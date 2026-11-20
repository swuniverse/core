import { ColonySandboxPreviewService } from './colony-sandbox-preview.service';
import { ColonyStatsService } from './colony-stats.service';
import { ColonySocialService } from './colony-social.service';
import type { Colony } from './entities/colony.entity';
import type { ColonySandbox } from './entities/colony-sandbox.entity';

function setup() {
  const buildings = new Map([
    [
      31010100,
      {
        id: 31010100,
        epsProc: 1,
        bevUse: 2,
        bevPro: 20,
        production: [
          { commodityId: 1, amount: 3 },
          { commodityId: 1300, amount: 5 },
        ],
        bonuses: { energy: 10, storage: 50 },
      },
    ],
    [
      11,
      {
        id: 11,
        epsProc: -2,
        bevUse: 1,
        bevPro: 0,
        production: [
          { commodityId: 1, amount: -1 },
          { commodityId: 2, amount: 4 },
        ],
        bonuses: { energy: 0, storage: 0 },
      },
    ],
  ]);
  const gameData = {
    getBuilding: (id: number) => buildings.get(id),
    getBuildingFunctions: () => [],
    getColonyClass: () => ({
      baseProduction: [{ commodityId: 1508, amount: 2 }],
    }),
    getCategoriesForTerrainTile: () => ['standard'],
    getCommodity: (id: number) => ({
      name: `Ware ${id}`,
      isSaveable: id < 1000,
      isEffect: id === 1300,
      isDeposit: id === 1508,
    }),
    getSocialEffects: () => ({ lifeStandardCommodityId: 1300 }),
  };
  const fields = [
    {
      id: 1,
      fieldIndex: 20,
      fieldType: 101,
      terrainTileId: '101',
      layer: 'SURFACE',
      buildingId: 31010100,
      isActive: true,
      isBuilding: false,
      bonusMarker: 'ATTRACTIVE',
      buildFinishesAt: null,
      terraformingFinishesAt: null,
    },
    {
      id: 2,
      fieldIndex: 21,
      fieldType: 101,
      terrainTileId: '101',
      layer: 'SURFACE',
      buildingId: 11,
      isActive: false,
      isBuilding: false,
      buildFinishesAt: null,
      terraformingFinishesAt: null,
    },
  ];
  const stats = new ColonyStatsService(gameData as never);
  const social = new ColonySocialService(gameData as never);
  const colony = {
    id: 4,
    name: 'Naboo heute',
    userId: 1,
    colonyClassId: 1,
    population: 10,
    solarOutputTJ: 1600,
    fields,
    changeable: {
      workers: 2,
      workless: 8,
      maxPopulation: 90,
      energy: 20,
      maxEnergy: 100,
      maxStorage: 300,
    },
    storageUsed: 5,
  } as unknown as Colony;
  const sandbox = {
    id: 8,
    userId: 1,
    sourceColonyId: 4,
    snapshot: {
      sourceColonyName: 'Naboo',
      colonyClassId: 1,
      population: 10,
      populationMax: 90,
      baseHousing: 50,
      workers: 2,
      energy: 20,
      energyMax: 100,
      storageMax: 300,
      solarOutputTJ: 1600,
      fields: structuredClone(fields),
    },
  } as ColonySandbox;
  const sandboxRepo = {
    findOne: jest.fn(async (options) =>
      options.where.userId === 1 ? sandbox : null,
    ),
    save: jest.fn(),
  };
  const colonyRepo = {
    findOne: jest.fn(async (options) =>
      options.where.userId === colony.userId && !colony.isAbandoned
        ? colony
        : null,
    ),
    save: jest.fn(),
  };
  const manager = {
    getRepository: (entity: { name: string }) =>
      entity.name === 'ColonySandbox' ? sandboxRepo : colonyRepo,
  };
  const source = {
    transaction: jest.fn(async (...args) => args.at(-1)(manager)),
  };
  const service = new ColonySandboxPreviewService(
    source as never,
    stats,
    social,
    gameData as never,
  );
  return { service, colony, sandbox, stats, social, sandboxRepo, colonyRepo };
}

describe('sandbox production preview', () => {
  it('gives the live colony balance for identical fields, including markers, capacity and social effects', async () => {
    const f = setup();
    const before = structuredClone({ colony: f.colony, sandbox: f.sandbox });
    const result = await f.service.preview(1, 8);
    expect(result.sandbox).toEqual(result.colony);
    const summary = f.stats.calculateSummary(f.colony);
    expect(result.sandbox).toMatchObject({
      energyBalance: 16,
      energyProduction: 16,
      energyConsumption: 0,
      energyMax: summary.effectiveState.energy.max,
      housing: 90,
      housingFree: 80,
      workers: 2,
      freeWorkers: 8,
      lifeStandard: 5,
      lifeStandardPercent: 50,
    });
    expect(result.production.every((entry) => entry.difference === 0)).toBe(
      true,
    );
    expect(Object.values(result.difference!)).toEqual(
      expect.arrayContaining([0]),
    );
    expect({ colony: f.colony, sandbox: f.sandbox }).toEqual(before);
    expect(f.colonyRepo.save).not.toHaveBeenCalled();
    expect(f.sandboxRepo.save).not.toHaveBeenCalled();
  });

  it('recalculates housing, workers, solar energy and each commodity after editing the plan', async () => {
    const f = setup();
    f.sandbox.snapshot.fields[0].isActive = false;
    f.sandbox.snapshot.fields[1].isActive = true;
    const result = await f.service.preview(1, 8);
    expect(result.sandbox).toMatchObject({
      housing: 50,
      housingFree: 40,
      workers: 1,
      freeWorkers: 9,
      energyBalance: -2,
      lifeStandard: 0,
      lifeStandardPercent: 0,
    });
    expect(result.difference).toMatchObject({
      housing: -40,
      workers: -1,
      freeWorkers: 1,
      lifeStandard: -5,
      lifeStandardPercent: -50,
    });
    expect(result.production).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          commodityId: 1,
          colony: 3,
          sandbox: -1,
          difference: -4,
        }),
        expect.objectContaining({
          commodityId: 2,
          colony: 0,
          sandbox: 4,
          difference: 4,
        }),
        expect.objectContaining({
          commodityId: 1300,
          colony: 5,
          sandbox: 0,
          difference: -5,
        }),
        expect.objectContaining({
          commodityId: 1508,
          colony: 2,
          sandbox: 2,
          difference: 0,
        }),
      ]),
    );
  });

  it('preserves the recorded capacity for legacy copies without a base housing value', async () => {
    const f = setup();
    delete f.sandbox.snapshot.baseHousing;
    f.colony.changeable.maxPopulation = 20;
    f.sandbox.snapshot.populationMax = 20;
    const result = await f.service.preview(1, 8);
    expect(result.sandbox.housing).toBe(result.colony!.housing);
    expect(result.difference!.housing).toBe(0);
    expect(f.sandbox.snapshot.baseHousing).toBeUndefined();
  });

  it('does not disclose a foreign or abandoned source', async () => {
    const f = setup();
    f.colony.userId = 2;
    await expect(f.service.preview(1, 8)).rejects.toThrow('Sandbox nicht gefunden');
    f.colony.userId = 1;
    f.colony.isAbandoned = true;
    await expect(f.service.preview(1, 8)).rejects.toThrow('Sandbox nicht gefunden');
  });

  it('rejects foreign sandbox owners before loading the source', async () => {
    const f = setup();
    await expect(f.service.preview(2, 8)).rejects.toThrow(
      'Sandbox nicht gefunden',
    );
    expect(f.colonyRepo.findOne).not.toHaveBeenCalled();
  });
});
