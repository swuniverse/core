jest.mock('../spacecraft/entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  SpacecraftOperatingMode: { NORMAL: 'NORMAL', STANDBY: 'STANDBY' },
  AlertState: { GREEN: 'GREEN', YELLOW: 'YELLOW', RED: 'RED' },
  SpacecraftStatus: {
    IDLE: 'IDLE',
    IN_FLIGHT: 'IN_FLIGHT',
    IN_COMBAT: 'IN_COMBAT',
    DESTROYED: 'DESTROYED',
  },
}));
jest.mock('../spacecraft/entities/spacecraft-module.entity', () => ({
  SpacecraftModule: class SpacecraftModule {},
}));
jest.mock('../colony/entities/colony.entity', () => ({
  Colony: class Colony {},
}));
jest.mock('../colony/entities/colony-stats.entity', () => ({
  ColonyStats: class ColonyStats {},
}));
jest.mock('../spacecraft/spacecraft-crew.service', () => ({
  SpacecraftCrewService: class SpacecraftCrewService {},
}));
jest.mock('../spacecraft/spacecraft-destruction.service', () => ({
  SpacecraftDestructionService: class SpacecraftDestructionService {},
}));
jest.mock('../messaging/messaging.service', () => ({
  MessagingService: class MessagingService {},
}));

import { CombatService } from './combat.service';
import { BattleResolverService } from './battle-resolver.service';
import { SpacecraftStatus } from '../spacecraft/entities/spacecraft.entity';
import { ColonyDefenseService } from '../colony/colony-defense.service';

function createService() {
  const shipRepo = {
    findOne: jest.fn(),
    find: jest.fn<Promise<any[]>, any[]>(async () => []),
    save: jest.fn(async (value) => value),
  };
  const moduleRepo = {
    find: jest.fn<Promise<any[]>, any[]>(async () => []),
    save: jest.fn(async (value) => value),
  };
  const colonyRepo = {
    findOne: jest.fn(),
    save: jest.fn(async (value) => value),
  };
  const colonyStatsRepo = { save: jest.fn(async (value) => value) };
  const colonyFieldRepo = { save: jest.fn(async (value) => value) };
  const engine = {
    resolveCombat: jest.fn(async () => ({
      attackerDestroyed: false,
      defenderDestroyed: false,
      rounds: [],
      winner: 'attacker',
    })),
    resolveBattle: jest.fn(async (attackers: any[], defenders: any[]) => ({
      rounds: [],
      winner: 'draw',
      destroyedShipIds: [],
      attackerShipIds: attackers.map(({ ship }) => ship.id),
      defenderShipIds: defenders.map(({ ship }) => ship.id),
    })),
  };
  const gateway = { emitToUser: jest.fn() };
  const spacecraftCrewService = { hasEnoughCrew: jest.fn(async () => true) };
  const storageService = { lowerStorage: jest.fn(async () => 1) };
  const colonyDefenseService = new ColonyDefenseService(
    storageService as any,
    {
      getTorpedoType: jest.fn((id: number) =>
        id === 81 ? { id: 81, commodityId: 81, baseDamage: 90 } : undefined,
      ),
    } as any,
  );
  const gameData = {
    getTorpedoType: jest.fn((id: number) =>
      id === 81
        ? { id: 81, commodityId: 81, name: 'Micro', baseDamage: 90 }
        : undefined,
    ),
    getBuildingFunctions: jest.fn((buildingId: number) => {
      if (buildingId === 100010100) return [24];
      if (buildingId === 100020100) return [25];
      if (buildingId === 100030100) return [26];
      if (buildingId === 100040100) return [27];
      if (buildingId === 100050100) return [28];
      return [];
    }),
  };
  const colonyEventService = {
    createActionEvent: jest.fn(async (value) => value),
  };
  const colonyDamageService = {
    damageField: jest.fn<any, any[]>((field, integrityLoss) => ({
      fieldIndex: field.fieldIndex,
      buildingId: field.buildingId,
      integrityBefore: field.integrity,
      integrityAfter: Math.max(0, field.integrity - integrityLoss),
      damage: Math.min(field.integrity, integrityLoss),
      status: 'DAMAGED',
    })),
  };
  const reportFormatter = {
    format: jest.fn((result) => result),
    formatBattle: jest.fn((result) => result),
  };
  const statistics = { countEvent: jest.fn(async () => undefined) };
  const destructionService = {
    destroyFromCombat: jest.fn(async () => undefined),
    saveCombatSurvivor: jest.fn(async (ship) => {
      await shipRepo.save(ship);
      return true;
    }),
  };
  const interactionContext = {
    load: jest.fn(async () => ({
      targetOnVacation: false,
      sourceCloaked: false,
      targetCloaked: false,
    })),
  };
  const battleResolver = new BattleResolverService(
    moduleRepo as any,
    engine as any,
    gateway as any,
    destructionService as any,
    reportFormatter as any,
    statistics as any,
  );
  const service = new CombatService(
    shipRepo as any,
    moduleRepo as any,
    colonyRepo as any,
    colonyStatsRepo as any,
    colonyFieldRepo as any,
    spacecraftCrewService as any,
    colonyDefenseService as any,
    gameData as any,
    colonyEventService as any,
    colonyDamageService as any,
    destructionService as any,
    statistics as any,
    interactionContext as any,
    battleResolver as any,
  );
  return {
    service,
    shipRepo,
    moduleRepo,
    colonyRepo,
    colonyStatsRepo,
    spacecraftCrewService,
    storageService,
    colonyEventService,
    colonyDamageService,
    colonyFieldRepo,
    engine,
    gateway,
    reportFormatter,
    battleResolver,
    statistics,
    destructionService,
    interactionContext,
  };
}

