jest.mock('./entities/colony-field.entity', () => ({
  ColonyField: class ColonyField {},
}));
jest.mock('./entities/colony.entity', () => ({ Colony: class Colony {} }));

import { ColonyBuildingManagementService } from './colony-building-management.service';
import { BuildingMassActionMode } from './colony-building-management.types';

function createService() {
  const fieldRepo = { save: jest.fn(async (value) => value) };
  const buildings: Record<number, any> = {
    82010100: {
      id: 82010100,
      name: 'HQ',
      epsProc: 10,
      bevUse: 0,
      bevPro: 10,
      production: [],
    },
    100: {
      id: 100,
      name: 'Factory',
      epsProc: -5,
      epsCost: 10,
      bevUse: 2,
      bevPro: 0,
      resourceCosts: [{ commodityId: 2, amount: 10 }],
      production: [{ commodityId: 2, amount: 5 }],
    },
    200: {
      id: 200,
      name: 'Power',
      epsProc: 10,
      bevUse: 0,
      bevPro: 0,
      production: [],
    },
    300: {
      id: 300,
      name: 'Housing',
      epsProc: 0,
      bevUse: 0,
      bevPro: 10,
      production: [],
    },
    400: {
      id: 400,
      name: 'Consumer',
      epsProc: -1,
      bevUse: 0,
      bevPro: 0,
      production: [{ commodityId: 3, amount: -1 }],
    },
  };
  const gameData = { getBuilding: jest.fn((id: number) => buildings[id]) };
  const lifecycle = {
    activateBuilding: jest.fn((_colony, field) => {
      field.isActive = true;
      return field;
    }),
    deactivateBuilding: jest.fn((_colony, field) => {
      field.isActive = false;
      return field;
    }),
    repairBuilding: jest.fn((field) => {
      field.integrity = field.maxIntegrity;
      return field;
    }),
  };
  const statsService = {
    calculateSummary: jest.fn(() => ({
      energyDelta: 10,
      workersUsed: 0,
      freeWorkers: 10,
      effectiveStorageMax: 100,
      maxHousing: 50,
    })),
  };
  const storageService = {
    lowerStorage: jest.fn(
      async (colony: any, commodityId: number, amount: number) => {
        const storage = (colony.storage ?? []).find(
          (item: any) => item.commodityId === commodityId,
        );
        if (!storage || storage.amount < amount)
          throw new Error('Not enough resources in colony storage');
        storage.amount -= amount;
        return amount;
      },
    ),
  };
  const service = new ColonyBuildingManagementService(
    fieldRepo as any,
    gameData as any,
    lifecycle as any,
    statsService as any,
    storageService as any,
  );
  return { service, fieldRepo, lifecycle, statsService, storageService };
}

