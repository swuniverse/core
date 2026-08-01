import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameDataService } from '../game-data/game-data.service';
import { Colony } from './entities/colony.entity';
import { ColonyField } from './entities/colony-field.entity';
import { BuildingLifecycleService } from './building-lifecycle.service';
import { ColonyStatsService } from './colony-stats.service';
import { ColonyBuildingEffectsService } from './colony-building-effects.service';
import {
  BuildingMassActionKind,
  BuildingMassActionMode,
  BuildingMassActionResult,
  BuildingRepairPlan,
  BuildingRepairPreview,
  BuildingRepairResult,
  toMassActionSummary,
} from './colony-building-management.types';
import { ColonyStorageService } from './colony-storage.service';

@Injectable()
export class ColonyBuildingManagementService {
  private readonly headquartersBuildingIds = new Set([1, 82010100, 82010300]);

  constructor(
    @InjectRepository(ColonyField)
    private readonly fieldRepo: Repository<ColonyField>,
    private readonly gameData: GameDataService,
    private readonly lifecycleService: BuildingLifecycleService,
    private readonly statsService: ColonyStatsService,
    private readonly storageService: ColonyStorageService,
    private readonly buildingEffectsService?: ColonyBuildingEffectsService,
  ) {}
  async activateBuildings(
    colony: Colony,
    mode: BuildingMassActionMode,
    options: { fieldIndexes?: number[]; commodityId?: number } = {},
  ): Promise<BuildingMassActionResult> {
    const result = this.createResult(
      mode,
      BuildingMassActionKind.ACTIVATE,
      colony,
    );
    for (const field of this.selectFields(colony, mode, options)) {
      const skip = this.getCommonSkipReason(field, false);
      if (skip) {
        result.skipped.push(this.skipped(field, skip));
        continue;
      }
      if (field.isActive) continue;
      try {
        this.validateActivation(colony, field);
        const definition = this.gameData.getBuilding(field.buildingId!);
        if (!definition) throw new BadRequestException('Unknown building');
        await this.lifecycleService.activateBuilding(colony, field, definition);
        await this.fieldRepo.save(field);
        result.changed.push(this.changed(field));
      } catch (error) {
        result.skipped.push(
          this.skipped(
            field,
            error instanceof Error
              ? error.message
              : 'Aktivierung fehlgeschlagen',
            error instanceof BadRequestException
              ? JSON.stringify(error.getResponse())
              : 'ACTIVATION_FAILED',
          ),
        );
      }
    }
    result.summaryAfter = toMassActionSummary(
      this.statsService.calculateSummary(colony),
    );
    return result;
  }

  async deactivateBuildings(
    colony: Colony,
    mode: BuildingMassActionMode,
    options: { fieldIndexes?: number[]; commodityId?: number } = {},
  ): Promise<BuildingMassActionResult> {
    const result = this.createResult(
      mode,
      BuildingMassActionKind.DEACTIVATE,
      colony,
    );
    for (const field of this.selectFields(colony, mode, options)) {
      const skip = this.getCommonSkipReason(field, true);
      if (skip) {
        result.skipped.push(this.skipped(field, skip));
        continue;
      }
      if (!field.isActive) continue;
      const definition = this.gameData.getBuilding(field.buildingId!);
      if (!definition) {
        result.skipped.push(this.skipped(field, 'Unknown building'));
        continue;
      }
      await this.lifecycleService.deactivateBuilding(colony, field, definition);
      await this.fieldRepo.save(field);
      result.changed.push(this.changed(field));
    }
    result.summaryAfter = toMassActionSummary(
      this.statsService.calculateSummary(colony),
    );
    return result;
  }

