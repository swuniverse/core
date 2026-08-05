jest.mock('../spacecraft/entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  SpacecraftStatus: {
    DOCKED: 'DOCKED',
    IN_COMBAT: 'IN_COMBAT',
    DESTROYED: 'DESTROYED',
  },
  AlertState: { RED: 'RED', YELLOW: 'YELLOW' },
}));

jest.mock('../spacecraft/entities/spacecraft-module.entity', () => ({
  SpacecraftModule: class SpacecraftModule {},
}));
jest.mock('../spacecraft/spacecraft-torpedo.service', () => ({
  SpacecraftTorpedoService: class SpacecraftTorpedoService {},
}));
jest.mock('../colony/colony-storage.service', () => ({
  ColonyStorageService: class ColonyStorageService {},
}));
jest.mock('../colony/entities/colony-storage.entity', () => ({
  ColonyStorage: class ColonyStorage {},
}));
jest.mock('../colony/entities/colony.entity', () => ({
  Colony: class Colony {},
}));
jest.mock('../auth/user.entity', () => ({
  User: class User {},
}));
jest.mock('../spacecraft/entities/ship-class-def.entity', () => ({
  ShipClassDef: class ShipClassDef {},
}));


import { CombatAction, CombatEngine } from './combat.engine';
import type { CombatFormulas, TorpedoTypeDef } from '../game-data/game-data.service';

function combatFormulas(): CombatFormulas {
  return {
    damage: {
      base_multiplier: 1,
      level_scaling: 0.2,
      variance_min: 1,
      variance_max: 1,
      crit_chance: 0,
      crit_multiplier: 1.5,
    },
    shields: {
      efficiency: 0.8,
      recharge_rate: 0,
      bleedthrough: 0.1,
    },
    hit_chance: {
      base: 0.7,
      speed_modifier: 0.01,
      min: 0.3,
      max: 0.95,
    },
    ship_class_modifiers: {
      CORVETTE: { damage: 1, speed: 1, hull: 1, evasion: 1 },
    },
    combat_flow: {
      max_rounds: 1,
      initiative: { speed_weight: 0.6, sensor_weight: 0.4 },
      escape: { base_chance: 0.3, speed_bonus: 0.05, damage_penalty: 0.1 },
    },
    ion_effects: {
      disable_chance: 0,
      disable_duration: 2,
      systems_priority: ['SHIELDS', 'WEAPONS'],
    },
  };
}

