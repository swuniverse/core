import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import {
  COLONIZATION_CLASS_GATE_RULES,
  COLONIZATION_LIMIT_RULES,
  COLONIZATION_MAX_LIMITS,
  type ColonizationLimitType,
  getClassGateRequiredTechPair,
  getColonizationClassGate,
  getColonizationLimitType,
  getFactionTechId,
} from '@swuniverse/shared';
import { User } from '../auth/user.entity';
import { Colony } from '../colony/entities/colony.entity';
import { AsteroidResourceDeposit } from '../colony/entities/asteroid-resource-deposit.entity';
import { ColonySeedService } from '../colony/colony-seed.service';
import { ColonyEventService } from '../colony/colony-event.service';
import {
  ColonyEventSeverity,
  ColonyEventType,
} from '../colony/entities/colony-event.entity';
import {
  CelestialObject,
  CelestialObjectType,
} from '../starmap/entities/celestial-object.entity';
import { Spacecraft, SpacecraftStatus } from '../spacecraft/entities/spacecraft.entity';
import { ShipClassDef } from '../spacecraft/entities/ship-class-def.entity';
import { UnlockResolverService } from '../research/unlock-resolver.service';
import { resolveSpacecraftLocation } from '../spacecraft/spacecraft-field';

export interface ColonizationLimitStatus {
  type: ColonizationLimitType;
  count: number;
  limit: number;
  max: number;
}

export interface ColonizationStatusDto {
  limits: Record<ColonizationLimitType, ColonizationLimitStatus>;
}

export interface StarterZoneStatusDto {
  layerId: number;
  layerName: string;
  isNoobzone: boolean;
  accountAgeAllowed: boolean;
  currentColoniesInLayer: number;
  maxColoniesInLayer: number;
}

export interface ColonizationTargetCheckDto {
  canColonize: boolean;
  reasons: string[];
  target: {
    id: number;
    objectType: CelestialObjectType;
    classId: number | null;
    systemId: number;
    posX: number;
    posY: number;
    limitType: ColonizationLimitType | null;
    classGate: string | null;
    starterZone?: StarterZoneStatusDto;
    reclaimed?: boolean;
  } | null;
  surface?: {
    width: number;
    fields: Array<{
      fieldIndex: number;
      fieldType: number;
      terrainTileId: number | null;
      layer: string | null;
      selectable: boolean;
    }>;
  } | null;
  status: ColonizationStatusDto;
  ship?: {
    id: number;
    shipClassId: number;
    isColonizer: boolean;
    colonizerTier: number | null;
    colonizationBuildingId: number | null;
  } | null;
}
const STARTER_NOOBZONE_MAX_ACCOUNT_AGE_MS = 12_960_000 * 1000;
const STARTER_NOOBZONE_MAX_COLONIES_PER_LAYER = 4;

