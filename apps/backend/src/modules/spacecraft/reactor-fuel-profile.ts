import type { SpacecraftModule } from './entities/spacecraft-module.entity';
import { BadRequestException } from '@nestjs/common';
import type { SpacecraftRuntimeSystemsDto } from '@swuniverse/shared';

// Only profiles backed by currently buildable SWU modules belong here.
export const REACTOR_FUEL_PROFILES = {
  RESERVE_HYPERMATTER: {
    key: 'RESERVE_HYPERMATTER',
    label: 'Hypermaterie-Reservekern',
    loadUnits: 85,
    capacityMultiplier: 20,
    costs: [
      { commodityId: 8, amount: 2 },
      { commodityId: 6, amount: 3 },
      { commodityId: 7, amount: 2 },
    ],
  },
  LIGHT_HYPERMATTER: {
    key: 'LIGHT_HYPERMATTER',
    label: 'Leichter Hypermaterie-Reaktor',
    loadUnits: 2,
    capacityMultiplier: 10,
    costs: [{ commodityId: 5, amount: 1 }],
  },
  HYPERMATTER: {
    key: 'HYPERMATTER',
    label: 'Hypermaterie-Reaktor',
    // STU's mapped core mechanics, expressed entirely in Star Wars fiction.
    loadUnits: 30,
    capacityMultiplier: 15,
    costs: [
      { commodityId: 8, amount: 1 }, // Kyber-Kristalle
      { commodityId: 6, amount: 2 }, // Antimaterie
      { commodityId: 5, amount: 2 }, // Hypermaterie
    ],
  },
} as const;

export type ReactorFuelProfile =
  (typeof REACTOR_FUEL_PROFILES)[keyof typeof REACTOR_FUEL_PROFILES];

const MODULE_PROFILES: Record<string, keyof typeof REACTOR_FUEL_PROFILES> = {
  'Hypermaterie-Reservekern': 'RESERVE_HYPERMATTER',
  'Leichter Hypermaterie-Reaktor': 'LIGHT_HYPERMATTER',
  'Hypermaterie-Reaktor': 'HYPERMATTER',
  'Allianz-Hypermaterie-Reaktor': 'HYPERMATTER',
};

export function installedReactor(
  modules: SpacecraftModule[] = [],
): SpacecraftModule | undefined {
  const unsupported = modules.find(
    (module) =>
      module.category === 'REACTOR' && !MODULE_PROFILES[module.moduleType],
  );
  if (unsupported)
    throw new BadRequestException(
      `Reaktor-Ladeprofil fehlt für ${unsupported.moduleType}`,
    );
  const reactors = modules.filter(
    (module) => MODULE_PROFILES[module.moduleType],
  );
  if (reactors.length > 1)
    throw new BadRequestException(
      'Nur ein alternatives Reaktormodul darf eingebaut sein',
    );
  return reactors[0];
}

export function isReserveCore(
  module: Pick<SpacecraftModule, 'moduleType'>,
): boolean {
  return MODULE_PROFILES[module.moduleType] === 'RESERVE_HYPERMATTER';
}

export function shutDownReserveCore(
  systems: SpacecraftRuntimeSystemsDto | null | undefined,
): void {
  if (!systems) return;
  if (systems.REACTOR) systems.REACTOR.active = false;
  if (systems.WARPDRIVE) systems.WARPDRIVE.active = false;
}

/** Repair restores the core's default mode, never the hyperdrive. */
export function restoreReserveCoreRuntime(
  ship: { runtimeSystems?: Record<string, unknown> | null },
  repaired: SpacecraftModule[],
): void {
  const core = repaired.find(isReserveCore);
  if (!core) return;
  const systems = (ship.runtimeSystems ??= {}) as SpacecraftRuntimeSystemsDto;
  systems.REACTOR = {
    ...(systems.REACTOR ?? { cooldown: 0 }),
    integrity: core.integrity,
    active: core.integrity > 0,
  };
}

export function reactorFuelProfile(
  modules: SpacecraftModule[] = [],
): ReactorFuelProfile {
  // Installed type determines fuel and recycling even while damaged/offline.
  const reactor = installedReactor(modules);
  if (reactor)
    return REACTOR_FUEL_PROFILES[MODULE_PROFILES[reactor.moduleType]];
  // Existing hulls without a module retain the established built-in profile.
  return REACTOR_FUEL_PROFILES.HYPERMATTER;
}

/** Recover the input mix for whole remaining loads, as on STU disassembly. */
export function recoverableReactorFuel(
  fuel: number,
  modules: SpacecraftModule[],
): Array<{ commodityId: number; amount: number }> {
  const profile = reactorFuelProfile(modules);
  const loads = Math.floor(Math.max(0, fuel ?? 0) / profile.loadUnits);
  return loads > 0
    ? profile.costs.map((cost) => ({
        commodityId: cost.commodityId,
        amount: loads * cost.amount,
      }))
    : [];
}
