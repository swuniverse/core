import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { GameDataService } from '../game-data/game-data.service';
import { ColonyEventService } from '../messaging/colony-event.service';
import {
  ColonyEventSeverity,
  ColonyEventType,
} from '../messaging/colony-event.types';
import { ShipClassDef } from '../spacecraft/entities/ship-class-def.entity';
import { ColonyCrewService } from './colony-crew.service';
import { ColonyField } from './entities/colony-field.entity';
import {
  ColonyShipBuildQueue,
  ColonyShipBuildQueueMode,
  ColonyShipBuildQueueStatus,
} from './entities/colony-ship-build-queue.entity';
import { Colony } from './entities/colony.entity';

@Injectable()
export class BuildingFunctionHooksService {
  constructor(
    @InjectRepository(ColonyShipBuildQueue)
    private readonly queueRepo: Repository<ColonyShipBuildQueue>,
    @InjectRepository(ShipClassDef)
    private readonly shipClassRepo: Repository<ShipClassDef>,
    private readonly gameData: GameDataService,
    private readonly crewService: ColonyCrewService,
    private readonly eventService: ColonyEventService,
  ) {}

  async activate(
    colony: Colony,
    field: ColonyField,
    functionIds: number[],
  ): Promise<void> {
    const jobs = await this.getOpenJobs(colony.id);
    const shipClasses = await this.getShipClasses(jobs);
    const now = new Date();

    for (const job of jobs) {
      if (
        job.status !== ColonyShipBuildQueueStatus.PAUSED ||
        !this.matchesAnyFunction(shipClasses.get(job.shipClassId), functionIds)
      ) {
        continue;
      }
      const compatibleFunctions = [
        ...this.getActiveShipyardFunctions(colony, field),
        ...functionIds,
      ];
      if (!this.isCompatible(shipClasses.get(job.shipClassId), compatibleFunctions)) {
        continue;
      }
      if (job.stoppedAt) {
        job.finishesAt = new Date(
          job.finishesAt.getTime() +
            Math.max(0, now.getTime() - job.stoppedAt.getTime()),
        );
      }
      job.stoppedAt = null;
      job.status = ColonyShipBuildQueueStatus.QUEUED;
      await this.queueRepo.save(job);
    }
  }

  async deactivate(
    colony: Colony,
    field: ColonyField,
    functionIds: number[],
  ): Promise<void> {
    const jobs = await this.getOpenJobs(colony.id);
    const shipClasses = await this.getShipClasses(jobs);
    const activeFunctions = this.getActiveShipyardFunctions(colony, field);
    const now = new Date();

    for (const job of jobs) {
      if (
        job.status !== ColonyShipBuildQueueStatus.QUEUED ||
        !this.matchesAnyFunction(shipClasses.get(job.shipClassId), functionIds) ||
        this.isCompatible(shipClasses.get(job.shipClassId), activeFunctions)
      ) {
        continue;
      }
      job.status = ColonyShipBuildQueueStatus.PAUSED;
      job.stoppedAt = now;
      await this.queueRepo.save(job);
      await this.notify(colony, job, 'Werftauftrag pausiert', ColonyEventType.BUILDING_DEACTIVATED);
    }
  }

  async destruct(
    colony: Colony,
    field: ColonyField,
    functionIds: number[],
  ): Promise<void> {
    const jobs = await this.getOpenJobs(colony.id);
    const shipClasses = await this.getShipClasses(jobs);
    const activeFunctions = this.getActiveShipyardFunctions(colony, field);

    for (const job of jobs) {
      if (
        !this.matchesAnyFunction(shipClasses.get(job.shipClassId), functionIds) ||
        this.isCompatible(shipClasses.get(job.shipClassId), activeFunctions)
      ) {
        continue;
      }
      if (!job.mode || job.mode === ColonyShipBuildQueueMode.BUILD) {
        await this.crewService.returnCrewToColony(colony, job.crewIds ?? []);
      }
      job.status = ColonyShipBuildQueueStatus.CANCELLED;
      await this.queueRepo.save(job);
      await this.notify(colony, job, 'Werftauftrag storniert', ColonyEventType.BUILDING_DESTROYED);
    }
  }

  private getOpenJobs(colonyId: number): Promise<ColonyShipBuildQueue[]> {
    return this.queueRepo.find({
      where: {
        colonyId,
        status: In([
          ColonyShipBuildQueueStatus.QUEUED,
          ColonyShipBuildQueueStatus.PAUSED,
        ]),
      },
    });
  }

  private async getShipClasses(jobs: ColonyShipBuildQueue[]) {
    const ids = [...new Set(jobs.map((job) => job.shipClassId))];
    const shipClasses = ids.length
      ? await this.shipClassRepo.findBy({ id: In(ids) })
      : [];
    return new Map(shipClasses.map((shipClass) => [shipClass.id, shipClass]));
  }

  private getActiveShipyardFunctions(colony: Colony, excludedField: ColonyField) {
    return [
      ...new Set(
        (colony.fields ?? [])
          .filter(
            (field) =>
              field !== excludedField &&
              (excludedField.id == null || field.id !== excludedField.id) &&
              field.isActive &&
              field.buildingId != null,
          )
          .flatMap((field) => this.gameData.getBuildingFunctions(field.buildingId!)),
      ),
    ];
  }

  private matchesAnyFunction(
    shipClass: ShipClassDef | undefined,
    functionIds: number[],
  ): boolean {
    if (!shipClass) return false;
    return this.getAllowedFunctions(shipClass).some((id) => functionIds.includes(id));
  }

  private isCompatible(
    shipClass: ShipClassDef | undefined,
    activeFunctions: number[],
  ): boolean {
    if (!shipClass) return false;
    const allowed = this.getAllowedFunctions(shipClass);
    return allowed.length === 0 || allowed.some((id) => activeFunctions.includes(id));
  }

  private getAllowedFunctions(shipClass: ShipClassDef): number[] {
    return (
      this.gameData.getShipClassDefByKey(shipClass.key)?.allowedBuildingFunctionIds ??
      this.gameData.getShipClassSlotRule(shipClass.category)?.allowedBuildingFunctionIds ??
      []
    );
  }

  private async notify(
    colony: Colony,
    job: ColonyShipBuildQueue,
    title: string,
    type: ColonyEventType,
  ): Promise<void> {
    await this.eventService.createActionEvent({
      colonyId: colony.id,
      userId: job.userId,
      type,
      severity: ColonyEventSeverity.WARNING,
      title,
      message: `${job.name} wurde ${title.endsWith('pausiert') ? 'pausiert' : 'storniert'}.`,
      payload: { queueId: job.id, shipClassId: job.shipClassId, mode: job.mode },
    });
  }
}
