import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  SpacecraftRuntimeSystemKey,
  SpacecraftRuntimeSystemStateDto,
  SpacecraftRuntimeSystemsDto,
} from '@swuniverse/shared';
import { Spacecraft } from './entities/spacecraft.entity';

export type SpacecraftRuntimeSystemState = SpacecraftRuntimeSystemStateDto;
export type SpacecraftRuntimeSystems = SpacecraftRuntimeSystemsDto;
export type { SpacecraftRuntimeSystemKey } from '@swuniverse/shared';

const DEFAULT_SYSTEMS: SpacecraftRuntimeSystemKey[] = [
  'SHIELDS',
  'REACTOR',
  'EPS',
  'WARPDRIVE',
  'SUBLIGHT_DRIVE',
  'LONG_RANGE_SENSORS',
  'SHORT_RANGE_SENSORS',
  'COMPUTER',
  'WEAPONS',
  'TORPEDO_BANK',
  'SPECIAL',
  'LIFE_SUPPORT',
];

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
    for (const key of DEFAULT_SYSTEMS) {
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