describe('ColonyBuildingManagementService', () => {
  const colony = () => ({
    id: 1,
    energy: 50,
    stats: { workless: 10 },
    storage: [{ commodityId: 2, amount: 100 }],
    fields: [
      {
        id: 1,
        fieldIndex: 1,
        buildingId: 82010100,
        isActive: true,
        isBuilding: false,
        integrity: 100,
        maxIntegrity: 100,
      },
      {
        id: 2,
        fieldIndex: 2,
        buildingId: 100,
        isActive: false,
        isBuilding: false,
        integrity: 100,
        maxIntegrity: 100,
      },
      {
        id: 3,
        fieldIndex: 3,
        buildingId: 200,
        isActive: true,
        isBuilding: false,
        integrity: 100,
        maxIntegrity: 100,
      },
      {
        id: 4,
        fieldIndex: 4,
        buildingId: 300,
        isActive: false,
        isBuilding: false,
        integrity: 40,
        maxIntegrity: 100,
      },
      {
        id: 5,
        fieldIndex: 5,
        buildingId: 400,
        isActive: true,
        isBuilding: false,
        integrity: 100,
        maxIntegrity: 100,
      },
    ],
  });

  it('activates selected inactive buildings and skips HQ/damaged fields', async () => {
    const { service } = createService();
    const result = await service.activateBuildings(
      colony() as any,
      BuildingMassActionMode.SELECTION,
      { fieldIndexes: [1, 2, 4] },
    );

    expect(result.changed).toContainEqual(
      expect.objectContaining({ fieldIndex: 2 }),
    );
    expect(result.skipped).toContainEqual(
      expect.objectContaining({
        fieldIndex: 1,
        reason: 'Zentralgebäude geschützt',
      }),
    );
    expect(result.skipped).toContainEqual(
      expect.objectContaining({
        fieldIndex: 4,
        reason: 'Gebäude zu beschädigt',
      }),
    );
  });

  it('deactivates EPS consumers by mode', async () => {
    const { service } = createService();
    const result = await service.deactivateBuildings(
      colony() as any,
      BuildingMassActionMode.EPS_CONSUMERS,
    );

    expect(result.changed).toContainEqual(
      expect.objectContaining({ fieldIndex: 5 }),
    );
    expect(result.skipped).toContainEqual(
      expect.objectContaining({ fieldIndex: 2, reason: 'Bereits deaktiviert' }),
    );
  });

  it('selects industry and commodity producers/consumers like STU modes', () => {
    const { service } = createService();
    const c = colony() as any;
    expect(
      service
        .selectFields(c, BuildingMassActionMode.INDUSTRY)
        .map((f: any) => f.fieldIndex),
    ).toEqual([2]);
    expect(
      service
        .selectFields(c, BuildingMassActionMode.COMMODITY_PRODUCERS, {
          commodityId: 2,
        })
        .map((f: any) => f.fieldIndex),
    ).toEqual([2]);
    expect(
      service
        .selectFields(c, BuildingMassActionMode.COMMODITY_CONSUMERS, {
          commodityId: 3,
        })
        .map((f: any) => f.fieldIndex),
    ).toEqual([5]);
  });

  it('returns skipped reasons when worker validation fails', async () => {
    const { service } = createService();
    const c = colony() as any;
    c.stats.workless = 0;
    const result = await service.activateBuildings(
      c,
      BuildingMassActionMode.SELECTION,
      { fieldIndexes: [2] },
    );
    expect(result.skipped).toContainEqual(
      expect.objectContaining({
        fieldIndex: 2,
        reason: 'Nicht genug freie Arbeiter',
      }),
    );
  });

  it('calculates repair plans and aggregates preview totals', () => {
    const { service } = createService();
    const c = colony() as any;
    c.fields[1].integrity = 50;
    c.fields[1].maxIntegrity = 100;

    const preview = service.getRepairPreview(c, [2]);

    expect(preview.fields[0]).toMatchObject({
      fieldIndex: 2,
      repairable: true,
      energyCost: 5,
      costs: [{ commodityId: 2, amount: 5 }],
    });
    expect(preview.totalEnergyCost).toBe(5);
    expect(preview.totalCosts).toEqual([{ commodityId: 2, amount: 5 }]);
  });

  it('repairs affordable damaged buildings and skips invalid ones', async () => {
    const { service, fieldRepo } = createService();
    const c = colony() as any;
    c.fields[1].integrity = 50;
    c.fields[1].maxIntegrity = 100;
    c.fields[3].integrity = 40;
    c.fields[3].maxIntegrity = 100;
    c.fields[3].isBuilding = true;

    const result = await service.repairDamagedBuildings(c, [2, 4]);

    expect(result.repaired).toContainEqual(
      expect.objectContaining({ fieldIndex: 2 }),
    );
    expect(result.skipped).toContainEqual(
      expect.objectContaining({ fieldIndex: 4 }),
    );
    expect(c.fields[1].integrity).toBe(100);
    expect(c.storage[0].amount).toBe(95);
    expect(c.energy).toBe(45);
    expect(fieldRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ fieldIndex: 2 }),
    );
  });
});
