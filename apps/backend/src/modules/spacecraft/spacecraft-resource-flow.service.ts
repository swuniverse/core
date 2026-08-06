import { Injectable } from '@nestjs/common';
import { Spacecraft } from './entities/spacecraft.entity';
import {
  SpacecraftRuntimeStateService,
  SpacecraftRuntimeSystemKey,
  SpacecraftRuntimeSystems,
} from './spacecraft-runtime-state.service';

// EPS upkeep per tick per system when active
const SYSTEM_UPKEEP: Partial<Record<SpacecraftRuntimeSystemKey, number>> = {
  SHIELDS: 2,
  SENSORS: 1,
  COMPUTER: 1,
  WEAPONS: 1,
};

@Injectable()
export class SpacecraftResourceFlowService {
  constructor(private readonly runtimeState: SpacecraftRuntimeStateService) {}

  recharge(ship: Spacecraft): void {
    const systems = this.runtimeState.initialize(ship);
    let reactorBudget = Math.max(0, ship.reactorOutput);

    for (const [key, cost] of Object.entries(SYSTEM_UPKEEP) as [SpacecraftRuntimeSystemKey, number][]) {
      reactorBudget = this.payUpkeep(ship, systems, key, cost, reactorBudget);
    }

    reactorBudget = this.chargeEps(ship, reactorBudget);
    reactorBudget = this.chargeWarpdrive(ship, reactorBudget);
    this.chargeBattery(ship, reactorBudget);
    this.runtimeState.initialize(ship);
  }

  private payUpkeep(
    ship: Spacecraft,
    systems: SpacecraftRuntimeSystems,
    key: SpacecraftRuntimeSystemKey,
    cost: number,
    reactorBudget: number,
  ): number {
    const system = systems[key];
    if (!system || system.active === false) return reactorBudget;
    if (key === 'SHIELDS' && ship.shields <= 0) return reactorBudget;

    const remaining = this.consumeEnergy(ship, reactorBudget, cost);
    if (remaining == null) {
      systems[key] = { ...system, active: false };
      ship.runtimeSystems = systems;
      return reactorBudget;
    }
    return remaining;
  }

  private consumeEnergy(
    ship: Spacecraft,
    reactorBudget: number,
    amount: number,
  ): number | null {
    const fromReactor = Math.min(reactorBudget, amount);
    reactorBudget -= fromReactor;
    amount -= fromReactor;

    const fromEps = Math.min(ship.energy, amount);
    ship.energy -= fromEps;
    amount -= fromEps;

    const fromBattery = Math.min(ship.battery, amount);
    ship.battery -= fromBattery;
    amount -= fromBattery;

    return amount === 0 ? reactorBudget : null;
  }

  private chargeEps(ship: Spacecraft, amount: number): number {
    const max = ship.epsMax || ship.energyMax;
    const missing = Math.max(0, max - ship.energy);
    const applied = Math.min(missing, amount);
    ship.energy += applied;
    ship.energyMax = max;
    return amount - applied;
  }

  private chargeWarpdrive(ship: Spacecraft, amount: number): number {
    const missing = Math.max(0, ship.warpdriveMax - ship.warpdrive);
    const applied = Math.min(missing, amount);
    ship.warpdrive += applied;
    return amount - applied;
  }

  private chargeBattery(ship: Spacecraft, amount: number): void {
    const missing = Math.max(0, ship.batteryMax - ship.battery);
    ship.battery += Math.min(missing, amount);
  }
}
