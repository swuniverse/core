import { Injectable } from '@nestjs/common';
import {
  BuildingFunctionDef,
  GameDataService,
} from '../game-data/game-data.service';
import { Colony } from './entities/colony.entity';
import { ColonyField } from './entities/colony-field.entity';

export function getEffectiveCurrentPopulation(colony: Colony): number {
  if (colony.stats) {
    return (colony.stats.workers ?? 0) + (colony.stats.workless ?? 0);
  }
  return colony.population ?? 0;
}

export interface ColonyEffectiveFunction extends BuildingFunctionDef {
  buildingIds: number[];
}

export interface ColonyEffectiveState {
  orbitalMaintenance: {
    production: number;
    consumption: number;
    balance: number;
  };
  population: {
    current: number;
    workers: number;
    available: number;
    maxHousing: number;
    freeHousing: number;
    housingBonus: number;
  };
  energy: {
    current: number;
    max: number;
    delta: number;
    production: number;
    consumption: number;
  };
  storage: {
    current: number;
    max: number;
    free: number;
    delta: number;
    bonus: number;
  };
  functions: {
    active: ColonyEffectiveFunction[];
    activeIds: number[];
  };
  production: {
    storage: Array<{ commodityId: number; amount: number }>;
    effects: Array<{ commodityId: number; amount: number }>;
    deposits: Array<{ commodityId: number; amount: number }>;
  };
  shortages: Array<{
    code: string;
    label: string;
    commodityId?: number;
    amount?: number;
  }>;
}

export interface ColonyInternalSummary {
  activeFields: ColonyField[];
  energyDelta: number;
  productionDelta: Map<number, number>;
  depositDelta: Map<number, number>;
  depositConsumption: Map<number, number>;
  researchPoints: number;
  workersUsed: number;
  housingBonus: number;
  /** @deprecated use housingBonus for raw active-building housing contribution. */
  housing: number;
  maxHousing: number;
  freeHousing: number;
  storageBonus: number;
  effectivePopulationMax: number;
  effectiveStorageMax: number;
  effectiveState: ColonyEffectiveState;
}

@Injectable()
export class ColonyStatsService {
  constructor(private readonly gameData: GameDataService) {}

