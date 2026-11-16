jest.mock('../auth/user.entity', () => ({ User: class User {} }));
jest.mock('../faction/entities/faction.entity', () => ({
  FactionEntity: class FactionEntity {},
}));
jest.mock('../faction/entities/faction-modifier.entity', () => ({
  FactionModifier: class FactionModifier {},
}));
jest.mock('../colony/entities/colony.entity', () => ({
  Colony: class Colony {},
}));
jest.mock('../starmap/entities/star-system.entity', () => ({
  StarSystem: class StarSystem {},
}));
jest.mock('../starmap/entities/layer.entity', () => ({
  Layer: class Layer {},
}));
jest.mock('../starmap/entities/celestial-object.entity', () => ({
  CelestialObject: class CelestialObject {},
}));
jest.mock('../starmap/entities/galaxy-field.entity', () => ({
  GalaxyField: class GalaxyField {},
}));
jest.mock('../starmap/entities/system-field.entity', () => ({
  SystemField: class SystemField {},
}));
jest.mock('../starmap/generator/planet-generator.service', () => ({
  PlanetGeneratorService: class PlanetGeneratorService {},
}));
jest.mock('../starmap/generator/stu-planet-surface.generator', () => ({
  supportsStuSurface: jest.fn(() => true),
}));
jest.mock('./entities/spacecraft-module.entity', () => ({
  SpacecraftModule: class SpacecraftModule {},
}));
jest.mock('./entities/fleet.entity', () => ({ Fleet: class Fleet {} }));
jest.mock('./entities/ship-class-def.entity', () => ({
  ShipClassDef: class ShipClassDef {},
}));
jest.mock('./entities/spacecraft.entity', () => ({
  AlertState: { GREEN: 'GREEN', YELLOW: 'YELLOW', RED: 'RED' },
  SpacecraftOperatingMode: { NORMAL: 'NORMAL', STANDBY: 'STANDBY' },
  SpacecraftLssMode: {
    DISABLED: 'DISABLED',
    TERRITORY: 'TERRITORY',
    IMPASSABLE: 'IMPASSABLE',
    CARTOGRAPHY: 'CARTOGRAPHY',
  },
  SpacecraftStatus: {
    IDLE: 'IDLE',
    IN_FLIGHT: 'IN_FLIGHT',
    IN_COMBAT: 'IN_COMBAT',
    DESTROYED: 'DESTROYED',
  },
  Spacecraft: class Spacecraft {},
}));

import {
  AlertState,
  SpacecraftOperatingMode,
} from './entities/spacecraft.entity';
import { SpacecraftService } from './spacecraft.service';

