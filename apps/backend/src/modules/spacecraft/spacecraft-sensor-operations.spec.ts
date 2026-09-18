jest.mock('./entities/spacecraft.entity', () => ({
  SpacecraftStatus: { IDLE: 'IDLE', DESTROYED: 'DESTROYED' },
  Spacecraft: class Spacecraft {},
}));
jest.mock('./entities/spacecraft-module.entity', () => ({
  SpacecraftModule: class SpacecraftModule {},
}));
jest.mock('./entities/colony-scan.entity', () => ({
  ColonyScan: class ColonyScan {},
}));
jest.mock('./entities/spacecraft-scan-result.entity', () => ({
  SpacecraftScanType: { SECTOR: 'SECTOR', SYSTEM_FIELD: 'SYSTEM_FIELD' },
  SpacecraftScanResult: class SpacecraftScanResult {},
}));
jest.mock('../starmap/entities/system-field.entity', () => ({
  SystemField: class SystemField {},
}));
jest.mock('../starmap/entities/galaxy-field.entity', () => ({
  GalaxyField: class GalaxyField {},
}));
jest.mock('../starmap/entities/celestial-object.entity', () => ({
  CelestialObject: class CelestialObject {},
}));
jest.mock('../colony/entities/colony.entity', () => ({
  Colony: class Colony {},
}));
jest.mock('./spacecraft-crew.service', () => ({
  SpacecraftCrewService: class SpacecraftCrewService {},
}));
jest.mock('../starmap/exploration.service', () => ({
  ExplorationService: class ExplorationService {},
}));

import { SpacecraftScanService } from './spacecraft-scan.service';

describe('Spacecraft sensor operations', () => {
  function setup() {
    const ship = {
      id: 2,
      userId: 1,
      status: 'IDLE',
      operatingMode: 'NORMAL',
      energy: 5,
      inSystem: false,
      currentLayerId: 1,
      starSystemId: null,
      posX: 4,
      posY: 5,
      runtimeSystems: {
        SHORT_RANGE_SENSORS: { active: true, cooldown: 0, integrity: 100 },
        LONG_RANGE_SENSORS: { active: true, cooldown: 0, integrity: 100 },
      },
      modules: [],
    };
    const shipRepo = {
      findOne: jest.fn().mockResolvedValue(ship),
      findOneBy: jest.fn().mockResolvedValue(ship),
      save: jest.fn(async (v) => v),
    };
    const scanRepo = {
      create: jest.fn((v) => v),
      save: jest.fn(async (v) => ({
        id: 9,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        ...v,
      })),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    const galaxyFieldRepo = {
      findOne: jest.fn().mockResolvedValue({
        cx: 4,
        cy: 5,
        energyCost: 0,
        damage: 0,
        effects: [],
        fieldType: { id: 1, key: 'EMPTY_SPACE', name: 'Raum' },
      }),
    };
    const exploration = { discoverArea: jest.fn(), discoverSystem: jest.fn() };
    const service = new SpacecraftScanService(
      shipRepo as never,
      { find: jest.fn() } as never,
      {} as never,
      {} as never,
      {} as never,
      scanRepo as never,
      { find: jest.fn(), findOne: jest.fn() } as never,
      galaxyFieldRepo as never,
      {} as never,
      { getAllModules: jest.fn() } as never,
      { hasEnoughCrew: jest.fn().mockResolvedValue(true) } as never,
      { initialize: jest.fn(() => ship.runtimeSystems) } as never,
      exploration as never,
    );
    return { service, ship, shipRepo, scanRepo, exploration };
  }

  it('charges one EPS, applies NBS cooldown and persists a user snapshot', async () => {
    const { service, ship, shipRepo, scanRepo, exploration } = setup();
    const result = await service.sectorScan(2, 1);
    expect(ship.energy).toBe(4);
    expect(ship.runtimeSystems.SHORT_RANGE_SENSORS.cooldown).toBe(0);
    expect(shipRepo.save).toHaveBeenCalled();
    expect(scanRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        spacecraftId: 2,
        type: 'SECTOR',
        energyCost: 1,
      }),
    );
    expect(exploration.discoverArea).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1, radius: 1 }),
    );
    expect(result.id).toBe(9);
  });

  it('rejects scans when the required sensor is inactive', async () => {
    const { service, ship } = setup();
    ship.runtimeSystems.SHORT_RANGE_SENSORS.active = false;
    await expect(service.sectorScan(2, 1)).rejects.toThrow('nicht aktiv');
  });
});