@Injectable()
export class ColonizationService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Colony)
    private readonly colonyRepo: Repository<Colony>,
    @InjectRepository(CelestialObject)
    private readonly objectRepo: Repository<CelestialObject>,
    @InjectRepository(Spacecraft)
    private readonly shipRepo: Repository<Spacecraft>,
    @InjectRepository(ShipClassDef)
    private readonly shipClassRepo: Repository<ShipClassDef>,
    @InjectRepository(CrewAssignment)
    private readonly crewAssignmentRepo: Repository<CrewAssignment>,
    private readonly unlockResolver: UnlockResolverService,
    private readonly colonySeedService: ColonySeedService,
    private readonly colonyEventService: ColonyEventService,
  ) {}

  async getColonizationStatus(userId: number): Promise<ColonizationStatusDto> {
    const user = await this.getUser(userId);
    const [planetLimit, moonLimit, asteroidLimit, counts] = await Promise.all([
      this.calculateLimit(userId, this.getFactionKey(user), 'planet'),
      this.calculateLimit(userId, this.getFactionKey(user), 'moon'),
      this.calculateLimit(userId, this.getFactionKey(user), 'asteroid'),
      this.getColonyCountsByType(userId),
    ]);

    return {
      limits: {
        planet: {
          type: 'planet',
          count: counts.planet,
          limit: planetLimit,
          max: COLONIZATION_MAX_LIMITS.planet,
        },
        moon: {
          type: 'moon',
          count: counts.moon,
          limit: moonLimit,
          max: COLONIZATION_MAX_LIMITS.moon,
        },
        asteroid: {
          type: 'asteroid',
          count: counts.asteroid,
          limit: asteroidLimit,
          max: COLONIZATION_MAX_LIMITS.asteroid,
        },
      },
    };
  }

  async explainTarget(
    userId: number,
    celestialObjectId: number,
    shipId?: number,
  ): Promise<ColonizationTargetCheckDto> {
    const user = await this.getUser(userId);
    const factionKey = this.getFactionKey(user);
    const status = await this.getColonizationStatus(userId);
    const reasons: string[] = [];
    const target = await this.objectRepo.findOne({
      where: { id: celestialObjectId },
      relations: ['starSystem', 'starSystem.layer'],
    });
    const ship = shipId
      ? await this.shipRepo.findOne({
          where: { id: shipId, userId },
          relations: ['location', 'location.systemField'],
        })
      : null;
    const shipClass = ship
      ? await this.shipClassRepo.findOneBy({ id: ship.shipClassId })
      : null;

    if (!target) {
      return {
        canColonize: false,
        reasons: ['Ziel nicht gefunden'],
        target: null,
        status,
        surface: null,
      };
    }

    const limitType = getColonizationLimitType(target.objectType);
    const classGate = getColonizationClassGate(target.classId);

    if (!target.isColonizable) reasons.push('Ziel ist nicht kolonisierbar');
    if (!limitType) reasons.push('Unbekannter Zieltyp');
    if (!classGate)
      reasons.push('Kolonieklasse ist nicht freigeschaltet oder unbewohnbar');

    const existing = await this.colonyRepo.findOne({
      where: { celestialObjectId: target.id },
    });
    if (existing && !existing.isAbandoned) {
      reasons.push('Ziel ist bereits kolonisiert');
    }
    if (target.objectType === CelestialObjectType.ASTEROID) {
      const deposits = await this.objectRepo.manager
        .getRepository(AsteroidResourceDeposit)
        .find({
          where: { userId, celestialObjectId: target.id },
        });
      if (
        deposits.length > 0 &&
        deposits.every((deposit) => deposit.amountLeft <= 0)
      ) {
        reasons.push('Dieser Asteroid ist für dich erschöpft');
      }
    }

    if (limitType) {
      const limitStatus = status.limits[limitType];
      if (limitStatus.count >= limitStatus.limit) {
        reasons.push(
          `Kolonielimit für ${this.labelLimitType(limitType)} erreicht (${limitStatus.count}/${limitStatus.limit})`,
        );
      }
    }

    if (limitType && classGate) {
      const requiredTech = getClassGateRequiredTechPair(classGate, limitType);
      if (requiredTech) {
        const techId = getFactionTechId(requiredTech, factionKey);
        if (!(await this.unlockResolver.hasTech(userId, techId))) {
          const gateLabel =
            COLONIZATION_CLASS_GATE_RULES.find(
              (rule) => rule.gate === classGate,
            )?.label ?? classGate;
          reasons.push(`Forschung fehlt: ${gateLabel}`);
        }
      }
    }
    await this.collectStarterZoneReasons(user, target, reasons);

    if (shipId) {
      if (!ship) {
        reasons.push('Kolonieschiff nicht gefunden');
      } else if (!shipClass) {
        reasons.push('Schiffsklasse nicht gefunden');
      } else {
        this.collectShipReasons(reasons, ship, shipClass, target);
      }
    }

    return {
      canColonize: reasons.length === 0,
      reasons,
      target: {
        id: target.id,
        objectType: target.objectType,
        classId: target.classId,
        systemId: target.systemId,
        posX: target.posX,
        posY: target.posY,
        limitType,
        classGate,
        starterZone: await this.buildStarterZoneStatus(user, target),
        reclaimed: existing?.isAbandoned === true,
      },
      status,
      surface: existing?.isAbandoned
        ? null
        : (() => {
            const surface = this.colonySeedService.generateSurfaceSnapshot(
              target.classId ?? 0,
              `colony-${userId}-${target.id}`,
              target.starSystem?.bonusFields ?? 2,
            );
            return {
              width: surface.width,
              fields: surface.fields.map((field) => ({
                fieldIndex: field.fieldIndex,
                fieldType: field.fieldType,
                terrainTileId: field.terrainTileId ?? null,
                layer: field.layer ?? null,
                selectable:
                  field.layer === 'SURFACE' && field.fieldType !== 201,
              })),
            };
          })(),
      ship: ship
        ? {
            id: ship.id,
            shipClassId: ship.shipClassId,
            isColonizer: shipClass?.isColonizer ?? false,
            colonizerTier: shipClass?.colonizerTier ?? null,
            colonizationBuildingId: shipClass?.colonizationBuildingId ?? null,
          }
        : undefined,
    };
  }

  async colonize(
    userId: number,
    shipId: number,
    celestialObjectId: number,
    initialFieldIndex?: number,
  ): Promise<{
    success: true;
    colonyId: number;
    colonyName: string;
    consumedShipId: number;
    transferredCrewCount: number;
  }> {
    const check = await this.explainTarget(userId, celestialObjectId, shipId);
    if (!check.canColonize) {
      throw new BadRequestException(check.reasons.join('; '));
    }
    const [user, ship, target] = await Promise.all([
      this.getUser(userId),
      this.shipRepo.findOne({ where: { id: shipId, userId } }),
      this.objectRepo.findOneBy({ id: celestialObjectId }),
    ]);
    if (!ship) throw new NotFoundException('Kolonieschiff nicht gefunden');
    if (!target) throw new NotFoundException('Ziel nicht gefunden');
    const shipClass = await this.shipClassRepo.findOneBy({
      id: ship.shipClassId,
    });
    if (!shipClass?.colonizationBuildingId) {
      throw new BadRequestException('Schiff kann keine Kolonie gründen');
    }
    const abandonedColony = await this.colonyRepo.findOne({
      where: { celestialObjectId, isAbandoned: true },
      relations: ['changeable'],
    });
    if (!abandonedColony) {
      const surface = this.colonySeedService.generateSurfaceSnapshot(
        target.classId ?? 0,
        `colony-${userId}-${target.id}`,
        target.starSystem?.bonusFields ?? 2,
      );
      const field = surface.fields.find(
        (entry) => entry.fieldIndex === initialFieldIndex,
      );
      if (!field || field.layer !== 'SURFACE' || field.fieldType === 201) {
        throw new BadRequestException('Ungültiges Startfeld');
      }
    }
    const colony = abandonedColony
      ? await this.reclaimAbandonedColony(abandonedColony, userId)
      : await this.colonySeedService.createFollowUpColony({
          userId,
          username: user.username,
          celestialObjectId,
          buildingId: shipClass.colonizationBuildingId,
          initialFieldIndex,
        });
    if (target.objectType === CelestialObjectType.ASTEROID) {
      await this.colonySeedService.ensureAsteroidDepositMining(userId, target);
    }

    const crewAssignments = await this.crewAssignmentRepo.find({
      where: { spacecraftId: ship.id, userId },
    });
    for (const assignment of crewAssignments) {
      assignment.spacecraftId = null;
      assignment.colonyId = colony.id;
    }
    if (crewAssignments.length)
      await this.crewAssignmentRepo.save(crewAssignments);
    await this.shipRepo.delete({ id: ship.id, userId });
    await this.colonyEventService.createActionEvent({
      colonyId: colony.id,
      userId,
      type: abandonedColony
        ? ColonyEventType.COLONY_RECLAIMED
        : ColonyEventType.COLONY_FOUNDED,
      severity: ColonyEventSeverity.INFO,
      title: abandonedColony ? 'Kolonie übernommen' : 'Kolonie gegründet',
      message: abandonedColony
        ? `${colony.name} wurde übernommen. Das Kolonieschiff ${ship.name} wurde verbraucht.`
        : `${colony.name} wurde gegründet. Das Kolonieschiff ${ship.name} wurde verbraucht.`,
      payload: {
        celestialObjectId,
        consumedShipId: ship.id,
        shipClassId: ship.shipClassId,
        colonizerTier: shipClass.colonizerTier,
        initialBuildingId: abandonedColony
          ? null
          : shipClass.colonizationBuildingId,
        reclaimed: !!abandonedColony,
        ruinsPreserved: !!abandonedColony,
        transferredCrewCount: crewAssignments.length,
        initialFieldIndex: abandonedColony ? null : (initialFieldIndex ?? null),
      },
    });

    return {
      success: true,
      colonyId: colony.id,
      colonyName: colony.name,
      consumedShipId: ship.id,
      transferredCrewCount: crewAssignments.length,
    };
  }

  private async reclaimAbandonedColony(
    colony: Colony,
    userId: number,
  ): Promise<Colony> {
    colony.userId = userId;
    colony.isAbandoned = false;
    colony.abandonedAt = null;
    colony.previousUserId = null;
    const changeable = colony.changeable;
    if (changeable) {
      changeable.energy = Math.max(0, colony.energy);
      changeable.immigrationEnabled = true;
      changeable.isBlockaded = false;
      changeable.shields = 0;
      changeable.shieldFrequency = null;
      changeable.torpedoTypeId = null;
      changeable.trainedCrew = 0;
      changeable.workless = Math.max(
        1,
        changeable.workers + changeable.workless,
      );
      changeable.workers = 0;
      await this.colonyRepo.manager.save(changeable);
    }
    return this.colonyRepo.save(colony);
  }

  private async calculateLimit(
    userId: number,
    factionKey: string | null,
    type: ColonizationLimitType,
  ): Promise<number> {
    let limit = 0;
    for (const rule of COLONIZATION_LIMIT_RULES.filter(
      (candidate) => candidate.type === type,
    )) {
      if (!rule.tech) {
        limit += 1;
        continue;
      }
      const techId = getFactionTechId(rule.tech, factionKey);
      if (await this.unlockResolver.hasTech(userId, techId)) limit += 1;
    }
    return Math.min(limit, COLONIZATION_MAX_LIMITS[type]);
  }

  private async getColonyCountsByType(
    userId: number,
  ): Promise<Record<ColonizationLimitType, number>> {
    const colonies = await this.colonyRepo.find({
      where: { userId, isAbandoned: false },
      relations: ['celestialObject'],
    });
    const counts: Record<ColonizationLimitType, number> = {
      planet: 0,
      moon: 0,
      asteroid: 0,
    };
    for (const colony of colonies) {
      const type = getColonizationLimitType(colony.celestialObject?.objectType);
      if (type) counts[type] += 1;
    }
    return counts;
  }

  private collectShipReasons(
    reasons: string[],
    ship: Spacecraft,
    shipClass: ShipClassDef,
    target: CelestialObject,
  ): void {
    if (!shipClass.isColonizer) reasons.push('Schiff ist kein Kolonieschiff');
    if (!shipClass.colonizationBuildingId) {
      reasons.push('Kolonieschiff hat kein Startgebäude konfiguriert');
    }
    if (ship.status !== SpacecraftStatus.IDLE) {
      reasons.push('Kolonieschiff muss betriebsbereit sein');
    }
    const location = resolveSpacecraftLocation(ship);
    if (location?.scope !== 'SYSTEM') {
      reasons.push('Kolonieschiff muss im Sternsystem sein');
    } else if (location.systemId !== target.systemId) {
      reasons.push('Kolonieschiff ist nicht im Zielsystem');
    }
    if (
      location?.scope !== 'SYSTEM' ||
      location.x !== target.posX ||
      location.y !== target.posY
    ) {
      reasons.push('Kolonieschiff muss exakt auf dem Zielfeld stehen');
    }
  }

  private async getUser(userId: number): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['factionRef'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private async collectStarterZoneReasons(
    user: User,
    target: CelestialObject,
    reasons: string[],
  ): Promise<void> {
    const starterZone = await this.buildStarterZoneStatus(user, target);
    if (!starterZone?.isNoobzone) {
      return;
    }

    if (!starterZone.accountAgeAllowed) {
      reasons.push(
        'Kolonisierung in der Noobzone nur für neue Accounts erlaubt',
      );
    }
    if (starterZone.currentColoniesInLayer >= starterZone.maxColoniesInLayer) {
      reasons.push(
        `Kolonielimit in dieser Noobzone erreicht (${starterZone.currentColoniesInLayer}/${starterZone.maxColoniesInLayer})`,
      );
    }
  }

  private async countUserColoniesInLayer(
    userId: number,
    layerId: number,
  ): Promise<number> {
    return this.colonyRepo
      .createQueryBuilder('colony')
      .innerJoin('colony.starSystem', 'starSystem')
      .where('colony.userId = :userId', { userId })
      .andWhere('colony.isAbandoned = false')
      .andWhere('starSystem.layerId = :layerId', { layerId })
      .getCount();
  }

  private async buildStarterZoneStatus(
    user: User,
    target: CelestialObject,
  ): Promise<StarterZoneStatusDto | undefined> {
    const layer = target.starSystem?.layer;
    if (!layer) {
      return undefined;
    }

    const accountAgeAllowed =
      Date.now() - user.createdAt.getTime() <=
      STARTER_NOOBZONE_MAX_ACCOUNT_AGE_MS;
    const currentColoniesInLayer = await this.countUserColoniesInLayer(
      user.id,
      layer.id,
    );

    return {
      layerId: layer.id,
      layerName: layer.name,
      isNoobzone: layer.isNoobzone,
      accountAgeAllowed,
      currentColoniesInLayer,
      maxColoniesInLayer: STARTER_NOOBZONE_MAX_COLONIES_PER_LAYER,
    };
  }

  private getFactionKey(user: User): string | null {
    return user.factionRef?.key ?? user.faction ?? null;
  }

  private labelLimitType(type: ColonizationLimitType): string {
    switch (type) {
      case 'planet':
        return 'Planeten';
      case 'moon':
        return 'Monde';
      case 'asteroid':
        return 'Asteroiden';
    }
  }
}