describe('CombatService attackColony', () => {
  const attacker = () => ({
    id: 7,
    userId: 1,
    status: SpacecraftStatus.IDLE,
    locationId: 40,
    location: {
      id: 40,
      kind: 'SYSTEM_FIELD',
      systemField: { starSystemId: 10, sx: 4, sy: 6, celestialObjectId: 20 },
    },
    hull: 500,
    shields: 0,
  });

  const colony = (
    fields: any[] = [
      {
        fieldIndex: 2,
        buildingId: 100030100,
        isActive: true,
        isBuilding: false,
        integrity: 100,
      },
    ],
  ): any => ({
    id: 5,
    userId: 2,
    starSystemId: 10,
    systemFieldId: 30,
    systemField: { id: 30, starSystemId: 10, sx: 4, sy: 6 },
    celestialObjectId: 20,
    energy: 100,
    fields,
    stats: {
      shields: 300,
      maxShields: 4000,
      shieldFrequency: null,
      torpedoTypeId: null,
    },
  });

  it.each([
    ['effective vacation', true, true],
    ['pending vacation', false, false],
    ['no vacation', false, false],
  ])('protects a colony during %s', async (_label, effective, rejected) => {
    const { service, shipRepo, colonyRepo, interactionContext } = createService();
    shipRepo.findOne.mockResolvedValue(attacker());
    colonyRepo.findOne.mockResolvedValue(colony());
    interactionContext.load.mockResolvedValue({
      targetOnVacation: effective,
      sourceCloaked: false,
      targetCloaked: false,
    });

    const action = service.attackColony(7, 5, 2, 1);

    if (rejected) {
      await expect(action).rejects.toThrow(
        'Aktion nicht möglich, der Spieler befindet sich im Urlaubsmodus!',
      );
    } else {
      await expect(action).resolves.toEqual(expect.objectContaining({
        defenderType: 'COLONY',
      }));
    }
  });

  it('absorbs incoming damage with colony shields', async () => {
    const {
      service,
      shipRepo,
      colonyRepo,
      moduleRepo,
      colonyStatsRepo,
      colonyEventService,
      colonyDamageService,
    } = createService();
    shipRepo.findOne.mockResolvedValue(attacker());
    colonyRepo.findOne.mockResolvedValue(
      colony([
        {
          fieldIndex: 2,
          buildingId: 100010100,
          isActive: true,
          isBuilding: false,
        },
      ]),
    );
    moduleRepo.find.mockResolvedValue([
      {
        spacecraftId: 7,
        category: 'WEAPONS',
        level: 1,
        integrity: 100,
        isActive: true,
      },
    ]);

    const result = await service.attackColony(7, 5, 2, 1);

    expect(result.defenderType).toBe('COLONY');
    expect(result.colonyShields).toBe(200);
    expect(result.damagedFields).toEqual([]);
    expect(colonyDamageService.damageField).not.toHaveBeenCalled();
    expect(colonyStatsRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ shields: 200 }),
    );
    expect(colonyEventService.createActionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        colonyId: 5,
        userId: 2,
        type: 'COLONY_ATTACKED',
      }),
    );
  });

  it('damages colony fields when shields are down', async () => {
    const {
      service,
      shipRepo,
      colonyRepo,
      moduleRepo,
      colonyDamageService,
      colonyFieldRepo,
    } = createService();
    const target = colony([
      {
        fieldIndex: 2,
        buildingId: 100030100,
        isActive: true,
        isBuilding: false,
      },
    ]);
    target.stats.shields = 0;
    const damaged = [
      {
        fieldIndex: 2,
        buildingId: 100030100,
        integrityBefore: 100,
        integrityAfter: 0,
        damage: 100,
        status: 'DESTROYED',
      },
    ];
    colonyDamageService.damageField.mockReturnValue(damaged[0]);
    shipRepo.findOne.mockResolvedValue(attacker());
    colonyRepo.findOne.mockResolvedValue(target);
    moduleRepo.find.mockResolvedValue([
      {
        spacecraftId: 7,
        category: 'WEAPONS',
        level: 1,
        integrity: 100,
        isActive: true,
      },
    ]);

    const result = await service.attackColony(7, 5, 2, 1);

    expect(result.damagedFields).toEqual(damaged);
    expect(colonyDamageService.damageField).toHaveBeenCalledWith(
      expect.objectContaining({ fieldIndex: 2 }),
      10,
    );
    expect(colonyFieldRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ fieldIndex: 2 }),
    );
    expect(result.rounds[0].log).toContainEqual(
      expect.objectContaining({ action: 'COLONY_SHIELD_ABSORB', value: 0 }),
    );
  });

  it('rejects a selected field without a finished building', async () => {
    const { service, shipRepo, colonyRepo } = createService();
    shipRepo.findOne.mockResolvedValue(attacker());
    colonyRepo.findOne.mockResolvedValue(
      colony([{ fieldIndex: 4, buildingId: null, isBuilding: false }]),
    );

    await expect(service.attackColony(7, 5, 4, 1)).rejects.toThrow(
      'Selected field has no finished building',
    );
  });

  it('rejects a selected field from another colony', async () => {
    const { service, shipRepo, colonyRepo } = createService();
    shipRepo.findOne.mockResolvedValue(attacker());
    colonyRepo.findOne.mockResolvedValue(
      colony([{ fieldIndex: 2, buildingId: 100030100, isBuilding: false }]),
    );

    await expect(service.attackColony(7, 5, 99, 1)).rejects.toThrow(
      'Selected field not found',
    );
  });

  it('fires energy phalanx and consumes colony energy', async () => {
    const { service, shipRepo, colonyRepo } = createService();
    const ship = attacker();
    const target = colony([
      {
        fieldIndex: 2,
        buildingId: 100010100,
        isActive: true,
        isBuilding: false,
      },
      {
        fieldIndex: 2,
        buildingId: 100030100,
        isActive: true,
        isBuilding: false,
      },
    ]);
    target.stats.shields = 0;
    shipRepo.findOne.mockResolvedValue(ship);
    colonyRepo.findOne.mockResolvedValue(target);

    const result = await service.attackColony(7, 5, 2, 1);

    expect(ship.hull).toBe(250);
    expect(target.energy).toBe(75);
    expect(result.rounds[0].log).toContainEqual(
      expect.objectContaining({ action: 'ENERGY_PHALANX_HIT', value: 250 }),
    );
  });

  it('fires particle phalanx when torpedoes are configured and stored', async () => {
    const { service, shipRepo, colonyRepo, storageService } = createService();
    const ship = attacker();
    const target = colony([
      {
        fieldIndex: 2,
        buildingId: 100040100,
        isActive: true,
        isBuilding: false,
      },
    ]);
    target.stats.shields = 0;
    target.stats.torpedoTypeId = 81;
    shipRepo.findOne.mockResolvedValue(ship);
    colonyRepo.findOne.mockResolvedValue(target);

    const result = await service.attackColony(7, 5, 2, 1);

    expect(storageService.lowerStorage).toHaveBeenCalledWith(target, 81, 1);
    expect(ship.hull).toBe(410);
    expect(target.energy).toBe(85);
    expect(result.rounds[0].log).toContainEqual(
      expect.objectContaining({ action: 'PARTICLE_PHALANX_HIT', value: 90 }),
    );
  });

  it('reduces projectile damage with anti-particle defense', async () => {
    const { service, shipRepo, colonyRepo, moduleRepo } = createService();
    shipRepo.findOne.mockResolvedValue(attacker());
    colonyRepo.findOne.mockResolvedValue(
      colony([
        {
          fieldIndex: 2,
          buildingId: 100010100,
          isActive: true,
          isBuilding: false,
        },
        {
          fieldIndex: 2,
          buildingId: 100050100,
          isActive: true,
          isBuilding: false,
        },
      ]),
    );
    moduleRepo.find.mockResolvedValue([
      {
        spacecraftId: 7,
        category: 'PROJECTILE',
        level: 2,
        integrity: 100,
        isActive: true,
      },
    ]);

    const result = await service.attackColony(7, 5, 2, 1);

    expect(result.colonyShields).toBe(200);
  });

  it('counts a colony attack as a combat, with the ship if it is destroyed', async () => {
    const { service, shipRepo, colonyRepo, statistics } = createService();
    shipRepo.findOne.mockResolvedValue(attacker());
    colonyRepo.findOne.mockResolvedValue(colony());

    await service.attackColony(7, 5, 2, 1);

    expect(statistics.countEvent).toHaveBeenCalledTimes(1);
    expect(statistics.countEvent).toHaveBeenCalledWith('combats');

    statistics.countEvent.mockClear();
    shipRepo.findOne.mockResolvedValue({ ...attacker(), hull: 0 });
    await service.attackColony(7, 5, 2, 1);

    expect(statistics.countEvent).toHaveBeenCalledWith('combats');
    expect(statistics.countEvent).toHaveBeenCalledWith('destroyed-ships', 1);
  });

  it('rejects attacks from ships outside colony orbit', async () => {
    const { service, shipRepo, colonyRepo } = createService();
    shipRepo.findOne.mockResolvedValue({
      ...attacker(),
      locationId: 41,
      location: {
        id: 41,
        kind: 'SYSTEM_FIELD',
        systemField: { starSystemId: 10, sx: 5, sy: 6 },
      },
    });
    colonyRepo.findOne.mockResolvedValue(colony());

    await expect(service.attackColony(7, 5, 2, 1)).rejects.toThrow(
      'Colony must be in same orbit',
    );
  });

  it('uses the canonical system field for colony orbit', async () => {
    const { service, shipRepo, colonyRepo } = createService();
    shipRepo.findOne.mockResolvedValue({
      ...attacker(),
      location: {
        id: 40,
        kind: 'SYSTEM_FIELD',
        systemField: { starSystemId: 10, sx: 4, sy: 6 },
      },
    });
    colonyRepo.findOne.mockResolvedValue({
      ...colony(),
      systemFieldId: 30,
      systemField: { id: 30, starSystemId: 10, sx: 4, sy: 6 },
    });

    await expect(service.attackColony(7, 5, 2, 1)).resolves.toMatchObject({
      defenderType: 'COLONY',
    });
  });
});

