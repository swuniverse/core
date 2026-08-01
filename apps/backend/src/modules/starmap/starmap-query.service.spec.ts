jest.mock('./entities/layer.entity', () => ({ Layer: class Layer {} }));
jest.mock('./entities/galaxy-field.entity', () => ({ GalaxyField: class GalaxyField {} }));
jest.mock('./entities/system-field.entity', () => ({ SystemField: class SystemField {} }));
jest.mock('./entities/star-system.entity', () => ({ StarSystem: class StarSystem {} }));
jest.mock('./entities/hyperspace-route.entity', () => ({ HyperspaceRoute: class HyperspaceRoute {} }));
jest.mock('./entities/hyperspace-route-segment.entity', () => ({ HyperspaceRouteSegment: class HyperspaceRouteSegment {} }));
jest.mock('../colony/entities/colony.entity', () => ({ Colony: class Colony {} }));

import { StarmapQueryService } from './starmap-query.service';

function repo(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findOneBy: jest.fn(),
    find: jest.fn(async () => []),
    ...overrides,
  } as never;
}

describe('StarmapQueryService shields', () => {
  it('projects shielded colonies into the system grid', async () => {
    const system = {
      id: 5,
      name: 'Yavin',
      cx: 1,
      cy: 2,
      maxX: 22,
      maxY: 22,
      systemTypeId: 1050,
      isLandmark: false,
      landmarkKey: null,
      landmarkCategory: null,
    };
    const fieldType = { id: 1, key: 'EMPTY_SPACE', name: 'Space', color: '#000', isSystem: false, isVisible: true };
    const systemRepo = repo({ findOneBy: jest.fn(async () => system) });
    const systemFieldRepo = repo({
      find: jest.fn(async () => [
        {
          id: 10,
          sx: 3,
          sy: 4,
          fieldTypeId: 1,
          celestialObjectId: null,
          isPassable: true,
          energyCost: 1,
          damage: 0,
          effects: null,
          regionKey: null,
          adminRegionKey: null,
          influenceAreaId: null,
          borderMask: null,
          fieldType,
          celestialObject: null,
          starSystem: system,
        },
      ]),
    });
    const colonyRepo = repo({
      find: jest.fn(async () => [
        {
          id: 99,
          starSystemId: 5,
          posX: 7,
          posY: 8,
          isAbandoned: false,
          changeable: { shields: 12 },
        },
        {
          id: 100,
          starSystemId: 5,
          posX: 1,
          posY: 1,
          isAbandoned: false,
          changeable: { shields: 0 },
        },
      ]),
    });
    const service = new StarmapQueryService(
      repo(),
      repo(),
      systemFieldRepo,
      systemRepo,
      repo(),
      repo(),
      colonyRepo,
    );

    const result = await service.getSystemGrid(5);

    expect(result.colonyShields).toEqual([
      { colonyId: 99, systemId: 5, posX: 7, posY: 8, shielded: true },
    ]);
  });
});