  calculateRepairPlan(
    colony: Colony,
    field: ColonyField,
    options: { checkStorageAvailability?: boolean } = {},
  ): BuildingRepairPlan {
    const base = {
      fieldIndex: field.fieldIndex,
      buildingId: field.buildingId,
      buildingName: 'Unbekannt',
      integrity: field.integrity ?? 0,
      maxIntegrity: field.maxIntegrity ?? 0,
      damageRatio: 0,
      energyCost: 0,
      costs: [],
      repairable: false,
    } satisfies BuildingRepairPlan;

    if (!field.buildingId) return { ...base, reason: 'Kein Gebäude' };
    const definition = this.gameData.getBuilding(field.buildingId);
    const buildingName = definition?.name ?? `Gebäude #${field.buildingId}`;
    if (!definition)
      return { ...base, buildingName, reason: 'Unbekanntes Gebäude' };
    if (field.isBuilding)
      return { ...base, buildingName, reason: 'Gebäude im Bau' };
    if (field.maxIntegrity <= 0 || field.integrity >= field.maxIntegrity) {
      return { ...base, buildingName, reason: 'Nicht beschädigt' };
    }

    const damageRatio =
      (field.maxIntegrity - field.integrity) / field.maxIntegrity;
    const energyCost = Math.ceil((definition.epsCost || 0) * damageRatio);
    const costs = (definition.resourceCosts ?? [])
      .map((cost) => ({
        commodityId: cost.commodityId,
        amount: Math.ceil(cost.amount * damageRatio),
      }))
      .filter((cost) => cost.amount > 0);

    if (energyCost > colony.energy) {
      return {
        ...base,
        buildingName,
        damageRatio,
        energyCost,
        costs,
        reason: `Nicht genug Energie: benötigt ${energyCost}, vorhanden ${colony.energy}`,
      };
    }

    if (options.checkStorageAvailability !== false) {
      for (const cost of costs) {
        const available =
          (colony.storage ?? []).find(
            (item) => item.commodityId === cost.commodityId,
          )?.amount ?? 0;
        if (available < cost.amount) {
          const commodity = this.gameData.getCommodity(cost.commodityId);
          return {
            ...base,
            buildingName,
            damageRatio,
            energyCost,
            costs,
            reason: `Nicht genug ${commodity?.name ?? `Ware #${cost.commodityId}`}: benötigt ${cost.amount}, vorhanden ${available}`,
          };
        }
      }
    }

    return {
      fieldIndex: field.fieldIndex,
      buildingId: field.buildingId,
      buildingName,
      integrity: field.integrity,
      maxIntegrity: field.maxIntegrity,
      damageRatio,
      energyCost,
      costs,
      repairable: true,
    };
  }

  getRepairPreview(
    colony: Colony,
    fieldIndexes?: number[],
  ): BuildingRepairPreview {
    const fields = this.getRepairCandidateFields(colony, fieldIndexes);
    const plans = fields.map((field) =>
      this.calculateRepairPlan(colony, field),
    );
    return {
      fields: plans,
      totalEnergyCost: plans
        .filter((plan) => plan.repairable)
        .reduce((sum, plan) => sum + plan.energyCost, 0),
      totalCosts: this.aggregateCosts(
        plans.filter((plan) => plan.repairable).flatMap((plan) => plan.costs),
      ),
    };
  }

  async repairDamagedBuildings(
    colony: Colony,
    fieldIndexes?: number[],
  ): Promise<BuildingRepairResult> {
    const result: BuildingRepairResult = {
      action: BuildingMassActionKind.REPAIR,
      repaired: [],
      skipped: [],
      totalEnergyCost: 0,
      totalCosts: [],
      previewAfter: { fields: [], totalEnergyCost: 0, totalCosts: [] },
    };

    for (const field of this.getRepairCandidateFields(colony, fieldIndexes)) {
      const plan = this.calculateRepairPlan(colony, field);
      if (!plan.repairable) {
        result.skipped.push(
          this.skipped(field, plan.reason ?? 'Nicht reparierbar'),
        );
        continue;
      }
      try {
        for (const cost of plan.costs) {
          await this.storageService.lowerStorage(
            colony,
            cost.commodityId,
            cost.amount,
          );
        }
        colony.energy -= plan.energyCost;
        this.lifecycleService.repairBuilding(field);
        await this.fieldRepo.save(field);
        result.repaired.push(this.changed(field));
        result.totalEnergyCost += plan.energyCost;
        result.totalCosts = this.aggregateCosts([
          ...result.totalCosts,
          ...plan.costs,
        ]);
      } catch (error) {
        result.skipped.push(
          this.skipped(
            field,
            error instanceof Error ? error.message : 'Reparatur fehlgeschlagen',
          ),
        );
      }
    }
    result.previewAfter = this.getRepairPreview(colony, fieldIndexes);
    return result;
  }

  selectFields(
    colony: Colony,
    mode: BuildingMassActionMode,
    options: { fieldIndexes?: number[]; commodityId?: number } = {},
  ): ColonyField[] {
    const fields = (colony.fields ?? [])
      .filter((field) => field.buildingId)
      .sort((a, b) => a.fieldIndex - b.fieldIndex);
    switch (mode) {
      case BuildingMassActionMode.EPS_CONSUMERS:
        return fields.filter(
          (field) => (this.getBuilding(field)?.epsProc ?? 0) < 0,
        );
      case BuildingMassActionMode.SELECTION:
        return fields.filter((field) =>
          options.fieldIndexes?.includes(field.fieldIndex),
        );
      case BuildingMassActionMode.EPS_PRODUCERS:
        return fields.filter(
          (field) => (this.getBuilding(field)?.epsProc ?? 0) > 0,
        );
      case BuildingMassActionMode.INDUSTRY:
        return fields.filter(
          (field) => (this.getBuilding(field)?.bevUse ?? 0) > 0,
        );
      case BuildingMassActionMode.RESIDENTIALS:
        return fields.filter(
          (field) => (this.getBuilding(field)?.bevPro ?? 0) > 0,
        );
      case BuildingMassActionMode.COMMODITY_CONSUMERS:
        return fields.filter((field) =>
          (this.getBuilding(field)?.production ?? []).some(
            (entry) =>
              entry.commodityId === options.commodityId && entry.amount < 0,
          ),
        );
      case BuildingMassActionMode.COMMODITY_PRODUCERS:
        return fields.filter((field) =>
          (this.getBuilding(field)?.production ?? []).some(
            (entry) =>
              entry.commodityId === options.commodityId && entry.amount > 0,
          ),
        );
      default:
        return [];
    }
  }

