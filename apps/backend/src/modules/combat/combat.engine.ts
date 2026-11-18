import { Injectable, Optional } from '@nestjs/common';
import {
  Spacecraft,
  SpacecraftStatus,
} from '../spacecraft/entities/spacecraft.entity';
import { SpacecraftModule } from '../spacecraft/entities/spacecraft-module.entity';
import {
  GameDataService,
  CombatFormulas,
  TorpedoTypeDef,
  TorpedoDamageType,
  ModuleDef,
} from '../game-data/game-data.service';
import { SpacecraftTorpedoService } from '../spacecraft/spacecraft-torpedo.service';
import { FieldEffect } from '@swuniverse/shared';
import {
  recordSpacecraftShieldHit,
  splitSpacecraftDamage,
} from '../spacecraft/spacecraft-damage';
import { getRuntimeSystemsForModule } from '../spacecraft/spacecraft-runtime-state.service';
import { CombatRandom } from './combat-random';
import { CombatCause, isOneWayCombat } from './combat-cause';

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
  DESTROYED = 'DESTROYED',
  ARMOR_ABSORB = 'ARMOR_ABSORB',
  WEAPON_SHIELD_MOD = 'WEAPON_SHIELD_MOD',
  FIELD_EFFECT = 'FIELD_EFFECT',
  PREPARATION = 'PREPARATION',
}

export interface CombatLogEntry {
  action: CombatAction;
  source: 'attacker' | 'defender';
  target?: 'attacker' | 'defender';
  sourceId?: number;
  targetId?: number;
  weapon?: string;
  value?: number;
  remaining?: number;
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
  winner: 'attacker' | 'defender' | 'draw';
  attackerDestroyed: boolean;
  defenderDestroyed: boolean;
}

export type EnergyFiringMode = 'FOCUS' | 'RANDOM';

export interface BattleParticipant {
  ship: Spacecraft;
  modules: SpacecraftModule[];
  fieldEffects?: FieldEffect[];
  fieldTypeName?: string;
  energyFiringMode?: EnergyFiringMode;
}

interface Combatant extends BattleParticipant {
  role: 'attacker' | 'defender';
  shipClass: string;
}

export interface BattleResult {
  rounds: Array<{ round: number; log: CombatLogEntry[] }>;
  winner: 'attacker' | 'defender' | 'draw';
  destroyedShipIds: number[];
  attackerShipIds: number[];
  defenderShipIds: number[];
}

@Injectable()
export class CombatEngine {
  constructor(
    private readonly gameData: GameDataService,
    private readonly torpedoService: SpacecraftTorpedoService,
    @Optional() private readonly random: CombatRandom = new CombatRandom(),
  ) {}

  async resolveBattle(
    attackers: BattleParticipant[],
    defenders: BattleParticipant[],
    cause: CombatCause = CombatCause.SHIP_FIGHT,
  ): Promise<BattleResult> {
    const formulas = this.gameData.getCombatFormulas();
    const attackerParty = attackers.map((participant) =>
      this.combatant(participant, 'attacker'),
    );
    const defenderParty = defenders.map((participant) =>
      this.combatant(participant, 'defender'),
    );
    const log: CombatLogEntry[] = [];
    this.logFieldEffects([...attackerParty, ...defenderParty], log);

    for (const combatant of [...attackerParty, ...defenderParty]) {
      if (!this.isActive(combatant)) continue;
      combatant.ship.status = SpacecraftStatus.IN_COMBAT;
    }

    const used = new Set<number>();
    const oneWay = isOneWayCombat(cause);
    let firstStrike = true;
    while (true) {
      const unused = (party: Combatant[]) =>
        party.filter(
          (member) => !used.has(member.ship.id) && this.canFire(member),
        );
      const availableAttackers = unused(attackerParty);
      const availableDefenders = oneWay ? [] : unused(defenderParty);
      // STU has no defender-only opening when the attacking party cannot fire.
      if (firstStrike && availableAttackers.length === 0) break;
      if (availableAttackers.length === 0 && availableDefenders.length === 0)
        break;
      const attackersFire =
        firstStrike ||
        availableDefenders.length === 0 ||
        (availableAttackers.length > 0 && this.random.next() < 0.5);
      const targets = attackersFire ? defenderParty : attackerParty;
      if (!targets.some((member) => this.isActive(member))) break;
      const shooter = this.pick(
        attackersFire ? availableAttackers : availableDefenders,
      );
      used.add(shooter.ship.id);
      firstStrike = false;
      await this.fireWeaponsPhase(shooter, targets, formulas, 'WEAPONS', log);
      await this.fireWeaponsPhase(
        shooter,
        targets,
        formulas,
        'PROJECTILE',
        log,
      );
    }

    const all = [...attackerParty, ...defenderParty];
    for (const combatant of all) {
      this.tickModuleCooldowns(combatant);
      if (!this.isActive(combatant)) {
        combatant.ship.status = SpacecraftStatus.DESTROYED;
      } else {
        combatant.ship.status = SpacecraftStatus.IDLE;
      }
    }
    const attackerAlive = attackerParty.some((member) => this.isActive(member));
    const defenderAlive = defenderParty.some((member) => this.isActive(member));
    const winner =
      attackerAlive && !defenderAlive
        ? 'attacker'
        : defenderAlive && !attackerAlive
          ? 'defender'
          : 'draw';

    return {
      rounds: [{ round: 1, log }],
      winner,
      destroyedShipIds: all
        .filter((member) => !this.isActive(member))
        .map(({ ship }) => ship.id),
      attackerShipIds: attackerParty.map(({ ship }) => ship.id),
      defenderShipIds: defenderParty.map(({ ship }) => ship.id),
    };
  }

