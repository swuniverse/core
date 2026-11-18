jest.mock('../spacecraft/entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  SpacecraftStatus: {
    IDLE: 'IDLE',
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
import { CombatCause } from './combat-cause';
import { CombatReportFormatter } from './combat-report.formatter';
import type {
  CombatFormulas,
  TorpedoTypeDef,
} from '../game-data/game-data.service';

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
      initiative: { speed_weight: 0.6, sensor_weight: 0.4 },
    },
    ion_effects: {
      disable_chance: 0,
      disable_duration: 2,
      systems_priority: ['SHIELDS', 'WEAPONS'],
    },
  };
}

describe('CombatEngine STU matchups', () => {
  const shots = (result: Awaited<ReturnType<CombatEngine['resolveBattle']>>) =>
    result.rounds[0].log.filter((entry) =>
      [
        CombatAction.ENERGY_HIT,
        CombatAction.PROJECTILE_HIT,
        CombatAction.ENERGY_MISS,
        CombatAction.PROJECTILE_MISS,
      ].includes(entry.action),
    );
  const module = (category: string) => ({
    moduleType:
      category === 'WEAPONS' || category === 'ENERGY_WEAPON'
        ? 'Laser'
        : 'Torpedorampe',
    category,
    integrity: 100,
    level: 1,
    cooldown: 0,
    isActive: true,
  });
  const member = (id: number, categories = ['WEAPONS', 'PROJECTILE']): any => ({
    ship: {
      id,
      name: `Schiff ${id}`,
      userId: id,
      shipClassId: 3,
      hull: 5000,
      hullMax: 5000,
      shields: 0,
      energy: 100,
      status: 'IDLE',
      runtimeSystems: {
        SHORT_RANGE_SENSORS: { active: true, integrity: 100 },
        WEAPONS: { active: true, integrity: 100 },
        TORPEDO_BANK: { active: true, integrity: 100 },
        SHIELDS: { active: true, integrity: 100 },
      },
    },
    modules: categories.map(module),
  });
  function fixture(next: () => number = () => 0.9) {
    const formulas = combatFormulas();
    formulas.hit_chance = { base: 1, min: 0, max: 1, speed_modifier: 0 };
    const torpedo = {
      baseDamage: 10,
      hitFactor: 100,
      criticalChance: 0,
      variance: 0,
      hullDamageFactor: 100,
      shieldDamageFactor: 100,
      name: 'Protonentorpedo',
    };
    const torpedoes = { consumeForAttack: jest.fn(async () => torpedo) };
    const gameData = {
      getCombatFormulas: () => formulas,
      getAllModules: () => [
        { name: 'Laser', secret: { baseDamage: 10 }, public: {} },
        { name: 'Torpedorampe', secret: {}, public: {} },
      ],
      getWeaponShieldModifier: () => 100,
    };
    return {
      engine: new CombatEngine(gameData as any, torpedoes as any, { next }),
      torpedoes,
      formulas,
    };
  }
  function scripted(values: number[]) {
    return () => values.shift() ?? 0.5;
  }

  it('opens with a random attacker, then tosses a coin and gives each ship one energy/projectile turn', async () => {
    const { engine, torpedoes } = fixture();
    const attackers = [member(1), member(2)];
    const defenders = [member(3), member(4)];
    const result = await engine.resolveBattle(attackers, defenders);
    expect(shots(result).map((shot) => shot.sourceId)).toEqual([
      2, 2, 4, 4, 3, 3, 1, 1,
    ]);
    for (let index = 0; index < shots(result).length; index += 2) {
      expect(
        shots(result)
          .slice(index, index + 2)
          .map((shot) => shot.action),
      ).toEqual([CombatAction.ENERGY_HIT, CombatAction.PROJECTILE_HIT]);
    }
    expect(torpedoes.consumeForAttack).toHaveBeenCalledTimes(4);
    expect(
      [...attackers, ...defenders].map(
        (participant) => participant.ship.energy,
      ),
    ).toEqual([98, 98, 98, 98]);
    expect(shots(result)[0].targetId).toBe(4); // not always the first defender
  });

  it('can choose the attacker again on the next coin toss', async () => {
    const { engine } = fixture(() => 0.1);
    const result = await engine.resolveBattle(
      [member(1, ['WEAPONS']), member(2, ['WEAPONS'])],
      [member(3, ['WEAPONS'])],
    );
    expect(shots(result).map((shot) => shot.sourceId)).toEqual([1, 2, 3]);
  });

  it.each([CombatCause.ACTIVATE_TRACTOR, CombatCause.BOARD_SHIP])(
    'allows only attackers to fire for %s',
    async (cause) => {
      const { engine } = fixture();
      const defender = member(3);
      const result = await engine.resolveBattle(
        [member(1), member(2)],
        [defender],
        cause,
      );
      expect(shots(result)).toHaveLength(4);
      expect(shots(result).every((shot) => shot.source === 'attacker')).toBe(
        true,
      );
      expect(defender.ship.energy).toBe(100);
    },
  );

  it.each([
    'off-nbs',
    'missing-nbs',
    'destroyed-nbs',
    'off-weapons',
    'missing-weapons',
    'no-eps',
    'broken-module',
    'cooldown',
  ])('does not fire with %s', async (reason) => {
    const { engine, torpedoes } = fixture();
    const attacker = member(1, ['WEAPONS']);
    const systems = attacker.ship.runtimeSystems;
    if (reason === 'off-nbs') systems.SHORT_RANGE_SENSORS.active = false;
    if (reason === 'missing-nbs') delete systems.SHORT_RANGE_SENSORS;
    if (reason === 'destroyed-nbs') systems.SHORT_RANGE_SENSORS.integrity = 0;
    if (reason === 'off-weapons') systems.WEAPONS.active = false;
    if (reason === 'missing-weapons') delete systems.WEAPONS;
    if (reason === 'no-eps') attacker.ship.energy = 0;
    if (reason === 'broken-module') attacker.modules[0].integrity = 0;
    if (reason === 'cooldown') attacker.modules[0].cooldown = 2;
    const energy = attacker.ship.energy;
    expect(shots(await engine.resolveBattle([attacker], [member(2)]))).toEqual(
      [],
    );
    expect(attacker.ship.energy).toBe(energy);
    expect(torpedoes.consumeForAttack).not.toHaveBeenCalled();
  });

  it('stops after the last EPS is spent before consuming a torpedo', async () => {
    const { engine, torpedoes } = fixture();
    const attacker = member(1);
    attacker.ship.energy = 1;
    const result = await engine.resolveBattle([attacker], [member(2, [])]);
    expect(shots(result).map((shot) => shot.action)).toEqual([
      CombatAction.ENERGY_HIT,
    ]);
    expect(torpedoes.consumeForAttack).not.toHaveBeenCalled();
    expect(attacker.ship.energy).toBe(0);
  });

  it.each(['FOCUS', 'RANDOM', 'PROJECTILE'])(
    'keeps energy focus or reselects each %s volley as required',
    async (mode) => {
      const { engine } = fixture(
        scripted([0, 0.5, 0.5, 0.5, 0.99, 0.5, 0.5, 0.5]),
      );
      const category = mode === 'PROJECTILE' ? 'PROJECTILE' : 'WEAPONS';
      const attacker = member(1, [category, category]);
      attacker.energyFiringMode = mode === 'RANDOM' ? 'RANDOM' : 'FOCUS';
      const result = await engine.resolveBattle(
        [attacker],
        [member(2, []), member(3, [])],
      );
      expect(shots(result).map((shot) => shot.targetId)).toEqual(
        mode === 'FOCUS' ? [2, 2] : [2, 3],
      );
    },
  );

  it('reselects a live target after destruction and reports the actual ship name', async () => {
    const { engine } = fixture(() => 0.1);
    const defenders = [member(2, []), member(3, [])];
    defenders[0].ship.hull = 5;
    const attacker = member(1, ['WEAPONS', 'WEAPONS']);
    const result = await engine.resolveBattle([attacker], defenders);
    expect(shots(result).map((shot) => shot.targetId)).toEqual([2, 3]);
    expect(result.destroyedShipIds).toEqual([2]);
    const report = new CombatReportFormatter().formatBattle(
      result,
      [attacker.ship],
      defenders.map((entry) => entry.ship),
    );
    expect(report.rounds[0].lines).toContainEqual(
      expect.objectContaining({
        kind: CombatAction.DESTROYED,
        text: 'Schiff 2 wurde zerstört.',
        sourceId: 2,
      }),
    );
  });

  it('directs damage to the hull when shields are OFF and shares shield overflow factors', async () => {
    for (const active of [false, true]) {
      const { engine } = fixture();
      const target = member(2, []);
      target.ship.shields = 6;
      target.ship.runtimeSystems.SHIELDS.active = active;
      await engine.resolveBattle([member(1, ['WEAPONS'])], [target]);
      expect(target.ship.shields).toBe(active ? 0 : 6);
      expect(target.ship.hull).toBe(active ? 4996 : 4990);
      expect(target.ship.runtimeSystems.SHIELDS.active).toBe(false);
    }
  });

  it('supports canonical shipyard weapon categories and never reuses a destroyed shooter', async () => {
    const { engine } = fixture(() => 0.1);
    const defender = member(2, ['ENERGY_WEAPON', 'TORPEDO_BANK']);
    defender.ship.hull = 5;
    const result = await engine.resolveBattle(
      [member(1, ['ENERGY_WEAPON'])],
      [defender],
    );
    expect(shots(result).map((shot) => shot.sourceId)).toEqual([1]);
    expect(result.winner).toBe('attacker');
  });

  it('rechecks firing eligibility after critical damage destroys the target NBS', async () => {
    const { engine, formulas } = fixture(() => 0.1);
    formulas.damage.crit_chance = 1;
    const defender = member(2, ['WEAPONS']);
    defender.modules.unshift({ ...module('SENSORS'), integrity: 5 });
    const result = await engine.resolveBattle(
      [member(1, ['WEAPONS'])],
      [defender],
    );
    expect(shots(result).map((shot) => shot.sourceId)).toEqual([1]);
    expect(defender.ship.runtimeSystems.SHORT_RANGE_SENSORS).toMatchObject({
      active: false,
      integrity: 0,
    });
    expect(defender.modules[0].isActive).toBe(false);
  });
});