  private getRepairCandidateFields(
    colony: Colony,
    fieldIndexes?: number[],
  ): ColonyField[] {
    return (colony.fields ?? [])
      .filter((field) =>
        fieldIndexes
          ? fieldIndexes.includes(field.fieldIndex)
          : !!field.buildingId,
      )
      .sort((a, b) => a.fieldIndex - b.fieldIndex);
  }

  private aggregateCosts(
    costs: Array<{ commodityId: number; amount: number }>,
  ) {
    const totals = new Map<number, number>();
    for (const cost of costs) {
      if (cost.amount <= 0) continue;
      totals.set(
        cost.commodityId,
        (totals.get(cost.commodityId) ?? 0) + cost.amount,
      );
    }
    return Array.from(totals.entries()).map(([commodityId, amount]) => ({
      commodityId,
      amount,
    }));
  }

  private validateActivation(colony: Colony, field: ColonyField): void {
    const result = this.buildingEffectsService?.canActivateField(colony, field);
    if (result) {
      if (!result.ok) throw new BadRequestException(result.reason);
      return;
    }

    const definition = this.gameData.getBuilding(field.buildingId!);
    if (!definition) throw new BadRequestException('Unknown building');
    if (field.maxIntegrity > 0 && field.integrity < field.maxIntegrity * 0.5) {
      throw new BadRequestException('Gebäude zu beschädigt');
    }
    const summaryWithoutField = this.statsService.calculateSummary(
      colony,
      new Set([field.id]),
    );
    const availableWorkers =
      summaryWithoutField.effectiveState?.population.available ??
      colony.stats?.workless ??
      Math.max(
        0,
        summaryWithoutField.maxHousing - summaryWithoutField.workersUsed,
      );
    if ((definition.bevUse || 0) > availableWorkers) {
      throw new BadRequestException({
        code: 'NOT_ENOUGH_WORKERS',
        message: 'Nicht genug freie Arbeiter',
      });
    }
    const energyAfter =
      (summaryWithoutField.effectiveState?.energy.delta ??
        summaryWithoutField.energyDelta) + (definition.epsProc || 0);
    if (energyAfter < 0 && colony.energy + energyAfter < 0) {
      throw new BadRequestException({
        code: 'NOT_ENOUGH_ENERGY',
        message: 'Nicht genug Energie',
      });
    }
  }

  private getCommonSkipReason(
    field: ColonyField,
    deactivation: boolean,
  ): string | null {
    if (!field.buildingId) return 'Kein Gebäude';
    if (field.isBuilding) return 'Gebäude im Bau';
    if (this.headquartersBuildingIds.has(field.buildingId))
      return 'Zentralgebäude geschützt';
    if (deactivation && !field.isActive) return 'Bereits deaktiviert';
    if (!deactivation && field.isActive) return 'Bereits aktiv';
    return null;
  }

  private getBuilding(field: ColonyField) {
    return field.buildingId
      ? this.gameData.getBuilding(field.buildingId)
      : undefined;
  }

  private changed(field: ColonyField) {
    const definition = this.getBuilding(field);
    return {
      fieldIndex: field.fieldIndex,
      buildingId: field.buildingId!,
      buildingName: definition?.name ?? `Gebäude #${field.buildingId}`,
    };
  }

  private skipped(field: ColonyField, reason: string, reasonCode?: string) {
    let label = reason;
    let code = reasonCode;
    try {
      const parsed = JSON.parse(reason) as { code?: string; message?: string };
      label = parsed.message ?? reason;
      code = parsed.code ?? reasonCode;
    } catch {
      // plain string reason
    }
    return {
      fieldIndex: field.fieldIndex,
      buildingId: field.buildingId,
      reason: label,
      reasonCode: code,
    };
  }

  private createResult(
    mode: BuildingMassActionMode,
    action: BuildingMassActionKind,
    colony: Colony,
  ): BuildingMassActionResult {
    return {
      mode,
      action,
      changed: [],
      skipped: [],
      summaryAfter: toMassActionSummary(
        this.statsService.calculateSummary(colony),
      ),
    };
  }
}
