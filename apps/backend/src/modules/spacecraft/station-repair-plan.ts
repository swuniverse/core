import type { SpacecraftModule } from './entities/spacecraft-module.entity';
import type { StationRole } from './entities/spacecraft.entity';

export const SPARE_PARTS_ID = 10001;
export const SYSTEM_COMPONENTS_ID = 10002;

/** Hull points restored per repair step (STU `RepairUtil::REPAIR_RATE_PER_TICK`). */
export const HULL_REPAIR_PER_STEP = 100;
/** Damaged systems restored per repair step. */
export const SYSTEMS_REPAIR_PER_STEP = 2;

/** Workbees a station role needs for its construction; a fifth of it keeps the passive self-repair running. */
export const STATION_ROLE_WORKBEES: Record<string, number> = {
  CONSTRUCTION: 5,
  DEPOT_SMALL: 15,
  DEPOT_LARGE: 20,
  SHIPYARD: 10,
  SENSOR: 5,
  OUTPOST: 30,
  BASE: 40,
};

const REPAIRING_ROLES: Array<string | null> = ['SHIPYARD', 'BASE'];

export type RepairCost = { commodityId: number; amount: number };

export interface RepairStep {
  hullRepair: number;
  modules: SpacecraftModule[];
  costs: RepairCost[];
}

export function isModuleDamaged(module: SpacecraftModule): boolean {
  return module.integrity < 100 || !module.isActive || module.cooldown !== 0;
}

export function needsRepair(
  ship: { hull: number; hullMax: number },
  modules: SpacecraftModule[],
): boolean {
  return ship.hull < ship.hullMax || modules.some(isModuleDamaged);
}

/** Only shipyards and bases repair docked ships (STU `StationUtility::canRepairShips`). */
export function mayRepairShips(role: StationRole | null): boolean {
  return REPAIRING_ROLES.includes(role);
}

export function requiredSelfRepairWorkbees(role: StationRole | null): number {
  return Math.ceil((role ? (STATION_ROLE_WORKBEES[role] ?? 0) : 0) / 5);
}

/** What one passive repair step restores and which parts it consumes. */
export function planRepairStep(
  ship: { hull: number; hullMax: number },
  modules: SpacecraftModule[],
): RepairStep {
  const hullRepair = Math.min(HULL_REPAIR_PER_STEP, Math.max(0, ship.hullMax - ship.hull));
  const repaired = modules.filter(isModuleDamaged).slice(0, SYSTEMS_REPAIR_PER_STEP);
  const costs: RepairCost[] = [];
  if (hullRepair > 0 || repaired.length > 0) costs.push({ commodityId: SPARE_PARTS_ID, amount: 1 });
  if (repaired.length > 0) costs.push({ commodityId: SYSTEM_COMPONENTS_ID, amount: 1 });
  return { hullRepair, modules: repaired, costs };
}

export function estimateRepairSteps(
  ship: { hull: number; hullMax: number },
  modules: SpacecraftModule[],
): number {
  const hullSteps = Math.ceil(Math.max(0, ship.hullMax - ship.hull) / HULL_REPAIR_PER_STEP);
  const systemSteps = Math.ceil(modules.filter(isModuleDamaged).length / SYSTEMS_REPAIR_PER_STEP);
  return Math.max(hullSteps, systemSteps);
}

export function applyRepairStep(
  ship: { hull: number; hullMax: number },
  step: RepairStep,
): void {
  ship.hull = Math.min(ship.hullMax, ship.hull + step.hullRepair);
  for (const module of step.modules) {
    module.integrity = 100;
    module.isActive = true;
    module.cooldown = 0;
  }
}
