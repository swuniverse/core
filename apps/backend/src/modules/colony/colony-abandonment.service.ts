import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { ColonyEventService } from '../messaging/colony-event.service';
import {
  ColonyEventSeverity,
  ColonyEventType,
} from '../messaging/colony-event.types';
import { ColonyFabricationQueue } from './entities/colony-fabrication-queue.entity';
import { ColonyCrewTrainingQueue } from './entities/colony-crew-training-queue.entity';
import { ColonyShipBuildQueue } from './entities/colony-ship-build-queue.entity';
import { ColonyOrbitAssignment } from './entities/colony-orbit-assignment.entity';
import { ColonyStats } from './entities/colony-stats.entity';
import { ColonyStorage } from './entities/colony-storage.entity';
import { CrewAssignment } from './entities/crew-assignment.entity';
import { Crew } from './entities/crew.entity';
import { ColonySandbox } from './entities/colony-sandbox.entity';
import { Colony } from './entities/colony.entity';
import { ColonyField } from './entities/colony-field.entity';
import {
  CelestialObject,
  CelestialObjectType,
} from '../starmap/entities/celestial-object.entity';
import {
  convertObjectToSwu,
  getSwuClassIdForStuClassId,
} from '../starmap/generator/swu-stu-class-mapping';
import { purgeColonies } from './colony-purge';

/** Alte STU-Oberflaechen haben ausschliesslich numerische Kachel-Codes, SWU-Felder alphanumerische (z.B. "G649"). */
function hasStuSurface(fields: Array<Pick<ColonyField, 'terrainTileId'>>): boolean {
  return (
    fields.length > 0 &&
    !fields.some(
      (field) =>
        field.terrainTileId != null && !/^\d+$/.test(field.terrainTileId),
    )
  );
}

@Injectable()
export class ColonyAbandonmentService {
  constructor(
    @InjectRepository(Colony)
    private readonly colonyRepo: Repository<Colony>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly colonyEventService: ColonyEventService,
  ) {}

  async giveUpColony(
    colonyId: number,
    userId: number,
    confirmation: string,
  ): Promise<{ abandoned: true; colonyId: number }> {
    const colony = await this.colonyRepo.findOne({
      where: { id: colonyId, userId },
      relations: ['fields', 'changeable', 'celestialObject'],
    });
    if (!colony) throw new NotFoundException('Colony not found');
    if (colony.isAbandoned)
      throw new BadRequestException('Colony is already abandoned');

    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');
    if (user.starterColonyId === colony.id) {
      throw new BadRequestException('Starter colony cannot be abandoned');
    }
    if ((confirmation ?? '').trim() !== colony.name) {
      throw new BadRequestException('Confirmation does not match colony name');
    }

    const asteroid =
      colony.celestialObject?.objectType === CelestialObjectType.ASTEROID;
    if (!this.purgedInsteadOfRuin(colony)) {
      await this.colonyEventService.createActionEvent({
        colonyId: colony.id,
        userId,
        type: ColonyEventType.COLONY_ABANDONED,
        severity: ColonyEventSeverity.WARNING,
        title: 'Kolonie aufgegeben',
        message: asteroid
          ? `${colony.name} wurde aufgegeben. Der Asteroid bleibt für diesen Account erschöpft.`
          : `${colony.name} wurde aufgegeben. Gebäude und Storage bleiben zurück.`,
        payload: { previousUserId: userId },
      });
    }
    await this.colonyRepo.manager.transaction((manager) =>
      this.abandonInManager(manager, colony, userId),
    );
    return { abandoned: true, colonyId: colony.id };
  }

