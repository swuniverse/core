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

function repo(overrides: Partial<Record<string, unknown>> = {}) {
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
  } as never;
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
      layerRepo,
      galaxyFieldRepo,
      fieldTypeRepo,
      systemRepo,
      systemFieldRepo,
      objectRepo,
      regionRepo,
      borderTypeRepo,
      hyperspaceRouteRepo,
      hyperspaceRouteSegmentRepo,
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
