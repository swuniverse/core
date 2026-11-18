jest.mock('./entities/colony.entity', () => ({ Colony: class Colony {} }));
jest.mock('./entities/colony-field.entity', () => ({
  ColonyField: class ColonyField {},
}));
jest.mock('./entities/colony-storage.entity', () => ({
  ColonyStorage: class ColonyStorage {},
}));

import { ConfigService } from '@nestjs/config';
import { ColonyConstructionService } from './colony-construction.service';
import { ColonyBuildingManagementService } from './colony-building-management.service';
import { BuildingLifecycleService } from './building-lifecycle.service';
import { ColonyOwnershipService } from './colony-ownership.service';
import { ColonyStorageService } from './colony-storage.service';

function setup() {
  const field = {
    id: 1,
    fieldIndex: 5,
    fieldType: 101,
    buildingId: 100 as number | null,
    isBuilding: false,
    isActive: false,
    integrity: 49,
    maxIntegrity: 100,
  };
  const colony = {
    id: 1,
    userId: 7,
    isAbandoned: false,
    energy: 50,
    fields: [field],
    storage: [
      { colonyId: 1, commodityId: 2, amount: 20 },
      { colonyId: 1, commodityId: 3, amount: 10 },
    ],
    changeable: {
      colonyId: 1,
      energy: 50,
      maxEnergy: 100,
      workers: 0,
      workless: 10,
      maxPopulation: 100,
      maxStorage: 100,
    },
  };
  const colonyRepo = {
    findOne: jest.fn(async ({ where }) =>
      where.id === colony.id &&
      where.userId === colony.userId &&
      where.isAbandoned === colony.isAbandoned
        ? colony
        : null,
    ),
    save: jest.fn(async (value) => value),
  };
  const fieldRepo = { save: jest.fn(async (value) => value) };
  const storageRepo = {
    findOne: jest.fn(async ({ where }) =>
      colony.storage.find((item) => item.commodityId === where.commodityId),
    ),
    save: jest.fn(async (value) => value),
    createQueryBuilder: () => ({
      select: () => ({
        where: () => ({
          getRawOne: async () => ({
            total: colony.storage.reduce((sum, item) => sum + item.amount, 0),
          }),
        }),
      }),
    }),
  };
  const gameData = {
    getBuilding: (id: number) =>
      id === 100
        ? {
            id,
            name: 'Fabrik',
            epsCost: 10,
            resourceCosts: [
              { commodityId: 2, amount: 10 },
              { commodityId: 3, amount: 4 },
            ],
          }
        : undefined,
    getCommodity: (id: number) => ({ name: id === 2 ? 'Duranium' : 'Plasma' }),
  };
  const lifecycle = new BuildingLifecycleService(
    fieldRepo as never,
    {} as never,
    new ConfigService(),
  );
  const storage = new ColonyStorageService(storageRepo as never);
  const management = new ColonyBuildingManagementService(
    fieldRepo as never,
    gameData as never,
    lifecycle,
    {} as never,
    storage,
  );
  const events = { createActionEvent: jest.fn() };
  const service = new ColonyConstructionService(
    colonyRepo as never,
    fieldRepo as never,
    storageRepo as never,
    gameData as never,
    {} as never,
    {} as never,
    storage,
    lifecycle,
    management,
    events as never,
    new ColonyOwnershipService(colonyRepo as never),
    {} as never,
  );
  return { service, colony, field, colonyRepo, fieldRepo, storageRepo, events };
}

