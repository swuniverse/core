import { Injectable } from '@nestjs/common';
import {
  Spacecraft,
  SpacecraftStatus,
  AlertState,
} from '../spacecraft/entities/spacecraft.entity';
import { SpacecraftModule } from '../spacecraft/entities/spacecraft-module.entity';
import {
  GameDataService,
  CombatFormulas,
  TorpedoTypeDef,
  TorpedoDamageType,
} from '../game-data/game-data.service';
import { SpacecraftTorpedoService } from '../spacecraft/spacecraft-torpedo.service';

export enum CombatAction {
  ENERGY_HIT = 'ENERGY_HIT',
  ENERGY_MISS = 'ENERGY_MISS',
  PROJECTILE_HIT = 'PROJECTILE_HIT',
  PROJECTILE_MISS = 'PROJECTILE_MISS',
  SHIELD_ABSORB = 'SHIELD_ABSORB',
  HULL_DAMAGE = 'HULL_DAMAGE',
  SYSTEM_DAMAGED = 'SYSTEM_DAMAGED',
  SYSTEM_DISABLED = 'SYSTEM_DISABLED',
  SHIELD_REGEN = 'SHIELD_REGEN',
  CRITICAL_HIT = 'CRITICAL_HIT',
  ESCAPED = 'ESCAPED',
  DESTROYED = 'DESTROYED',
  ARMOR_ABSORB = 'ARMOR_ABSORB',
}

export interface CombatLogEntry {
  action: CombatAction;
  source: 'attacker' | 'defender';
  value?: number;
  detail?: string;
}

export interface CombatRoundResult {
  round: number;
  attackerShields: number;
  defenderShields: number;
  attackerHull: number;
  defenderHull: number;
  log: CombatLogEntry[];
}

export interface CombatResult {
  rounds: CombatRoundResult[];
  winner: 'attacker' | 'defender' | 'draw' | 'escaped';
  attackerDestroyed: boolean;
  defenderDestroyed: boolean;
}

interface Combatant {
  ship: Spacecraft;
  modules: SpacecraftModule[];
  role: 'attacker' | 'defender';
  shipClass: string;
}

@Injectable()
export class CombatEngine {
  constructor(
    private readonly gameData: GameDataService,
    private readonly torpedoService: SpacecraftTorpedoService,
  ) {}

