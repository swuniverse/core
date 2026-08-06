import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameDataService } from '../game-data/game-data.service';
import { BuildingLifecycleService } from './building-lifecycle.service';
import { ColonyCrewService } from './colony-crew.service';
import { ColonyDefenseService } from './colony-defense.service';
import { ColonyFabricationService } from './colony-fabrication.service';
import { ColonyShipyardService } from './colony-shipyard.service';
import {
  ColonyStatsService,
  ColonyInternalSummary,
  getColonyChangeable,
  getEffectiveCurrentPopulation,
  syncLegacyColonySnapshot,
} from './colony-stats.service';
import { ColonyStorageService } from './colony-storage.service';
import {
  ColonyCrewTrainingQueue,
  ColonyCrewTrainingQueueStatus,
} from './entities/colony-crew-training-queue.entity';
import { ColonyDepositMining } from './entities/colony-deposit-mining.entity';
import { ColonyField } from './entities/colony-field.entity';
import { ColonyStats } from './entities/colony-stats.entity';
import { ColonyStorage } from './entities/colony-storage.entity';
import { Colony } from './entities/colony.entity';
import { assertOwnedColony } from './colony-owner.util';
import type { ColonyTickEvent, ColonyTickResult } from './colony.service';

@Injectable()
export class ColonyTickProcessorService {
  private readonly headquartersBuildingIds = new Set([1, 82010100, 82010300]);

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
    private readonly gameData: GameDataService,
    private readonly colonyStatsService: ColonyStatsService,
    private readonly colonyStorageService: ColonyStorageService,
    private readonly buildingLifecycleService: BuildingLifecycleService,
    private readonly colonyCrewService: ColonyCrewService,
    private readonly colonyDefenseService: ColonyDefenseService,
    private readonly colonyFabricationService: ColonyFabricationService,
    private readonly colonyShipyardService: ColonyShipyardService,
  ) {}

  private async processCrewTrainingQueue(colony: Colony): Promise<void> {
    const jobs = await this.crewTrainingQueueRepo.find({
      where: {
        colonyId: colony.id,
        status: ColonyCrewTrainingQueueStatus.QUEUED,
      },
    });
    for (const job of jobs) {
      await this.colonyCrewService.createCrewOnColony(colony, job.amount);
      job.status = ColonyCrewTrainingQueueStatus.COMPLETED;
      await this.crewTrainingQueueRepo.save(job);
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

  private async processShipBuildQueue(colony: Colony): Promise<void> {
    return this.colonyShipyardService.processShipBuildQueue(colony);
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

  private calculatePopulationGrowth(
    colony: Colony,
    summary: ColonyInternalSummary,
  ): number {
    const changeable = getColonyChangeable(colony);
    if (changeable.immigrationEnabled === false) {
      return 0;
    }

    const currentPopulation =
      (changeable.workers ?? 0) + (changeable.workless ?? 0);
    const freeHousing = summary.maxHousing - currentPopulation;
    if (freeHousing <= 0) {
      return 0;
    }

    const lifeStandardProduction = summary.productionDelta.get(1300) ?? 0;
    if (lifeStandardProduction === 0) {
      return 0;
    }

    const lifeStandardPercentage =
      lifeStandardProduction > currentPopulation || currentPopulation <= 0
        ? 100
        : Math.floor((lifeStandardProduction * 100) / currentPopulation);
    const bevGrowthRate =
      this.gameData.getColonyClass(colony.colonyClassId)?.bevGrowthRate ?? 100;

    let immigration = Math.ceil(
      (freeHousing / 3 / 100) * bevGrowthRate * (lifeStandardPercentage / 50),
    );

    if (currentPopulation + immigration > summary.maxHousing) {
      immigration = summary.maxHousing - currentPopulation;
    }

    const populationLimit = changeable.populationLimit ?? 0;
    if (
      populationLimit > 0 &&
      currentPopulation + immigration > populationLimit
    ) {
      immigration = populationLimit - currentPopulation;
    }

    return Math.max(0, immigration);
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
    await this.processShipBuildQueue(colony);
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
        const terraforming = this.gameData.getTerraforming(
          field.terraformingId,
        );
        if (terraforming) {
          field.fieldType = terraforming.toFieldType;
          field.terrainTileId = terraforming.toFieldType;
        }
        field.terraformingId = null;
        field.terraformingFinishesAt = null;
        await this.fieldRepo.save(field);
        events.push({
          type: 'TERRAFORMING_FINISHED',
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
        await this.buildingLifecycleService.finishBuilding(
          colony,
          field,
          definition,
          field.activateAfterBuild,
        );
        const activationReason = field.isActive
          ? undefined
          : !field.activateAfterBuild
            ? 'Automatische Aktivierung deaktiviert'
            : 'Nicht genug freie Arbeiter';
        events.push({
          type: 'BUILDING_FINISHED',
          fieldIndex: field.fieldIndex,
          buildingId: field.buildingId,
          buildingName: definition.name,
          activated: field.isActive,
          reason: activationReason,
        });
      }
    }
  }

  private async balanceAndProduce(
    colony: Colony,
    events: ColonyTickEvent[] = [],
  ): Promise<void> {
    const deactivatedFieldIds = new Set<number>();

    balancing: for (let round = 0; round < 100; round++) {
      const summary = this.colonyStatsService.calculateSummary(
        colony,
        deactivatedFieldIds,
      );
      const activeFields = summary.activeFields;

      if (
        summary.energyDelta < 0 &&
        getColonyChangeable(colony).energy + summary.energyDelta < 0
      ) {
        const victim = activeFields.find((field) => {
          if (this.isHeadquartersField(field)) return false;
          const definition = this.gameData.getBuilding(field.buildingId!);
          return definition && (definition.epsProc || 0) < 0;
        });
        if (victim) {
          const definition = this.gameData.getBuilding(victim.buildingId!)!;
          await this.buildingLifecycleService.deactivateBuilding(
            colony,
            victim,
            definition,
          );
          deactivatedFieldIds.add(victim.id);
          events.push({
            type: 'BUILDING_DEACTIVATED',
            fieldIndex: victim.fieldIndex,
            buildingId: victim.buildingId,
            buildingName: definition.name,
            reason: 'Energie',
          });
          continue balancing;
        }
      }

      if (summary.workersUsed > getEffectiveCurrentPopulation(colony)) {
        const victim = activeFields.find((field) => {
          if (this.isHeadquartersField(field)) return false;
          const definition = this.gameData.getBuilding(field.buildingId!);
          return definition && (definition.bevUse || 0) > 0;
        });
        if (victim) {
          const definition = this.gameData.getBuilding(victim.buildingId!)!;
          await this.buildingLifecycleService.deactivateBuilding(
            colony,
            victim,
            definition,
          );
          deactivatedFieldIds.add(victim.id);
          events.push({
            type: 'BUILDING_DEACTIVATED',
            fieldIndex: victim.fieldIndex,
            buildingId: victim.buildingId,
            buildingName: definition.name,
            reason: 'Arbeiter',
          });
          continue balancing;
        }
      }

      for (const [commodityId] of summary.depositConsumption) {
        const netDelta = summary.depositDelta.get(commodityId) ?? 0;
        if (netDelta >= 0) continue;
        const shortfall = Math.abs(netDelta);
        const mining = await this.ensureDepositMining(colony, commodityId);
        if (!mining || mining.amountLeft < shortfall) {
          const victim = activeFields.find((field) => {
            if (this.isHeadquartersField(field)) return false;
            const definition = this.gameData.getBuilding(field.buildingId!);
            if (!definition) return false;
            return definition.production.some(
              (p) => p.commodityId === commodityId && p.amount < 0,
            );
          });
          if (victim) {
            const definition = this.gameData.getBuilding(victim.buildingId!)!;
            await this.buildingLifecycleService.deactivateBuilding(
              colony,
              victim,
              definition,
            );
            deactivatedFieldIds.add(victim.id);
            events.push({
              type: 'BUILDING_DEACTIVATED',
              fieldIndex: victim.fieldIndex,
              buildingId: victim.buildingId,
              buildingName: definition.name,
              commodityId,
              reason: `kein ${this.gameData.getCommodity(commodityId)?.name ?? 'Rohstoff'}`,
            });
            continue balancing;
          }
        }
      }

      for (const [commodityId, amount] of summary.productionDelta) {
        if (amount >= 0) continue;
        const commodity = this.gameData.getCommodity(commodityId);
        if (commodity?.isTradeOnly && !commodity.isEffect) continue;
        const storage = await this.storageRepo.findOne({
          where: { colonyId: colony.id, commodityId },
        });
        const available = storage?.amount || 0;
        if (available + amount < 0) {
          const victim = activeFields.find((field) => {
            if (this.isHeadquartersField(field)) return false;
            const definition = this.gameData.getBuilding(field.buildingId!);
            if (!definition) return false;
            return definition.production.some(
              (p) => p.commodityId === commodityId && p.amount < 0,
            );
          });
          if (victim) {
            const definition = this.gameData.getBuilding(victim.buildingId!)!;
            await this.buildingLifecycleService.deactivateBuilding(
              colony,
              victim,
              definition,
            );
            deactivatedFieldIds.add(victim.id);
            events.push({
              type: 'BUILDING_DEACTIVATED',
              fieldIndex: victim.fieldIndex,
              buildingId: victim.buildingId,
              buildingName: definition.name,
              commodityId,
              reason: `kein ${this.gameData.getCommodity(commodityId)?.name ?? 'Rohstoff'}`,
            });
            continue balancing;
          }
        }
      }

      break;
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
      changeable.energy = Math.max(
        0,
        Math.min(
          changeable.energy + summary.energyDelta,
          summary.effectiveState.energy.max,
        ),
      );
      syncLegacyColonySnapshot(colony);
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

      for (const [commodityId, amount] of finalProduction) {
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

  private async ensureDepositMining(
    colony: Colony,
    commodityId: number,
  ): Promise<ColonyDepositMining | null> {
    assertOwnedColony(colony);
    const existing = await this.depositMiningRepo.findOne({
      where: { colonyId: colony.id, userId: colony.userId, commodityId },
    });
    if (existing) return existing;
    const deposits = this.gameData.getColonyClassDeposits(colony.colonyClassId);
    const def = deposits.find((d) => d.commodityId === commodityId);
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
      await this.depositMiningRepo.save(mining);
    }
  }

  private isHeadquartersField(field: ColonyField): boolean {
    return (
      !!field.buildingId && this.headquartersBuildingIds.has(field.buildingId)
    );
  }

  private async growPopulation(colony: Colony): Promise<void> {
    const summary = this.colonyStatsService.calculateSummary(colony);
    const currentPopulation = getEffectiveCurrentPopulation(colony);
    const growth = this.calculatePopulationGrowth(colony, summary);
    const changeable = getColonyChangeable(colony);
    if (growth <= 0) {
      if (colony.population !== currentPopulation) {
        syncLegacyColonySnapshot(colony);
        await this.colonyRepo.save(colony);
      }
      return;
    }

    const nextPopulation = Math.min(
      currentPopulation + growth,
      summary.effectivePopulationMax,
    );
    const actualGrowth = nextPopulation - currentPopulation;

    if (actualGrowth > 0) {
      changeable.workless += actualGrowth;
    }
    syncLegacyColonySnapshot(colony);
    await this.colonyRepo.save(colony);
  }
}
