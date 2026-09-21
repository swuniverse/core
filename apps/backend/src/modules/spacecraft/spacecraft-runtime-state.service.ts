import { BadRequestException, Injectable } from '@nestjs/common';
import { SPACECRAFT_RUNTIME_SYSTEM_KEYS } from '@swuniverse/shared';
import type {
  SpacecraftRuntimeSystemKey,
  SpacecraftRuntimeSystemStateDto,
  SpacecraftRuntimeSystemsDto,
} from '@swuniverse/shared';
import { Spacecraft } from './entities/spacecraft.entity';
import type { SpacecraftModule } from './entities/spacecraft-module.entity';

export type SpacecraftRuntimeSystemState = SpacecraftRuntimeSystemStateDto;
export type SpacecraftRuntimeSystems = SpacecraftRuntimeSystemsDto;
export type { SpacecraftRuntimeSystemKey } from '@swuniverse/shared';

export function getRuntimeSystemsForModule(
  module: Pick<SpacecraftModule, 'category' | 'moduleType'>,
): SpacecraftRuntimeSystemKey[] {
  const category = module.category.toUpperCase();
  const name = module.moduleType.toLowerCase();
  if (category === 'SHIELDS') return ['SHIELDS'];
  if (category === 'COMPUTER') return ['COMPUTER'];
  if (category === 'SUBLIGHT_DRIVE' || category === 'SUBLIGHT_ENGINE') {
    return ['SUBLIGHT_DRIVE'];
  }
  if (category === 'HYPERDRIVE') return ['WARPDRIVE'];
  if (category === 'ENERGY_WEAPON' || category === 'WEAPONS') {
    return ['WEAPONS'];
  }
  if (category === 'TORPEDO_BANK' || category === 'PROJECTILE') {
    return ['TORPEDO_BANK'];
  }
  if (category === 'SENSORS') {
    return ['LONG_RANGE_SENSORS', 'SHORT_RANGE_SENSORS'];
  }
  if (category === 'REACTOR' || name.includes('reaktor')) return ['REACTOR'];
  if (category === 'EPS' || name.includes('energieverteiler')) return ['EPS'];
  if (category === 'SPECIAL') return ['SPECIAL'];
  return [];
}

@Injectable()
export class SpacecraftRuntimeStateService {
  initialize(ship: Spacecraft): SpacecraftRuntimeSystems {
    return initializeSpacecraftRuntimeSystems(ship);
  }

  validateActivation(
    systems: SpacecraftRuntimeSystems,
    key: SpacecraftRuntimeSystemKey,
  ): string | null {
    const system = systems[key];
    if (!system) return 'System nicht verfügbar';
    if (system.cooldown > 0) return `Cooldown ${system.cooldown}`;
    if (system.integrity <= 0) return 'System zerstört';
    return null;
  }

  requireActivation(
    systems: SpacecraftRuntimeSystems,
    key: SpacecraftRuntimeSystemKey,
  ): void {
    const reason = this.validateActivation(systems, key);
    if (reason) throw new BadRequestException(reason);
  }

  getSystems(ship: Spacecraft): SpacecraftRuntimeSystems {
    return getStoredSystems(ship);
  }
}

export function initializeSpacecraftRuntimeSystems(
  ship: Spacecraft,
): SpacecraftRuntimeSystems {
  const systems = getStoredSystems(ship);
  const legacy = (
    systems as Record<string, SpacecraftRuntimeSystemState | undefined>
  ).SENSORS;
  if (legacy) {
    systems.LONG_RANGE_SENSORS ??= { ...legacy };
    systems.SHORT_RANGE_SENSORS ??= { ...legacy };
    delete (systems as Record<string, unknown>).SENSORS;
  }

  // Callers without hydrated modules retain the legacy state until they can
  // load the relation. Authorization paths load modules explicitly.
  if (ship.modules) {
    const availableSystems = getAvailableSystems(ship.modules);
    for (const key of Object.keys(systems) as SpacecraftRuntimeSystemKey[]) {
      if (!availableSystems.has(key)) delete systems[key];
    }
    for (const key of availableSystems) {
      const backingModules = ship.modules.filter((module) =>
        getRuntimeSystemsForModule(module).includes(key),
      );
      systems[key] ??= {
        active:
          key === 'LIFE_SUPPORT' ||
          backingModules.length === 0 ||
          backingModules.some((module) => module.isActive !== false),
        cooldown: Math.max(
          0,
          ...backingModules.map((module) => module.cooldown ?? 0),
        ),
        integrity:
          backingModules.length > 0
            ? Math.max(
                ...backingModules.map((module) => module.integrity ?? 100),
              )
            : 100,
      };
    }
  } else {
    for (const key of SPACECRAFT_RUNTIME_SYSTEM_KEYS) {
      systems[key] ??= { active: true, cooldown: 0, integrity: 100 };
    }
  }
  if (systems.EPS) {
    systems.EPS = withDefaults(systems.EPS, {
      current: ship.energy,
      max: ship.epsMax || ship.energyMax,
    });
  }
  if (systems.WARPDRIVE) {
    systems.WARPDRIVE = withDefaults(systems.WARPDRIVE, {
      current: ship.warpdrive,
      max: ship.warpdriveMax,
    });
  }
  if (systems.REACTOR) {
    systems.REACTOR = withDefaults(systems.REACTOR, {
      current: ship.reactorOutput,
      max: ship.reactorOutput,
    });
  }
  if (systems.SHIELDS) {
    systems.SHIELDS = withDefaults(systems.SHIELDS, {
      current: ship.shields,
      max: ship.shieldsMax,
    });
  }
  ship.runtimeSystems = systems;
  return systems;
}

function getAvailableSystems(
  modules: SpacecraftModule[] | undefined,
): Set<SpacecraftRuntimeSystemKey> {
  // Life support is a universal ship system. All other runtime systems must
  // be backed by an installed module, matching STU's system creation model.
  const systems = new Set<SpacecraftRuntimeSystemKey>(['LIFE_SUPPORT']);
  if (!modules) {
    for (const key of SPACECRAFT_RUNTIME_SYSTEM_KEYS) systems.add(key);
    return systems;
  }

  for (const module of modules) {
    for (const system of getRuntimeSystemsForModule(module))
      systems.add(system);
  }
  return systems;
}

function withDefaults(
  state: SpacecraftRuntimeSystemState | undefined,
  values: Pick<SpacecraftRuntimeSystemState, 'current' | 'max'>,
): SpacecraftRuntimeSystemState {
  return {
    active: state?.active ?? true,
    cooldown: state?.cooldown ?? 0,
    integrity: state?.integrity ?? 100,
    ...values,
  };
}

function getStoredSystems(ship: Spacecraft): SpacecraftRuntimeSystems {
  const value = ship.runtimeSystems;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as SpacecraftRuntimeSystems;
}
