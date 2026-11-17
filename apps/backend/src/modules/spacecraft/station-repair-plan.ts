import type { SpacecraftModule } from './entities/spacecraft-module.entity';
import type { StationRole } from './entities/spacecraft.entity';
import type { SpacecraftRuntimeSystemStateDto } from '@swuniverse/shared';

type RepairableSpacecraft = {
  hull: number;
  hullMax: number;
  kind?: string;
  crew?: number;
  runtimeSystems?: Record<string, unknown> | null;
};

function damagedBuiltInSystem(ship: RepairableSpacecraft, key: string): SpacecraftRuntimeSystemStateDto | undefined {
  const state = ship.runtimeSystems?.[key] as SpacecraftRuntimeSystemStateDto | undefined;
  return ship.kind === 'STATION' && state && state.integrity < 100 ? state : undefined;
}

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
  beamBlocker?: SpacecraftRuntimeSystemStateDto;
  uplink?: SpacecraftRuntimeSystemStateDto;
}

export function isModuleDamaged(module: SpacecraftModule): boolean {
  return module.integrity < 100 || !module.isActive || module.cooldown !== 0;
}

export function needsRepair(
  ship: RepairableSpacecraft,
  modules: SpacecraftModule[],
): boolean {
  return ship.hull < ship.hullMax || modules.some(isModuleDamaged) || !!damagedBuiltInSystem(ship, 'BEAM_BLOCKER') || !!damagedBuiltInSystem(ship, 'UPLINK');
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
  ship: RepairableSpacecraft,
  modules: SpacecraftModule[],
): RepairStep {
  const hullRepair = Math.min(HULL_REPAIR_PER_STEP, Math.max(0, ship.hullMax - ship.hull));
  const repaired = modules.filter(isModuleDamaged).slice(0, SYSTEMS_REPAIR_PER_STEP);
  const beamBlocker = repaired.length < SYSTEMS_REPAIR_PER_STEP ? damagedBuiltInSystem(ship, 'BEAM_BLOCKER') : undefined;
  const uplink = repaired.length + (beamBlocker ? 1 : 0) < SYSTEMS_REPAIR_PER_STEP ? damagedBuiltInSystem(ship, 'UPLINK') : undefined;
  const costs: RepairCost[] = [];
  if (hullRepair > 0 || repaired.length > 0 || beamBlocker || uplink) costs.push({ commodityId: SPARE_PARTS_ID, amount: 1 });
  if (repaired.length > 0 || beamBlocker || uplink) costs.push({ commodityId: SYSTEM_COMPONENTS_ID, amount: 1 });
  return { hullRepair, modules: repaired, costs, ...(beamBlocker ? { beamBlocker } : {}), ...(uplink ? { uplink } : {}) };
}

export function estimateRepairSteps(
  ship: RepairableSpacecraft,
  modules: SpacecraftModule[],
): number {
  const hullSteps = Math.ceil(Math.max(0, ship.hullMax - ship.hull) / HULL_REPAIR_PER_STEP);
  const systemSteps = Math.ceil((modules.filter(isModuleDamaged).length + (damagedBuiltInSystem(ship, 'BEAM_BLOCKER') ? 1 : 0) + (damagedBuiltInSystem(ship, 'UPLINK') ? 1 : 0)) / SYSTEMS_REPAIR_PER_STEP);
  return Math.max(hullSteps, systemSteps);
}

export function applyRepairStep(
  ship: RepairableSpacecraft,
  step: RepairStep,
): void {
  ship.hull = Math.min(ship.hullMax, ship.hull + step.hullRepair);
  for (const module of step.modules) {
    module.integrity = 100;
    module.isActive = true;
    module.cooldown = 0;
  }
  if (step.beamBlocker) {
    // STU passive station repair restores default modes when crew is aboard.
    if ((ship.crew ?? 0) > 0) step.beamBlocker.active = true;
    step.beamBlocker.integrity = 100;
  }
  if (step.uplink) {
    if ((ship.crew ?? 0) > 0) step.uplink.active = false; // STU Uplink default is MODE_OFF.
    step.uplink.integrity = 100;
  }
}
