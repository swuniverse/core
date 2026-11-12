import type { Spacecraft } from './entities/spacecraft.entity';

/** Port of STU `DamageWrapper` as far as non-combat damage needs it. */
export interface DamageRequest {
  netDamage: number;
  isCrit: boolean;
  /** Percent of the net damage that reaches the hull. */
  hullDamageFactor: number;
  /** Percent of the net damage that reaches the shields. */
  shieldDamageFactor: number;
  /** Runtime systems that may be hit; `null` allows every system. */
  targetSystems: readonly string[] | null;
}

export interface DamageRandom {
  integer(min: number, max: number): number;
}

type SystemState = { active?: boolean; integrity?: number };

const SYSTEM_NAMES: Record<string, string> = {
  DEFLECTOR: 'Deflektor',
  LONG_RANGE_SENSORS: 'Langstreckensensoren',
  SHORT_RANGE_SENSORS: 'Nahbereichssensoren',
  SUBLIGHT_DRIVE: 'Impulsantrieb',
  WARPDRIVE: 'Hyperantrieb',
  SHIELDS: 'Schilde',
};

/**
 * STU `ApplyDamage` with `SystemDamage`: shields first, then hull, critical
 * hits and system damage on the runtime systems. Mutates the spacecraft;
 * persisting and destruction stay with the caller.
 */
export class SpacecraftDamage {
  constructor(private readonly random: DamageRandom) {}

  apply(ship: Spacecraft, request: DamageRequest, info: string[]): { destroyed: boolean } {
    const damage = { ...request };
    if (damage.netDamage <= 0) return { destroyed: false };
    const systems = this.systems(ship);
    if (systems.SHIELDS?.active && ship.shields > 0) this.damageShields(ship, systems, damage, info);
    if (damage.netDamage <= 0) return { destroyed: false };

    const hullDamage = Math.round((damage.netDamage / 100) * damage.hullDamageFactor);
    if (ship.hull > hullDamage) {
      this.damageHull(ship, systems, damage, hullDamage, info);
      return { destroyed: false };
    }
    if (damage.isCrit) info.push('- Kritischer Hüllen-Treffer');
    info.push(`- Hüllenschaden: ${hullDamage}`);
    info.push('-- Das Schiff wurde zerstört!');
    ship.hull = 0;
    return { destroyed: true };
  }

  private damageShields(ship: Spacecraft, systems: Record<string, SystemState>, damage: DamageRequest, info: string[]): void {
    const factor = damage.shieldDamageFactor / 100;
    const needed = Math.min(damage.netDamage, Math.ceil(ship.shields / factor));
    const absorbed = Math.trunc(Math.min(ship.shields, needed * factor));
    damage.netDamage = needed >= damage.netDamage ? 0 : damage.netDamage - needed;
    if (absorbed >= ship.shields) {
      info.push(`- Schildschaden: ${ship.shields}`);
      info.push('-- Schilde brechen zusammen!');
      if (systems.SHIELDS) systems.SHIELDS.active = false;
      ship.shields = 0;
      return;
    }
    ship.shields -= absorbed;
    info.push(`- Schildschaden: ${absorbed} - Status: ${ship.shields}`);
  }

  private damageHull(ship: Spacecraft, systems: Record<string, SystemState>, damage: DamageRequest, hullDamage: number, info: string[]): void {
    if (damage.isCrit) this.criticalHit(ship, systems, damage, info);
    const before = ship.hull;
    ship.hull -= hullDamage;
    info.push(`- Hüllenschaden: ${hullDamage} - Status: ${ship.hull}`);
    if (!this.damageSystemsByHullLoss(ship, systems, damage, before, info)) {
      this.damageRandomSystem(systems, damage, info, Math.ceil((100 * hullDamage * this.random.integer(1, 5)) / ship.hullMax));
    }
  }

  /** STU `checkForDamagedShipSystems`: one system per lost sixth of the hull. */
  private damageSystemsByHullLoss(ship: Spacecraft, systems: Record<string, SystemState>, damage: DamageRequest, before: number, info: string[]): boolean {
    const count = Math.ceil((before * 6) / ship.hullMax) - Math.ceil((ship.hull * 6) / ship.hullMax);
    if (count === 0) return false;
    for (let index = 0; index < count; index++) this.damageRandomSystem(systems, damage, info);
    return true;
  }

  private criticalHit(ship: Spacecraft, systems: Record<string, SystemState>, damage: DamageRequest, info: string[]): void {
    const hullPercentage = (ship.hull / ship.hullMax) * 100;
    if (hullPercentage > 50) {
      const percent = this.random.integer(30, 60);
      info.push(`- Kritischer Hüllen-Treffer verursacht ${percent}% Systemschaden`);
      this.damageRandomSystem(systems, damage, info, percent);
      return;
    }
    const destructionChance = (50 - hullPercentage) / 50;
    if (this.random.integer(1, 100) <= destructionChance * 100) {
      const key = this.pickHealthySystem(systems, damage);
      if (key) {
        systems[key].integrity = 0;
        systems[key].active = false;
        info.push(`- Kritischer Hüllen-Treffer zerstört System: ${SYSTEM_NAMES[key] ?? key}`);
      }
      return;
    }
    const percent = this.random.integer(50, 90);
    info.push(`- Kritischer Hüllen-Treffer verursacht ${percent}% Systemschaden`);
    this.damageRandomSystem(systems, damage, info, percent);
  }

  private damageRandomSystem(systems: Record<string, SystemState>, damage: DamageRequest, info: string[], percent?: number): void {
    const key = this.pickHealthySystem(systems, damage);
    if (!key) return;
    const amount = percent ?? this.random.integer(1, 70);
    const system = systems[key];
    const integrity = system.integrity ?? 100;
    if (integrity > amount) {
      system.integrity = integrity - amount;
      info.push(`- Folgendes System wurde beschädigt: ${SYSTEM_NAMES[key] ?? key}`);
      return;
    }
    system.integrity = 0;
    system.active = false;
    info.push(`- Der Schaden zerstört folgendes System: ${SYSTEM_NAMES[key] ?? key}`);
  }

  private pickHealthySystem(systems: Record<string, SystemState>, damage: DamageRequest): string | null {
    const healthy = Object.keys(systems)
      .filter((key) => damage.targetSystems == null || damage.targetSystems.includes(key))
      .filter((key) => (systems[key].integrity ?? 100) > 0)
      .sort();
    return healthy.length ? healthy[this.random.integer(0, healthy.length - 1)] : null;
  }

  private systems(ship: Spacecraft): Record<string, SystemState> {
    return ship.runtimeSystems as Record<string, SystemState>;
  }
}
