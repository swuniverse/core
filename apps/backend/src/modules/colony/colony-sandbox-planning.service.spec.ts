import { ColonySandboxPlanningService } from './colony-sandbox-planning.service';
import { ColonyConstructionService } from './colony-construction.service';
import { ColonyBuildingManagementService } from './colony-building-management.service';
import { ColonyStatsService } from './colony-stats.service';
import { ColonyBuildingEffectsService } from './colony-building-effects.service';
import { ColonyFunctionManagerService } from './colony-function-manager.service';
import type { BuildingDef } from '../game-data/game-data.service';
import type { ColonySandbox } from './entities/colony-sandbox.entity';

function setup() {
  const definitions = new Map<number, BuildingDef>([
    [
      10,
      {
        id: 10,
        name: 'Generator',
        category: 'energy',
        isUnique: false,
        allowedFieldTypes: [101],
        costs: { buildTime: 60 },
        epsCost: 999,
        resourceCosts: [{ commodityId: 1, amount: 999 }],
        epsProc: 20,
        production: [],
        bonuses: { energy: 0, population: 0, storage: 0 },
        integrity: 100,
      } as BuildingDef,
    ],
    [
      11,
      {
        id: 11,
        name: 'Industrie',
        category: 'industry',
        isUnique: false,
        allowedFieldTypes: [101],
        costs: { buildTime: 60 },
        epsProc: -10,
        bevUse: 1,
        researchId: 5,
        colonyLimit: 1,
        globalLimit: 2,
        production: [],
        bonuses: { energy: 0, population: 0, storage: 0 },
        integrity: 200,
      } as BuildingDef,
    ],
  ]);
  const gameData = {
    getBuilding: jest.fn((id) => definitions.get(id)),
    getAllBuildings: () => [...definitions.values()],
    getFieldBuildRuleForFieldTypes: jest.fn(),
    getCategoriesForTerrainTile: () => [],
    getBuildingFunctions: () => [],
    getColonyClass: () => ({ baseProduction: [] }),
    getCommodity: () => undefined,
    getBuildingUpgrade: () => ({
      id: 1,
      fromBuildingId: 10,
      toBuildingId: 11,
      researchId: 5,
      energyCost: 999,
      costs: [{ commodityId: 1, amount: 999 }],
    }),
    getBuildingUpgradesForBuilding: () => [],
    getTerraforming: () => ({
      id: 'land',
      fromFieldType: '101',
      toFieldType: '102',
      researchId: 7,
      energyCost: 999,
      costs: [],
      duration: 999,
    }),
    getTerraformingForFieldType: () => [],
    getAllTerraforming: () => [],
  };
  const unlocks = {
    isBuildingUnlocked: jest.fn(async () => true),
    hasTech: jest.fn(async () => true),
    hasTechByName: jest.fn(async () => true),
  };
  const liveFields = [
    {
      id: 1,
      fieldIndex: 20,
      fieldType: 101,
      layer: 'SURFACE',
      buildingId: null,
      isBuilding: false,
      isActive: false,
      integrity: 0,
      maxIntegrity: 0,
      terrainTileId: null,
      bonusMarker: null,
      buildProgress: 0,
      buildFinishesAt: null,
      activateAfterBuild: true,
      reactivateAfterUpgrade: null,
      terraformingId: null,
      terraformingFinishesAt: null,
    },
  ];
  const sandbox = {
    id: 8,
    userId: 1,
    sourceColonyId: 4,
    name: 'Plan',
    snapshot: {
      sourceColonyName: 'Naboo',
      colonyClassId: 1,
      population: 10,
      populationMax: 10,
      workers: 0,
      energy: 0,
      energyMax: 100,
      storageMax: 100,
      fields: structuredClone(liveFields),
    },
  } as ColonySandbox;
  const live = { id: 4, userId: 1, fields: liveFields };
  const repository = {
    findOne: jest.fn(async (options) =>
      options.where.userId === 1 ? structuredClone(sandbox) : null,
    ),
    save: jest.fn(async (value) => {
      Object.assign(sandbox, structuredClone(value));
      return value;
    }),
  };
  const manager = {
    getRepository: jest.fn((entity) =>
      entity.name === 'ColonySandbox'
        ? repository
        : { find: jest.fn(async () => [live]) },
    ),
  };
  const source = { transaction: jest.fn(async (work) => work(manager)) };
  const lifecycle = {
    activateBuilding: jest.fn(),
    deactivateBuilding: jest.fn(),
    destructBuilding: jest.fn(),
    prepareBuildJob: jest.fn(),
  };
  const stats = new ColonyStatsService(gameData as never);
  const functions = new ColonyFunctionManagerService(gameData as never);
  const effects = new ColonyBuildingEffectsService(
    gameData as never,
    functions,
    stats,
  );
  const rules = new ColonyConstructionService(
    { find: async () => [live] } as never,
    {} as never,
    {} as never,
    gameData as never,
    unlocks as never,
    stats,
    {} as never,
    lifecycle as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    effects,
  );
  const management = new ColonyBuildingManagementService(
    {} as never,
    gameData as never,
    lifecycle as never,
    stats,
    {} as never,
    effects,
  );
  const sandboxes = { get: jest.fn(async () => structuredClone(sandbox)) };
  const service = new ColonySandboxPlanningService(
    source as never,
    sandboxes as never,
    rules,
    gameData as never,
    management,
    unlocks as never,
  );
  return {
    service,
    sandbox,
    live,
    repository,
    lifecycle,
    definitions,
    gameData,
    unlocks,
  };
}

