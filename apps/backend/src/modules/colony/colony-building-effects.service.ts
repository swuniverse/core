import { Injectable } from '@nestjs/common';
import { BuildingDef, GameDataService } from '../game-data/game-data.service';
import { Colony } from './entities/colony.entity';
import { ColonyField } from './entities/colony-field.entity';
import { ColonyFunctionManagerService } from './colony-function-manager.service';
import { ColonyStatsService, getColonyChangeable } from './colony-stats.service';
import { COLONY_FUNCTION_GROUPS } from './colony.constants';

export interface FieldContribution {
  epsProc: number;
  bevUse: number;
  bevPro: number;
  storage: number;
  production: Array<{ commodityId: number; amount: number }>;
}

@Injectable()
export class ColonyBuildingEffectsService {
  private readonly orbitalMaintenanceCommodityId = 1801;
  private readonly undergroundLogisticsFunctionIds: number[] = [
    ...COLONY_FUNCTION_GROUPS.UNDERGROUND_LOGISTICS,
  ];

  constructor(
    private readonly gameData: GameDataService,
    private readonly functionManager: ColonyFunctionManagerService,
    private readonly statsService: ColonyStatsService,
  ) {}

  calculateFieldStateContribution(field: ColonyField): FieldContribution {
    const building = field.buildingId
      ? this.gameData.getBuilding(field.buildingId)
      : undefined;
    if (!building || field.isBuilding || !field.isActive) {
      return { epsProc: 0, bevUse: 0, bevPro: 0, storage: 0, production: [] };
    }
    return {
      epsProc: building.epsProc || 0,
      bevUse: building.bevUse || 0,
      bevPro: building.bevPro || 0,
      storage: building.lager || building.bonuses.storage || 0,
      production: building.production ?? [],
    };
  }

  getUndergroundLogisticsState(colony: Colony): {
    present: boolean;
    active: boolean;
    capacity: number;
  } {
    const present = this.hasPresentFunction(
      colony,
      this.undergroundLogisticsFunctionIds,
    );
    const active = this.functionManager.countActiveFunctions(
      colony,
      this.undergroundLogisticsFunctionIds,
    );
    return { present, active: active > 0, capacity: active };
  }

  getOrbitalMaintenanceState(colony: Colony): {
    present: boolean;
    active: boolean;
    capacity: number;
  } {
    const summary = this.statsService.calculateSummary(colony);
    const capacity = summary.productionDelta.get(this.orbitalMaintenanceCommodityId) ?? 0;
    return {
      present: (colony.fields ?? []).some((field) =>
        this.fieldTouchesCommodity(field, this.orbitalMaintenanceCommodityId),
      ),
      active: capacity > 0,
      capacity,
    };
  }

  canActivateField(
    colony: Colony,
    field: ColonyField,
    ignoredFieldIds: Set<number> = new Set(),
  ): { ok: boolean; reason?: string } {
    const building = field.buildingId
      ? this.gameData.getBuilding(field.buildingId)
      : undefined;
    if (!building) return { ok: false, reason: 'Unknown building' };
    if (field.maxIntegrity > 0 && field.integrity < field.maxIntegrity * 0.5) {
      return { ok: false, reason: 'Gebäude zu beschädigt' };
    }

    const summaryWithoutField = this.statsService.calculateSummary(
      colony,
      new Set([field.id, ...ignoredFieldIds]),
    );
    if ((building.bevUse || 0) > summaryWithoutField.effectiveState.population.available) {
      return { ok: false, reason: 'Nicht genug freie Arbeiter' };
    }
    const energyAfter = summaryWithoutField.energyDelta + (building.epsProc || 0);
    if (energyAfter < 0 && getColonyChangeable(colony).energy + energyAfter < 0) {
      return { ok: false, reason: 'Nicht genug Energie' };
    }
    const missing = this.getUnavailableEffectCommodity(summaryWithoutField, building);
    if (missing) {
      const commodity = this.gameData.getCommodity(missing.commodityId);
      return {
        ok: false,
        reason: `Nicht genug ${commodity?.name ?? 'Effekt-Ressource'} verfügbar (${missing.available} vorhanden)`,
      };
    }

    if (field.layer === 'UNDERGROUND') {
      const logistics = this.getUndergroundLogisticsState(colony);
      if (logistics.present && !logistics.active) {
        return { ok: false, reason: 'Aktive Untergrund-Logistik erforderlich' };
      }
    }
    if (field.layer === 'ORBIT') {
      const maintenance = this.getOrbitalMaintenanceState(colony);
      if (maintenance.present && !maintenance.active) {
        return { ok: false, reason: 'Aktive orbitale Wartung erforderlich' };
      }
    }

    return { ok: true };
  }

  private hasPresentFunction(colony: Colony, functionIds: number[]): boolean {
    const targets = new Set(functionIds);
    for (const field of colony.fields ?? []) {
      if (!field.buildingId || field.isBuilding) continue;
      for (const functionId of this.gameData.getBuildingFunctions(
        field.buildingId,
      )) {
        if (targets.has(functionId)) return true;
      }
    }
    return false;
  }

  private fieldTouchesCommodity(field: ColonyField, commodityId: number): boolean {
    const building = field.buildingId
      ? this.gameData.getBuilding(field.buildingId)
      : undefined;
    return Boolean(
      building?.production?.some((entry) => entry.commodityId === commodityId),
    );
  }

  private getUnavailableEffectCommodity(
    summary: ReturnType<ColonyStatsService['calculateSummary']>,
    definition: BuildingDef,
  ): { commodityId: number; available: number } | null {
    for (const production of definition.production ?? []) {
      if (production.amount >= 0) continue;
      const commodity = this.gameData.getCommodity(production.commodityId);
      if (!commodity || commodity.isSaveable || commodity.isDeposit) continue;
      const available = summary.productionDelta.get(production.commodityId) ?? 0;
      if (available + production.amount < 0) {
        return { commodityId: production.commodityId, available };
      }
    }
    return null;
  }
}
