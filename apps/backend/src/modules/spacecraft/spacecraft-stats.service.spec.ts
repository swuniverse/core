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
      public: { baseEnergyOutput: 10, baseCrewCapacity: 0 },
      secret: {},
    },
    {
      name: 'Ion-Triebwerk',
      category: 'SUBLIGHT_ENGINE',
      public: { baseSpeed: 3, baseCrewCapacity: 1 },
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
    warpBase: 2,
    crewMax: 10,
    cargoCapacity: 40,
    batteryBase: 5,
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
        moduleType: 'Ion-Triebwerk',
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
      warpSpeed: 5,
      crewMax: 12,
      cargoMax: 90,
      batteryMax: 5,
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