describe('sandbox planning', () => {
  it('builds and replaces immediately without resources, queues or lifecycle effects', async () => {
    const f = setup();
    await f.service.act(1, 8, {
      action: 'build',
      fieldIndex: 20,
      buildingId: 10,
    });
    expect(f.sandbox.snapshot.fields[0]).toMatchObject({
      buildingId: 10,
      isActive: true,
      isBuilding: false,
      integrity: 100,
      buildFinishesAt: null,
    });
    await f.service.act(1, 8, {
      action: 'build',
      fieldIndex: 20,
      buildingId: 11,
      activate: false,
    });
    expect(f.sandbox.snapshot.fields[0]).toMatchObject({
      buildingId: 11,
      isActive: false,
      integrity: 200,
    });
    expect(f.live.fields[0].buildingId).toBeNull();
    for (const spy of Object.values(f.lifecycle))
      expect(spy).not.toHaveBeenCalled();
  });

  it('upgrades, toggles, demolishes and terraforms only the snapshot', async () => {
    const f = setup();
    await f.service.act(1, 8, {
      action: 'build',
      fieldIndex: 20,
      buildingId: 10,
      activate: false,
    });
    await f.service.act(1, 8, {
      action: 'upgrade',
      fieldIndex: 20,
      upgradeId: 1,
    });
    expect(f.sandbox.snapshot.fields[0]).toMatchObject({
      buildingId: 11,
      isActive: false,
      integrity: 200,
    });
    await expect(
      f.service.act(1, 8, { action: 'toggle', fieldIndex: 20 }),
    ).rejects.toThrow('Nicht genug Energie');
    await f.service.act(1, 8, { action: 'demolish', fieldIndex: 20 });
    await f.service.act(1, 8, {
      action: 'terraform',
      fieldIndex: 20,
      terraformingId: 'land',
    });
    expect(f.sandbox.snapshot.fields[0]).toMatchObject({
      buildingId: null,
      fieldType: 102,
      terrainTileId: '102',
      terraformingId: null,
      terraformingFinishesAt: null,
    });
    for (const spy of Object.values(f.lifecycle))
      expect(spy).not.toHaveBeenCalled();
  });

  it('rejects foreign owners and hidden underground fields', async () => {
    const f = setup();
    await expect(
      f.service.act(2, 8, { action: 'build', fieldIndex: 20, buildingId: 10 }),
    ).rejects.toThrow('Sandbox nicht gefunden');
    f.sandbox.snapshot.fields[0].layer = 'UNDERGROUND';
    f.unlocks.hasTechByName.mockResolvedValue(false);
    await expect(
      f.service.act(1, 8, { action: 'build', fieldIndex: 20, buildingId: 10 }),
    ).rejects.toThrow('Untergrund');
    expect(f.repository.save).not.toHaveBeenCalled();
  });

  it('enforces research, terrain, atmosphere and colony/global limits through live placement rules', async () => {
    const f = setup();
    f.unlocks.isBuildingUnlocked.mockResolvedValue(false);
    await expect(
      f.service.act(1, 8, { action: 'build', fieldIndex: 20, buildingId: 11 }),
    ).rejects.toThrow('Research required');
    f.unlocks.isBuildingUnlocked.mockResolvedValue(true);
    f.sandbox.snapshot.fields[0].fieldType = 999;
    await expect(
      f.service.act(1, 8, { action: 'build', fieldIndex: 20, buildingId: 11 }),
    ).rejects.toThrow('terrain');
    f.sandbox.snapshot.fields[0].fieldType = 101;
    f.definitions.get(11)!.colonyLimit = 0;
    f.definitions.get(11)!.globalLimit = 1;
    // The real source is replaced in the planning count, never double counted.
    f.live.fields[0].buildingId = 11 as never;
    await f.service.act(1, 8, {
      action: 'build',
      fieldIndex: 20,
      buildingId: 11,
      activate: false,
    });
    f.sandbox.snapshot.fields.push({
      ...f.sandbox.snapshot.fields[0],
      id: 2,
      fieldIndex: 21,
      buildingId: null,
    });
    await expect(
      f.service.act(1, 8, {
        action: 'build',
        fieldIndex: 21,
        buildingId: 11,
        activate: false,
      }),
    ).rejects.toThrow('per user');
  });

  it('rejects atmosphere and field research violations even when resources are free', async () => {
    const f = setup();
    f.sandbox.snapshot.celestialObject = {
      classId: 90120,
      name: 'Mond',
      objectType: 2,
    };
    f.definitions.get(10)!.requiresAtmosphere = true;
    await expect(
      f.service.act(1, 8, { action: 'build', fieldIndex: 20, buildingId: 10 }),
    ).rejects.toThrow('requires an atmosphere');
    f.definitions.get(10)!.requiresAtmosphere = false;
    f.gameData.getFieldBuildRuleForFieldTypes.mockReturnValue({
      researchId: 20,
    } as never);
    f.unlocks.hasTech.mockResolvedValue(false);
    await expect(
      f.service.act(1, 8, { action: 'build', fieldIndex: 20, buildingId: 10 }),
    ).rejects.toThrow('Research required for this terrain');
    expect(f.repository.save).not.toHaveBeenCalled();
  });

  it('does not reuse workers during consecutive mass activations', async () => {
    const f = setup();
    f.sandbox.snapshot.population = 1;
    f.definitions.get(11)!.colonyLimit = 0;
    f.definitions.get(11)!.globalLimit = 0;
    await f.service.act(1, 8, {
      action: 'build',
      fieldIndex: 20,
      buildingId: 10,
    });
    for (const index of [21, 22])
      f.sandbox.snapshot.fields.push({
        ...f.sandbox.snapshot.fields[0],
        id: index,
        fieldIndex: index,
        buildingId: 11,
        isActive: false,
      });
    const result = await f.service.act(1, 8, {
      action: 'mass-toggle',
      mode: 2,
      fieldIndexes: [21, 22],
      activate: true,
    });
    expect(
      result.snapshot.fields.filter(
        (field) => field.buildingId === 11 && field.isActive,
      ),
    ).toHaveLength(1);
    expect(result.skipped).toEqual([
      { fieldIndex: 22, reason: 'Nicht genug freie Arbeiter' },
    ]);
  });

  it('deactivates orbital effect dependents without lifecycle hooks and protects headquarters', async () => {
    const f = setup();
    f.definitions.get(10)!.production = [{ commodityId: 1801, amount: 1 }];
    f.definitions.get(11)!.production = [{ commodityId: 1801, amount: -1 }];
    await f.service.act(1, 8, {
      action: 'build',
      fieldIndex: 20,
      buildingId: 10,
    });
    f.sandbox.snapshot.fields.push({
      ...f.sandbox.snapshot.fields[0],
      id: 2,
      fieldIndex: 21,
      buildingId: 11,
    });
    await f.service.act(1, 8, { action: 'toggle', fieldIndex: 20 });
    expect(f.sandbox.snapshot.fields[1].isActive).toBe(false);
    f.sandbox.snapshot.fields[0].buildingId = 1;
    await expect(
      f.service.act(1, 8, { action: 'demolish', fieldIndex: 20 }),
    ).rejects.toThrow('headquarters');
    const result = await f.service.act(1, 8, {
      action: 'mass-toggle',
      mode: 2,
      fieldIndexes: [20],
      activate: false,
    });
    expect(result.skipped[0]).toMatchObject({
      fieldIndex: 20,
      reason: 'Zentralgebäude geschützt',
    });
  });

  it('mass switching reports skipped protected/invalid buildings and uses the current plan energy', async () => {
    const f = setup();
    await f.service.act(1, 8, {
      action: 'build',
      fieldIndex: 20,
      buildingId: 10,
    });
    f.sandbox.snapshot.fields.push({
      ...f.sandbox.snapshot.fields[0],
      id: 2,
      fieldIndex: 21,
      buildingId: 11,
      isActive: false,
    });
    const activated = await f.service.act(1, 8, {
      action: 'mass-toggle',
      mode: 2,
      fieldIndexes: [21],
      activate: true,
    });
    expect(activated.snapshot.fields[1].isActive).toBe(true);
    await f.service.act(1, 8, {
      action: 'mass-toggle',
      mode: 2,
      fieldIndexes: [20, 21],
      activate: false,
    });
    expect(f.sandbox.snapshot.fields.every((field) => !field.isActive)).toBe(
      true,
    );
  });
});