describe('Colony construction repair endpoints', () => {
  it.each(['single', 'bulk', 'preview'] as const)(
    'requires colony ownership for %s repair',
    async (action) => {
      const { service, field, colonyRepo, fieldRepo, storageRepo, events } =
        setup();
      const result =
        action === 'single'
          ? service.repairBuilding(1, 99, 5)
          : action === 'bulk'
            ? service.repairDamagedBuildings(1, 99)
            : service.getBuildingRepairPreview(1, 99);

      await expect(result).rejects.toThrow('Colony not found');
      expect(colonyRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1, userId: 99, isAbandoned: false },
        }),
      );
      expect(field.integrity).toBe(49);
      expect(fieldRepo.save).not.toHaveBeenCalled();
      expect(storageRepo.save).not.toHaveBeenCalled();
      expect(events.createActionEvent).not.toHaveBeenCalled();
    },
  );

  it('uses the preview costs for a single repair and keeps an inactive building inactive', async () => {
    const { service, colony, field, fieldRepo } = setup();
    const preview = await service.getBuildingRepairPreview(1, 7, [5]);
    expect(preview.fields).toEqual([
      expect.objectContaining({
        fieldIndex: 5,
        repairable: true,
        energyCost: 6,
        costs: [
          { commodityId: 2, amount: 6 },
          { commodityId: 3, amount: 3 },
        ],
      }),
    ]);
    expect(colony.changeable.energy).toBe(50);
    expect(colony.storage.map((item) => item.amount)).toEqual([20, 10]);

    await service.repairBuilding(1, 7, 5);

    expect(colony.changeable.energy).toBe(44);
    expect(colony.energy).toBe(44);
    expect(colony.storage.map((item) => item.amount)).toEqual([14, 7]);
    expect(field.integrity).toBe(field.maxIntegrity);
    expect(field.isActive).toBe(false);
    expect(fieldRepo.save).toHaveBeenCalledWith(field);
  });

  it.each(['building', 'empty', 'undamaged', 'missing'] as const)(
    'rejects a %s field before deducting single repair costs',
    async (state) => {
      const { service, colony, field, storageRepo, fieldRepo } = setup();
      if (state === 'building') field.isBuilding = true;
      if (state === 'empty') field.buildingId = null;
      if (state === 'undamaged') field.integrity = field.maxIntegrity;
      const integrityBefore = field.integrity;

      await expect(
        service.repairBuilding(1, 7, state === 'missing' ? 99 : 5),
      ).rejects.toThrow();

      expect(colony.changeable.energy).toBe(50);
      expect(colony.storage.map((item) => item.amount)).toEqual([20, 10]);
      expect(field.integrity).toBe(integrityBefore);
      expect(storageRepo.save).not.toHaveBeenCalled();
      expect(fieldRepo.save).not.toHaveBeenCalled();
    },
  );

  it.each(['energy', 'second commodity'] as const)(
    'rejects insufficient %s without partially deducting single repair costs',
    async (shortage) => {
      const { service, colony, field, storageRepo } = setup();
      if (shortage === 'energy') colony.changeable.energy = 5;
      else colony.storage[1].amount = 2;
      const energyBefore = colony.changeable.energy;
      const amountsBefore = colony.storage.map((item) => item.amount);

      await expect(service.repairBuilding(1, 7, 5)).rejects.toThrow();

      expect(colony.changeable.energy).toBe(energyBefore);
      expect(colony.storage.map((item) => item.amount)).toEqual(amountsBefore);
      expect(field.integrity).toBe(49);
      expect(storageRepo.save).not.toHaveBeenCalled();
    },
  );

  it('repairs selected completed buildings in bulk and reports a construction site', async () => {
    const { service, colony, field, colonyRepo } = setup();
    colony.fields.push({ ...field, id: 2, fieldIndex: 6, isBuilding: true });
    colony.fields.push({ ...field, id: 3, fieldIndex: 7 });

    const result = await service.repairDamagedBuildings(1, 7, [5, 6]);

    expect(result.repaired.map((item) => item.fieldIndex)).toEqual([5]);
    expect(result.skipped).toContainEqual(
      expect.objectContaining({ fieldIndex: 6, reason: 'Gebäude im Bau' }),
    );
    expect(result.totalEnergyCost).toBe(6);
    expect(result.totalCosts).toEqual([
      { commodityId: 2, amount: 6 },
      { commodityId: 3, amount: 3 },
    ]);
    expect(colony.changeable.energy).toBe(44);
    expect(colony.storage.map((item) => item.amount)).toEqual([14, 7]);
    expect(colony.fields.map((item) => item.integrity)).toEqual([100, 49, 49]);
    expect(colonyRepo.save).toHaveBeenCalledWith(colony);
  });

  it('skips a later bulk repair when earlier repairs exhaust resources', async () => {
    const { service, colony, field } = setup();
    colony.storage[0].amount = 6;
    colony.fields.push({ ...field, id: 2, fieldIndex: 6 });

    const result = await service.repairDamagedBuildings(1, 7);

    expect(result.repaired.map((item) => item.fieldIndex)).toEqual([5]);
    expect(result.skipped).toContainEqual(
      expect.objectContaining({
        fieldIndex: 6,
        reason: 'Nicht genug Duranium: benötigt 6, vorhanden 0',
      }),
    );
    expect(colony.storage.map((item) => item.amount)).toEqual([0, 7]);
    expect(colony.changeable.energy).toBe(44);
    expect(colony.fields.map((item) => item.integrity)).toEqual([100, 49]);
  });
});