describe('CombatEngine battle parties', () => {
  it('lets every surviving ship fire and removes destroyed targets', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.1);
    const formulas = combatFormulas();
    const gameData = {
      getCombatFormulas: jest.fn(() => formulas),
      getAllModules: jest.fn(() => [
        {
          name: 'Turbolaser',
          category: 'WEAPONS',
          public: {},
          secret: { baseDamage: 100, epsCost: 0 },
        },
      ]),
      getWeaponShieldModifier: jest.fn(() => 100),
    };
    const engine = new CombatEngine(
      gameData as any,
      {
        consumeForAttack: jest.fn(async () => null),
      } as any,
    );
    const ship = (id: number, hull = 100) =>
      ({
        id,
        name: `Ship ${id}`,
        shipClassId: 3,
        hull,
        hullMax: hull,
        shields: 0,
        shieldsMax: 0,
        energy: 100,
        runtimeSystems: {
          SHORT_RANGE_SENSORS: { active: true },
          WEAPONS: { active: true },
          TORPEDO_BANK: { active: true },
          SHIELDS: { active: true },
        },
        status: 'IDLE',
        alertState: 'GREEN',
      }) as any;
    const weapon = (spacecraftId: number) =>
      ({
        spacecraftId,
        moduleType: 'Turbolaser',
        category: 'WEAPONS',
        level: 1,
        integrity: 100,
        cooldown: 0,
        isActive: true,
      }) as any;
    const attackers = [
      { ship: ship(1), modules: [weapon(1)] },
      { ship: ship(2), modules: [weapon(2)] },
    ];
    const defenders = [
      { ship: ship(3, 50), modules: [weapon(3)] },
      { ship: ship(4, 200), modules: [weapon(4)] },
    ];

    const result = await engine.resolveBattle(attackers, defenders);

    expect(result.rounds[0].log).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceId: 1, targetId: 3 }),
        expect.objectContaining({ sourceId: 2, targetId: 4 }),
        expect.objectContaining({ sourceId: 4, targetId: 1 }),
      ]),
    );
    expect(result.destroyedShipIds).toContain(3);
    expect(
      result.rounds[0].log.some(
        (entry) =>
          entry.sourceId === 3 &&
          [
            CombatAction.ENERGY_HIT,
            CombatAction.ENERGY_MISS,
            CombatAction.PROJECTILE_HIT,
            CombatAction.PROJECTILE_MISS,
          ].includes(entry.action),
      ),
    ).toBe(false);
  });
});