  async resolveCombat(
    attacker: Spacecraft,
    defender: Spacecraft,
    attackerModules: SpacecraftModule[],
    defenderModules: SpacecraftModule[],
  ): Promise<CombatResult> {
    const result = await this.resolveBattle(
      [{ ship: attacker, modules: attackerModules }],
      [{ ship: defender, modules: defenderModules }],
    );
    return {
      rounds: result.rounds.map((round) =>
        this.buildRoundResult(round.round, attacker, defender, round.log),
      ),
      winner: result.winner,
      attackerDestroyed: attacker.hull <= 0,
      defenderDestroyed: defender.hull <= 0,
    };
  }

  private combatant(
    participant: BattleParticipant,
    role: 'attacker' | 'defender',
  ): Combatant {
    return {
      ...participant,
      role,
      shipClass: this.getShipClass(participant.ship.shipClassId),
    };
  }

  private isActive(combatant: Combatant): boolean {
    return (
      combatant.ship.hull > 0 &&
      combatant.ship.status !== SpacecraftStatus.DESTROYED
    );
  }

  private systemActive(combatant: Combatant, key: string): boolean {
    const system = (
      combatant.ship.runtimeSystems as Record<
        string,
        { active?: boolean; integrity?: number }
      > | null
    )?.[key];
    return system?.active === true && (system.integrity ?? 100) > 0;
  }

  private weapons(
    combatant: Combatant,
    category: 'WEAPONS' | 'PROJECTILE',
  ): SpacecraftModule[] {
    const categories =
      category === 'WEAPONS'
        ? ['WEAPONS', 'ENERGY_WEAPON']
        : ['PROJECTILE', 'TORPEDO_BANK'];
    return combatant.modules.filter(
      (module) =>
        categories.includes(module.category) &&
        module.isActive &&
        module.cooldown === 0 &&
        module.integrity > 0,
    );
  }

  private canFire(combatant: Combatant): boolean {
    return (
      this.isActive(combatant) &&
      this.systemActive(combatant, 'SHORT_RANGE_SENSORS') &&
      combatant.ship.energy > 0 &&
      ((this.systemActive(combatant, 'WEAPONS') &&
        this.weapons(combatant, 'WEAPONS').length > 0) ||
        (this.systemActive(combatant, 'TORPEDO_BANK') &&
          this.weapons(combatant, 'PROJECTILE').length > 0))
    );
  }

  private pick<T>(members: T[]): T {
    return members.length === 1
      ? members[0]
      : members[Math.floor(this.random.next() * members.length)];
  }

