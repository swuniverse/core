jest.mock('./entities/layer.entity', () => ({ Layer: class Layer {} }));
jest.mock('./entities/galaxy-field.entity', () => ({
  GalaxyField: class GalaxyField {},
  FactionZone: { FEDERATION: 'FEDERATION', NEUTRAL: 'NEUTRAL' },
}));
jest.mock('./entities/galaxy-field-type.entity', () => ({
  GalaxyFieldType: class GalaxyFieldType {},
}));
jest.mock('./entities/star-system.entity', () => ({
  StarSystem: class StarSystem {},
}));
jest.mock('./entities/system-field.entity', () => ({
  SystemField: class SystemField {},
}));
jest.mock('./entities/celestial-object.entity', () => ({
  CelestialObject: class CelestialObject {},
  CelestialObjectType: { PLANET: 1, MOON: 2, ASTEROID: 3 },
}));
jest.mock('./entities/map-region.entity', () => ({
  MapRegion: class MapRegion {},
}));
jest.mock('./entities/border-type.entity', () => ({
  BorderType: class BorderType {},
}));
jest.mock('./entities/hyperspace-route.entity', () => ({
  HyperspaceRoute: class HyperspaceRoute {},
}));
jest.mock('./entities/hyperspace-route-segment.entity', () => ({
  HyperspaceRouteSegment: class HyperspaceRouteSegment {},
}));

import { StarmapAdminService } from './starmap-admin.service';

type MockRepo = {
  find: jest.Mock;
  findOne: jest.Mock;
  findOneBy: jest.Mock;
  findOneOrFail: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  delete: jest.Mock;
  createQueryBuilder: jest.Mock;
};

function repo(overrides: Partial<MockRepo> = {}): MockRepo {
  return {
    find: jest.fn(async () => []),
    findOne: jest.fn(async () => null),
    findOneBy: jest.fn(async () => null),
    findOneOrFail: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
    delete: jest.fn(async () => ({ affected: 0 })),
    createQueryBuilder: jest.fn(() => ({
      delete: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn(async () => ({ affected: 0 })),
    })),
    ...overrides,
  };
}

function createService(overrides: { objectRepo?: MockRepo } = {}) {
  const objectRepo = overrides.objectRepo ?? repo();
  return {
    objectRepo,
    service: new StarmapAdminService(
      repo() as never,
      repo() as never,
      repo() as never,
      repo() as never,
      repo() as never,
      objectRepo as never,
      repo() as never,
      repo() as never,
      repo() as never,
      repo() as never,
      {} as never,
      {} as never,
    ),
  };
}

