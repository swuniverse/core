jest.mock('./entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  SpacecraftOperatingMode: { NORMAL: 'NORMAL', STANDBY: 'STANDBY' },
  SpacecraftStatus: { IDLE: 'IDLE', DESTROYED: 'DESTROYED' },
}));
jest.mock('./entities/spacecraft-module.entity', () => ({
  SpacecraftModule: class SpacecraftModule {},
}));
jest.mock('../starmap/entities/celestial-object.entity', () => ({
  CelestialObject: class CelestialObject {},
}));
jest.mock('../colony/entities/colony.entity', () => ({
  Colony: class Colony {},
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
jest.mock('../starmap/system-type-discovery.service', () => ({
  SystemTypeDiscoveryService: class SystemTypeDiscoveryService {},
}));
jest.mock('../starmap/celestial-class-discovery.service', () => ({
  CelestialClassDiscoveryService: class CelestialClassDiscoveryService {},
}));
jest.mock('../starmap/exploration.service', () => ({
  ExplorationService: class ExplorationService {},
}));
jest.mock('../starmap/generator/planet-generator.service', () => ({
  PlanetGeneratorService: class PlanetGeneratorService {},
}));
jest.mock('../starmap/generator/stu-planet-surface.generator', () => ({
  supportsStuSurface: jest.fn(() => true),
}));
jest.mock('./spacecraft-crew.service', () => ({
  SpacecraftCrewService: class SpacecraftCrewService {},
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SpacecraftScanService } from './spacecraft-scan.service';
import { SpacecraftStatus } from './entities/spacecraft.entity';

const activeScanner = {
  moduleType: 'Matrixsensoren',
  category: 'SENSORS',
  level: 1,
  integrity: 100,
  isActive: true,
};

function createService() {
  const shipRepo = { findOne: jest.fn(), save: jest.fn(async (ship) => ship) };
  const moduleRepo = { find: jest.fn() };
  const objectRepo = { findOneBy: jest.fn() };
  const colonyRepo = { findOne: jest.fn() };
  const colonyScanRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(() => ({})),
    save: jest.fn(async (value) => ({ id: 99, ...value })),
    remove: jest.fn(async (value) => value),
  };
  const scanResultRepo = {
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({
      id: 100,
      createdAt: new Date(),
      ...value,
    })),
  };
  const systemFieldRepo = { find: jest.fn(), findOne: jest.fn() };
  const galaxyFieldRepo = { find: jest.fn() };
  const locationRepo = { findOne: jest.fn() };
  const planetGenerator = { generateAndPersist: jest.fn() };
  const gameData = {
    getAllModules: jest.fn().mockReturnValue([
      {
        name: 'Matrixsensoren',
        category: 'SENSORS',
        public: { canSurfaceScan: true, baseSensorRange: 3 },
      },
    ]),
    getBuilding: jest.fn((id: number) => ({ id, name: `Gebäude ${id}` })),
    getColonyClassDeposits: jest.fn().mockReturnValue([]),
    getCommodity: jest.fn(),
  };
  const spacecraftCrewService = {
    hasEnoughCrew: jest.fn().mockResolvedValue(true),
  };
  const runtimeState = {
    initialize: jest.fn((ship) => ship.runtimeSystems ?? {}),
  };
  const explorationService = {
    discoverArea: jest.fn(),
    discoverSystem: jest.fn(),
    isSystemExplored: jest.fn().mockResolvedValue(false),
  };
  const systemTypeDiscoveryService = { discover: jest.fn() };
  const celestialClassDiscoveryService = { discover: jest.fn() };
  const colonyScanProjection = {
    allAccessible: jest.fn(),
  };
  const service = new SpacecraftScanService(
    shipRepo as any,
    moduleRepo as any,
    objectRepo as any,
    colonyRepo as any,
    colonyScanRepo as any,
    scanResultRepo as any,
    systemFieldRepo as any,
    galaxyFieldRepo as any,
    locationRepo as any,
    planetGenerator as any,
    gameData as any,
    spacecraftCrewService as any,
    runtimeState as any,
    explorationService as any,
    systemTypeDiscoveryService as any,
    celestialClassDiscoveryService as any,
    colonyScanProjection as any,
  );
  return {
    service,
    shipRepo,
    moduleRepo,
    objectRepo,
    colonyRepo,
    colonyScanRepo,
    colonyScanProjection,
    planetGenerator,
    gameData,
    spacecraftCrewService,
    celestialClassDiscoveryService,
    explorationService,
    systemFieldRepo,
  };
}

describe('SpacecraftScanService systemFieldScan', () => {
  it('does not discover the system while scanning one of its fields', async () => {
    const { service, shipRepo, systemFieldRepo, explorationService } =
      createService();
    shipRepo.findOne.mockResolvedValue({
      id: 10,
      userId: 1,
      status: SpacecraftStatus.IDLE,
      energy: 10,
      modules: [activeScanner],
      runtimeSystems: { LONG_RANGE_SENSORS: { active: true, integrity: 100 } },
      location: {
        kind: 'SYSTEM_FIELD',
        systemField: { starSystemId: 8, sx: 2, sy: 2 },
      },
    });
    systemFieldRepo.findOne.mockResolvedValue({
      id: 30,
      starSystemId: 8,
      sx: 3,
      sy: 2,
      isPassable: true,
      effects: [],
      celestialObject: null,
      fieldType: { name: 'Leerer Raum' },
    });

    await service.systemFieldScan(10, 1, 3, 2);

    expect(explorationService.discoverSystem).not.toHaveBeenCalled();
  });
});

describe('SpacecraftScanService colonyScan', () => {
  it('returns redacted foreign colony surface intel without storage, defense, or production', async () => {
    const { service, shipRepo, colonyRepo, colonyScanRepo } = createService();
    shipRepo.findOne.mockResolvedValue({
      id: 10,
      userId: 1,
      inSystem: true,
      starSystemId: 7,
      currentSystemFieldX: 5,
      currentSystemFieldY: 5,
      location: {
        kind: 'SYSTEM_FIELD',
        systemField: { starSystemId: 8, sx: 6, sy: 6 },
      },
      status: SpacecraftStatus.IDLE,
      modules: [activeScanner],
    });
    colonyRepo.findOne.mockResolvedValue({
      id: 20,
      name: 'Fremdwelt',
      userId: 2,
      user: { username: 'Leia' },
      starSystemId: 8,
      colonyClassId: 3,
      posX: 5,
      posY: 5,
      systemField: { starSystemId: 8, sx: 6, sy: 6 },
      celestialObject: {
        id: 30,
        name: 'Mond I',
        classId: 3,
        posX: 6,
        posY: 6,
        surfaceWidth: 4,
        surfaceHeight: 3,
      },
      storage: [{ commodityId: 1, amount: 999 }],
      stats: { shields: 500, shieldFrequency: 123, torpedoTypeId: 81 },
      fields: [
        {
          fieldIndex: 1,
          fieldType: 101,
          terrainTileId: 4,
          buildingId: 11,
          isBuilding: false,
          isActive: true,
          integrity: 80,
          maxIntegrity: 100,
        },
      ],
    });

    const result = await service.colonyScan(10, 1, 20);

    expect(colonyScanRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        colonyId: 20,
        userId: 1,
        colonyOwnerId: 2,
        colonyName: 'Fremdwelt',
        colonyOwnerUsername: 'Leia',
      }),
    );
    expect(result).toEqual({
      scanId: 99,
      colony: {
        id: 20,
        name: 'Fremdwelt',
        owner: { id: 2, username: 'Leia' },
        colonyClassId: 3,
        starSystemId: 8,
        celestialObject: {
          id: 30,
          name: 'Mond I',
          classId: 3,
          posX: 6,
          posY: 6,
        },
      },
      surface: {
        width: 4,
        height: 3,
        deposits: [],
        fields: [
          {
            fieldIndex: 1,
            fieldType: 101,
            terrainTileId: 4,
            buildingId: 11,
            buildingName: 'Gebäude 11',
            hasBuilding: true,
            isConstruction: false,
            isActive: true,
            integrityPercent: 80,
          },
        ],
      },
      intelligence: {
        level: 'SURFACE_SCAN',
        redacted: [
          'storage',
          'defense',
          'population',
          'production',
          'events',
          'queues',
        ],
      },
    });
    expect(JSON.stringify(result)).not.toContain('999');
    expect(JSON.stringify(result)).not.toContain('shieldFrequency');
    expect(JSON.stringify(result)).not.toContain('torpedoTypeId');
  });

  it('includes a database reference only when the scanner already discovered the system', async () => {
    const { service, shipRepo, colonyRepo, explorationService } = createService();
    shipRepo.findOne.mockResolvedValue({
      id: 10,
      userId: 1,
      status: SpacecraftStatus.IDLE,
      modules: [activeScanner],
      location: {
        kind: 'SYSTEM_FIELD',
        systemField: { starSystemId: 8, sx: 6, sy: 6 },
      },
    });
    colonyRepo.findOne.mockResolvedValue({
      id: 20,
      name: 'Fremdwelt',
      userId: 2,
      user: { username: 'Leia' },
      colonyClassId: 3,
      systemField: { starSystemId: 8, sx: 6, sy: 6 },
      celestialObject: null,
      fields: [],
    });

    explorationService.isSystemExplored.mockResolvedValueOnce(true);
    await expect(service.colonyScan(10, 1, 20)).resolves.toEqual(
      expect.objectContaining({
        systemReference: { id: 8, href: '/database/systems/8' },
      }),
    );

    explorationService.isSystemExplored.mockResolvedValueOnce(false);
    await expect(service.colonyScan(10, 1, 20)).resolves.toEqual(
      expect.not.objectContaining({ systemReference: expect.anything() }),
    );
    expect(explorationService.discoverSystem).not.toHaveBeenCalled();
  });

  it('requires target colony to be inside scanner range', async () => {
    const { service, shipRepo, colonyRepo } = createService();
    shipRepo.findOne.mockResolvedValue({
      id: 10,
      userId: 1,
      inSystem: true,
      starSystemId: 7,
      currentSystemFieldX: 1,
      currentSystemFieldY: 1,
      location: {
        kind: 'SYSTEM_FIELD',
        systemField: { starSystemId: 8, sx: 2, sy: 2 },
      },
      status: SpacecraftStatus.IDLE,
      modules: [activeScanner],
    });
    colonyRepo.findOne.mockResolvedValue({
      id: 20,
      userId: 2,
      starSystemId: 8,
      posX: 20,
      posY: 20,
      fields: [],
    });

    await expect(service.colonyScan(10, 1, 20)).rejects.toThrow(
      new BadRequestException('Colony scan requires ship to orbit the colony'),
    );
  });

  it('does not load colonies by requester ownership', async () => {
    const { service, shipRepo, colonyRepo } = createService();
    shipRepo.findOne.mockResolvedValue({
      id: 10,
      userId: 1,
      inSystem: true,
      starSystemId: 7,
      currentSystemFieldX: 1,
      currentSystemFieldY: 1,
      location: {
        kind: 'SYSTEM_FIELD',
        systemField: { starSystemId: 8, sx: 2, sy: 2 },
      },
      status: SpacecraftStatus.IDLE,
      modules: [activeScanner],
    });
    colonyRepo.findOne.mockResolvedValue(null);

    await expect(service.colonyScan(10, 1, 20)).rejects.toThrow(
      new NotFoundException('Colony not found'),
    );
    expect(colonyRepo.findOne).toHaveBeenCalledWith({
      where: { id: 20 },
      relations: ['fields', 'user', 'celestialObject', 'systemField'],
    });
    expect(shipRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        relations: expect.arrayContaining([
          'location',
          'location.galaxyField',
          'location.systemField',
        ]),
      }),
    );
  });

  it('lists authorized own and alliance scans with projection metadata', async () => {
    const { service, colonyScanProjection } = createService();
    const scan = (id: number, userId: number, colonyId: number) => ({
      id,
      colonyId,
      scanner: { id: userId, username: `Spieler ${userId}` },
      provenance: userId === 1 ? 'OWN' : 'ALLIANCE',
      canDelete: userId === 1,
      snapshot: {
        colonyName: `Kolonie ${colonyId}`,
        owner: { id: 20 + userId, username: `Spieler ${userId}` },
        scannedAt: new Date(`2026-07-${20 - id}T09:00:00.000Z`),
        system: { id: 7, celestialObjectId: 30 + colonyId },
        colonyClassId: 3,
        surface: { width: 4, height: 3, deposits: [], fields: [] },
      },
      current: { colony: { isAbandoned: false } },
    });
    colonyScanProjection.allAccessible.mockResolvedValue([
      scan(7, 1, 20),
      scan(6, 2, 21),
    ]);

    await expect(service.listColonyScans(1)).resolves.toEqual([
      expect.objectContaining({
        id: 7,
        colonyId: 20,
        scanner: { id: 1, username: 'Spieler 1' },
        provenance: 'OWN',
        canDelete: true,
        history: [
          expect.objectContaining({
            id: 7,
            scanner: { id: 1, username: 'Spieler 1' },
            provenance: 'OWN',
            canDelete: true,
          }),
        ],
      }),
      expect.objectContaining({
        id: 6,
        colonyId: 21,
        scanner: { id: 2, username: 'Spieler 2' },
        provenance: 'ALLIANCE',
        canDelete: false,
      }),
    ]);
  });

  it('uses the shared projection for archive visibility', async () => {
    const { service, colonyScanProjection } = createService();
    colonyScanProjection.allAccessible.mockResolvedValue([]);

    await expect(service.listColonyScans(1)).resolves.toEqual([]);
    expect(colonyScanProjection.allAccessible).toHaveBeenCalledWith(1);
  });

  it('opens an authorized alliance scan with shared provenance metadata and denies inaccessible scans', async () => {
    const { service, colonyScanProjection } = createService();
    colonyScanProjection.allAccessible.mockResolvedValue([
      {
        id: 7,
        colonyId: 20,
        scanner: { id: 2, username: 'Alliance Scout' },
        provenance: 'ALLIANCE',
        canDelete: false,
        snapshot: {
          colonyName: 'Alderaan',
          owner: { id: 3, username: 'Leia' },
          scannedAt: new Date('2026-07-16T09:00:00.000Z'),
          system: { id: 7, celestialObjectId: 30 },
          colonyClassId: 3,
          surface: { width: 4, height: 3, deposits: [], fields: [] },
        },
        current: { colony: { isAbandoned: false } },
      },
    ]);

    await expect(service.getColonyScan(7, 1)).resolves.toEqual(
      expect.objectContaining({
        id: 7,
        colonyId: 20,
        scanner: { id: 2, username: 'Alliance Scout' },
        provenance: 'ALLIANCE',
        canDelete: false,
      }),
    );
    expect(colonyScanProjection.allAccessible).toHaveBeenCalledWith(1);

    colonyScanProjection.allAccessible.mockResolvedValue([]);
    await expect(service.getColonyScan(7, 1)).rejects.toThrow(
      new NotFoundException('Colony scan not found'),
    );
  });

  it('denies a direct delete attempt for a foreign colony scan', async () => {
    const { service, colonyScanRepo } = createService();
    colonyScanRepo.findOne.mockResolvedValue(null);

    await expect(service.deleteColonyScan(7, 1)).rejects.toThrow(
      new NotFoundException('Colony scan not found'),
    );
    expect(colonyScanRepo.findOne).toHaveBeenCalledWith({
      where: { id: 7, userId: 1 },
    });
    expect(colonyScanRepo.remove).not.toHaveBeenCalled();
  });

  it('deletes own colony scans', async () => {
    const { service, colonyScanRepo } = createService();
    colonyScanRepo.findOne.mockResolvedValue({ id: 7, userId: 1 });

    await expect(service.deleteColonyScan(7, 1)).resolves.toEqual({
      deleted: true,
      id: 7,
    });
    expect(colonyScanRepo.remove).toHaveBeenCalledWith({ id: 7, userId: 1 });
  });
});