  private async fireWeaponsPhase(
    shooter: Combatant,
    targets: Combatant[],
    formulas: CombatFormulas,
    weaponCategory: 'WEAPONS' | 'PROJECTILE',
    log: CombatLogEntry[],
  ): Promise<void> {
    const systemKey = weaponCategory === 'WEAPONS' ? 'WEAPONS' : 'TORPEDO_BANK';
    const weapons = this.weapons(shooter, weaponCategory);
    let target: Combatant | undefined;

    for (const weapon of weapons) {
      if (!this.canFire(shooter) || !this.systemActive(shooter, systemKey))
        break;
      const activeTargets = targets.filter((member) => this.isActive(member));
      if (activeTargets.length === 0) break;
      if (
        !target ||
        !this.isActive(target) ||
        weaponCategory === 'PROJECTILE' ||
        shooter.energyFiringMode === 'RANDOM'
      ) {
        target = this.pick(activeTargets);
      }
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

      if (weaponCategory === 'WEAPONS') {
        const epsCost =
          (weaponDef.secret as Record<string, number>).epsCost ?? 1;
        if (shooter.ship.energy < epsCost) continue;
        shooter.ship.energy -= epsCost;
      }

      if (torpedo) shooter.ship.energy--; // STU projectile volley costs one EPS.

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

      if (this.random.next() > hitChance) {
        const action =
          weaponCategory === 'WEAPONS'
            ? CombatAction.ENERGY_MISS
            : CombatAction.PROJECTILE_MISS;
        log.push({
          action,
          source: shooter.role,
          target: target.role,
          sourceId: shooter.ship.id,
          targetId: target.ship.id,
          weapon: torpedo?.name ?? weapon.moduleType,
        });
        continue;
      }

      const levelScale = 1 + (weapon.level - 1) * formulas.damage.level_scaling;
      const classModifier = this.getClassModifier(shooter.shipClass, formulas);
      const variance = torpedo
        ? 1 -
          Math.max(0, torpedo.variance) / 100 +
          this.random.next() * (Math.max(0, torpedo.variance) / 100) * 2
        : formulas.damage.variance_min +
          this.random.next() *
            (formulas.damage.variance_max - formulas.damage.variance_min);
      const projectileDamageMultiplier =
        torpedo &&
        typeof weaponDef.secret.projectileDamageMultiplier === 'number'
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
      if (!torpedo) {
        damage = Math.ceil(damage * this.energyWeaponFieldMultiplier(shooter));
      }

      const critChance = torpedo
        ? Math.max(0, torpedo.criticalChance) / 100
        : formulas.damage.crit_chance;
      const isCrit = this.random.next() < critChance;
      if (isCrit) {
        damage = Math.round(damage * formulas.damage.crit_multiplier);
        log.push({
          action: CombatAction.CRITICAL_HIT,
          source: shooter.role,
          value: damage,
        });
      }

      // Energy weapon modifiers affect shields only, not hull overflow.
      let shieldModifier = 100;
      if (
        this.systemActive(target, 'SHIELDS') &&
        target.ship.shields > 0 &&
        !torpedo
      ) {
        const weaponFamily = weaponDef.secret.weaponFamily as
          | string
          | undefined;
        const shieldFamily = this.getActiveShieldFamily(target);
        if (weaponFamily && shieldFamily) {
          const modifier = this.gameData.getWeaponShieldModifier(
            weaponFamily,
            shieldFamily,
          );
          if (modifier !== 100) {
            shieldModifier = modifier;
            log.push({
              action: CombatAction.WEAPON_SHIELD_MOD,
              source: shooter.role,
              value: modifier,
              detail: `${weaponFamily} vs ${shieldFamily}`,
            });
          }
        }
      }

      const action =
        weaponCategory === 'WEAPONS'
          ? CombatAction.ENERGY_HIT
          : CombatAction.PROJECTILE_HIT;
      log.push({
        action,
        source: shooter.role,
        target: target.role,
        sourceId: shooter.ship.id,
        targetId: target.ship.id,
        weapon: torpedo?.name ?? weapon.moduleType,
        value: damage,
      });

      this.applyDamage(target, damage, log, isCrit, torpedo, shieldModifier);

      // Ion weapon system disable
      const isIon = weapon.moduleType.toLowerCase().includes('ion');
      if (isIon && this.random.next() < formulas.ion_effects.disable_chance) {
        this.disableRandomSystem(target, formulas, log);
      }
    }
  }

  private applyDamage(
    target: Combatant,
    damage: number,
    log: CombatLogEntry[],
    isCrit: boolean,
    torpedo?: TorpedoTypeDef | null,
    shieldModifier = 100,
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
    const split = splitSpacecraftDamage(target.ship, {
      netDamage: damage,
      shieldDamageFactor: shieldFactor * shieldModifier,
      hullDamageFactor: hullFactor * 100,
    });
    let hullDamage = split.hullDamage;
    if (this.systemActive(target, 'SHIELDS') && target.ship.shields > 0) {
      recordSpacecraftShieldHit(target.ship);
      target.ship.shields -= split.shieldDamage;
      if (target.ship.shields === 0) {
        const shields = target.ship.runtimeSystems?.SHIELDS as {
          active: boolean;
        };
        shields.active = false;
      }
      log.push({
        action: CombatAction.SHIELD_ABSORB,
        source: target.role,
        sourceId: target.ship.id,
        value: split.shieldDamage,
        remaining: target.ship.shields,
      });
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
          sourceId: target.ship.id,
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
        sourceId: target.ship.id,
        value: hullDamage,
        remaining: target.ship.hull,
      });

      // Critical hits can damage modules
      if (isCrit && target.modules.length > 0) {
        const randomMod =
          target.modules[
            Math.floor(this.random.next() * target.modules.length)
          ];
        const integrityLoss = 10 + Math.floor(this.random.next() * 20);
        randomMod.integrity = Math.max(0, randomMod.integrity - integrityLoss);
        log.push({
          action: CombatAction.SYSTEM_DAMAGED,
          source: target.role,
          sourceId: target.ship.id,
          value: integrityLoss,
          detail: randomMod.moduleType,
        });

        if (randomMod.integrity === 0) randomMod.isActive = false;
        for (const key of getRuntimeSystemsForModule(randomMod)) {
          const state = target.ship.runtimeSystems?.[key] as
            | { active: boolean; integrity: number }
            | undefined;
          if (state) {
            state.integrity = Math.max(
              ...target.modules
                .filter((module) =>
                  getRuntimeSystemsForModule(module).includes(key),
                )
                .map((module) => module.integrity),
            );
            if (state.integrity === 0) state.active = false;
          }
        }
      }

