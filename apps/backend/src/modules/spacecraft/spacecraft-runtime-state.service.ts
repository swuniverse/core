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

@Injectable()
export class SpacecraftRuntimeStateService {
  initialize(ship: Spacecraft): SpacecraftRuntimeSystems {
    const systems = this.getSystems(ship);
    const legacy = (
      systems as Record<string, SpacecraftRuntimeSystemState | undefined>
    ).SENSORS;
    if (legacy) {
      systems.LONG_RANGE_SENSORS ??= { ...legacy };
      systems.SHORT_RANGE_SENSORS ??= { ...legacy };
      delete (systems as Record<string, unknown>).SENSORS;
    }
    const availableSystems = this.getAvailableSystems(ship.modules);
    for (const key of Object.keys(systems) as SpacecraftRuntimeSystemKey[]) {
      if (!availableSystems.has(key)) delete systems[key];
    }
    for (const key of availableSystems) {
      systems[key] ??= {
        active: true,
        cooldown: 0,
        integrity: 100,
      };
    }
    systems.EPS = this.withDefaults(systems.EPS, {
      current: ship.energy,
      max: ship.epsMax || ship.energyMax,
    });
    systems.WARPDRIVE = this.withDefaults(systems.WARPDRIVE, {
      current: ship.warpdrive,
      max: ship.warpdriveMax,
    });
    systems.REACTOR = this.withDefaults(systems.REACTOR, {
      current: ship.reactorOutput,
      max: ship.reactorOutput,
    });
    systems.SHIELDS = this.withDefaults(systems.SHIELDS, {
      current: ship.shields,
      max: ship.shieldsMax,
    });
    ship.runtimeSystems = systems;
    return systems;
  }

  private getAvailableSystems(
    modules: SpacecraftModule[] | undefined,
  ): Set<SpacecraftRuntimeSystemKey> {
    // Life support is a universal ship system. All other runtime systems must
    // be backed by an installed module, matching STU's system creation model.
    const systems = new Set<SpacecraftRuntimeSystemKey>(['LIFE_SUPPORT']);
    if (!modules) {
      // Callers that did not load modules retain the legacy state until they
      // hydrate the ship relation instead of losing runtime information.
      for (const key of SPACECRAFT_RUNTIME_SYSTEM_KEYS) systems.add(key);
      return systems;
    }

    for (const module of modules) {
      const category = module.category.toUpperCase();
      const name = module.moduleType.toLowerCase();
      if (category === 'SHIELDS') systems.add('SHIELDS');
      if (category === 'COMPUTER') systems.add('COMPUTER');
      if (category === 'SUBLIGHT_DRIVE' || category === 'SUBLIGHT_ENGINE') {
        systems.add('SUBLIGHT_DRIVE');
      }
      if (category === 'HYPERDRIVE') systems.add('WARPDRIVE');
      if (category === 'ENERGY_WEAPON' || category === 'WEAPONS') {
        systems.add('WEAPONS');
      }
      if (category === 'TORPEDO_BANK' || category === 'PROJECTILE') {
        systems.add('TORPEDO_BANK');
      }
      if (category === 'SENSORS') {
        // STU creates both NBS and LSS from its single SENSOR module type.
        systems.add('LONG_RANGE_SENSORS');
        systems.add('SHORT_RANGE_SENSORS');
      }
      if (category === 'REACTOR' || name.includes('reaktor')) {
        systems.add('REACTOR');
      }
      if (category === 'EPS' || name.includes('energieverteiler')) {
        systems.add('EPS');
      }
      if (
        category === 'SPECIAL' &&
        !name.includes('reaktor') &&
        !name.includes('energieverteiler')
      ) {
        systems.add('SPECIAL');
      }
    }
    return systems;
  }

  private withDefaults(
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
    const value = ship.runtimeSystems;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value as SpacecraftRuntimeSystems;
  }
}