describe('CombatService attack', () => {
  it('rejects attacking a player in vacation mode', async () => {
    const { service, shipRepo, engine, interactionContext } = createService();
    const ship = (id: number, userId: number) => ({
      id,
      userId,
      status: SpacecraftStatus.IDLE,
      alertState: 'GREEN',
      operatingMode: 'NORMAL',
      fleetId: null,
      locationId: 42,
      location: { id: 42, kind: 'GALAXY_FIELD' },
    });
    shipRepo.findOne
      .mockResolvedValueOnce(ship(1, 1))
      .mockResolvedValueOnce(ship(2, 2));
    interactionContext.load.mockResolvedValue({
      targetOnVacation: true,
      sourceCloaked: false,
      targetCloaked: false,
    });

    await expect(service.attack(1, 2, 1)).rejects.toThrow(
      'Aktion nicht möglich, der Spieler befindet sich im Urlaubsmodus!',
    );
    expect(interactionContext.load).toHaveBeenCalledWith(1, 2, [
      'targetOnVacation',
      'sourceCloaked',
      'targetCloaked',
    ]);
    expect(engine.resolveBattle).not.toHaveBeenCalled();
  });

  it('forms attacker fleet and target fleet plus alerted defenders', async () => {
    const { service, shipRepo, engine } = createService();
    const ship = (id: number, userId: number, overrides = {}) => ({
      id,
      userId,
      name: `Ship ${id}`,
      status: SpacecraftStatus.IDLE,
      alertState: 'GREEN',
      operatingMode: 'NORMAL',
      fleetId: null,
      locationId: 42,
      location: { id: 42, kind: 'GALAXY_FIELD' },
      ...overrides,
    });
    const attacker = ship(1, 1, { fleetId: 10 });
    const defender = ship(3, 2, { fleetId: 20 });
    const participants = [
      attacker,
      ship(2, 1, { fleetId: 10 }),
      defender,
      ship(4, 2, { fleetId: 20 }),
      ship(5, 2, { alertState: 'YELLOW' }),
      ship(6, 2),
    ];
    shipRepo.findOne
      .mockResolvedValueOnce(attacker)
      .mockResolvedValueOnce(defender);
    shipRepo.find.mockResolvedValue(participants);
    engine.resolveBattle = jest.fn(async (_attackers, _defenders) => ({
      rounds: [],
      winner: 'attacker',
      destroyedShipIds: [],
      attackerShipIds: [1, 2],
      defenderShipIds: [3, 4, 5],
    }));

    await service.attack(1, 3, 1);

    expect(engine.resolveBattle).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ ship: expect.objectContaining({ id: 1 }) }),
        expect.objectContaining({ ship: expect.objectContaining({ id: 2 }) }),
      ]),
      expect.arrayContaining([
        expect.objectContaining({ ship: expect.objectContaining({ id: 3 }) }),
        expect.objectContaining({ ship: expect.objectContaining({ id: 4 }) }),
        expect.objectContaining({ ship: expect.objectContaining({ id: 5 }) }),
      ]),
    );
    expect(
      engine.resolveBattle.mock.calls[0][1].some(
        ({ ship }: any) => ship.id === 6,
      ),
    ).toBe(false);
  });

  it('uses matching canonical location IDs', async () => {
    const { service, shipRepo } = createService();
    const attacker = {
      id: 1,
      userId: 1,
      status: SpacecraftStatus.IDLE,
      locationId: 42,
      location: { id: 42, kind: 'GALAXY_FIELD' },
    };
    const defender = {
      id: 2,
      userId: 2,
      status: SpacecraftStatus.IDLE,
      locationId: 42,
      location: { id: 42, kind: 'GALAXY_FIELD' },
    };
    shipRepo.findOne
      .mockResolvedValueOnce(attacker)
      .mockResolvedValueOnce(defender);

    await expect(service.attack(1, 2, 1)).resolves.toBeDefined();
  });

  describe('statistics', () => {
    const ship = (id: number, userId: number) => ({
      id,
      userId,
      status: SpacecraftStatus.IDLE,
      locationId: 42,
      location: { id: 42, kind: 'GALAXY_FIELD' },
    });

    async function fight(outcome: {
      attackerDestroyed: boolean;
      defenderDestroyed: boolean;
    }) {
      const env = createService();
      env.engine.resolveBattle.mockResolvedValueOnce({
        rounds: [],
        winner: 'attacker',
        destroyedShipIds: [
          ...(outcome.attackerDestroyed ? [1] : []),
          ...(outcome.defenderDestroyed ? [2] : []),
        ],
        attackerShipIds: [1],
        defenderShipIds: [2],
      } as any);
      env.shipRepo.findOne
        .mockResolvedValueOnce(ship(1, 1))
        .mockResolvedValueOnce(ship(2, 2));
      return env;
    }

    it('counts a finished combat once and each destroyed ship', async () => {
      const { service, statistics } = await fight({
        attackerDestroyed: true,
        defenderDestroyed: true,
      });

      await service.attack(1, 2, 1);

      expect(statistics.countEvent).toHaveBeenCalledTimes(2);
      expect(statistics.countEvent).toHaveBeenCalledWith('combats');
      expect(statistics.countEvent).toHaveBeenCalledWith('destroyed-ships', 2);
    });

    it('counts no destroyed ships when both survive', async () => {
      const { service, statistics } = await fight({
        attackerDestroyed: false,
        defenderDestroyed: false,
      });

      await service.attack(1, 2, 1);

      expect(statistics.countEvent).toHaveBeenCalledTimes(1);
      expect(statistics.countEvent).toHaveBeenCalledWith('combats');
    });

    it('counts nothing when the combat fails midway', async () => {
      const { service, statistics, engine } = await fight({
        attackerDestroyed: false,
        defenderDestroyed: true,
      });
      engine.resolveBattle.mockReset();
      engine.resolveBattle.mockRejectedValueOnce(new Error('boom'));

      await expect(service.attack(1, 2, 1)).rejects.toThrow('boom');

      expect(statistics.countEvent).not.toHaveBeenCalled();
    });

    it('counts nothing when the attack is rejected', async () => {
      const { service, statistics, shipRepo } = createService();
      shipRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.attack(1, 2, 1)).rejects.toThrow();

      expect(statistics.countEvent).not.toHaveBeenCalled();
    });
  });
});