      if (target.ship.hull <= 0) {
        log.push({
          action: CombatAction.DESTROYED,
          source: target.role,
          sourceId: target.ship.id,
        });
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

      const percent = (
        resistances as Partial<Record<TorpedoDamageType, unknown>>
      )[damageType];
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

    // STU formula: hitChance * (100 - evadeChance) / 100
    if (shooter.fieldEffects?.includes(FieldEffect.HIT_CHANCE_INTERFERENCE)) {
      hitChance = Math.ceil(hitChance * this.randomPercent(15, 60) * 100) / 100;
    }

    let evadeChance = target.ship.evadeChance ?? 0;
    if (target.fieldEffects?.includes(FieldEffect.EVADE_CHANCE_INTERFERENCE)) {
      const malus = Math.abs(
        Math.trunc((evadeChance / 100) * this.randomPercent(40, 85) * 100),
      );
      evadeChance -= malus;
    }
    hitChance = hitChance * (1 - evadeChance / 100);

    return Math.max(
      formulas.hit_chance.min,
      Math.min(formulas.hit_chance.max, hitChance),
    );
  }

  private energyWeaponFieldMultiplier(shooter: Combatant): number {
    let multiplier = 1;
    if (shooter.fieldEffects?.includes(FieldEffect.ENERGY_WEAPON_BUFF)) {
      multiplier *= this.randomPercent(115, 170);
    }
    if (shooter.fieldEffects?.includes(FieldEffect.ENERGY_WEAPON_NERF)) {
      multiplier *= this.randomPercent(30, 85);
    }
    return multiplier;
  }

  private randomPercent(min: number, max: number): number {
    return (min + this.random.next() * (max - min)) / 100;
  }

  private logFieldEffects(
    combatants: Combatant[],
    log: CombatLogEntry[],
  ): void {
    const logged = new Set<string>();
    for (const combatant of combatants) {
      for (const effect of combatant.fieldEffects ?? []) {
        if (
          ![
            FieldEffect.HIT_CHANCE_INTERFERENCE,
            FieldEffect.EVADE_CHANCE_INTERFERENCE,
            FieldEffect.ENERGY_WEAPON_BUFF,
            FieldEffect.ENERGY_WEAPON_NERF,
          ].includes(effect) ||
          logged.has(effect)
        ) {
          continue;
        }
        logged.add(effect);
        log.push({
          action: CombatAction.FIELD_EFFECT,
          source: combatant.role,
          sourceId: combatant.ship.id,
          detail: this.fieldEffectMessage(effect, combatant.fieldTypeName),
        });
      }
    }
  }

  private fieldEffectMessage(
    effect: FieldEffect,
    fieldTypeName?: string,
  ): string {
    const field = fieldTypeName ?? 'unbekannten Feldtyp';
    switch (effect) {
      case FieldEffect.HIT_CHANCE_INTERFERENCE:
        return `Beeinträchtigung der Zielerfassung durch ${field}`;
      case FieldEffect.EVADE_CHANCE_INTERFERENCE:
        return `Beeinträchtigung der Ausweichmanöver durch ${field}`;
      case FieldEffect.ENERGY_WEAPON_BUFF:
        return `Verstärkung der Energiewaffen durch ${field}`;
      default:
        return `Abschwächung der Energiewaffen durch ${field}`;
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
        for (const key of getRuntimeSystemsForModule(mod)) {
          const state = target.ship.runtimeSystems?.[key] as
            | { active: boolean }
            | undefined;
          if (
            state &&
            !target.modules.some(
              (module) =>
                getRuntimeSystemsForModule(module).includes(key) &&
                module.isActive &&
                module.integrity > 0,
            )
          ) {
            state.active = false;
          }
        }
        log.push({
          action: CombatAction.SYSTEM_DISABLED,
          source: target.role,
          sourceId: target.ship.id,
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

  private getActiveShieldFamily(target: Combatant): string | undefined {
    const allModuleDefs = this.gameData.getAllModules();
    for (const mod of target.modules) {
      if (mod.category !== 'SHIELDS' || !mod.isActive || mod.integrity <= 0) {
        continue;
      }
      const def = allModuleDefs.find(
        (d: ModuleDef) => d.name === mod.moduleType,
      );
      const family = def?.secret?.shieldFamily;
      if (typeof family === 'string') return family;
    }
    return undefined;
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