describe('CombatEngine projectile specialization', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('applies torpedo hull factors and active hull projectile resistance', async () => {
    jest
      .spyOn(Math, 'random')
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
    const gameDataArg = gameData as unknown as ConstructorParameters<
      typeof CombatEngine
    >[0];
    const torpedoServiceArg =
      torpedoService as unknown as ConstructorParameters<
        typeof CombatEngine
      >[1];
    const engine = new CombatEngine(gameDataArg, torpedoServiceArg);
    const attacker = {
      id: 1,
      shipClassId: 3,
      hull: 1000,
      hullMax: 1000,
      shields: 0,
      shieldsMax: 0,
      energy: 100,
      runtimeSystems: {
        SHORT_RANGE_SENSORS: { active: true },
        WEAPONS: { active: true },
        TORPEDO_BANK: { active: true },
        SHIELDS: { active: true },
      },
      status: 'IDLE',
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
      runtimeSystems: {
        SHORT_RANGE_SENSORS: { active: true },
        WEAPONS: { active: true },
        TORPEDO_BANK: { active: true },
        SHIELDS: { active: true },
      },
      status: 'IDLE',
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
    jest
      .spyOn(Math, 'random')
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
    const gameDataArg = gameData as unknown as ConstructorParameters<
      typeof CombatEngine
    >[0];
    const torpedoServiceArg =
      torpedoService as unknown as ConstructorParameters<
        typeof CombatEngine
      >[1];
    const engine = new CombatEngine(gameDataArg, torpedoServiceArg);
    const attacker = {
      id: 1,
      shipClassId: 3,
      hull: 1000,
      hullMax: 1000,
      shields: 0,
      shieldsMax: 0,
      energy: 100,
      runtimeSystems: {
        SHORT_RANGE_SENSORS: { active: true },
        WEAPONS: { active: true },
        TORPEDO_BANK: { active: true },
        SHIELDS: { active: true },
      },
      status: 'IDLE',
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
      runtimeSystems: {
        SHORT_RANGE_SENSORS: { active: true },
        WEAPONS: { active: true },
        TORPEDO_BANK: { active: true },
        SHIELDS: { active: true },
      },
      status: 'IDLE',
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
      expect.objectContaining({
        action: CombatAction.PROJECTILE_HIT,
        value: 150,
      }),
    );
    expect(result.rounds[0].log).toContainEqual(
      expect.objectContaining({ action: CombatAction.HULL_DAMAGE, value: 150 }),
    );
  });
});

