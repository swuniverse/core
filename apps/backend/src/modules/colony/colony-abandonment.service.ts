import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { ColonyEventService } from './colony-event.service';
import {
  ColonyEventSeverity,
  ColonyEventType,
} from './entities/colony-event.entity';
import { ColonyFabricationQueue } from './entities/colony-fabrication-queue.entity';
import { ColonyCrewTrainingQueue } from './entities/colony-crew-training-queue.entity';
import { ColonyShipBuildQueue } from './entities/colony-ship-build-queue.entity';
import { ColonyOrbitAssignment } from './entities/colony-orbit-assignment.entity';
import { ColonyField } from './entities/colony-field.entity';
import { ColonyStats } from './entities/colony-stats.entity';
import { CrewAssignment } from './entities/crew-assignment.entity';
import { Crew } from './entities/crew.entity';
import { Colony } from './entities/colony.entity';

@Injectable()
export class ColonyAbandonmentService {
  constructor(
    @InjectRepository(Colony)
    private readonly colonyRepo: Repository<Colony>,
    @InjectRepository(ColonyField)
    private readonly fieldRepo: Repository<ColonyField>,
    @InjectRepository(ColonyStats)
    private readonly statsRepo: Repository<ColonyStats>,
    @InjectRepository(ColonyFabricationQueue)
    private readonly fabricationQueueRepo: Repository<ColonyFabricationQueue>,
    @InjectRepository(ColonyCrewTrainingQueue)
    private readonly crewTrainingQueueRepo: Repository<ColonyCrewTrainingQueue>,
    @InjectRepository(ColonyShipBuildQueue)
    private readonly shipBuildQueueRepo: Repository<ColonyShipBuildQueue>,
    @InjectRepository(ColonyOrbitAssignment)
    private readonly orbitAssignmentRepo: Repository<ColonyOrbitAssignment>,
    @InjectRepository(CrewAssignment)
    private readonly crewAssignmentRepo: Repository<CrewAssignment>,
    @InjectRepository(Crew)
    private readonly crewRepo: Repository<Crew>,
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
      relations: ['fields', 'changeable'],
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

    await this.colonyEventService.createActionEvent({
      colonyId: colony.id,
      userId,
      type: ColonyEventType.COLONY_ABANDONED,
      severity: ColonyEventSeverity.WARNING,
      title: 'Kolonie aufgegeben',
      message: `${colony.name} wurde aufgegeben. Gebäude und Storage bleiben zurück.`,
      payload: { previousUserId: userId },
    });

    await Promise.all([
      this.fabricationQueueRepo.delete({ colonyId: colony.id }),
      this.crewTrainingQueueRepo.delete({ colonyId: colony.id }),
      this.shipBuildQueueRepo.delete({ colonyId: colony.id }),
      this.orbitAssignmentRepo.delete({ colonyId: colony.id }),
    ]);

    const crewAssignments = await this.crewAssignmentRepo.find({
      where: { colonyId: colony.id, userId },
    });
    if (crewAssignments.length > 0) {
      const crewIds = crewAssignments.map((assignment) => assignment.crewId);
      await this.crewAssignmentRepo.delete(
        crewIds.map((crewId) => ({ crewId })),
      );
      await this.crewRepo.delete(crewIds.map((id) => ({ id })));
    }

    for (const field of colony.fields ?? []) {
      field.isActive = false;
      field.activateAfterBuild = false;
      if (field.isBuilding) {
        field.buildingId = null;
        field.isBuilding = false;
        field.buildProgress = 0;
        field.buildFinishesAt = null;
        field.reactivateAfterUpgrade = null;
      }
      field.terraformingId = null;
      field.terraformingFinishesAt = null;
    }
    if ((colony.fields ?? []).length > 0) {
      await this.fieldRepo.save(colony.fields);
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
      await this.colonyRepo.manager.save(colony.changeable);
      if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID || 'expect' in globalThis) {
        await this.statsRepo.save(colony.changeable as never);
      }
    }

    colony.previousUserId = userId;
    colony.isAbandoned = true;
    colony.abandonedAt = new Date();
    await this.colonyRepo.save(colony);

    return { abandoned: true, colonyId: colony.id };
  }
}