function createService() {
  const ship = {
    id: 2,
    userId: 1,
    name: 'Falke',
    shipClassId: 3,
    alertState: AlertState.GREEN,
    operatingMode: SpacecraftOperatingMode.NORMAL,
    modules: [],
    runtimeSystems: {},
    energy: 20,
    energyMax: 50,
    epsMax: 50,
    warpdrive: 2,
    warpdriveMax: 10,
    battery: 3,
    batteryMax: 5,
    reactorOutput: 8,
    reactorWarpSplit: 100,
    reactorAutoCarryOver: false,
    shields: 10,
    shieldsMax: 20,
    hull: 30,
    hullMax: 30,
    crew: 1,
    crewMax: 4,
    cargoMax: 8,
    evadeChance: 0,
    posX: 1,
    posY: 1,
  };
  const shipRepo = {
    save: jest.fn(async (value) => value),
    findOneBy: jest.fn(async () => null),
  };
  const runtime = {
    initialize: jest.fn((value) => {
      const systems = value.runtimeSystems as Record<string, any>;
      for (const key of [
        'LIFE_SUPPORT',
        'COMPUTER',
        'LONG_RANGE_SENSORS',
        'SHORT_RANGE_SENSORS',
        'SHIELDS',
        'WEAPONS',
        'TORPEDO_BANK',
      ]) {
        systems[key] ??= { active: true, cooldown: 0, integrity: 100 };
      }
      return systems;
    }),
    requireActivation: jest.fn(),
    validateActivation: jest.fn((systems, key) => {
      const value = systems[key];
      if (!value) return 'System nicht verfügbar';
      if (value.cooldown > 0) return `Cooldown ${value.cooldown}`;
      if (value.integrity <= 0) return 'System zerstört';
      return null;
    }),
  };
  const resourceFlow = {
    calculate: jest.fn(() => ({ reactorOutput: 8 })),
    getSystemCost: jest.fn(() => 1),
    recharge: jest.fn(),
  };
  const service = new SpacecraftService(
    shipRepo as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    { getAllModules: () => [] } as any,
    { findById: jest.fn(async () => ({ crewMin: 1 })) } as any,
    {} as any,
    {} as any,
    {} as any,
    {
      calculateStats: jest.fn(() => ({
        hullMax: 30,
        shieldsMax: 20,
        energyMax: 50,
        warpdriveMax: 10,
        batteryMax: 5,
        reactorOutput: 8,
        cargoMax: 8,
        crewMax: 4,
        evadeChance: 0,
      })),
    } as any,
    {
      getAssignedCrew: jest.fn(async () => []),
      getAssignedCrewCount: jest.fn(async () => 0),
      hasEnoughCrew: jest.fn(async () => true),
      getRequiredCrew: jest.fn(async () => 1),
    } as any,
    {} as any,
    resourceFlow as any,
    runtime as any,
    { emitToUser: jest.fn() } as any,
    {} as any,
    { saveUnlessDestroyed: jest.fn(async () => true) } as any,
    {} as any,
    {} as any,
    {
      apply: jest.fn(() => ({
        applied: true,
        systems: ship.runtimeSystems,
        rejections: [],
        messages: [],
      })),
    } as any,
    {
      getPlan: jest.fn(),
      getPlanForFinalizingSpacecraft: jest.fn(async (spacecraftId: number) =>
        spacecraftId === ship.id ? { starSystemId: 44 } : null,
      ),
      createPlan: jest.fn(),
      startFinalization: jest.fn(async () => ({
        id: 8,
        starSystemId: 44,
        status: 'FINISHING',
        remainingFieldIds: [],
        finalizationStartedAt: new Date(),
        finalizationTick: 0,
        finalizingSpacecraftId: ship.id,
        completedAt: null,
      })),
      resetFinishingForSpacecraft: jest.fn(),
      progressFinalization: jest.fn(async () => ({
        completed: false,
        userId: null,
        starSystemId: null,
      })),
    } as any,
    { sendSystem: jest.fn() } as any,
    { change: jest.fn() } as any,
    { countEvent: jest.fn() } as any,
  );
  jest.spyOn(service, 'findOne').mockResolvedValue(ship as any);
  jest.spyOn(service, 'getSensorRange').mockResolvedValue(3);
  return { service, ship, shipRepo, resourceFlow };
}

