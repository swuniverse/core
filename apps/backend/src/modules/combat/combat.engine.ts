import { Injectable } from '@nestjs/common';
import { Spacecraft, SpacecraftStatus, AlertState } from '../spacecraft/entities/spacecraft.entity';

export interface CombatRoundResult {
  round: number;
  attackerDamage: number;
  defenderDamage: number;
  attackerShields: number;
  defenderShields: number;
  attackerHull: number;
  defenderHull: number;
  log: string[];
}

export interface CombatResult {
  rounds: CombatRoundResult[];
  winner: 'attacker' | 'defender' | 'draw';
  attackerDestroyed: boolean;
  defenderDestroyed: boolean;
}

const BASE_ACCURACY = 0.7;
const CRITICAL_CHANCE = 0.1;
const CRITICAL_MULTIPLIER = 1.5;
const MAX_ROUNDS = 10;

@Injectable()
export class CombatEngine {

  resolveCombat(attacker: Spacecraft, defender: Spacecraft): CombatResult {
    const rounds: CombatRoundResult[] = [];
    let round = 0;

    attacker.status = SpacecraftStatus.IN_COMBAT;
    attacker.alertState = AlertState.RED;
    defender.status = SpacecraftStatus.IN_COMBAT;
    defender.alertState = AlertState.RED;

    while (round < MAX_ROUNDS && attacker.hull > 0 && defender.hull > 0) {
      round++;
      const result = this.resolveRound(round, attacker, defender);
      rounds.push(result);
    }

    const attackerDestroyed = attacker.hull <= 0;
    const defenderDestroyed = defender.hull <= 0;

    let winner: 'attacker' | 'defender' | 'draw';
    if (attackerDestroyed && defenderDestroyed) {
      winner = 'draw';
    } else if (defenderDestroyed) {
      winner = 'attacker';
    } else if (attackerDestroyed) {
      winner = 'defender';
    } else {
      winner = attacker.hull > defender.hull ? 'attacker' : 'defender';
    }

    if (attackerDestroyed) {
      attacker.status = SpacecraftStatus.DESTROYED;
    } else {
      attacker.status = SpacecraftStatus.DOCKED;
      attacker.alertState = AlertState.YELLOW;
    }

    if (defenderDestroyed) {
      defender.status = SpacecraftStatus.DESTROYED;
    } else {
      defender.status = SpacecraftStatus.DOCKED;
      defender.alertState = AlertState.YELLOW;
    }

    return { rounds, winner, attackerDestroyed, defenderDestroyed };
  }

  private resolveRound(
    round: number,
    attacker: Spacecraft,
    defender: Spacecraft,
  ): CombatRoundResult {
    const log: string[] = [];

    // Attacker fires
    const atkDamage = this.calculateDamage(attacker, defender, log, 'attacker');
    this.applyDamage(defender, atkDamage, log, 'defender');

    // Defender returns fire (if alive)
    let defDamage = 0;
    if (defender.hull > 0) {
      defDamage = this.calculateDamage(defender, attacker, log, 'defender');
      this.applyDamage(attacker, defDamage, log, 'attacker');
    }

    return {
      round,
      attackerDamage: defDamage,
      defenderDamage: atkDamage,
      attackerShields: attacker.shields,
      defenderShields: defender.shields,
      attackerHull: attacker.hull,
      defenderHull: defender.hull,
      log,
    };
  }

  private calculateDamage(
    shooter: Spacecraft,
    _target: Spacecraft,
    log: string[],
    shooterRole: string,
  ): number {
    if (Math.random() > BASE_ACCURACY) {
      log.push(`${shooterRole} misses!`);
      return 0;
    }

    const baseDamage = 8 + Math.floor(Math.random() * 12); // 8-20 base
    const energyBonus = Math.floor(shooter.energy * 0.05);
    let damage = baseDamage + energyBonus;

    if (Math.random() < CRITICAL_CHANCE) {
      damage = Math.floor(damage * CRITICAL_MULTIPLIER);
      log.push(`${shooterRole} scores a critical hit!`);
    }

    shooter.energy = Math.max(0, shooter.energy - 5);

    return damage;
  }

  private applyDamage(
    target: Spacecraft,
    damage: number,
    log: string[],
    targetRole: string,
  ): void {
    if (damage <= 0) return;

    let remaining = damage;

    // Shields absorb first
    if (target.shields > 0) {
      const absorbed = Math.min(target.shields, remaining);
      target.shields -= absorbed;
      remaining -= absorbed;
      if (absorbed > 0) {
        log.push(`${targetRole} shields absorb ${absorbed} damage (${target.shields} remaining)`);
      }
    }

    // Hull takes rest
    if (remaining > 0) {
      target.hull -= remaining;
      log.push(`${targetRole} hull takes ${remaining} damage (${Math.max(0, target.hull)} remaining)`);
    }

    if (target.hull <= 0) {
      target.hull = 0;
      log.push(`${targetRole} ship destroyed!`);
    }
  }
}