describe('CombatEngine weapon-vs-shield modifier', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('PHASER vs PHASIC shield (modifier 120) increases shield damage', async () => {
    // variance fixed to 1, no crit
    jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0.1) // hit
      .mockReturnValueOnce(0.5) // variance midpoint → 1.0 (min=1, max=1)
      .mockReturnValueOnce(0.99); // no crit

    const gameData = {
      getCombatFormulas: jest.fn(() => combatFormulas()),
      getAllModules: jest.fn(() => [
        {
          name: 'Leichter Turbolaser',
          category: 'WEAPONS',
          public: {},
          secret: {
            baseDamage: 15,
            tibannaConsumption: 8,
            weaponFamily: 'PHASER',
          },
        },
        {
          name: 'Verstärkter Deflektorschild',
          category: 'SHIELDS',
          public: {},
          secret: {
            baseShieldStrength: 35,
            tibannaConsumption: 8,
            shieldFamily: 'PHASIC',
          },
        },
      ]),
      getWeaponShieldModifier: jest.fn((wf: string, sf: string) => {
        if (wf === 'PHASER' && sf === 'PHASIC') return 120;
        return 100;
      }),
    };
    const torpedoService = { consumeForAttack: jest.fn(async () => null) };
    const engine = new CombatEngine(
      gameData as unknown as ConstructorParameters<typeof CombatEngine>[0],
      torpedoService as unknown as ConstructorParameters<
        typeof CombatEngine
      >[1],
    );

    const attacker = {
      id: 1,
      shipClassId: 3,
      hull: 1000,
      hullMax: 1000,
      shields: 0,
      shieldsMax: 0,
      energy: 100,
      runtimeSystems: {
        SHORT_RANGE_SENSORS: { active: true },
        WEAPONS: { active: true },
        TORPEDO_BANK: { active: true },
        SHIELDS: { active: true },
      },
      status: 'IDLE',
      alertState: 'GREEN',
    };
    // Defender has shields so modifier applies
    const defender = {
      id: 2,
      shipClassId: 3,
      hull: 1000,
      hullMax: 1000,
      shields: 500,
      shieldsMax: 500,
      energy: 100,
      runtimeSystems: {
        SHORT_RANGE_SENSORS: { active: true },
        WEAPONS: { active: true },
        TORPEDO_BANK: { active: true },
        SHIELDS: { active: true },
      },
      status: 'IDLE',
      alertState: 'GREEN',
    };

    const result = await engine.resolveCombat(
      attacker as unknown as Parameters<CombatEngine['resolveCombat']>[0],
      defender as unknown as Parameters<CombatEngine['resolveCombat']>[1],
      [
        {
          spacecraftId: 1,
          moduleType: 'Leichter Turbolaser',
          category: 'WEAPONS',
          level: 1,
          integrity: 100,
          cooldown: 0,
          isActive: true,
        },
      ] as unknown as Parameters<CombatEngine['resolveCombat']>[2],
      [
        {
          spacecraftId: 2,
          moduleType: 'Verstärkter Deflektorschild',
          category: 'SHIELDS',
          level: 1,
          integrity: 100,
          cooldown: 0,
          isActive: true,
        },
      ] as unknown as Parameters<CombatEngine['resolveCombat']>[3],
    );

    // baseDamage=15, level=1 → levelScale=1, classModifier=1, variance=1, base_multiplier=1 → damage=15
    // modifier=120 → damage = round(15 * 1.2) = 18
    // Active shields take all 18 damage; no fixed hull leakage.
    expect(defender.shields).toBe(482);
    expect(defender.hull).toBe(1000);

    expect(result.rounds[0].log).toContainEqual(
      expect.objectContaining({
        action: CombatAction.WEAPON_SHIELD_MOD,
        value: 120,
        detail: 'PHASER vs PHASIC',
      }),
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
        {
          name: 'Turbolaser',
          category: 'WEAPONS',
          public: {},
          secret: { baseDamage: 50 },
        },
        {
          name: 'Torpedorampe',
          category: 'PROJECTILE',
          public: {},
          secret: { baseDamage: 50 },
        },
      ]),
    };
    const torpedoService = { consumeForAttack: jest.fn(async () => null) };
    return new CombatEngine(
      gameData as unknown as ConstructorParameters<typeof CombatEngine>[0],
      torpedoService as unknown as ConstructorParameters<
        typeof CombatEngine
      >[1],
    );
  }

  function makeShip(overrides: Record<string, unknown> = {}) {
    return {
      id: 1,
      shipClassId: 3,
      hull: 1000,
      hullMax: 1000,
      shields: 500,
      shieldsMax: 500,
      energy: 100,
      evadeChance: 0,
      runtimeSystems: {
        SHORT_RANGE_SENSORS: { active: true },
        WEAPONS: { active: true },
        TORPEDO_BANK: { active: true },
        SHIELDS: { active: true },
      },
      status: 'IDLE',
      alertState: 'GREEN',
      ...overrides,
    };
  }

  const weaponModule = (cat: string) => ({
    spacecraftId: 1,
    moduleType: cat === 'WEAPONS' ? 'Turbolaser' : 'Torpedorampe',
    category: cat,
    level: 1,
    integrity: 100,
    cooldown: 0,
    isActive: true,
  });

  it('disabled WEAPONS system prevents energy weapons from firing', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.1); // always hit
    const engine = makeEngine();
    const attacker = makeShip({
      runtimeSystems: { WEAPONS: { active: false } },
    });
    const defender = makeShip();

    const result = await engine.resolveCombat(
      attacker as any,
      defender as any,
      [weaponModule('WEAPONS')] as any,
      [] as any,
    );

    expect(
      result.rounds[0].log.filter((e) => e.action === CombatAction.ENERGY_HIT),
    ).toHaveLength(0);
    expect(
      result.rounds[0].log.filter((e) => e.action === CombatAction.HULL_DAMAGE),
    ).toHaveLength(0);
  });

  it('disabled TORPEDO_BANK system prevents projectile weapons from firing', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.1); // always hit
    const engine = makeEngine();
    const attacker = makeShip({
      runtimeSystems: { TORPEDO_BANK: { active: false } },
    });
    const defender = makeShip();

    const result = await engine.resolveCombat(
      attacker as any,
      defender as any,
      [weaponModule('PROJECTILE')] as any,
      [] as any,
    );

    expect(
      result.rounds[0].log.filter(
        (e) => e.action === CombatAction.PROJECTILE_HIT,
      ),
    ).toHaveLength(0);
  });

  it('disabled SHIELDS system prevents shield regeneration', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.99); // always miss
    const engine = makeEngine();
    const attacker = makeShip();
    const defender = makeShip({
      shields: 0,
      shieldsMax: 500,
      runtimeSystems: { SHIELDS: { active: false } },
    });
    const formulas = combatFormulas();
    (engine as any).gameData.getCombatFormulas.mockReturnValue({
      ...formulas,
      shields: { ...formulas.shields, recharge_rate: 0.1 },
    });

    const result = await engine.resolveCombat(
      attacker as any,
      defender as any,
      [] as any,
      [
        {
          spacecraftId: 2,
          moduleType: 'Shields',
          category: 'SHIELDS',
          level: 1,
          integrity: 100,
          cooldown: 0,
          isActive: true,
        },
      ] as any,
    );

    expect(
      result.rounds[0].log.filter(
        (e) => e.action === CombatAction.SHIELD_REGEN,
      ),
    ).toHaveLength(0);
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
      attacker as any,
      defender as any,
      [weaponModule('WEAPONS')] as any,
      [] as any,
    );

    expect(
      result.rounds[0].log.filter((e) => e.action === CombatAction.ENERGY_HIT),
    ).toHaveLength(0);
    expect(
      result.rounds[0].log.filter((e) => e.action === CombatAction.ENERGY_MISS),
    ).toHaveLength(1);
  });

  it('applies combat field effects with deterministic random values', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const engine = makeEngine();
    const attacker = makeShip({ energy: 1000 });
    const defender = makeShip({ evadeChance: 50 });

    const result = await engine.resolveBattle(
      [
        {
          ship: attacker as any,
          modules: [weaponModule('WEAPONS')] as any,
          fieldEffects: [
            'HIT_CHANCE_INTERFERENCE',
            'ENERGY_WEAPON_BUFF',
          ] as any,
          fieldTypeName: 'Tibanna-Nebel',
        },
      ],
      [
        {
          ship: defender as any,
          modules: [],
          fieldEffects: ['EVADE_CHANCE_INTERFERENCE'] as any,
          fieldTypeName: 'Tibanna-Nebel',
        },
      ],
    );

    expect(result.rounds[0].log).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: CombatAction.FIELD_EFFECT,
          detail: 'Beeinträchtigung der Zielerfassung durch Tibanna-Nebel',
        }),
        expect.objectContaining({
          action: CombatAction.FIELD_EFFECT,
          detail: 'Beeinträchtigung der Ausweichmanöver durch Tibanna-Nebel',
        }),
      ]),
    );
    expect(
      result.rounds[0].log.filter(
        (entry) => entry.action === CombatAction.ENERGY_MISS,
      ),
    ).toHaveLength(1);
  });

  it('scales energy damage but leaves torpedo damage unchanged', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const engine = makeEngine();
    const energyAttacker = makeShip({ energy: 1000 });
    const energyDefender = makeShip({ shields: 0 });

    const energyResult = await engine.resolveBattle(
      [
        {
          ship: energyAttacker as any,
          modules: [weaponModule('WEAPONS')] as any,
          fieldEffects: ['ENERGY_WEAPON_BUFF'] as any,
        },
      ],
      [{ ship: energyDefender as any, modules: [] }],
    );
    const energyHit = energyResult.rounds[0].log.find(
      (entry) => entry.action === CombatAction.ENERGY_HIT,
    );
    expect(energyHit?.value).toBe(72);

    const torpedo = {
      name: 'Protonentorpedo',
      baseDamage: 50,
      criticalChance: 0,
      hitFactor: 100,
      hullDamageFactor: 100,
      shieldDamageFactor: 100,
      variance: 0,
    };
    (engine as any).torpedoService.consumeForAttack.mockResolvedValue(torpedo);
    const projectileResult = await engine.resolveBattle(
      [
        {
          ship: makeShip({ energy: 1000 }) as any,
          modules: [weaponModule('PROJECTILE')] as any,
          fieldEffects: ['ENERGY_WEAPON_BUFF'] as any,
        },
      ],
      [{ ship: makeShip({ id: 2, shields: 0 }) as any, modules: [] }],
    );
    const projectileHit = projectileResult.rounds[0].log.find(
      (entry) => entry.action === CombatAction.PROJECTILE_HIT,
    );
    expect(projectileHit?.value).toBe(50);
  });

  it('has no field-effect impact without effects', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const engine = makeEngine();
    const result = await engine.resolveBattle(
      [
        {
          ship: makeShip({ energy: 1000 }) as any,
          modules: [weaponModule('WEAPONS')] as any,
        },
      ],
      [{ ship: makeShip({ id: 2, shields: 0 }) as any, modules: [] }],
    );
    const hit = result.rounds[0].log.find(
      (entry) => entry.action === CombatAction.ENERGY_HIT,
    );
    expect(hit?.value).toBe(50);
    expect(
      result.rounds[0].log.filter(
        (entry) => entry.action === CombatAction.FIELD_EFFECT,
      ),
    ).toHaveLength(0);
  });

  it('energy weapon does not fire when EPS is insufficient', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.1); // would hit
    const engine = makeEngine();
    const attacker = makeShip({ energy: 0 }); // no EPS
    const defender = makeShip();

    const result = await engine.resolveCombat(
      attacker as any,
      defender as any,
      [weaponModule('WEAPONS')] as any,
      [] as any,
    );

    expect(
      result.rounds[0].log.filter((e) => e.action === CombatAction.ENERGY_HIT),
    ).toHaveLength(0);
    expect(
      result.rounds[0].log.filter((e) => e.action === CombatAction.ENERGY_MISS),
    ).toHaveLength(0);
  });
});