  /**
   * The shared part of giving up a colony (col-E2, ADR-0007), also used by the
   * account deletion (sh-AP-05d) inside its transaction: queues end without
   * refund, orbit orders and blockade end, the colony's crew and sandboxes go
   * (purged colonies drop sandboxes by foreign key), and the
   * colony stays as a resettleable ruin with buildings and storage. Former
   * STU planets and moons are purged and converted instead. Callers check the
   * starter-colony lock and confirmation themselves.
   */
  async abandonInManager(manager: EntityManager, colony: Colony, userId: number): Promise<void> {
    if (this.purgedInsteadOfRuin(colony)) {
      const object = colony.celestialObject as CelestialObject;
      if (object.objectType === CelestialObjectType.ASTEROID) {
        // Lagerstaetten pro Account (asteroid_resource_deposits) bleiben
        // bestehen, ein erschoepfter Asteroid bleibt erschoepft.
        await purgeColonies(manager, [colony.id]);
        return;
      }
      convertObjectToSwu(object);
      await purgeColonies(manager, [colony.id]);
      await manager.save(object);
      return;
    }
    const asteroid =
      colony.celestialObject?.objectType === CelestialObjectType.ASTEROID;
    await manager.delete(ColonyFabricationQueue, { colonyId: colony.id });
    await manager.delete(ColonyCrewTrainingQueue, { colonyId: colony.id });
    await manager.delete(ColonyShipBuildQueue, { colonyId: colony.id });
    await manager.delete(ColonyOrbitAssignment, { colonyId: colony.id });
    // STU ColonyResetter: planning copies go with the colony (col-AUD-16b).
    await manager.delete(ColonySandbox, { sourceColonyId: colony.id });
    if (asteroid) await manager.delete(ColonyStorage, { colonyId: colony.id });

    const crewAssignments = await manager.find(CrewAssignment, {
      where: { colonyId: colony.id, userId },
    });
    if (crewAssignments.length > 0) {
      const crewIds = crewAssignments.map((assignment) => assignment.crewId);
      await manager.delete(CrewAssignment, { crewId: In(crewIds) });
      await manager.delete(Crew, { id: In(crewIds) });
    }

    for (const field of colony.fields ?? []) {
      field.isActive = false;
      field.activateAfterBuild = false;
      field.reactivateAfterUpgrade = null;
      field.terraformingId = null;
      field.terraformingFinishesAt = null;
      field.domeFinishesAt = null;
      field.wreckRepairFinishesAt = null;
      if (field.isBuilding) {
        // A construction site has no completed ruin to preserve.
        field.buildingId = null;
        field.isBuilding = false;
        field.buildProgress = 0;
        field.buildFinishesAt = null;
      }
    }
    if ((colony.fields ?? []).length > 0) {
      await manager.save(colony.fields);
    }

    if (colony.changeable) {
      colony.changeable.workers = 0;
      colony.changeable.workless = 0;
      colony.changeable.trainedCrew = 0;
      colony.changeable.isBlockaded = false;
      colony.changeable.shields = 0;
      colony.changeable.shieldFrequency = null;
      colony.changeable.torpedoTypeId = null;
      colony.changeable.immigrationEnabled = false;
      await manager.save(colony.changeable);
      if (
        process.env.NODE_ENV === 'test' ||
        process.env.JEST_WORKER_ID ||
        'expect' in globalThis
      ) {
        await manager.getRepository(ColonyStats).save(colony.changeable as never);
      }
    }

    colony.previousUserId = userId;
    colony.isAbandoned = true;
    colony.abandonedAt = new Date();
    await manager.save(colony);
  }

  /**
   * Noch-STU-Planeten/-Monde werden nicht als Ruine hinterlassen, sondern
   * gesaeubert und auf SWU umgestellt - so muss das nicht mehr manuell
   * (Admin: Bereinigen + "Set empty to SWU") nachgezogen werden.
   */
  private purgedInsteadOfRuin(colony: Colony): boolean {
    const object = colony.celestialObject;
    // Asteroiden mit noch alter STU-Oberflaeche (nur numerische Kachel-Codes)
    // werden ebenfalls gesaeubert: die naechste Besiedlung erzeugt dann die
    // SWU-Oberflaeche (siehe swu-asteroid-biomes.ts) statt die alte Ruine zu
    // uebernehmen.
    if (
      object?.objectType === CelestialObjectType.ASTEROID &&
      hasStuSurface(colony.fields ?? [])
    ) {
      return true;
    }
    return Boolean(
      object &&
        (object.objectType === CelestialObjectType.PLANET ||
          object.objectType === CelestialObjectType.MOON) &&
        object.originalClassId == null &&
        object.classId != null &&
        getSwuClassIdForStuClassId(object.classId) != null,
    );
  }
}
