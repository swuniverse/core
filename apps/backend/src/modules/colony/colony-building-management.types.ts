import { ColonyInternalSummary } from './colony-stats.service';

export enum BuildingMassActionMode {
  EPS_CONSUMERS = 1,
  SELECTION = 2,
  EPS_PRODUCERS = 3,
  INDUSTRY = 4,
  RESIDENTIALS = 5,
  COMMODITY_CONSUMERS = 6,
  COMMODITY_PRODUCERS = 7,
}

export enum BuildingMassActionKind {
  ACTIVATE = 'ACTIVATE',
  DEACTIVATE = 'DEACTIVATE',
  REPAIR = 'REPAIR',
}

export interface BuildingMassActionChangedEntry {
  fieldIndex: number;
  buildingId: number;
  buildingName: string;
}

export interface BuildingMassActionSkippedEntry {
  fieldIndex: number;
  buildingId: number | null;
  reason: string;
  reasonCode?: string;
}

export interface BuildingMassActionSummaryAfter {
  energyDelta: number;
  workersUsed: number;
  freeWorkers: number;
  maxStorage: number;
  maxHousing: number;
  storageFree?: number;
  energyCurrent?: number;
  energyMax?: number;
  activeFunctionIds?: number[];
}

export interface BuildingMassActionResult {
  mode: BuildingMassActionMode;
  action: BuildingMassActionKind;
  changed: BuildingMassActionChangedEntry[];
  skipped: BuildingMassActionSkippedEntry[];
  summaryAfter: BuildingMassActionSummaryAfter;
}

export interface BuildingRepairPlan {
  fieldIndex: number;
  buildingId: number | null;
  buildingName: string;
  integrity: number;
  maxIntegrity: number;
  damageRatio: number;
  energyCost: number;
  costs: Array<{ commodityId: number; amount: number }>;
  repairable: boolean;
  reason?: string;
}

export interface BuildingRepairPreview {
  fields: BuildingRepairPlan[];
  totalEnergyCost: number;
  totalCosts: Array<{ commodityId: number; amount: number }>;
}

export interface BuildingRepairResult {
  action: BuildingMassActionKind.REPAIR;
  repaired: BuildingMassActionChangedEntry[];
  skipped: BuildingMassActionSkippedEntry[];
  totalEnergyCost: number;
  totalCosts: Array<{ commodityId: number; amount: number }>;
  previewAfter: BuildingRepairPreview;
}

export function toMassActionSummary(
  summary: ColonyInternalSummary,
): BuildingMassActionSummaryAfter {
  return {
    energyDelta: summary.energyDelta,
    workersUsed: summary.workersUsed,
    freeWorkers:
      summary.effectiveState?.population.available ??
      Math.max(0, summary.maxHousing - summary.workersUsed),
    maxStorage: summary.effectiveStorageMax,
    maxHousing: summary.maxHousing,
    storageFree: summary.effectiveState?.storage.free,
    energyCurrent: summary.effectiveState?.energy.current,
    energyMax: summary.effectiveState?.energy.max,
    activeFunctionIds: summary.effectiveState?.functions.activeIds,
  };
}
