import { Injectable } from '@nestjs/common';
import { Spacecraft } from './entities/spacecraft.entity';
import {
  SpacecraftRuntimeStateService,
  SpacecraftRuntimeSystems,
} from './spacecraft-runtime-state.service';

@Injectable()
export class SpacecraftResourceFlowService {
  constructor(private readonly runtimeState: SpacecraftRuntimeStateService) {}

  recharge(ship: Spacecraft): void {
    const systems = this.runtimeState.initialize(ship);
    let reactorBudget = Math.max(0, ship.reactorOutput);

    reactorBudget = this.paySystemUpkeep(ship, reactorBudget, systems);
    reactorBudget = this.chargeEps(ship, reactorBudget);
    reactorBudget = this.chargeWarpdrive(ship, reactorBudget);
    this.chargeBattery(ship, reactorBudget);
    this.runtimeState.initialize(ship);
  }

  private paySystemUpkeep(
    ship: Spacecraft,
    reactorBudget: number,
    systems: SpacecraftRuntimeSystems,
  ): number {
    const shieldUpkeep = ship.shields > 0 ? 2 : 0;
    if (shieldUpkeep <= 0 || systems.SHIELDS?.active === false) {
      return reactorBudget;
    }

    const remaining = this.consumeOperationalEnergy(ship, reactorBudget, shieldUpkeep);
    if (remaining == null) {
      systems.SHIELDS = {
        active: false,
        cooldown: systems.SHIELDS?.cooldown ?? 0,
        integrity: systems.SHIELDS?.integrity ?? 100,
        current: ship.shields,
        max: ship.shieldsMax,
      };
      ship.runtimeSystems = systems;
      return reactorBudget;
    }
    return remaining;
  }

  private consumeOperationalEnergy(
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