describe('CombatEngine projectile specialization', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('applies torpedo hull factors and active hull projectile resistance', async () => {
    jest.spyOn(Math, 'random')
      .mockReturnValueOnce(0.1) // hit
      .mockReturnValueOnce(0.5) // variance midpoint
      .mockReturnValueOnce(0.99); // no crit

    const gameData = {
      getCombatFormulas: jest.fn(() => combatFormulas()),
      getAllModules: jest.fn(() => [
        {
          name: 'Protonenraketen-System',
          category: 'WEAPONS',
          public: {},
          secret: { baseDamage: 30 },
        },
        {
          name: 'Ablative Durastahl-Panzerung',
          category: 'HULL',
          public: { baseHullPoints: 27, baseCrewCapacity: 0 },
          secret: { projectileResistances: { QUANTUM: 30 } },
        },
      ]),
    };
    const torpedo: TorpedoTypeDef = {
      id: 84,
      commodityId: 84,
      name: 'Schwerer Protonentorpedo',
      level: 4,
      baseDamage: 100,
      criticalChance: 0,
      hitFactor: 95,
      hullDamageFactor: 200,
      shieldDamageFactor: 100,
      variance: 0,
      energyCost: 10,
      productionAmount: 1,
      researchId: 501100,
      damageType: 'QUANTUM',
    };
    const torpedoService = { consumeForAttack: jest.fn(async () => torpedo) };
    const gameDataArg = gameData as unknown as ConstructorParameters<typeof CombatEngine>[0];
    const torpedoServiceArg = torpedoService as unknown as ConstructorParameters<typeof CombatEngine>[1];
    const engine = new CombatEngine(gameDataArg, torpedoServiceArg);
    const attacker = {
      id: 1,
      shipClassId: 3,
      hull: 1000,
      hullMax: 1000,
      shields: 0,
      shieldsMax: 0,
      energy: 100,
      status: 'DOCKED',
      alertState: 'GREEN',
    };
    const defender = {
      id: 2,
      shipClassId: 3,
      hull: 1000,
      hullMax: 1000,
      shields: 0,
      shieldsMax: 0,
      energy: 100,
      status: 'DOCKED',
      alertState: 'GREEN',
    };

    const result = await engine.resolveCombat(
      attacker as unknown as Parameters<CombatEngine['resolveCombat']>[0],
      defender as unknown as Parameters<CombatEngine['resolveCombat']>[1],
      [
        {
          spacecraftId: 1,
          moduleType: 'Protonenraketen-System',
          category: 'PROJECTILE',
          level: 1,
          integrity: 100,
          cooldown: 0,
          isActive: true,
        },
      ] as unknown as Parameters<CombatEngine['resolveCombat']>[2],
      [
        {
          spacecraftId: 2,
          moduleType: 'Ablative Durastahl-Panzerung',
          category: 'HULL',
          level: 1,
          integrity: 100,
          cooldown: 0,
          isActive: true,
        },
      ] as unknown as Parameters<CombatEngine['resolveCombat']>[3],
    );

    expect(defender.hull).toBe(860);
    expect(result.rounds[0].log).toContainEqual(
      expect.objectContaining({
        action: CombatAction.ARMOR_ABSORB,
        value: 60,
        detail: 'QUANTUM by Ablative Durastahl-Panzerung',
      }),
    );
    expect(result.rounds[0].log).toContainEqual(
      expect.objectContaining({ action: CombatAction.HULL_DAMAGE, value: 140 }),
    );
  });

  it('applies projectile launcher damage multipliers', async () => {
    jest.spyOn(Math, 'random')
      .mockReturnValueOnce(0.1) // hit
      .mockReturnValueOnce(0.5) // variance midpoint
      .mockReturnValueOnce(0.99); // no crit

    const gameData = {
      getCombatFormulas: jest.fn(() => combatFormulas()),
      getAllModules: jest.fn(() => [
        {
          name: 'Mehrfach-Torpedorampe',
          category: 'WEAPONS',
          public: {},
          secret: { baseDamage: 30, projectileDamageMultiplier: 1.5 },
        },
      ]),
    };
    const torpedo: TorpedoTypeDef = {
      id: 83,
      commodityId: 83,
      name: 'Protonentorpedo',
      level: 3,
      baseDamage: 100,
      criticalChance: 0,
      hitFactor: 95,
      hullDamageFactor: 100,
      shieldDamageFactor: 100,
      variance: 0,
      energyCost: 8,
      productionAmount: 1,
      researchId: 500300,
      damageType: 'PROTON',
    };
    const torpedoService = { consumeForAttack: jest.fn(async () => torpedo) };
    const gameDataArg = gameData as unknown as ConstructorParameters<typeof CombatEngine>[0];
    const torpedoServiceArg = torpedoService as unknown as ConstructorParameters<typeof CombatEngine>[1];
    const engine = new CombatEngine(gameDataArg, torpedoServiceArg);
    const attacker = {
      id: 1,
      shipClassId: 3,
      hull: 1000,
      hullMax: 1000,
      shields: 0,
      shieldsMax: 0,
      energy: 100,
      status: 'DOCKED',
      alertState: 'GREEN',
    };
    const defender = {
      id: 2,
      shipClassId: 3,
      hull: 1000,
      hullMax: 1000,
      shields: 0,
      shieldsMax: 0,
      energy: 100,
      status: 'DOCKED',
      alertState: 'GREEN',
    };

    const result = await engine.resolveCombat(
      attacker as unknown as Parameters<CombatEngine['resolveCombat']>[0],
      defender as unknown as Parameters<CombatEngine['resolveCombat']>[1],
      [
        {
          spacecraftId: 1,
          moduleType: 'Mehrfach-Torpedorampe',
          category: 'PROJECTILE',
          level: 1,
          integrity: 100,
          cooldown: 0,
          isActive: true,
        },
      ] as unknown as Parameters<CombatEngine['resolveCombat']>[2],
      [] as unknown as Parameters<CombatEngine['resolveCombat']>[3],
    );

    expect(result.rounds[0].log).toContainEqual(
      expect.objectContaining({ action: CombatAction.PROJECTILE_HIT, value: 150 }),
    );
    expect(result.rounds[0].log).toContainEqual(
      expect.objectContaining({ action: CombatAction.HULL_DAMAGE, value: 150 }),
    );
  });
});