  async resolveCombat(
    attacker: Spacecraft,
    defender: Spacecraft,
    attackerModules: SpacecraftModule[],
    defenderModules: SpacecraftModule[],
  ): Promise<CombatResult> {
    const formulas = this.gameData.getCombatFormulas();
    const maxRounds = formulas.combat_flow.max_rounds;

    const aCombatant: Combatant = {
      ship: attacker,
      modules: attackerModules,
      role: 'attacker',
      shipClass: this.getShipClass(attacker.shipClassId),
    };
    const dCombatant: Combatant = {
      ship: defender,
      modules: defenderModules,
      role: 'defender',
      shipClass: this.getShipClass(defender.shipClassId),
    };

    attacker.status = SpacecraftStatus.IN_COMBAT;
    attacker.alertState = AlertState.RED;
    defender.status = SpacecraftStatus.IN_COMBAT;
    defender.alertState = AlertState.RED;

    const rounds: CombatRoundResult[] = [];
    let escaped = false;

    for (let round = 1; round <= maxRounds; round++) {
      if (attacker.hull <= 0 || defender.hull <= 0) break;

      const log: CombatLogEntry[] = [];

      // Escape attempt (defender can try to flee from round 2)
      if (round > 1) {
        if (this.attemptEscape(dCombatant, aCombatant, formulas, log)) {
          escaped = true;
          rounds.push(this.buildRoundResult(round, attacker, defender, log));
          break;
        }
      }

      // Phase 1: Energy weapons
      await this.fireWeaponsPhase(
        aCombatant,
        dCombatant,
        formulas,
        'WEAPONS',
        log,
      );
      if (defender.hull > 0) {
        await this.fireWeaponsPhase(
          dCombatant,
          aCombatant,
          formulas,
          'WEAPONS',
          log,
        );
      }

      // Phase 2: Projectile weapons (torpedoes etc.)
      if (attacker.hull > 0 && defender.hull > 0) {
        await this.fireWeaponsPhase(
          aCombatant,
          dCombatant,
          formulas,
          'PROJECTILE',
          log,
        );
        if (defender.hull > 0) {
          await this.fireWeaponsPhase(
            dCombatant,
            aCombatant,
            formulas,
            'PROJECTILE',
            log,
          );
        }
      }

      // Shield regeneration
      this.regenShields(aCombatant, formulas, log);
      this.regenShields(dCombatant, formulas, log);

      // Decrement disabled module cooldowns
      this.tickModuleCooldowns(aCombatant);
      this.tickModuleCooldowns(dCombatant);

      rounds.push(this.buildRoundResult(round, attacker, defender, log));
    }

    const attackerDestroyed = attacker.hull <= 0;
    const defenderDestroyed = defender.hull <= 0;

    let winner: 'attacker' | 'defender' | 'draw' | 'escaped';
    if (escaped) {
      winner = 'escaped';
    } else if (attackerDestroyed && defenderDestroyed) {
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

  private async fireWeaponsPhase(
    shooter: Combatant,
    target: Combatant,
    formulas: CombatFormulas,
    weaponCategory: string,
    log: CombatLogEntry[],
  ): Promise<void> {
    const weapons = shooter.modules.filter(
      (m) =>
        m.category === weaponCategory &&
        m.isActive &&
        m.cooldown === 0 &&
        m.integrity > 0,
    );

    for (const weapon of weapons) {
      const weaponDef = this.gameData
        .getAllModules()
        .find((m) => m.name === weapon.moduleType);
      if (!weaponDef) continue;

      const torpedo =
        weaponCategory === 'PROJECTILE'
          ? await this.torpedoService.consumeForAttack(shooter.ship, 1)
          : null;
      if (weaponCategory === 'PROJECTILE' && !torpedo) {
        continue;
      }

      const baseDamage =
        torpedo?.baseDamage ??
        (weaponDef.secret as Record<string, number>).baseDamage ??
        10;
      const hitChance = this.calculateHitChance(
        shooter,
        target,
        formulas,
        torpedo,
      );

      if (Math.random() > hitChance) {
        const action =
          weaponCategory === 'WEAPONS'
            ? CombatAction.ENERGY_MISS
            : CombatAction.PROJECTILE_MISS;
        log.push({ action, source: shooter.role, detail: weapon.moduleType });
        continue;
      }

      const levelScale = 1 + (weapon.level - 1) * formulas.damage.level_scaling;
      const classModifier = this.getClassModifier(shooter.shipClass, formulas);
      const variance = torpedo
        ? 1 -
          Math.max(0, torpedo.variance) / 100 +
          Math.random() * (Math.max(0, torpedo.variance) / 100) * 2
        : formulas.damage.variance_min +
          Math.random() *
            (formulas.damage.variance_max - formulas.damage.variance_min);
      const projectileDamageMultiplier =
        torpedo && typeof weaponDef.secret.projectileDamageMultiplier === 'number'
          ? weaponDef.secret.projectileDamageMultiplier
          : 1;

      let damage = Math.round(
        baseDamage *
          levelScale *
          classModifier.damage *
          variance *
          projectileDamageMultiplier *
          formulas.damage.base_multiplier,
      );

      const critChance = torpedo
        ? Math.max(0, torpedo.criticalChance) / 100
        : formulas.damage.crit_chance;
      const isCrit = Math.random() < critChance;
      if (isCrit) {
        damage = Math.round(damage * formulas.damage.crit_multiplier);
        log.push({
          action: CombatAction.CRITICAL_HIT,
          source: shooter.role,
          value: damage,
        });
      }

      const action =
        weaponCategory === 'WEAPONS'
          ? CombatAction.ENERGY_HIT
          : CombatAction.PROJECTILE_HIT;
      log.push({
        action,
        source: shooter.role,
        value: damage,
        detail: weapon.moduleType,
      });

      this.applyDamage(target, damage, formulas, log, shooter, isCrit, torpedo);

      // Ion weapon system disable
      const isIon = weapon.moduleType.toLowerCase().includes('ion');
      if (isIon && Math.random() < formulas.ion_effects.disable_chance) {
        this.disableRandomSystem(target, formulas, log);
      }

      shooter.ship.energy = Math.max(0, shooter.ship.energy - 5);
    }
  }

  private applyDamage(
    target: Combatant,
    damage: number,
    formulas: CombatFormulas,
    log: CombatLogEntry[],
    shooter: Combatant,
    isCrit: boolean,
    torpedo?: TorpedoTypeDef | null,
  ): void {
    const isProjectile = !!torpedo;
    const shieldFactor =
      isProjectile &&
      typeof torpedo.shieldDamageFactor === 'number' &&
      Number.isFinite(torpedo.shieldDamageFactor)
        ? torpedo.shieldDamageFactor / 100
        : 1;
    const hullFactor =
      isProjectile &&
      typeof torpedo.hullDamageFactor === 'number' &&
      Number.isFinite(torpedo.hullDamageFactor)
        ? torpedo.hullDamageFactor / 100
        : 1;
    const bleedthrough = Math.round(damage * formulas.shields.bleedthrough);
    const shieldDamage = Math.round((damage - bleedthrough) * shieldFactor);
    let hullDamage = Math.round(bleedthrough * hullFactor);

    if (target.ship.shields > 0) {
      const absorbed = Math.round(
        Math.min(target.ship.shields, shieldDamage) *
          formulas.shields.efficiency,
      );
      target.ship.shields = Math.max(0, target.ship.shields - shieldDamage);
      log.push({
        action: CombatAction.SHIELD_ABSORB,
        source: target.role,
        value: absorbed,
      });

      if (target.ship.shields <= 0) {
        hullDamage += Math.round((shieldDamage - absorbed) * hullFactor);
      }
    } else {
      hullDamage = Math.round(damage * hullFactor);
    }

    const resistance = isProjectile
      ? this.getProjectileResistance(target, torpedo.damageType)
      : null;
    if (resistance && hullDamage > 0) {
      const mitigatedHullDamage = Math.round(
        hullDamage * (1 - resistance.percent / 100),
      );
      const absorbed = hullDamage - mitigatedHullDamage;
      if (absorbed > 0) {
        hullDamage = mitigatedHullDamage;
        log.push({
          action: CombatAction.ARMOR_ABSORB,
          source: target.role,
          value: absorbed,
          detail: `${resistance.damageType} by ${resistance.moduleType}`,
        });
      }
    }
    if (hullDamage > 0) {
      target.ship.hull = Math.max(0, target.ship.hull - hullDamage);
      log.push({
        action: CombatAction.HULL_DAMAGE,
        source: target.role,
        value: hullDamage,
      });

      // Critical hits can damage modules
      if (isCrit && target.modules.length > 0) {
        const randomMod =
          target.modules[Math.floor(Math.random() * target.modules.length)];
        const integrityLoss = 10 + Math.floor(Math.random() * 20);
        randomMod.integrity = Math.max(0, randomMod.integrity - integrityLoss);
        log.push({
          action: CombatAction.SYSTEM_DAMAGED,
          source: target.role,
          value: integrityLoss,
          detail: randomMod.moduleType,
        });

        if (randomMod.integrity === 0) {
          randomMod.isActive = false;
        }
      }

      if (target.ship.hull <= 0) {
        log.push({ action: CombatAction.DESTROYED, source: target.role });
      }
    }
  }

  private getProjectileResistance(
    target: Combatant,
    damageType: TorpedoDamageType | undefined,
  ): {
    damageType: TorpedoDamageType;
    moduleType: string;
    percent: number;
  } | null {
    if (!damageType) return null;

    let strongest: {
      damageType: TorpedoDamageType;
      moduleType: string;
      percent: number;
    } | null = null;

    for (const module of target.modules) {
      if (
        module.category !== 'HULL' ||
        !module.isActive ||
        module.integrity <= 0
      ) {
        continue;
      }

      const definition = this.gameData
        .getAllModules()
        .find((moduleDef) => moduleDef.name === module.moduleType);
      const resistances = definition?.secret.projectileResistances;
      if (!resistances || typeof resistances !== 'object') continue;

      const percent = (resistances as Partial<Record<TorpedoDamageType, unknown>>)[
        damageType
      ];
      if (
        typeof percent !== 'number' ||
        !Number.isFinite(percent) ||
        percent <= 0 ||
        percent > 100
      ) {
        continue;
      }
      if (!strongest || percent > strongest.percent) {
        strongest = { damageType, moduleType: module.moduleType, percent };
      }
    }

    return strongest;
  }

  private calculateHitChance(
    shooter: Combatant,
    target: Combatant,
    formulas: CombatFormulas,
    torpedo?: TorpedoTypeDef | null,
  ): number {
    const classModShooter = this.getClassModifier(shooter.shipClass, formulas);
    const classModTarget = this.getClassModifier(target.shipClass, formulas);

    const speedDiff = (classModShooter.speed - classModTarget.speed) * 10;
    let hitChance = torpedo
      ? torpedo.hitFactor / 100
      : formulas.hit_chance.base +
        speedDiff * formulas.hit_chance.speed_modifier;

    // Evasion reduces hit chance
    hitChance -= (classModTarget.evasion - 1.0) * 0.15;

    return Math.max(
      formulas.hit_chance.min,
      Math.min(formulas.hit_chance.max, hitChance),
    );
  }

  private attemptEscape(
    runner: Combatant,
    chaser: Combatant,
    formulas: CombatFormulas,
    log: CombatLogEntry[],
  ): boolean {
    const escape = formulas.combat_flow.escape;
    const runnerClass = this.getClassModifier(runner.shipClass, formulas);
    const chaserClass = this.getClassModifier(chaser.shipClass, formulas);

    let chance = escape.base_chance;
    chance += (runnerClass.speed - chaserClass.speed) * escape.speed_bonus * 10;

    if (runner.ship.hull < runner.ship.hullMax * 0.5) {
      chance -= escape.damage_penalty;
    }

    chance = Math.max(0.05, Math.min(0.8, chance));

    if (Math.random() < chance) {
      log.push({ action: CombatAction.ESCAPED, source: runner.role });
      return true;
    }
    return false;
  }

  private regenShields(
    combatant: Combatant,
    formulas: CombatFormulas,
    log: CombatLogEntry[],
  ): void {
    if (combatant.ship.shields < combatant.ship.shieldsMax) {
      const activeShieldMods = combatant.modules.filter(
        (m) => m.category === 'SHIELDS' && m.isActive && m.integrity > 0,
      );
      if (activeShieldMods.length > 0) {
        const regen = Math.max(
          1,
          Math.round(
            combatant.ship.shieldsMax * formulas.shields.recharge_rate,
          ),
        );
        combatant.ship.shields = Math.min(
          combatant.ship.shieldsMax,
          combatant.ship.shields + regen,
        );
        log.push({
          action: CombatAction.SHIELD_REGEN,
          source: combatant.role,
          value: regen,
        });
      }
    }
  }

  private disableRandomSystem(
    target: Combatant,
    formulas: CombatFormulas,
    log: CombatLogEntry[],
  ): void {
    const priority = formulas.ion_effects.systems_priority;

    for (const systemCategory of priority) {
      const mod = target.modules.find(
        (m) => m.category === systemCategory && m.isActive && m.cooldown === 0,
      );
      if (mod) {
        mod.isActive = false;
        mod.cooldown = formulas.ion_effects.disable_duration;
        log.push({
          action: CombatAction.SYSTEM_DISABLED,
          source: target.role,
          detail: mod.moduleType,
        });
        return;
      }
    }
  }

  private tickModuleCooldowns(combatant: Combatant): void {
    for (const mod of combatant.modules) {
      if (mod.cooldown > 0) {
        mod.cooldown--;
        if (mod.cooldown === 0 && mod.integrity > 0) {
          mod.isActive = true;
        }
      }
    }
  }

  private getClassModifier(
    shipClass: string,
    formulas: CombatFormulas,
  ): { damage: number; speed: number; hull: number; evasion: number } {
    return (
      formulas.ship_class_modifiers[shipClass] || {
        damage: 1,
        speed: 1,
        hull: 1,
        evasion: 1,
      }
    );
  }

  private getShipClass(shipClassId: number): string {
    const classes = [
      'FIGHTER',
      'BOMBER',
      'CORVETTE',
      'FRIGATE',
      'CRUISER',
      'CAPITAL',
      'TRANSPORT',
    ];
    return classes[shipClassId - 1] || 'CORVETTE';
  }

  private buildRoundResult(
    round: number,
    attacker: Spacecraft,
    defender: Spacecraft,
    log: CombatLogEntry[],
  ): CombatRoundResult {
    return {
      round,
      attackerShields: Math.max(0, attacker.shields),
      defenderShields: Math.max(0, defender.shields),
      attackerHull: Math.max(0, attacker.hull),
      defenderHull: Math.max(0, defender.hull),
      log,
    };
  }
}
