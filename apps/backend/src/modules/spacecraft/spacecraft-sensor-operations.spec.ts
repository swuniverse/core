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
jest.mock('../starmap/system-type-discovery.service', () => ({
  SystemTypeDiscoveryService: class SystemTypeDiscoveryService {},
}));
jest.mock('../starmap/celestial-class-discovery.service', () => ({
  CelestialClassDiscoveryService: class CelestialClassDiscoveryService {},
}));

import { SpacecraftRuntimeStateService } from './spacecraft-runtime-state.service';
import { tachyonScanExpiresAt } from './spacecraft-tachyon-scan';
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
      locationId: 42,
      location: {
        kind: 'GALAXY_FIELD',
        galaxyField: { layerId: 3, cx: 8, cy: 9 },
      },
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
    const manager = { findOne: shipRepo.findOne, save: shipRepo.save };
    Object.assign(shipRepo, { manager: { transaction: jest.fn(async (run) => run(manager)) } });
    const crew = { hasEnoughCrew: jest.fn().mockResolvedValue(true) };
    const runtime = new SpacecraftRuntimeStateService();
    const scanRepo = {
      create: jest.fn((v) => v),
      save: jest.fn(async (v) => ({
        id: 9,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        ...v,
      })),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    const flightSignatures = {
      getVisibleAt: jest.fn().mockResolvedValue({
        signatures: [
          {
            id: 77,
            spacecraftId: 9,
            spacecraftName: 'Ziel',
            fromDirection: 'WEST',
            toDirection: 'EAST',
          },
        ],
        fadedSignatures: { uncloaked: 0, cloaked: 0 },
      }),
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
      { findOne: jest.fn() } as never,
      {} as never,
      { getAllModules: jest.fn() } as never,
      crew as never,
      { initialize: jest.fn(() => ship.runtimeSystems), requireActivation: runtime.requireActivation.bind(runtime) } as never,
      exploration as never,
      { discover: jest.fn() } as never,
      { discover: jest.fn() } as never,
      { resolve: jest.fn() } as never,
      { find: jest.fn().mockResolvedValue([]) } as never,
      flightSignatures as never,
    );
    return {
      service,
      ship,
      shipRepo,
      scanRepo,
      galaxyFieldRepo,
      exploration,
      flightSignatures,
      crew,
      manager,
    };
  }

  describe('Gravitationswellenscanner', () => {
    function scannerSetup() {
      const fixture = setup();
      fixture.ship.energy = 20;
      Object.assign(fixture.ship.runtimeSystems, {
        TACHYON_SCANNER: { active: true, cooldown: 0, integrity: 100 },
      });
      return fixture;
    }

    afterEach(() => jest.useRealTimers());

    it('atomically spends 10 EPS and detects cloak only before the five-minute deadline', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-11-16T12:00:00Z'));
      const { service, ship, manager } = scannerSetup();
      const result = await service.tachyonScan(2, 1);
      expect(ship.energy).toBe(10);
      expect(result.energyCost).toBe(10);
      expect(manager.findOne).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        where: { id: 2, userId: 1 }, lock: { mode: 'pessimistic_write', tables: ['spacecraft'] },
      }));
      expect(manager.save).toHaveBeenCalledWith(ship);
      expect(tachyonScanExpiresAt(ship as never, result.scannedAt - 1)).toBeNull();
      expect(tachyonScanExpiresAt(ship as never, result.scannedAt)).toBe(result.expiresAt);
      expect(tachyonScanExpiresAt(ship as never, result.expiresAt - 1)).toBe(result.expiresAt);
      expect(tachyonScanExpiresAt(ship as never, result.expiresAt)).toBeNull();
      ship.locationId = 43;
      expect(tachyonScanExpiresAt(ship as never, result.scannedAt)).toBeNull();
    });

    it.each([
      ['missing', undefined, 'nicht verfügbar'],
      ['inactive', { active: false, integrity: 100, cooldown: 0 }, 'nicht aktiv'],
      ['destroyed', { active: true, integrity: 0, cooldown: 0 }, 'zerstört'],
      ['cooling', { active: true, integrity: 100, cooldown: 1 }, 'Cooldown'],
    ])('rejects a %s scanner without spending EPS', async (_name, state, reason) => {
      const { service, ship, shipRepo } = scannerSetup();
      (ship.runtimeSystems as Record<string, unknown>).TACHYON_SCANNER = state;
      await expect(service.tachyonScan(2, 1)).rejects.toThrow(reason);
      expect(ship.energy).toBe(20);
      expect(shipRepo.save).not.toHaveBeenCalled();
    });

    it.each(['energy', 'crew', 'standby', 'destroyed', 'owner'])('rejects invalid %s without saving a scan', async (guard) => {
      const { service, ship, shipRepo, crew } = scannerSetup();
      if (guard === 'energy') ship.energy = 9;
      if (guard === 'crew') crew.hasEnoughCrew.mockResolvedValue(false);
      if (guard === 'standby') ship.operatingMode = 'STANDBY';
      if (guard === 'destroyed') ship.status = 'DESTROYED';
      if (guard === 'owner') shipRepo.findOne.mockResolvedValue(null);
      await expect(service.tachyonScan(2, 1)).rejects.toThrow();
      expect(shipRepo.save).not.toHaveBeenCalled();
    });

    it('passes cloak detection to sector scans only while fresh', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-11-16T12:00:00Z'));
      const { service, ship, flightSignatures } = scannerSetup();
      const result = await service.tachyonScan(2, 1);
      await service.sectorScan(2, 1);
      expect(flightSignatures.getVisibleAt).toHaveBeenLastCalledWith(42, 1, expect.any(Date), true);
      jest.setSystemTime(result.expiresAt);
      await service.sectorScan(2, 1);
      expect(flightSignatures.getVisibleAt).toHaveBeenLastCalledWith(42, 1, expect.any(Date), false);
      expect(ship.energy).toBe(8);
    });
  });

  it('charges one EPS, applies NBS cooldown and persists a user snapshot', async () => {
    const { service, ship, shipRepo, scanRepo, galaxyFieldRepo, exploration } =
      setup();
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
      expect.objectContaining({
        userId: 1,
        layerId: 3,
        cx: 8,
        cy: 9,
        radius: 1,
      }),
    );
    expect(galaxyFieldRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { layerId: 3, cx: 8, cy: 9 } }),
    );
    expect(scanRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ locationId: 42, location: ship.location }),
    );
    expect(result.id).toBe(9);
  });

  it('reports energy cost, special damage and deflector-failure damage of the field type like STU', async () => {
    const { service, scanRepo, galaxyFieldRepo } = setup();
    galaxyFieldRepo.findOne.mockResolvedValue({
      cx: 8,
      cy: 9,
      // Per-field copies are not authoritative; STU reads the field type.
      energyCost: 1,
      damage: 0,
      effects: [],
      fieldType: { id: 165, key: 'brennender_nebel_165', name: 'Brennender Nebel', energyCost: 5, damage: 100, specialDamage: 30 },
    });

    await service.sectorScan(2, 1);

    expect(scanRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        result: expect.objectContaining({
          field: expect.objectContaining({ movementEnergyCost: 5, damage: 100, specialDamage: 30 }),
        }),
      }),
    );
  });

  it('starts targeted subspace analysis from a sector scan for 100 EPS', async () => {
    const { service, ship, shipRepo } = setup();
    ship.energy = 150;
    (ship.runtimeSystems as Record<string, unknown>).SUBSPACE_SCANNER = {
      active: true,
      cooldown: 0,
      integrity: 100,
    };
    (ship.runtimeSystems as Record<string, unknown>).MATRIX_SCANNER = {
      active: true,
      cooldown: 0,
      integrity: 100,
    };

    await expect(service.analyzeSubspace(2, 1, 77)).resolves.toEqual({
      signatureId: 77,
      spacecraftId: 9,
      spacecraftName: 'Ziel',
      energy: 50,
    });
    expect(shipRepo.save).toHaveBeenCalledWith(ship);
  });

  it('rejects scans when the required sensor is inactive', async () => {
    const { service, ship } = setup();
    ship.runtimeSystems.SHORT_RANGE_SENSORS.active = false;
    await expect(service.sectorScan(2, 1)).rejects.toThrow('nicht aktiv');
  });
});
