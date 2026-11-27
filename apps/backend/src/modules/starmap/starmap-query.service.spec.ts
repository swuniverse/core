jest.mock('./entities/layer.entity', () => ({ Layer: class Layer {} }));
jest.mock('./entities/galaxy-field.entity', () => ({
  GalaxyField: class GalaxyField {},
}));
jest.mock('./entities/system-field.entity', () => ({
  SystemField: class SystemField {},
}));
jest.mock('./entities/star-system.entity', () => ({
  StarSystem: class StarSystem {},
}));
jest.mock('./entities/hyperspace-route.entity', () => ({
  HyperspaceRoute: class HyperspaceRoute {},
}));
jest.mock('./entities/hyperspace-route-segment.entity', () => ({
  HyperspaceRouteSegment: class HyperspaceRouteSegment {},
}));
jest.mock('../colony/entities/colony.entity', () => ({
  Colony: class Colony {},
}));

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
    const fieldType = {
      id: 1,
      key: 'EMPTY_SPACE',
      name: 'Space',
      color: '#000',
      isSystem: false,
      isVisible: true,
    };
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
    const colonyRepo: any = repo({
      find: jest.fn(async () => [
        {
          id: 99,
          systemFieldId: 11,
          systemField: { starSystemId: 5, sx: 9, sy: 10 },
          isAbandoned: false,
          changeable: { shields: 12 },
        },
        {
          id: 100,
          systemFieldId: 12,
          systemField: { starSystemId: 5, sx: 1, sy: 1 },
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
      { colonyId: 99, systemId: 5, posX: 9, posY: 10, shielded: true },
    ]);
    expect(colonyRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: [
          { systemField: { starSystemId: 5 }, isAbandoned: false },
          { starSystemId: 5, isAbandoned: false },
        ],
        relations: expect.arrayContaining(['systemField']),
      }),
    );
  });
});

describe('StarmapQueryService layer field details', () => {
  it('attaches details only to fully explored fields and omits unexplored ones', async () => {
    const fieldType = { id: 1, key: 'SPACE', name: 'Weltraum', passable: true, energyCost: 1, damage: 0, isSystem: false, colorKey: null };
    const galaxyFieldRepo = repo({
      find: jest.fn(async () => [
        { id: 1, cx: 1, cy: 1, fieldType },
        { id: 2, cx: 2, cy: 1, fieldType },
        { id: 3, cx: 3, cy: 1, fieldType },
      ]),
    });
    const fieldDetails = {
      load: jest.fn(async (_viewer: number, _layer: number, fields: Array<{ id: number }>) =>
        new Map(fields.map((field) => [field.id, { territoryOwner: null }])),
      ),
    };
    const service = new StarmapQueryService(
      repo(), galaxyFieldRepo, repo(), repo(), repo(), repo(), repo(),
      undefined, undefined, fieldDetails as never,
    );
    const explorationService = {
      getExploredFields: jest.fn(async () => [
        { cx: 1, cy: 1, explorationLevel: 'FULL' },
        { cx: 2, cy: 1, explorationLevel: 'TERRAIN' },
      ]),
      getExploredSystems: jest.fn(async () => []),
    } as never;

    const fields = await service.getExploredLayerFields(12, 1, explorationService);

    expect(fields.map((field) => [field.id, field.details])).toEqual([
      [1, { territoryOwner: null }],
      [2, undefined],
    ]);
    expect(fieldDetails.load).toHaveBeenCalledWith(12, 1, [expect.objectContaining({ id: 1 })]);
  });

  it('shows systems seen at TERRAIN level and treats database systems as fully known', async () => {
    const fieldType = { id: 1, key: 'SYSTEM', name: 'System', passable: true, energyCost: 0, damage: 0, isSystem: true, colorKey: null, category: 'SYSTEM' };
    const starSystem = { id: 7, name: 'Home', cx: 1, cy: 1, layerId: 1 };
    const galaxyFieldRepo = repo({
      find: jest.fn(async () => [
        { id: 1, cx: 1, cy: 1, fieldType, starSystemId: 7, starSystem },
        { id: 2, cx: 2, cy: 1, fieldType, starSystemId: 8, starSystem: { ...starSystem, id: 8 } },
      ]),
    });
    const fieldDetails = { load: jest.fn(async () => new Map()) };
    const service = new StarmapQueryService(
      repo(), galaxyFieldRepo, repo(), repo(), repo(), repo(), repo(),
      undefined, undefined, fieldDetails as never,
    );
    const explorationService = {
      getExploredFields: jest.fn(async () => [
        { cx: 2, cy: 1, explorationLevel: 'TERRAIN' },
      ]),
      getExploredSystems: jest.fn(async () => [{ starSystemId: 7 }]),
    } as never;

    const fields = await service.getExploredLayerFields(12, 1, explorationService);

    // Field 2 is only seen by sensors: the star is visible, but no details are loaded.
    expect(fields.map((f) => [f.id, f.starSystemId, f.details])).toEqual([
      [1, 7, undefined],
      [2, 8, undefined],
    ]);
  });
});
