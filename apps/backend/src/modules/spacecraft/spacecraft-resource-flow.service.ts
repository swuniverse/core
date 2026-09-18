import { Injectable } from '@nestjs/common';
import type { SpacecraftEnergyFlowDto } from '@swuniverse/shared';
import { Spacecraft } from './entities/spacecraft.entity';
import {
  SpacecraftRuntimeStateService,
  SpacecraftRuntimeSystemKey,
  SpacecraftRuntimeSystems,
} from './spacecraft-runtime-state.service';

// STU-aligned system EPS costs per tick when active
const SYSTEM_EPS_USAGE: Partial<Record<SpacecraftRuntimeSystemKey, number>> = {
  SHIELDS: 0,
  REACTOR: 0,
  EPS: 0,
  WARPDRIVE: 0,
  SUBLIGHT_DRIVE: 0,
  LONG_RANGE_SENSORS: 1,
  SHORT_RANGE_SENSORS: 1,
  COMPUTER: 0,
  WEAPONS: 1,
  TORPEDO_BANK: 1,
  SPECIAL: 1,
  LIFE_SUPPORT: 1,
};

export const SPACECRAFT_REACTOR_FUEL_COMMODITY_ID = 5;

const SYSTEM_LABELS: Partial<Record<SpacecraftRuntimeSystemKey, string>> = {
  SHIELDS: 'Schilde',
  REACTOR: 'Reaktor',
  EPS: 'Energiesystem',
  WARPDRIVE: 'Hyperantrieb',
  SUBLIGHT_DRIVE: 'Impulsantrieb',
  LONG_RANGE_SENSORS: 'Langstreckensensoren',
  SHORT_RANGE_SENSORS: 'Nahbereichssensoren',
  COMPUTER: 'Computer',
  WEAPONS: 'Waffen',
  TORPEDO_BANK: 'Torpedobank',
  SPECIAL: 'Spezialsysteme',
  LIFE_SUPPORT: 'Lebenserhaltung',
};

@Injectable()
export class SpacecraftResourceFlowService {
  constructor(private readonly runtimeState: SpacecraftRuntimeStateService) {}

  recharge(ship: Spacecraft, flightCost = 1): void {
    let flow = this.calculate(ship, flightCost);
    const systems = this.runtimeState.initialize(ship);

    // Brownout: reactor output is capped by the remaining reactor load.
    if (flow.netEps < 0) {
      this.handleBrownout(ship, systems, -flow.netEps);
      flow = this.calculate(ship, flightCost);
    }

    const epsMax = ship.epsMax || ship.energyMax;
    const missingEps = Math.max(0, epsMax - ship.energy);
    const epsGain = Math.min(missingEps, Math.max(0, flow.netEps));
    ship.energy += epsGain;
    ship.energyMax = epsMax;

    const missingWarp = Math.max(0, ship.warpdriveMax - ship.warpdrive);
    const warpGain = Math.min(missingWarp, flow.warpProduction);
    ship.warpdrive += warpGain;

    // Stations will opt in to limited automatic reload once Station support exists.
    const batteryGain = 0;

    const reactorUsage = Math.min(
      ship.reactorFuel ?? 0,
      flow.totalSystemConsumption +
        epsGain +
        warpGain * flightCost +
        batteryGain,
    );
    ship.reactorFuel = Math.max(0, (ship.reactorFuel ?? 0) - reactorUsage);
    this.runtimeState.initialize(ship);
  }

  calculate(ship: Spacecraft, flightCost = 1): SpacecraftEnergyFlowDto {
    const systems = this.runtimeState.initialize(ship);
    const reactorOutput = Math.min(
      Math.max(0, ship.reactorOutput),
      Math.max(0, ship.reactorFuel ?? 0),
    );
    const totalSystemConsumption = this.calculateEpsUsage(systems);
    const split = Math.max(0, Math.min(100, ship.reactorWarpSplit ?? 100));
    const maxWarpGain =
      flightCost > 0
        ? Math.max(
            0,
            Math.floor((reactorOutput - totalSystemConsumption) / flightCost),
          )
        : 0;
    const warpProduction = Math.round((1 - split / 100) * maxWarpGain);
    const epsProduction = reactorOutput - warpProduction * flightCost;
    const netEps = epsProduction - totalSystemConsumption;
    return {
      energy: { current: ship.energy, max: ship.epsMax || ship.energyMax },
      warpdrive: { current: ship.warpdrive, max: ship.warpdriveMax },
      battery: { current: ship.battery, max: ship.batteryMax },
      reactorFuel: {
        current: ship.reactorFuel ?? 0,
        max: ship.reactorFuelMax ?? 0,
        commodityId: SPACECRAFT_REACTOR_FUEL_COMMODITY_ID,
      },
      reactorOutput,
      reactorWarpSplit: split,
      flightCost,
      epsProduction,
      warpProduction,
      totalSystemConsumption,
      netEps,
      systems: Object.entries(systems).map(([systemKey, state]) => ({
        systemKey: systemKey as SpacecraftRuntimeSystemKey,
        label:
          SYSTEM_LABELS[systemKey as SpacecraftRuntimeSystemKey] ?? systemKey,
        active: state?.active !== false,
        epsPerTick:
          state?.active === false
            ? 0
            : (SYSTEM_EPS_USAGE[systemKey as SpacecraftRuntimeSystemKey] ?? 0),
      })),
    };
  }

  getEpsUsage(ship: Spacecraft): number {
    return this.calculate(ship).totalSystemConsumption;
  }

  getSystemCost(systemKey: SpacecraftRuntimeSystemKey): number {
    return SYSTEM_EPS_USAGE[systemKey] ?? 0;
  }

  private calculateEpsUsage(systems: SpacecraftRuntimeSystems): number {
    let total = 0;
    for (const [key, state] of Object.entries(systems)) {
      if (!state || state.active === false) continue;
      total += SYSTEM_EPS_USAGE[key as SpacecraftRuntimeSystemKey] ?? 0;
    }
    return total;
  }

  private handleBrownout(
    ship: Spacecraft,
    systems: SpacecraftRuntimeSystems,
    deficit: number,
  ): void {
    // Deactivate systems in reverse priority until deficit is covered
    // ponytail: priority order — least critical first
    const deactivationOrder: SpacecraftRuntimeSystemKey[] = [
      'SPECIAL',
      'TORPEDO_BANK',
      'WEAPONS',
      'LONG_RANGE_SENSORS',
      'SHORT_RANGE_SENSORS',
    ];

    let remaining = deficit;
    for (const key of deactivationOrder) {
      if (remaining <= 0) break;
      const system = systems[key];
      if (!system || system.active === false) continue;
      const cost = SYSTEM_EPS_USAGE[key] ?? 0;
      if (cost <= 0) continue;
      systems[key] = { ...system, active: false };
      remaining -= cost;
    }

    // Drain EPS + battery for any remaining deficit
    const fromEps = Math.min(ship.energy, remaining);
    ship.energy -= fromEps;
    remaining -= fromEps;
    const fromBattery = Math.min(ship.battery, remaining);
    ship.battery -= fromBattery;

    ship.runtimeSystems = systems;
  }
}
