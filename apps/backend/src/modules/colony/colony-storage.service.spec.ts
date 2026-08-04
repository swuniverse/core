jest.mock('./entities/colony.entity', () => ({ Colony: class Colony {} }));
jest.mock('./entities/colony-storage.entity', () => ({
  ColonyStorage: class ColonyStorage {},
}));

import { BadRequestException } from '@nestjs/common';
import { ColonyStorageService } from './colony-storage.service';
import type { ColonyStorage } from './entities/colony-storage.entity';
import type { Colony } from './entities/colony.entity';

type StorageRow = Pick<ColonyStorage, 'colonyId' | 'commodityId' | 'amount'>;
type TestColony = Pick<Colony, 'id' | 'storageUsed'> & {
  storage?: StorageRow[];
};

function createStorageService(total = 0) {
  const rows = new Map<number, StorageRow>();
  const colonyUpdates: Array<Pick<Colony, 'storageUsed'>> = [];
  const repo = {
    manager: {
      getRepository: () => ({
        update: async (
          _where: Pick<Colony, 'id'>,
          value: Pick<Colony, 'storageUsed'>,
        ) => {
          colonyUpdates.push(value);
          return { affected: 1 };
        },
      }),
    },
    findOne: async ({ where }: { where: { commodityId: number } }) =>
      rows.get(where.commodityId) ?? null,
    create: (value: StorageRow) => value,
    save: async (value: StorageRow) => {
      rows.set(value.commodityId, value);
      return value;
    },
    createQueryBuilder: () => ({
      select() {
        return this;
      },
      where() {
        return this;
      },
      async getRawOne() {
        return {
          total: Array.from(rows.values()).reduce(
            (sum, row) => sum + row.amount,
            total,
          ),
        };
      },
    }),
  };
  return {
    service: new ColonyStorageService(
      repo as unknown as ConstructorParameters<typeof ColonyStorageService>[0],
    ),
    repo,
    rows,
    colonyUpdates,
  };
}

describe('ColonyStorageService', () => {
  const colony = { id: 1, storageUsed: 0 } satisfies TestColony;

  it('caps amounts to free storage', () => {
    const { service } = createStorageService();
    expect(service.capToMax(10, 4)).toBe(4);
    expect(service.capToMax(-10, 4)).toBe(0);
  });

  it('partially stores positive production when storage is nearly full', async () => {
    const { service, rows, colonyUpdates } = createStorageService();
    const loadedStorage = { colonyId: 1, commodityId: 2, amount: 95 };
    const colonyWithStorage = {
      id: 1,
      storageUsed: 95,
      storage: [loadedStorage],
    } satisfies TestColony;
    rows.set(2, { colonyId: 1, commodityId: 2, amount: 95 });

    const stored = await service.upperStorage(
      colonyWithStorage as unknown as Colony,
      2,
      10,
      100,
    );

    expect(stored).toBe(5);
    expect(rows.get(2)?.amount).toBe(100);
    expect(loadedStorage.amount).toBe(100);
    expect(colonyWithStorage.storageUsed).toBe(100);
    expect(colonyUpdates).toContainEqual({ storageUsed: 100 });
  });

  it('does not create negative storage', async () => {
    const { service, rows } = createStorageService();
    rows.set(2, { colonyId: 1, commodityId: 2, amount: 3 });

    await expect(
      service.lowerStorage(colony as unknown as Colony, 2, 4),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(rows.get(2)?.amount).toBe(3);
  });

  it('keeps loaded colony storage in sync after deduction', async () => {
    const { service, rows, colonyUpdates } = createStorageService();
    const loadedStorage = { colonyId: 1, commodityId: 2, amount: 10 };
    const colonyWithStorage = {
      id: 1,
      storageUsed: 10,
      storage: [loadedStorage],
    } satisfies TestColony;
    rows.set(2, { colonyId: 1, commodityId: 2, amount: 10 });

    await service.lowerStorage(colonyWithStorage as unknown as Colony, 2, 5);

    expect(loadedStorage.amount).toBe(5);
    expect(colonyWithStorage.storageUsed).toBe(5);
    expect(colonyUpdates).toContainEqual({ storageUsed: 5 });
  });

  it('adds new loaded colony storage rows after storing new commodity', async () => {
    const { service, rows } = createStorageService();
    const colonyWithStorage = {
      id: 1,
      storageUsed: 0,
      storage: [],
    } satisfies TestColony;

    await service.upperStorage(colonyWithStorage as unknown as Colony, 2, 10, 100);

    expect(rows.get(2)?.amount).toBe(10);
    expect(colonyWithStorage.storage).toEqual([rows.get(2)]);
    expect(colonyWithStorage.storageUsed).toBe(10);
  });

  it('reports missing resources', async () => {
    const { service } = createStorageService();

    await expect(
      service.lowerStorage(colony as unknown as Colony, 2, 1),
    ).rejects.toThrow('Not enough resources');
  });
});