  calculateSummary(
    colony: Colony,
    excludedFieldIds: Set<number> = new Set(),
  ): ColonyInternalSummary {
    const activeFields = (colony.fields ?? []).filter(
      (field) =>
        field.buildingId &&
        !field.isBuilding &&
        field.isActive &&
        !excludedFieldIds.has(field.id),
    );
    const productionDelta = new Map<number, number>();
    const depositDelta = new Map<number, number>();
    const depositConsumption = new Map<number, number>();
    let energyDelta = 0;
    let energyProduction = 0;
    let energyConsumption = 0;
    let researchPoints = 0;
    let workersUsed = 0;
    let housingBonus = 0;
    let storageBonus = 0;
    const activeFunctionBuildingIds = new Map<number, Set<number>>();

    for (const field of activeFields) {
      const buildingId = field.buildingId!;
      for (const functionId of this.gameData.getBuildingFunctions(buildingId)) {
        const buildingIds =
          activeFunctionBuildingIds.get(functionId) ?? new Set<number>();
        buildingIds.add(buildingId);
        activeFunctionBuildingIds.set(functionId, buildingIds);
      }
      const definition = this.gameData.getBuilding(buildingId);
      if (!definition) continue;
      const epsProc = definition.epsProc || 0;
      energyDelta += epsProc;
      if (epsProc > 0) energyProduction += epsProc;
      if (epsProc < 0) energyConsumption += Math.abs(epsProc);
      researchPoints += definition.researchPoints || 0;
      workersUsed += definition.bevUse || 0;
      housingBonus += definition.bevPro || 0;
      storageBonus += definition.lager || definition.bonuses.storage || 0;
      for (const output of definition.production) {
        const commodity = this.gameData.getCommodity(output.commodityId);
        const targetDelta = commodity?.isDeposit
          ? depositDelta
          : productionDelta;
        targetDelta.set(
          output.commodityId,
          (targetDelta.get(output.commodityId) || 0) + output.amount,
        );
        if (commodity?.isDeposit && output.amount < 0) {
          depositConsumption.set(
            output.commodityId,
            (depositConsumption.get(output.commodityId) || 0) +
              Math.abs(output.amount),
          );
        }
      }
    }

    const colonyClass = this.gameData.getColonyClass(colony.colonyClassId);
    if (colonyClass) {
      for (const baseProduction of colonyClass.baseProduction) {
        depositDelta.set(
          baseProduction.commodityId,
          (depositDelta.get(baseProduction.commodityId) || 0) +
            baseProduction.amount,
        );
      }
    }

    const effectiveCurrentPopulation = getEffectiveCurrentPopulation(colony);
    const persistedOrComputedMaxHousing = colony.stats
      ? (colony.stats.maxPopulation ?? 0)
      : (colony.populationMax ?? 0) + housingBonus;
    const maxHousing = Math.max(
      persistedOrComputedMaxHousing,
      effectiveCurrentPopulation,
    );
    const freeHousing = Math.max(0, maxHousing - effectiveCurrentPopulation);

    const effectiveStorageMax =
      (colony.stats?.maxStorage ?? colony.storageMax) + storageBonus;
    const storageCurrent = colony.storageUsed ?? 0;
    const storageProduction: Array<{ commodityId: number; amount: number }> =
      [];
    const effectProduction: Array<{ commodityId: number; amount: number }> = [];
    for (const [commodityId, amount] of productionDelta) {
      const commodity = this.gameData.getCommodity(commodityId);
      if (commodity?.isSaveable) {
        storageProduction.push({ commodityId, amount });
      } else {
        effectProduction.push({ commodityId, amount });
      }
    }
    const depositProduction = Array.from(depositDelta.entries()).map(
      ([commodityId, amount]) => ({ commodityId, amount }),
    );
    const orbitalMaintenanceAmount = productionDelta.get(1801) ?? 0;
    const orbitalMaintenance = {
      production: Math.max(0, orbitalMaintenanceAmount),
      consumption: Math.abs(Math.min(0, orbitalMaintenanceAmount)),
      balance: orbitalMaintenanceAmount,
    };
    const activeFunctions = Array.from(activeFunctionBuildingIds.entries())
      .map(([functionId, buildingIds]) => {
        const definition = this.gameData.getBuildingFunction(functionId);
        return {
          id: functionId,
          key: definition?.key ?? String(functionId),
          name: definition?.name ?? `Function ${functionId}`,
          buildingIds: Array.from(buildingIds).sort((a, b) => a - b),
        };
      })
      .sort((a, b) => a.id - b.id);

    const effectiveState: ColonyEffectiveState = {
      orbitalMaintenance,
      population: {
        current: effectiveCurrentPopulation,
        workers: colony.stats?.workers ?? workersUsed,
        available:
          colony.stats?.workless ??
          Math.max(0, effectiveCurrentPopulation - workersUsed),
        maxHousing,
        freeHousing,
        housingBonus,
      },
      energy: {
        current: colony.energy ?? 0,
        max: colony.stats?.maxEnergy ?? colony.energyMax,
        delta: energyDelta,
        production: energyProduction,
        consumption: energyConsumption,
      },
      storage: {
        current: storageCurrent,
        max: effectiveStorageMax,
        free: Math.max(0, effectiveStorageMax - storageCurrent),
        delta: Array.from(productionDelta.values()).reduce(
          (sum, value) => sum + value,
          0,
        ),
        bonus: storageBonus,
      },
      functions: {
        active: activeFunctions,
        activeIds: activeFunctions.map((fn) => fn.id),
      },
      production: {
        storage: storageProduction,
        effects: effectProduction,
        deposits: depositProduction,
      },
      shortages: [],
    };

    return {
      activeFields,
      energyDelta,
      productionDelta,
      depositDelta,
      depositConsumption,
      researchPoints,
      workersUsed,
      housingBonus,
      housing: housingBonus,
      maxHousing,
      freeHousing,
      storageBonus,
      effectivePopulationMax: maxHousing,
      effectiveStorageMax,
      effectiveState,
    };
  }
}
