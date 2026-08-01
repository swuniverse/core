import { Injectable } from '@nestjs/common';
import { Spacecraft } from './entities/spacecraft.entity';

export type SpacecraftRuntimeSystemKey =
  | 'SHIELDS'
  | 'REACTOR'
  | 'EPS'
  | 'WARPDRIVE'
  | 'SUBLIGHT_DRIVE'
  | 'SENSORS'
  | 'COMPUTER'
  | 'WEAPONS'
  | 'TORPEDO_BANK'
  | 'SPECIAL';

export interface SpacecraftRuntimeSystemState {
  active: boolean;
  cooldown: number;
  integrity: number;
  current?: number;
  max?: number;
}

export type SpacecraftRuntimeSystems = Partial<
  Record<SpacecraftRuntimeSystemKey, SpacecraftRuntimeSystemState>
>;

const DEFAULT_SYSTEMS: SpacecraftRuntimeSystemKey[] = [
  'SHIELDS',
  'REACTOR',
  'EPS',
  'WARPDRIVE',
  'SUBLIGHT_DRIVE',
  'SENSORS',
  'COMPUTER',
  'WEAPONS',
  'TORPEDO_BANK',
  'SPECIAL',
];

@Injectable()
export class SpacecraftRuntimeStateService {
  initialize(ship: Spacecraft): SpacecraftRuntimeSystems {
    const systems = this.getSystems(ship);
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

  getSystems(ship: Spacecraft): SpacecraftRuntimeSystems {
    const value = ship.runtimeSystems;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value as SpacecraftRuntimeSystems;
  }
}
