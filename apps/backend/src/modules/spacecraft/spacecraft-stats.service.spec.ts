import { SpacecraftStatsService } from './spacecraft-stats.service';

function createService() {
  const modules = [
    {
      name: 'Durastahl-Panzerung',
      category: 'HULL',
      public: { baseHullPoints: 25, baseCrewCapacity: 0 },
      secret: {},
    },
    {
      name: 'Standard-Deflektorschild',
      category: 'SHIELDS',
      public: { baseCrewCapacity: 1 },
      secret: { baseShieldStrength: 20 },
    },
    {
      name: 'Energieverteiler',
      category: 'SPECIAL',
      public: { baseEpsCapacity: 10, baseBatteryCapacity: 3, baseCrewCapacity: 0 },
      secret: {},
    },
    {
      name: 'Hypermaterie-Reaktor',
      category: 'SPECIAL',
      public: { baseReactorOutput: 20, baseCrewCapacity: 1 },
      secret: {},
    },
    {
      name: 'Ion-Triebwerk',
      category: 'SUBLIGHT_ENGINE',
      public: { baseEvadeChance: 0, baseCrewCapacity: 1 },
      secret: {},
    },
    {
      name: 'Imperialer Ionenantrieb',
      category: 'SUBLIGHT_ENGINE',
      public: { baseEvadeChance: 10, baseCrewCapacity: 1 },
      secret: {},
    },
    {
      name: 'Standard-Hyperantrieb',
      category: 'HYPERDRIVE',
      public: { baseWarpdriveCapacity: 20, hyperdriveRating: 3, baseCrewCapacity: 1 },
      secret: {},
    },
    {
      name: 'Allianz-Hyperantrieb',
      category: 'HYPERDRIVE',
      public: { baseWarpdriveCapacity: 30, hyperdriveRating: 2, baseCrewCapacity: 2 },
      secret: {},
    },
    {
      name: 'Standard-Frachtraum',
      category: 'CARGO',
      public: { baseCargoCapacity: 50, baseCrewCapacity: 0 },
      secret: {},
    },
  ];
  const gameData = { getAllModules: jest.fn(() => modules) };
  return new SpacecraftStatsService(gameData as any);
}

describe('SpacecraftStatsService', () => {
  const shipClass = {
    hullBase: 100,
    shieldBase: 50,
    epsBase: 80,
    warpdriveBase: 2,
    crewMax: 10,
    cargoCapacity: 40,
    batteryBase: 5,
    reactorBase: 0,
    evadeBase: 0,
    hitChanceBase: 75,
    sensorRangeBase: 2,
    torpedoStorageBase: 0,
    flightEnergyCost: 1,
  } as any;

  it('calculates stats from class base values and active modules', () => {
    const service = createService();
    const stats = service.calculateStats(shipClass, [
      {
        moduleType: 'Durastahl-Panzerung',
        level: 1,
        integrity: 100,
        isActive: true,
      },
      {
        moduleType: 'Standard-Deflektorschild',
        level: 2,
        integrity: 100,
        isActive: true,
      },
      {
        moduleType: 'Energieverteiler',
        level: 1,
        integrity: 100,
        isActive: true,
      },
      {
        moduleType: 'Hypermaterie-Reaktor',
        level: 1,
        integrity: 100,
        isActive: true,
      },
      {
        moduleType: 'Imperialer Ionenantrieb',
        level: 1,
        integrity: 100,
        isActive: true,
      },
      {
        moduleType: 'Allianz-Hyperantrieb',
        level: 1,
        integrity: 100,
        isActive: true,
      },
      {
        moduleType: 'Standard-Frachtraum',
        level: 1,
        integrity: 100,
        isActive: true,
      },
    ] as any);

    expect(stats).toMatchObject({
      hullMax: 125,
      shieldsMax: 74,
      energyMax: 90,
      epsMax: 90,
      reactorOutput: 20,
      warpdriveMax: 32,
      evadeChance: 10,
      warpSpeed: 2,
      crewMax: 15,
      cargoMax: 90,
      batteryMax: 8,
    });

  });

  it('keeps drive families separate from legacy warp speed and projects custom fields', () => {
    const service = createService();
    const ship = {
      hull: 200,
      shields: 200,
      energy: 200,
      crew: 50,
      cargoUsed: 999,
      battery: 999,
    } as any;

    service.applyStats(ship, shipClass, [
      {
        moduleType: 'Energieverteiler',
        level: 2,
        integrity: 100,
        isActive: true,
      },
      {
        moduleType: 'Hypermaterie-Reaktor',
        level: 2,
        integrity: 100,
        isActive: true,
      },
      {
        moduleType: 'Imperialer Ionenantrieb',
        level: 2,
        integrity: 100,
        isActive: true,
      },
      {
        moduleType: 'Allianz-Hyperantrieb',
        level: 2,
        integrity: 100,
        isActive: true,
      },
    ] as any);

    expect(ship).toMatchObject({
      energyMax: 92,
      warpSpeed: 2,
      batteryMax: 9,
      epsMax: 92,
      reactorOutput: 24,
      warpdriveMax: 38,
      evadeChance: 12,
    });
  });

  it('ignores inactive or destroyed modules and caps current values when applied', () => {
    const service = createService();
    const ship = {
      hull: 200,
      shields: 200,
      energy: 200,
      crew: 50,
      cargoUsed: 100,
      battery: 50,
    } as any;

    service.applyStats(ship, shipClass, [
      {
        moduleType: 'Durastahl-Panzerung',
        level: 1,
        integrity: 0,
        isActive: true,
      },
      {
        moduleType: 'Standard-Deflektorschild',
        level: 1,
        integrity: 100,
        isActive: false,
      },
    ] as any);

    expect(ship).toMatchObject({
      hullMax: 100,
      shieldsMax: 50,
      energyMax: 80,
      crewMax: 10,
      cargoMax: 40,
      hull: 100,
      shields: 50,
      energy: 80,
      crew: 10,
      cargoUsed: 40,
      battery: 5,
    });
  });
});
