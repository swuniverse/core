import { Injectable } from '@nestjs/common';
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
  SENSORS: 1,
  COMPUTER: 0,
  WEAPONS: 1,
  TORPEDO_BANK: 1,
  SPECIAL: 1,
};

@Injectable()
export class SpacecraftResourceFlowService {
  constructor(private readonly runtimeState: SpacecraftRuntimeStateService) {}

  recharge(ship: Spacecraft, flightCost = 1): void {
    const systems = this.runtimeState.initialize(ship);
    const reactorOutput = Math.max(0, ship.reactorOutput);
    const epsUsage = this.calculateEpsUsage(systems);
    const split = Math.max(0, Math.min(100, ship.reactorWarpSplit ?? 100));

    // STU formula: split determines what fraction goes to warpdrive
    const maxWarpGain = flightCost > 0
      ? Math.max(0, Math.floor((reactorOutput - epsUsage) / flightCost))
      : 0;
    const warpProduction = Math.round((1 - split / 100) * maxWarpGain);
    const epsProduction = reactorOutput - warpProduction * flightCost;
    const netEps = epsProduction - epsUsage;

    // Brownout: not enough reactor output to cover system usage
    if (netEps < 0) {
      this.handleBrownout(ship, systems, -netEps);
    }

    // Charge EPS
    const epsMax = ship.epsMax || ship.energyMax;
    const missingEps = Math.max(0, epsMax - ship.energy);
    const epsGain = Math.min(missingEps, Math.max(0, netEps));
    ship.energy += epsGain;
    ship.energyMax = epsMax;

    // Charge Warpdrive
    const missingWarp = Math.max(0, ship.warpdriveMax - ship.warpdrive);
    const warpGain = Math.min(missingWarp, warpProduction);
    ship.warpdrive += warpGain;

    // Leftover → battery (autoCarryOver)
    const epsLeftover = Math.max(0, netEps) - epsGain;
    const warpLeftover = (warpProduction - warpGain) * flightCost;
    const totalLeftover = epsLeftover + warpLeftover;
    const missingBattery = Math.max(0, ship.batteryMax - ship.battery);
    ship.battery += Math.min(missingBattery, totalLeftover);

    this.runtimeState.initialize(ship);
  }

  getEpsUsage(ship: Spacecraft): number {
    const systems = this.runtimeState.getSystems(ship);
    return this.calculateEpsUsage(systems);
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
      'SENSORS',
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
