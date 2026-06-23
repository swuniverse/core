import { Injectable } from '@nestjs/common';
import { GameDataService } from '../game-data/game-data.service';
import { Colony } from './entities/colony.entity';
import { ColonyField } from './entities/colony-field.entity';

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
    let researchPoints = 1;
    let workersUsed = 0;
    let housingBonus = 0;
    let storageBonus = 0;

    for (const field of activeFields) {
      const definition = this.gameData.getBuilding(field.buildingId!);
      if (!definition) continue;
      energyDelta += definition.epsProc || 0;
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

    const maxHousing = colony.stats
      ? colony.stats.maxPopulation
      : colony.populationMax + housingBonus;
    const freeHousing = Math.max(0, maxHousing - colony.population);

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
      effectiveStorageMax:
        (colony.stats?.maxStorage ?? colony.storageMax) + storageBonus,
    };
  }
}