describe('spacecraft core detail controls', () => {
  it('enters standby with only life support active', async () => {
    const { service, ship } = createService();
    const result = await service.setOperatingMode(
      2,
      1,
      SpacecraftOperatingMode.STANDBY,
    );
    expect(result.operatingMode).toBe('STANDBY');
    expect(result.systems.LIFE_SUPPORT?.active).toBe(true);
    expect(result.systems.SHIELDS?.active).toBe(false);
    expect(ship.operatingMode).toBe('STANDBY');
  });

  it('resets a running cartography finalization when standby powers down its laboratory', async () => {
    const { service, ship } = createService();
    ship.runtimeSystems = {
      ASTROMETRY_LAB: { active: true, cooldown: 0, integrity: 100 },
      SHORT_RANGE_SENSORS: { active: true, cooldown: 0, integrity: 100 },
      LONG_RANGE_SENSORS: { active: true, cooldown: 0, integrity: 100 },
      LIFE_SUPPORT: { active: true, cooldown: 0, integrity: 100 },
    };

    await service.setOperatingMode(2, 1, SpacecraftOperatingMode.STANDBY);

    expect(
      (service as any).cartographyPlanService.resetFinishingForSpacecraft,
    ).toHaveBeenCalledWith(2);
    expect((ship.runtimeSystems as any).ASTROMETRY_LAB.active).toBe(false);
  });

  it('changes alert state without changing active systems', async () => {
    const { service, ship, shipRepo } = createService();
    (ship.runtimeSystems as Record<string, any>).LONG_RANGE_SENSORS = {
      active: true,
      cooldown: 0,
      integrity: 100,
    };
    (ship.runtimeSystems as Record<string, any>).SHIELDS = {
      active: false,
      cooldown: 2,
      integrity: 100,
    };
    const result = await service.setAlertState(2, 1, AlertState.GREEN);
    expect(result.applied).toBe(true);
    expect(result.rejections).toEqual([]);
    expect(result.systems.LONG_RANGE_SENSORS?.active).toBe(true);
    expect(result.systems.SHIELDS?.active).toBe(false);
    expect(ship.alertState).toBe('GREEN');
    expect(shipRepo.save).toHaveBeenCalled();
  });

  it('persists reactor split and automatic energy transfer together', async () => {
    const { service, ship, shipRepo } = createService();

    await expect(
      service.setReactorDistribution(2, 1, 40, true),
    ).resolves.toEqual({
      reactorWarpSplit: 40,
      reactorAutoCarryOver: true,
    });
    expect(ship.reactorWarpSplit).toBe(40);
    expect(ship.reactorAutoCarryOver).toBe(true);
    expect(shipRepo.save).toHaveBeenCalledWith(ship);
  });

  it('serves authoritative details and energy flow', async () => {
    const { service, resourceFlow } = createService();
    const details = await service.getDetails(2, 1);
    expect(details.crewRoster).toEqual([]);
    expect(details.effectiveStats?.sensorRange).toBe(3);
    await service.getEnergyFlow(2, 1);
    expect(resourceFlow.calculate).toHaveBeenCalled();
  });

  it('activates only a concrete Astrometrie-Labor after charging one EPS and requiring both sensors', async () => {
    const { service, ship } = createService();
    ship.modules = [
      {
        moduleType: 'Astrometrie-Labor',
        category: 'SPECIAL',
        isActive: false,
        integrity: 100,
      } as never,
    ];
    ship.runtimeSystems = {
      ASTROMETRY_LAB: { active: false, cooldown: 0, integrity: 100 },
      SHORT_RANGE_SENSORS: { active: true, cooldown: 0, integrity: 100 },
      LONG_RANGE_SENSORS: { active: true, cooldown: 0, integrity: 100 },
    };

    (
      service as any
    ).spacecraftCrewService.getAssignedCrewCount.mockResolvedValue(1);

    await service.toggleSystem(2, 1, 'ASTROMETRY_LAB', true);

    expect(ship.energy).toBe(19);
    expect((ship.runtimeSystems as any).ASTROMETRY_LAB.active).toBe(true);
  });

  it('charges 30 EPS to activate the Hyperraumfeldscanner and blocks it while cloaked', async () => {
    const { service, ship } = createService();
    ship.energy = 100;
    ship.modules = [
      {
        moduleType: 'Hyperraumfeldscanner',
        category: 'SPECIAL',
        isActive: false,
        integrity: 100,
      } as never,
    ];
    ship.runtimeSystems = {
      SUBSPACE_SCANNER: { active: false, cooldown: 0, integrity: 100 },
      CLOAK: { active: false, cooldown: 0, integrity: 100 },
    };
    (service as any).userRepo = {
      findOneBy: jest.fn(async () => ({ id: 1, faction: 'GALACTIC_EMPIRE' })),
    };
    (
      service as any
    ).spacecraftCrewService.getAssignedCrewCount.mockResolvedValue(1);

    await service.toggleSystem(2, 1, 'SUBSPACE_SCANNER', true);

    expect(ship.energy).toBe(70);
    expect((ship.runtimeSystems as any).SUBSPACE_SCANNER.active).toBe(true);

    (ship.runtimeSystems as any).SUBSPACE_SCANNER.active = false;
    (ship.runtimeSystems as any).CLOAK.active = true;
    await expect(
      service.toggleSystem(2, 1, 'SUBSPACE_SCANNER', true),
    ).rejects.toThrow('Tarnung');
  });

  it.each(['SHORT_RANGE_SENSORS', 'LONG_RANGE_SENSORS'] as const)(
    'resets a running cartography finalization when %s is deactivated',
    async (systemKey) => {
      const { service, ship } = createService();
      ship.runtimeSystems = {
        ASTROMETRY_LAB: { active: true, cooldown: 0, integrity: 100 },
        SHORT_RANGE_SENSORS: { active: true, cooldown: 0, integrity: 100 },
        LONG_RANGE_SENSORS: { active: true, cooldown: 0, integrity: 100 },
      };

      await service.toggleSystem(2, 1, systemKey, false);

      expect(
        (service as any).cartographyPlanService.resetFinishingForSpacecraft,
      ).toHaveBeenCalledWith(2);
      expect((service as any).messagingService.sendSystem).toHaveBeenCalledWith(
        1,
        'Kartographie',
        expect.stringContaining('abgebrochen'),
        'cartography-finalization-aborted:2',
      );
    },
  );

  it('rejects laboratory activation when its required sensors are not active', async () => {
    const { service, ship } = createService();
    ship.runtimeSystems = {
      ASTROMETRY_LAB: { active: false, cooldown: 0, integrity: 100 },
      SHORT_RANGE_SENSORS: { active: false, cooldown: 0, integrity: 100 },
      LONG_RANGE_SENSORS: { active: true, cooldown: 0, integrity: 100 },
    };

    await expect(
      service.toggleSystem(2, 1, 'ASTROMETRY_LAB', true),
    ).rejects.toThrow(
      'Astrometrie-Labor benötigt aktive intakte Kurz- und Langstreckensensoren',
    );
  });

  it('blocks cartography finalization while the ship is in standby', async () => {
    const { service, ship } = createService();
    ship.operatingMode = SpacecraftOperatingMode.STANDBY;
    Object.assign(ship, {
      location: {
        kind: 'SYSTEM_FIELD',
        systemField: { starSystemId: 44, sx: 1, sy: 1 },
      },
    });

    await expect(service.startCartographyFinalization(2, 1)).rejects.toThrow(
      'Kartographie-Finalisierung ist in Bereitschaft nicht möglich',
    );
  });

  it('allows Icarus sensor activation without crew when STU crew requirement is zero', async () => {
    const { service, ship } = createService();
    ship.crew = 0;
    Object.assign(ship, { crewRequired: 0 });
    ship.modules = [
      {
        moduleType: 'Sensorphalanx',
        category: 'SENSORS',
        level: 1,
        isActive: true,
        integrity: 100,
      } as never,
    ];
    ship.runtimeSystems = {
      LONG_RANGE_SENSORS: { active: false, cooldown: 0, integrity: 100 },
    };
    (
      service as any
    ).spacecraftCrewService.getAssignedCrewCount.mockResolvedValue(0);
    (service as any).spacecraftCrewService.getRequiredCrew.mockImplementation(
      async (candidate: any) => candidate.crewRequired,
    );

    await expect(
      service.toggleSystem(2, 1, 'LONG_RANGE_SENSORS', true),
    ).resolves.toEqual(expect.objectContaining({ systems: expect.anything() }));
  });

  describe('cloak', () => {
    const cloakShip = (faction: string | null = 'GALACTIC_EMPIRE') => {
      const { service, ship } = createService();
      ship.modules = [
        {
          moduleType: 'Tarnvorrichtung',
          category: 'SPECIAL',
          isActive: false,
          integrity: 100,
        } as never,
      ];
      ship.runtimeSystems = {
        CLOAK: { active: false, cooldown: 0, integrity: 100 },
        SHIELDS: { active: true, cooldown: 0, integrity: 100 },
        WEAPONS: { active: true, cooldown: 0, integrity: 100 },
        TORPEDO_BANK: { active: true, cooldown: 0, integrity: 100 },
        ASTROMETRY_LAB: { active: true, cooldown: 0, integrity: 100 },
      };
      (ship as any).dockedAtId = 9;
      (service as any).userRepo = {
        findOneBy: jest.fn(async () => ({ id: 1, faction })),
      };
      (
        service as any
      ).spacecraftCrewService.getAssignedCrewCount.mockResolvedValue(1);
      return { service, ship: ship as any };
    };

    it('shuts down shields, weapons and the laboratory, undocks and charges EPS', async () => {
      const { service, ship } = cloakShip();

      await service.toggleSystem(2, 1, 'CLOAK', true);

      expect(ship.runtimeSystems.CLOAK.active).toBe(true);
      for (const key of ['SHIELDS', 'WEAPONS', 'TORPEDO_BANK', 'ASTROMETRY_LAB']) {
        expect(ship.runtimeSystems[key].active).toBe(false);
      }
      expect(ship.dockedAtId).toBeNull();
      expect(ship.energy).toBe(10);
      expect(
        (service as any).cartographyPlanService.resetFinishingForSpacecraft,
      ).toHaveBeenCalledWith(2);
    });

    it('refuses activation for the Rebel Alliance and deactivates stored cloaks', async () => {
      const { service, ship } = cloakShip('REBEL_ALLIANCE');
      ship.runtimeSystems.CLOAK.active = true;

      await expect(service.toggleSystem(2, 1, 'CLOAK', true)).rejects.toThrow(
        'Galaktischen Imperium vorbehalten',
      );
      await service.toggleSystem(2, 1, 'SHIELDS', false);

      expect(ship.runtimeSystems.CLOAK.active).toBe(false);
    });

    it('refuses activation under red alert and without EPS', async () => {
      const { service, ship } = cloakShip();
      ship.alertState = AlertState.RED;
      await expect(service.toggleSystem(2, 1, 'CLOAK', true)).rejects.toThrow(
        'Alarmstufe Rot',
      );
      ship.alertState = AlertState.GREEN;
      ship.energy = 9;
      await expect(service.toggleSystem(2, 1, 'CLOAK', true)).rejects.toThrow(
        'Nicht genug EPS',
      );
    });

    it.each(['SHIELDS', 'WEAPONS', 'TORPEDO_BANK', 'ASTROMETRY_LAB'] as const)(
      'refuses %s activation while cloaked',
      async (key) => {
        const { service, ship } = cloakShip();
        ship.runtimeSystems.CLOAK.active = true;
        ship.runtimeSystems[key].active = false;

        await expect(service.toggleSystem(2, 1, key, true)).rejects.toThrow(
          'Tarnung',
        );
      },
    );
  });

  describe.each(['SYSTEM', 'GALAXY'])('cloak counts in %s LSS', (scope) => {
    afterEach(() => jest.useRealTimers());

    it('counts foreign cloaks only during detection without revealing ship details', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-11-16T12:00:00Z'));
      const { service, ship } = createService();
      const location = (x: number) => scope === 'SYSTEM'
        ? { kind: 'SYSTEM_FIELD', systemField: { starSystemId: 1, sx: x, sy: 1, starSystem: { maxX: 5, maxY: 5 } } }
        : { kind: 'GALAXY_FIELD', galaxyField: { layerId: 1, cx: x, cy: 1 } };
      const fields = [1, 2].map((x) => ({ id: x, sx: x, sy: 1, cx: x, cy: 1, fieldType: { id: 1, key: 'EMPTY_SPACE', name: 'Raum' } }));
      const cloaked = { id: 8, name: 'Geheim', userId: 5, location: location(2), runtimeSystems: { CLOAK: { active: true } } };
      const query = (rows: unknown[]) => {
        const builder: any = { getMany: jest.fn(async () => rows), getRawMany: jest.fn(async () => []) };
        for (const method of ['leftJoinAndSelect', 'leftJoin', 'innerJoin', 'select', 'addSelect', 'where', 'andWhere', 'orderBy', 'addOrderBy']) builder[method] = jest.fn(() => builder);
        return builder;
      };
      Object.assign(ship, { locationId: 42, location: location(1), status: 'IDLE', runtimeSystems: {
        LONG_RANGE_SENSORS: { active: true, cooldown: 0, integrity: 100 },
        TACHYON_SCANNER: { active: true, cooldown: 0, integrity: 100, lastScanAt: Date.now(), lastScanLocationId: 42 },
      } });
      Object.assign(service as any, {
        shipRepo: { findOne: jest.fn(async () => ship), createQueryBuilder: () => query([cloaked]) },
        systemFieldRepo: { createQueryBuilder: () => query(fields) },
        galaxyFieldRepo: { createQueryBuilder: () => query(fields) },
        objectRepo: { createQueryBuilder: () => query([]) },
        layerRepo: { findOneBy: jest.fn(async () => ({ width: 5, height: 5 })) },
        dataSource: { getRepository: () => ({ createQueryBuilder: () => query([]) }) },
        getSensorRange: jest.fn(async () => 3),
        buildLocalMapContext: jest.fn(async () => ({})),
      });
      const detected = await service.getLocalMap(2, 1);
      expect(detected.overlays.signatures).toContainEqual({ x: 2, y: 1, state: 'COUNT', count: 1 });
      expect(detected.ships).toEqual([]);
      expect(JSON.stringify(detected)).not.toContain('Geheim');
      jest.advanceTimersByTime(300_000);
      const expired = await service.getLocalMap(2, 1);
      expect(expired.overlays.signatures).not.toContainEqual({ x: 2, y: 1, state: 'COUNT', count: 1 });
      expect(expired.tachyonScanExpiresAt).toBeNull();
    });
  });

  it('shows detected NBS contacts only until expiry and offers only the attack action', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-16T12:00:00Z'));
    try {
      const { service, ship } = createService();
      const location = { id: 100, kind: 'GALAXY_FIELD', galaxyField: { layerId: 1, cx: 1, cy: 1 } };
      Object.assign(ship, { locationId: 100, location, runtimeSystems: {
        TACHYON_SCANNER: { active: true, cooldown: 0, integrity: 100, lastScanAt: Date.now(), lastScanLocationId: 100 },
      } });
      const target = { id: 8, userId: 5, name: 'Getarnt', kind: 'SHIP', status: 'IDLE', locationId: 100, location, runtimeSystems: { CLOAK: { active: true } } };
      const query: any = { getMany: jest.fn(async () => [target]) };
      for (const method of ['leftJoinAndSelect', 'where', 'andWhere', 'leftJoin']) query[method] = jest.fn(() => query);
      (service as any).shipRepo.createQueryBuilder = jest.fn(() => query);
      (service as any).dataSource = { getRepository: () => ({ createQueryBuilder: () => ({ ...query, getMany: async () => [] }), find: async () => [] }) };
      (service as any).escapePodService = { listNearby: async () => [] };
      jest.spyOn(service, 'findOne').mockResolvedValue(ship as any);
      const result = await service.getNearby(2, 1);
      expect(result.ships).toHaveLength(1);
      expect(result.ships[0]).toMatchObject({ id: 8, cloaked: true, actions: { attack: true, scan: false, contact: false, transfer: false, energyTransfer: false, boarding: false } });
      jest.advanceTimersByTime(300_000);
      expect((await service.getNearby(2, 1)).ships).toEqual([]);
    } finally {
      jest.useRealTimers();
    }
  });

  describe('nearby sensors and cloak', () => {
    it('lists foreign cloaked ships for nobody but their owner', async () => {
      const { service, ship } = createService();
      const query: any = {
        leftJoinAndSelect: jest.fn(() => query),
        where: jest.fn(() => query),
        andWhere: jest.fn(() => query),
        leftJoin: jest.fn(() => query),
        getMany: jest.fn(async () => [
          { id: 7, userId: 5, status: 'IDLE', runtimeSystems: {} },
          {
            id: 8,
            userId: 5,
            status: 'IDLE',
            runtimeSystems: { CLOAK: { active: true } },
          },
          {
            id: 9,
            userId: 1,
            status: 'IDLE',
            runtimeSystems: { CLOAK: { active: true } },
          },
        ]),
      };
      (ship as any).locationId = 100;
      (ship as any).location = {
        id: 100,
        kind: 'GALAXY_FIELD',
        galaxyField: { layerId: 1, cx: 1, cy: 1 },
        systemField: null,
      };
      (service as any).shipRepo.createQueryBuilder = jest.fn(() => query);
      (service as any).dataSource = {
        getRepository: jest.fn(() => ({
          createQueryBuilder: () => query,
          find: jest.fn(async () => []),
        })),
      };
      (service as any).escapePodService = { listNearby: jest.fn(async () => []) };
      jest.spyOn(service, 'findOne').mockResolvedValue(ship as any);
      const systems = (service as any).spacecraftRuntimeStateService;
      systems.initialize.mockImplementation((value: any) => ({
        SHORT_RANGE_SENSORS: { active: true, cooldown: 0, integrity: 100 },
        ...value.runtimeSystems,
      }));
      const result = await service.getNearby(2, 1);

      expect(result.ships.map((target) => target.id)).toEqual([7, 9]);
    });
  });
});
