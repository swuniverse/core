jest.mock('./entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  SpacecraftStatus: { DOCKED: 'DOCKED', DESTROYED: 'DESTROYED' },
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
  const shipRepo = { findOne: jest.fn() };
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
  };
  const spacecraftCrewService = {
    hasEnoughCrew: jest.fn().mockResolvedValue(true),
  };
  const service = new SpacecraftScanService(
    shipRepo as any,
    moduleRepo as any,
    objectRepo as any,
    colonyRepo as any,
    colonyScanRepo as any,
    planetGenerator as any,
    gameData as any,
    spacecraftCrewService as any,
  );
  return {
    service,
    shipRepo,
    moduleRepo,
    objectRepo,
    colonyRepo,
    colonyScanRepo,
    planetGenerator,
    gameData,
    spacecraftCrewService,
  };
}

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
      status: SpacecraftStatus.DOCKED,
      modules: [activeScanner],
    });
    colonyRepo.findOne.mockResolvedValue({
      id: 20,
      name: 'Fremdwelt',
      userId: 2,
      user: { username: 'Leia' },
      starSystemId: 7,
      colonyClassId: 3,
      posX: 5,
      posY: 5,
      celestialObject: {
        id: 30,
        name: 'Mond I',
        classId: 3,
        posX: 5,
        posY: 5,
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
        starSystemId: 7,
        celestialObject: {
          id: 30,
          name: 'Mond I',
          classId: 3,
          posX: 5,
          posY: 5,
        },
      },
      surface: {
        width: 4,
        height: 3,
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

  it('requires target colony to be inside scanner range', async () => {
    const { service, shipRepo, colonyRepo } = createService();
    shipRepo.findOne.mockResolvedValue({
      id: 10,
      userId: 1,
      inSystem: true,
      starSystemId: 7,
      currentSystemFieldX: 1,
      currentSystemFieldY: 1,
      status: SpacecraftStatus.DOCKED,
      modules: [activeScanner],
    });
    colonyRepo.findOne.mockResolvedValue({
      id: 20,
      userId: 2,
      starSystemId: 7,
      posX: 20,
      posY: 20,
      fields: [],
    });

    await expect(service.colonyScan(10, 1, 20)).rejects.toThrow(
      new BadRequestException('Colony is outside sensor range'),
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
      status: SpacecraftStatus.DOCKED,
      modules: [activeScanner],
    });
    colonyRepo.findOne.mockResolvedValue(null);

    await expect(service.colonyScan(10, 1, 20)).rejects.toThrow(
      new NotFoundException('Colony not found'),
    );
    expect(colonyRepo.findOne).toHaveBeenCalledWith({
      where: { id: 20 },
      relations: ['fields', 'user', 'celestialObject'],
    });
  });

  it('lists latest colony scans per colony for a user', async () => {
    const { service, colonyScanRepo } = createService();
    colonyScanRepo.find.mockResolvedValue([
      {
        id: 7,
        colonyId: 20,
        colonyOwnerId: 2,
        colonyName: 'Neu',
        colonyOwnerUsername: 'Leia',
        starSystemId: 7,
        celestialObjectId: 30,
        colonyClassId: 3,
        surfaceWidth: 4,
        surfaceHeight: 3,
        createdAt: new Date('2026-07-16T09:00:00.000Z'),
        colony: { id: 20, userId: 2 },
      },
      {
        id: 6,
        colonyId: 20,
        colonyOwnerId: 2,
        colonyName: 'Alt',
        colonyOwnerUsername: 'Leia',
        starSystemId: 7,
        celestialObjectId: 30,
        colonyClassId: 3,
        surfaceWidth: 4,
        surfaceHeight: 3,
        createdAt: new Date('2026-07-15T09:00:00.000Z'),
        colony: { id: 20, userId: 2 },
      },
    ]);

    await expect(service.listColonyScans(1)).resolves.toEqual([
      expect.objectContaining({
        id: 7,
        colonyId: 20,
        abandoned: false,
        history: expect.arrayContaining([
          expect.objectContaining({ id: 7 }),
          expect.objectContaining({ id: 6 }),
        ]),
      }),
    ]);
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
