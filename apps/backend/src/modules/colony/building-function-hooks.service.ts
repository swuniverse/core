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
import { ColonyDefenseService } from './colony-defense.service';
import { ColonyStatsService } from './colony-stats.service';
import { ColonyStorageService } from './colony-storage.service';
import { COLONY_FUNCTION_IDS } from './colony.constants';
import { ColonyField } from './entities/colony-field.entity';
import {
  ColonyFabricationQueue,
  ColonyFabricationQueueStatus,
} from './entities/colony-fabrication-queue.entity';
import {
  ColonyCrewTrainingQueue,
  ColonyCrewTrainingQueueStatus,
} from './entities/colony-crew-training-queue.entity';
import {
  ColonyShipBuildQueue,
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
    @InjectRepository(ColonyFabricationQueue)
    private readonly fabricationQueueRepo: Repository<ColonyFabricationQueue>,
    @InjectRepository(ColonyCrewTrainingQueue)
    private readonly crewTrainingQueueRepo: Repository<ColonyCrewTrainingQueue>,
    private readonly gameData: GameDataService,
    private readonly eventService: ColonyEventService,
    private readonly storageService: ColonyStorageService,
    private readonly statsService: ColonyStatsService,
    private readonly defenseService: ColonyDefenseService,
  ) {}

  async activate(
    colony: Colony,
    field: ColonyField,
    functionIds: number[],
  ): Promise<void> {
    if (
      functionIds.includes(COLONY_FUNCTION_IDS.SHIELD_GENERATOR) ||
      functionIds.includes(COLONY_FUNCTION_IDS.SHIELD_BATTERY)
    ) {
      this.syncShields(colony);
    }
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
    if (functionIds.includes(COLONY_FUNCTION_IDS.SHIELD_GENERATOR)) {
      this.syncShields(colony, null);
    } else if (functionIds.includes(COLONY_FUNCTION_IDS.SHIELD_BATTERY)) {
      this.syncShields(colony, field);
    }
    await this.cancelFabricationJobs(
      colony,
      functionIds,
      ColonyEventType.BUILDING_DEACTIVATED,
    );
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
    await this.cancelFabricationJobs(
      colony,
      functionIds,
      ColonyEventType.BUILDING_DESTROYED,
    );
    if (functionIds.includes(COLONY_FUNCTION_IDS.ACADEMY)) {
      await this.crewTrainingQueueRepo.update(
        {
          colonyId: colony.id,
          status: ColonyCrewTrainingQueueStatus.QUEUED,
        },
        { status: ColonyCrewTrainingQueueStatus.CANCELLED },
      );
    }
    if (
      functionIds.includes(COLONY_FUNCTION_IDS.SHIELD_GENERATOR) ||
      functionIds.includes(COLONY_FUNCTION_IDS.SHIELD_BATTERY)
    ) {
      this.syncShields(colony, field);
    }
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
      job.status = ColonyShipBuildQueueStatus.CANCELLED;
      await this.queueRepo.save(job);
      await this.notify(colony, job, 'Werftauftrag storniert', ColonyEventType.BUILDING_DESTROYED);
    }
  }

  private async cancelFabricationJobs(
    colony: Colony,
    functionIds: number[],
    type: ColonyEventType,
  ): Promise<void> {
    const fabricationIds = functionIds.filter(
      (id) =>
        id === COLONY_FUNCTION_IDS.TORPEDO_FAB ||
        (id >= COLONY_FUNCTION_IDS.MODULEFAB_TYPE1_LVL1 &&
          id <= COLONY_FUNCTION_IDS.MODULEFAB_TYPE3_LVL3),
    );
    if (!fabricationIds.length) return;
    const jobs = await this.fabricationQueueRepo.find({
      where: {
        colonyId: colony.id,
        buildingFunctionId: In(fabricationIds),
        status: ColonyFabricationQueueStatus.QUEUED,
      },
    });
    const maxStorage =
      this.statsService.calculateSummary(colony).effectiveStorageMax;
    for (const job of jobs) {
      const item = this.gameData.getFabricationItem(job.itemKey);
      const refunded: string[] = [];
      for (const cost of item?.costs ?? []) {
        const amount = await this.storageService.upperStorage(
          colony,
          cost.commodityId,
          cost.amount * job.amount,
          maxStorage,
        );
        const name = this.gameData.getCommodity(cost.commodityId)?.name ?? `Ware ${cost.commodityId}`;
        refunded.push(`${amount} ${name}`);
      }
      job.status = ColonyFabricationQueueStatus.CANCELLED;
      await this.fabricationQueueRepo.save(job);
      await this.eventService.createActionEvent({
        colonyId: colony.id,
        userId: job.userId,
        type,
        severity: ColonyEventSeverity.WARNING,
        title: 'Fabrikationsauftrag storniert',
        message: `${job.itemKey} (${job.amount}) wurde storniert. Erstattet: ${refunded.join(', ') || 'nichts'}.`,
        payload: { queueId: job.id, itemKey: job.itemKey, amount: job.amount },
      });
    }
  }

  private syncShields(
    colony: Colony,
    excludedField?: ColonyField | null,
  ): void {
    const maxShields = excludedField === null
      ? 0
      : this.defenseService.calculateMaxShields({
          ...colony,
          fields: (colony.fields ?? []).filter(
            (candidate) =>
              !excludedField ||
              (candidate !== excludedField && candidate.id !== excludedField.id),
          ),
        } as Colony);
    this.defenseService.syncShieldCapacity(colony, maxShields);
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