describe('CombatEngine runtimeSystems integration', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  function makeEngine() {
    const gameData = {
      getCombatFormulas: jest.fn(() => combatFormulas()),
      getAllModules: jest.fn(() => [
        { name: 'Turbolaser', category: 'WEAPONS', public: {}, secret: { baseDamage: 50 } },
        { name: 'Torpedorampe', category: 'PROJECTILE', public: {}, secret: { baseDamage: 50 } },
      ]),
    };
    const torpedoService = { consumeForAttack: jest.fn(async () => null) };
    return new CombatEngine(
      gameData as unknown as ConstructorParameters<typeof CombatEngine>[0],
      torpedoService as unknown as ConstructorParameters<typeof CombatEngine>[1],
    );
  }

  function makeShip(overrides: Record<string, unknown> = {}) {
    return {
      id: 1, shipClassId: 3,
      hull: 1000, hullMax: 1000,
      shields: 500, shieldsMax: 500,
      energy: 100,
      evadeChance: 0,
      runtimeSystems: null,
      status: 'DOCKED', alertState: 'GREEN',
      ...overrides,
    };
  }

  const weaponModule = (cat: string) => ({
    spacecraftId: 1,
    moduleType: cat === 'WEAPONS' ? 'Turbolaser' : 'Torpedorampe',
    category: cat,
    level: 1, integrity: 100, cooldown: 0, isActive: true,
  });

  it('disabled WEAPONS system prevents energy weapons from firing', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.1); // always hit
    const engine = makeEngine();
    const attacker = makeShip({ runtimeSystems: { WEAPONS: { active: false } } });
    const defender = makeShip();

    const result = await engine.resolveCombat(
      attacker as any, defender as any,
      [weaponModule('WEAPONS')] as any, [] as any,
    );

    expect(result.rounds[0].log.filter(e => e.action === CombatAction.ENERGY_HIT)).toHaveLength(0);
    expect(result.rounds[0].log.filter(e => e.action === CombatAction.HULL_DAMAGE)).toHaveLength(0);
  });

  it('disabled TORPEDO_BANK system prevents projectile weapons from firing', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.1); // always hit
    const engine = makeEngine();
    const attacker = makeShip({ runtimeSystems: { TORPEDO_BANK: { active: false } } });
    const defender = makeShip();

    const result = await engine.resolveCombat(
      attacker as any, defender as any,
      [weaponModule('PROJECTILE')] as any, [] as any,
    );

    expect(result.rounds[0].log.filter(e => e.action === CombatAction.PROJECTILE_HIT)).toHaveLength(0);
  });

  it('disabled SHIELDS system prevents shield regeneration', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.99); // always miss
    const engine = makeEngine();
    const attacker = makeShip();
    const defender = makeShip({
      shields: 0, shieldsMax: 500,
      runtimeSystems: { SHIELDS: { active: false } },
    });
    const formulas = combatFormulas();
    (engine as any).gameData.getCombatFormulas.mockReturnValue({
      ...formulas,
      shields: { ...formulas.shields, recharge_rate: 0.1 },
    });

    const result = await engine.resolveCombat(
      attacker as any, defender as any,
      [] as any,
      [{ spacecraftId: 2, moduleType: 'Shields', category: 'SHIELDS', level: 1, integrity: 100, cooldown: 0, isActive: true }] as any,
    );

    expect(result.rounds[0].log.filter(e => e.action === CombatAction.SHIELD_REGEN)).toHaveLength(0);
    expect(defender.shields).toBe(0);
  });

  it('evadeChance > 0 reduces hit chance (STU multiplicative formula)', async () => {
    // With evadeChance=50 and base hit=0.7: effective = 0.7 * 0.5 = 0.35
    // random() = 0.4 > 0.35 → miss
    jest.spyOn(Math, 'random').mockReturnValue(0.4);
    const engine = makeEngine();
    const attacker = makeShip({ energy: 1000 });
    const defender = makeShip({ evadeChance: 50 });

    const result = await engine.resolveCombat(
      attacker as any, defender as any,
      [weaponModule('WEAPONS')] as any, [] as any,
    );

    expect(result.rounds[0].log.filter(e => e.action === CombatAction.ENERGY_HIT)).toHaveLength(0);
    expect(result.rounds[0].log.filter(e => e.action === CombatAction.ENERGY_MISS)).toHaveLength(1);
  });

  it('energy weapon does not fire when EPS is insufficient', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.1); // would hit
    const engine = makeEngine();
    const attacker = makeShip({ energy: 0 }); // no EPS
    const defender = makeShip();

    const result = await engine.resolveCombat(
      attacker as any, defender as any,
      [weaponModule('WEAPONS')] as any, [] as any,
    );

    expect(result.rounds[0].log.filter(e => e.action === CombatAction.ENERGY_HIT)).toHaveLength(0);
    expect(result.rounds[0].log.filter(e => e.action === CombatAction.ENERGY_MISS)).toHaveLength(0);
  });
});