describe('StarmapAdminService importLayer colony bindings', () => {
  it('restores existing colony system/object references after replacing layer content', async () => {
    const layerRepo = repo({
      findOne: jest.fn(async () => ({ id: 1, name: 'Galaxy' })),
    });
    const fieldTypeRepo = repo({
      find: jest.fn(async () => [{ id: 7, key: 'EMPTY_SPACE' }]),
    });
    const systemRepo = repo({
      save: jest.fn(async (value) => ({ ...value, id: 100 })),
    });
    const objectRepo = repo({
      save: jest.fn(async (value) => ({ ...value, id: 200 })),
      createQueryBuilder: jest.fn(() => ({
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn(async () => ({ affected: 1 })),
      })),
    });
    const systemFieldRepo = repo();
    const regionRepo = repo();
    const borderTypeRepo = repo();
    const hyperspaceRouteRepo = repo();
    const hyperspaceRouteSegmentRepo = repo();
    const galaxyFieldRepo = repo();
    const updateExecute = jest.fn(async () => ({ affected: 1 }));
    const updateSet = jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({ execute: updateExecute }),
    });
    const entityManager = {
      query: jest.fn(async (sql: string) => {
        if (sql.includes('FROM "colonies" c')) {
          return [
            {
              colonyId: 55,
              colonyName: 'Home',
              userId: 9,
              sourceSystemId: 10,
              sourceCelestialObjectId: 20,
              systemName: 'Corellia',
              systemCx: 4,
              systemCy: 5,
              objectType: 1,
              objectName: 'Corellia Prime',
              objectPosX: 8,
              objectPosY: 9,
              objectClassId: 101,
            },
          ];
        }
        return [];
      }),
      createQueryBuilder: jest.fn(() => ({
        update: jest.fn().mockReturnValue({ set: updateSet }),
      })),
    } as never;

    const service = new StarmapAdminService(
      layerRepo as never,
      galaxyFieldRepo as never,
      fieldTypeRepo as never,
      systemRepo as never,
      systemFieldRepo as never,
      objectRepo as never,
      regionRepo as never,
      borderTypeRepo as never,
      hyperspaceRouteRepo as never,
      hyperspaceRouteSegmentRepo as never,
      {} as never,
      entityManager,
    );

    const result = await service.importLayer({
      layer: { name: 'Galaxy', width: 10, height: 10, sectorSize: 5 },
      fieldTypes: [],
      borderTypes: [],
      regions: [],
      galaxyFields: [],
      systems: [
        {
          sourceId: 10,
          name: 'Corellia',
          cx: 4,
          cy: 5,
          systemTypeId: 1,
          maxX: 12,
          maxY: 12,
          celestialObjects: [
            {
              sourceId: 20,
              objectType: 1,
              name: 'Corellia Prime',
              posX: 8,
              posY: 9,
              classId: 101,
              isColonizable: true,
            },
          ],
          fields: [],
        },
      ],
      hyperspaceRoutes: [],
      wormholes: [],
    });

    expect(updateSet).toHaveBeenCalledWith({
      starSystemId: 100,
      celestialObjectId: 200,
    });
    expect(result).toEqual({
      layerId: 1,
      imported: true,
      restoredColonyBindings: 1,
    });
  });
});

describe('StarmapAdminService updateCelestialObject', () => {
  it('trims empty name and description to null', async () => {
    const object = {
      id: 7,
      objectType: 1,
      name: 'Alderaan',
      description: 'Peaceful core world',
      posX: 3,
      posY: 4,
      classId: 101,
      isColonizable: true,
    };
    const { service, objectRepo } = createService({
      objectRepo: repo({ findOneBy: jest.fn(async () => object) }),
    });

    const result = await service.updateCelestialObject(7, {
      name: '   ',
      description: '   ',
    });

    expect(objectRepo.save).toHaveBeenCalledWith({
      ...object,
      name: null,
      description: null,
    });
    expect(result).toEqual({
      id: 7,
      objectType: 1,
      name: null,
      description: null,
      posX: 3,
      posY: 4,
      classId: 101,
      isColonizable: true,
    });
  });

  it('rejects descriptions above 2000 characters', async () => {
    const object = {
      id: 7,
      objectType: 1,
      name: 'Alderaan',
      description: null,
      posX: 3,
      posY: 4,
      classId: 101,
      isColonizable: true,
    };
    const { service, objectRepo } = createService({
      objectRepo: repo({ findOneBy: jest.fn(async () => object) }),
    });

    await expect(
      service.updateCelestialObject(7, { description: 'x'.repeat(2001) }),
    ).rejects.toThrow('Celestial object description is too long');
    expect(objectRepo.save).not.toHaveBeenCalled();
  });

  it('returns a DTO with description after saving', async () => {
    const object = {
      id: 7,
      objectType: 1,
      name: 'Alderaan',
      description: null,
      posX: 3,
      posY: 4,
      classId: 101,
      isColonizable: true,
    };
    const { service } = createService({
      objectRepo: repo({ findOneBy: jest.fn(async () => object) }),
    });

    const result = await service.updateCelestialObject(7, {
      name: ' Alderaan Prime ',
      description: ' [quote]Outer Rim[/quote] ',
    });

    expect(result).toEqual({
      id: 7,
      objectType: 1,
      name: 'Alderaan Prime',
      description: '[quote]Outer Rim[/quote]',
      posX: 3,
      posY: 4,
      classId: 101,
      isColonizable: true,
    });
  });
});
