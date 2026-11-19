import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  pickWreckShip,
  WRECK_SALVAGED_TILE_ID,
  type ColonyTickEvent,
} from '@swuniverse/shared';
import { Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { BuildingDef, GameDataService } from '../game-data/game-data.service';
import { ColonyEventService } from '../messaging/colony-event.service';
import {
  ColonyEventSeverity,
  ColonyEventType,
} from '../messaging/colony-event.types';
import { BuildingLifecycleService } from './building-lifecycle.service';
import { ColonyCrewService } from './colony-crew.service';
import { ColonyEconomyService } from './colony-economy.service';
import { ColonyDefenseService } from './colony-defense.service';
import { ColonyFabricationService } from './colony-fabrication.service';
import { ColonyShipyardService } from './colony-shipyard.service';
import {
  ColonyStatsService,
  ColonyInternalSummary,
  adjustColonyPopulationParts,
  getColonyChangeable,
  calculateColonyGrowth,
  getEffectiveCurrentPopulation,
  setColonyEnergy,
  syncLegacyColonySnapshot,
} from './colony-stats.service';
import { ColonyStorageService } from './colony-storage.service';
import {
  ColonyCrewTrainingQueue,
  ColonyCrewTrainingQueueStatus,
} from './entities/colony-crew-training-queue.entity';
import { ColonyDepositMining } from './entities/colony-deposit-mining.entity';
import { AsteroidResourceDeposit } from './entities/asteroid-resource-deposit.entity';
import { ColonyField } from './entities/colony-field.entity';
import { ColonyStats } from './entities/colony-stats.entity';
import { ColonyStorage } from './entities/colony-storage.entity';
import { Colony } from './entities/colony.entity';
import { assertOwnedColony } from './colony-owner.util';
import type { ColonyTickResult } from './colony.service';

@Injectable()
export class ColonyTickProcessorService {
  private randomInt = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  constructor(
    @InjectRepository(Colony)
    private readonly colonyRepo: Repository<Colony>,
    @InjectRepository(ColonyStats)
    _statsRepo: Repository<ColonyStats>,
    @InjectRepository(ColonyField)
    private readonly fieldRepo: Repository<ColonyField>,
    @InjectRepository(ColonyStorage)
    private readonly storageRepo: Repository<ColonyStorage>,
    @InjectRepository(ColonyDepositMining)
    private readonly depositMiningRepo: Repository<ColonyDepositMining>,
    @InjectRepository(ColonyCrewTrainingQueue)
    private readonly crewTrainingQueueRepo: Repository<ColonyCrewTrainingQueue>,
    @InjectRepository(User)
    _userRepo: Repository<User>,
    private readonly gameData: GameDataService,
    private readonly colonyStatsService: ColonyStatsService,
    private readonly colonyStorageService: ColonyStorageService,
    private readonly buildingLifecycleService: BuildingLifecycleService,
    private readonly colonyCrewService: ColonyCrewService,
    private readonly colonyEconomyService: ColonyEconomyService,
    private readonly colonyEventService: ColonyEventService,
    private readonly colonyDefenseService: ColonyDefenseService,
    private readonly colonyFabricationService: ColonyFabricationService,
    private readonly colonyShipyardService: ColonyShipyardService,
  ) {}

  async processCrewTrainingQueue(colony: Colony): Promise<void> {
    const jobs = await this.crewTrainingQueueRepo.find({
      where: {
        colonyId: colony.id,
        status: ColonyCrewTrainingQueueStatus.QUEUED,
      },
    });
    if (
      jobs.length === 0 ||
      !this.colonyEconomyService.getCrewTrainingFacility(colony).active
    ) {
      return;
    }

    const [freeLocal, globalLimit, assigned, trainable] = await Promise.all([
      this.colonyCrewService.getFreeAssignmentCount(colony),
      this.colonyCrewService.getGlobalCrewLimit(colony.userId!),
      this.colonyCrewService.getAssignedCount(colony.userId!),
      this.colonyCrewService.getTrainableCount(colony.userId!),
    ]);
    let remainingLocal = freeLocal;
    let remainingGlobal = Math.max(0, globalLimit - assigned);
    let remainingTrainable = trainable;

    for (const job of jobs) {
      const reason =
        remainingLocal <= 0
          ? 'LOCAL_CREW_LIMIT'
          : remainingGlobal <= 0
            ? 'GLOBAL_CREW_LIMIT'
            : null;
      if (reason) {
        job.status = ColonyCrewTrainingQueueStatus.CANCELLED;
        await this.crewTrainingQueueRepo.save(job);
        await this.colonyEventService.createActionEvent({
          colonyId: colony.id,
          userId: job.userId,
          type: ColonyEventType.CREW_TRAINING_CANCELLED,
          severity: ColonyEventSeverity.WARNING,
          title: 'Crewausbildung abgebrochen',
          message:
            reason === 'LOCAL_CREW_LIMIT'
              ? 'Die Crewausbildung wurde wegen des lokalen Crewlimits abgebrochen.'
              : 'Die Crewausbildung wurde wegen des globalen Crewlimits abgebrochen.',
          payload: { amount: job.amount, reason },
        });
        continue;
      }
      if (remainingTrainable <= 0) break;

      const amount = Math.min(
        job.amount,
        remainingLocal,
        remainingGlobal,
        remainingTrainable,
      );
      await this.colonyCrewService.createCrewOnColony(colony, amount);
      job.amount = amount;
      job.status = ColonyCrewTrainingQueueStatus.COMPLETED;
      await this.crewTrainingQueueRepo.save(job);
      remainingLocal -= amount;
      remainingGlobal -= amount;
      remainingTrainable -= amount;
    }
  }

  private async enforceLocalCrewLimit(
    colony: Colony,
    events: ColonyTickEvent[] = [],
  ): Promise<void> {
    const removed = await this.colonyCrewService.removeExcessColonyCrew(colony);
    if (removed > 0) {
      events.push({
        type: 'CREW_LIMIT_EXCEEDED',
        amount: removed,
        reason: 'LOCAL_CREW_LIMIT',
      });
    }
  }

  private async processFabricationQueue(colony: Colony): Promise<void> {
    return this.colonyFabricationService.processFabricationQueue(colony);
  }

  private async processShipRepairQueue(colony: Colony): Promise<void> {
    return this.colonyShipyardService.processShipBuildQueue(colony, true);
  }

  private getMaxShields(colony: Colony): number {
    return this.colonyDefenseService.calculateMaxShieldsByFunctions(
      this.getActiveBuildingFunctionIds(colony),
    );
  }

  private getActiveBuildingFunctionIds(colony: Colony): number[] {
    return (colony.fields ?? [])
      .filter(
        (field) => field.buildingId && !field.isBuilding && field.isActive,
      )
      .flatMap((field) =>
        this.gameData.getBuildingFunctions(field.buildingId!),
      );
  }

  calculatePopulationGrowth(
    colony: Colony,
    summary: ColonyInternalSummary,
  ): number {
    return calculateColonyGrowth(
      colony,
      summary.productionDelta.get(1300) ?? 0,
      this.gameData.getColonyClass(colony.colonyClassId)?.bevGrowthRate ?? 100,
    );
  }

  async processTick(colony: Colony): Promise<ColonyTickResult> {
    const events: ColonyTickEvent[] = [];
    await this.checkBuildingCompletions(colony, events);
    this.syncDefenseStats(colony);
    await this.balanceAndProduce(colony, events);
    await this.growPopulation(colony);
    await this.processFabricationQueue(colony);
    await this.processCrewTrainingQueue(colony);
    await this.enforceLocalCrewLimit(colony, events);
    await this.processShipRepairQueue(colony);
    const summary = this.colonyStatsService.calculateSummary(colony);
    return {
      researchPoints: summary.researchPoints,
      productionDelta: summary.productionDelta,
      events,
    };
  }

  private syncDefenseStats(colony: Colony): void {
    this.colonyDefenseService.syncShieldCapacity(
      colony,
      this.getMaxShields(colony),
    );
  }

  async checkBuildingCompletions(
    colony: Colony,
    events: ColonyTickEvent[] = [],
  ): Promise<void> {
    const now = new Date();
    for (const field of colony.fields) {
      if (
        field.terraformingId &&
        field.terraformingFinishesAt &&
        field.terraformingFinishesAt <= now
      ) {
        const selectedTerraforming = this.gameData.getTerraforming(
          field.terraformingId,
        );
        const terraforming = selectedTerraforming
          ? (this.gameData
              .getTerraformingForFieldType(
                field.terrainTileId ?? field.fieldType,
              )
              .find(
                (option) =>
                  this.normalizeTerraformingTarget(option.toFieldType) ===
                  this.normalizeTerraformingTarget(
                    selectedTerraforming.toFieldType,
                  ),
              ) ?? selectedTerraforming)
          : undefined;
        if (terraforming) {
          // fieldType bleibt eine reine Gameplay-Zahl - bei SWU-Zielen (z.B.
          // "E433") gibt es noch keine numerische Entsprechung, also nur bei
          // rein numerischen (alten STU-)Zielen mitziehen.
          if (/^\d+$/.test(String(terraforming.toFieldType))) {
            field.fieldType = this.normalizeFieldType(
              Number(terraforming.toFieldType),
            );
          }
          field.terrainTileId = String(terraforming.toFieldType);
        }
        field.terraformingId = null;
        field.terraformingFinishesAt = null;
        await this.fieldRepo.save(field);
        events.push({
          type: 'TERRAFORMING_FINISHED',
          fieldIndex: field.fieldIndex,
        });
      }

      if (field.wreckRepairFinishesAt && field.wreckRepairFinishesAt <= now) {
        const hangarDef = this.gameData.getHangarShipDef(
          pickWreckShip(Math.random()),
        );
        if (hangarDef) {
          const maxStorage =
            this.colonyStatsService.calculateSummary(
              colony,
            ).effectiveStorageMax;
          const stored = await this.colonyStorageService.upperStorage(
            colony,
            hangarDef.hangarCommodityId,
            1,
            maxStorage,
          );
          if (stored > 0) {
            field.wreckRepaired = true;
            field.wreckRepairFinishesAt = null;
            field.terrainTileId = WRECK_SALVAGED_TILE_ID;
            await this.fieldRepo.save(field);
            events.push({
              type: 'WRECK_REPAIRED',
              fieldIndex: field.fieldIndex,
              reason: hangarDef.displayName.replace(/ Rumpf$/, ''),
            });
          }
          // Lager voll: Reparatur bleibt faellig und wird im naechsten Tick erneut versucht.
        }
      }

      if (field.domeFinishesAt && field.domeFinishesAt <= now) {
        field.hasDome = true;
        field.domeFinishesAt = null;
        await this.fieldRepo.save(field);
        events.push({
          type: 'DOME_FINISHED',
          fieldIndex: field.fieldIndex,
        });
      }

      if (
        field.isBuilding &&
        field.buildFinishesAt &&
        field.buildFinishesAt <= now
      ) {
        const definition = this.gameData.getBuilding(field.buildingId!);
        if (!definition) continue;
        const completion =
          await this.buildingLifecycleService.finishBuildingWithReactivation(
            colony,
            field,
            definition,
            field.activateAfterBuild,
          );
        events.push({
          type: 'BUILDING_FINISHED',
          fieldIndex: field.fieldIndex,
          buildingId: field.buildingId,
          buildingName: definition.name,
          activated: field.isActive,
          reason: completion.activationReason,
          ...(completion.reactivatedCount > 0
            ? { reactivatedCount: completion.reactivatedCount }
            : {}),
        });
      }
    }
  }

  private normalizeTerraformingTarget(toFieldType: string): string {
    return /^\d+$/.test(toFieldType)
      ? String(this.normalizeFieldType(Number(toFieldType)))
      : toFieldType;
  }

  private normalizeFieldType(fieldType: number): number {
    return fieldType >= 10000 ? Math.floor(fieldType / 100) : fieldType;
  }

  async balanceAndProduce(
    colony: Colony,
    events: ColonyTickEvent[] = [],
  ): Promise<void> {
    const deactivatedFieldIds = new Set<number>();

    while (true) {
      let deactivated = false;
      let currentSummary = this.colonyStatsService.calculateSummary(
        colony,
        deactivatedFieldIds,
      );
      const commodityIds = [
        ...new Set([
          ...currentSummary.productionDelta.keys(),
          ...currentSummary.depositConsumption.keys(),
        ]),
      ].sort((a, b) => a - b);

      // STU checks every commodity before housing and energy, removing at most
      // one consumer per commodity in each round. Recalculate after each removal
      // because a building can consume or produce several different commodities.
      for (const commodityId of commodityIds) {
        const current = currentSummary;
        const commodity = this.gameData.getCommodity(commodityId);
        const depositDelta = current.depositDelta.get(commodityId) ?? 0;
        let shortage = false;
        if (current.depositConsumption.has(commodityId) && depositDelta < 0) {
          const mining = await this.ensureDepositMining(colony, commodityId);
          shortage = !mining || mining.amountLeft < Math.abs(depositDelta);
        }
        const amount = current.productionDelta.get(commodityId) ?? 0;
        if (amount < 0 && !(commodity?.isTradeOnly && !commodity.isEffect)) {
          const storage = await this.storageRepo.findOne({
            where: { colonyId: colony.id, commodityId },
          });
          shortage ||= (storage?.amount ?? 0) + amount < 0;
        }
        if (!shortage) continue;
        const changed = await this.deactivateFirstMatchingField(
          colony,
          current.activeFields,
          deactivatedFieldIds,
          events,
          `kein ${commodity?.name ?? 'Rohstoff'}`,
          (definition) =>
            definition.production.some(
              (entry) => entry.commodityId === commodityId && entry.amount < 0,
            ),
          { commodityId },
        );
        if (changed) {
          deactivated = true;
          currentSummary = this.colonyStatsService.calculateSummary(
            colony,
            deactivatedFieldIds,
          );
        }
      }

      const housingSummary = currentSummary;
      // The changeable capacity is maintained by building activation/deactivation.
      // summary.maxHousing also includes current population and masks lost housing.
      if (housingSummary.workersUsed > getColonyChangeable(colony).maxPopulation) {
        const changed = await this.deactivateFirstMatchingField(
          colony,
          housingSummary.activeFields,
          deactivatedFieldIds,
          events,
          'Wohnraum',
          (definition) => (definition.bevUse || 0) > 0,
        );
        if (changed) {
          deactivated = true;
          currentSummary = this.colonyStatsService.calculateSummary(
            colony,
            deactivatedFieldIds,
          );
        }
      }

      const energySummary = currentSummary;
      if (
        energySummary.energyDelta < 0 &&
        getColonyChangeable(colony).energy + energySummary.energyDelta < 0
      ) {
        const changed = await this.deactivateFirstMatchingField(
          colony,
          energySummary.activeFields,
          deactivatedFieldIds,
          events,
          'Energie',
          (definition) => (definition.epsProc || 0) < 0,
        );
        deactivated ||= changed;
      }
      // Each successful pass removes an active building, so this terminates
      // without leaving an unresolved shortage after an arbitrary round limit.
      if (!deactivated) break;
    }

    const summary = this.colonyStatsService.calculateSummary(
      colony,
      deactivatedFieldIds,
    );
    const finalProduction = summary.productionDelta;
    await this.applyDepositConsumption(
      colony,
      summary.depositConsumption,
      summary.depositDelta,
    );

    if (summary.energyDelta !== 0) {
      const changeable = getColonyChangeable(colony);
      setColonyEnergy(
        colony,
        Math.max(
          0,
          Math.min(
            changeable.energy + summary.energyDelta,
            summary.effectiveState.energy.max,
          ),
        ),
      );
    }

    if (finalProduction.size > 0) {
      let currentStored = await this.colonyStorageService.getStorageUsed(
        colony.id,
      );

      for (const [commodityId, amount] of finalProduction) {
        if (amount >= 0) continue;
        const commodity = this.gameData.getCommodity(commodityId);
        if (!commodity?.isSaveable) continue;
        try {
          await this.colonyStorageService.lowerStorage(
            colony,
            commodityId,
            Math.abs(amount),
          );
          currentStored += amount;
        } catch {
          continue;
        }
      }

      // STU `ProceedStorage`: book in commodity sort order; the first commodity
      // that no longer fits is filled up to the limit, later ones are lost.
      const bookingOrder = [...finalProduction].sort(
        ([a], [b]) =>
          (this.gameData.getCommodity(a)?.sort ?? Number.MAX_SAFE_INTEGER) -
            (this.gameData.getCommodity(b)?.sort ?? Number.MAX_SAFE_INTEGER) || a - b,
      );
      for (const [commodityId, amount] of bookingOrder) {
        if (amount <= 0) continue;
        const commodity = this.gameData.getCommodity(commodityId);
        if (!commodity?.isSaveable) continue;
        const freeStorage = summary.effectiveStorageMax - currentStored;
        if (freeStorage <= 0) {
          events.push({ type: 'STORAGE_FULL', commodityId });
          break;
        }
        const storedAmount = this.colonyStorageService.capToMax(
          amount,
          freeStorage,
        );
        if (storedAmount < amount) {
          events.push({ type: 'STORAGE_FULL', commodityId });
        }
        const actualStored = await this.colonyStorageService.upperStorage(
          colony,
          commodityId,
          storedAmount,
          summary.effectiveStorageMax,
        );
        currentStored += actualStored;
        if (storedAmount < amount) break;
      }

      colony.storageUsed = currentStored;
    }

    if (
      summary.energyDelta !== 0 ||
      finalProduction.size > 0 ||
      deactivatedFieldIds.size > 0
    ) {
      await this.colonyRepo.save(colony);
    }
  }

  private async deactivateFirstMatchingField(
    colony: Colony,
    activeFields: ColonyField[],
    deactivatedFieldIds: Set<number>,
    events: ColonyTickEvent[],
    reason: string,
    matches: (definition: BuildingDef) => boolean,
    eventExtra: Partial<ColonyTickEvent> = {},
  ): Promise<boolean> {
    // STU's selection query has no ordering; field index keeps SWU deterministic.
    for (const field of [...activeFields].sort(
      (a, b) => a.fieldIndex - b.fieldIndex || a.id - b.id,
    )) {
      if (
        !field.isActive || field.isBuilding || deactivatedFieldIds.has(field.id)
      ) continue;
      const definition = this.gameData.getBuilding(field.buildingId!);
      if (!definition || !matches(definition)) continue;

      await this.buildingLifecycleService.deactivateBuilding(
        colony,
        field,
        definition,
      );
      deactivatedFieldIds.add(field.id);
      events.push({
        type: 'BUILDING_DEACTIVATED',
        fieldIndex: field.fieldIndex,
        buildingId: field.buildingId,
        buildingName: definition.name,
        reason,
        ...eventExtra,
      });
      return true;
    }
    return false;
  }

  private async ensureDepositMining(
    colony: Colony,
    commodityId: number,
  ): Promise<ColonyDepositMining | AsteroidResourceDeposit | null> {
    assertOwnedColony(colony);
    if (colony.celestialObject?.objectType === 3) {
      const asteroidDepositRepo = this.depositMiningRepo.manager.getRepository(
        AsteroidResourceDeposit,
      );
      const existing = await asteroidDepositRepo.findOne({
        where: {
          userId: colony.userId,
          celestialObjectId: colony.celestialObject.id,
          commodityId,
        },
      });
      if (existing) return existing;
      return null;
    }
    const existing = await this.depositMiningRepo.findOne({
      where: { colonyId: colony.id, userId: colony.userId, commodityId },
    });
    if (existing) return existing;
    const def = this.gameData
      .getColonyClassDeposits(colony.colonyClassId)
      .find((deposit) => deposit.commodityId === commodityId);
    if (!def) return null;
    const mining = this.depositMiningRepo.create({
      userId: colony.userId,
      colonyId: colony.id,
      commodityId,
      amountLeft: def.maxAmount,
    });
    await this.depositMiningRepo.save(mining);
    return mining;
  }

  private async applyDepositConsumption(
    colony: Colony,
    depositConsumption: Map<number, number>,
    depositDelta: Map<number, number>,
  ): Promise<void> {
    for (const commodityId of depositConsumption.keys()) {
      const netDelta = depositDelta.get(commodityId) ?? 0;
      if (netDelta >= 0) continue;
      const mining = await this.ensureDepositMining(colony, commodityId);
      if (!mining) continue;
      mining.amountLeft = Math.max(0, mining.amountLeft + netDelta);
      if ('celestialObjectId' in mining) {
        await this.depositMiningRepo.manager
          .getRepository(AsteroidResourceDeposit)
          .save(mining);
      } else {
        await this.depositMiningRepo.save(mining);
      }
    }
  }


  async growPopulation(colony: Colony): Promise<void> {
    const summary = this.colonyStatsService.calculateSummary(colony);
    const changeable = getColonyChangeable(colony);
    const currentPopulation = getEffectiveCurrentPopulation(colony);

    // STU `ProceedMigration`: compare with real housing; summary.maxHousing masks overcrowding.
    if (currentPopulation > (changeable.maxPopulation ?? 0)) {
      if (changeable.workless > 0) {
        const amount = this.randomInt(1, changeable.workless);
        adjustColonyPopulationParts(colony, 0, -amount);
        await this.createEmigrationEvent(
          colony,
          amount,
          'HOUSING',
          `${amount} Einwohner sind ausgewandert`,
        );
        await this.colonyRepo.save(colony);
      } else if (colony.population !== currentPopulation) {
        syncLegacyColonySnapshot(colony);
        await this.colonyRepo.save(colony);
      }
      return;
    }

    const populationLimit = changeable.populationLimit ?? 0;
    if (
      populationLimit > 0 &&
      currentPopulation > populationLimit &&
      changeable.workless > 0
    ) {
      const nextWorkless = Math.max(0, populationLimit - changeable.workers);
      const amount = changeable.workless - nextWorkless;
      adjustColonyPopulationParts(colony, 0, -amount);
      await this.createEmigrationEvent(
        colony,
        amount,
        'POPULATION_LIMIT',
        nextWorkless > 0
          ? `Es sind ${amount} Arbeitslose ausgewandert`
          : 'Es sind alle Arbeitslosen ausgewandert',
      );
    }

    const populationAfterMigration = getEffectiveCurrentPopulation(colony);
    const growth = this.calculatePopulationGrowth(colony, summary);
    if (growth <= 0) {
      if (colony.population !== populationAfterMigration) {
        syncLegacyColonySnapshot(colony);
      }
      if (populationAfterMigration !== currentPopulation) {
        await this.colonyRepo.save(colony);
      }
      return;
    }

    const nextPopulation = Math.min(
      populationAfterMigration + growth,
      summary.effectivePopulationMax,
    );
    const actualGrowth = nextPopulation - populationAfterMigration;

    if (actualGrowth > 0) {
      adjustColonyPopulationParts(colony, 0, actualGrowth);
    } else {
      syncLegacyColonySnapshot(colony);
    }
    await this.colonyRepo.save(colony);
  }

  private async createEmigrationEvent(
    colony: Colony,
    amount: number,
    reason: 'HOUSING' | 'POPULATION_LIMIT',
    message: string,
  ): Promise<void> {
    if (colony.userId == null) return;
    await this.colonyEventService.createActionEvent({
      colonyId: colony.id,
      userId: colony.userId,
      type: ColonyEventType.EMIGRATION,
      severity: ColonyEventSeverity.INFO,
      title: 'Auswanderung',
      message,
      payload: { amount, reason },
    });
  }
}
