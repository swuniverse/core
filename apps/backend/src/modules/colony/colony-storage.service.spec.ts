jest.mock('./entities/colony.entity', () => ({ Colony: class Colony {} }));
jest.mock('./entities/colony-storage.entity', () => ({
  ColonyStorage: class ColonyStorage {},
}));

import { BadRequestException } from '@nestjs/common';
import { ColonyStorageService } from './colony-storage.service';

function createStorageService(total = 0) {
  const rows = new Map<number, any>();
  const repo = {
    findOne: jest.fn(
      async ({ where }: any) => rows.get(where.commodityId) ?? null,
    ),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => {
      rows.set(value.commodityId, value);
      return value;
    }),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(async () => ({
        total: Array.from(rows.values()).reduce(
          (sum, row) => sum + row.amount,
          total,
        ),
      })),
    })),
  };
  return { service: new ColonyStorageService(repo as any), repo, rows };
}

describe('ColonyStorageService', () => {
  const colony = { id: 1 } as any;

  it('caps amounts to free storage', () => {
    const { service } = createStorageService();
    expect(service.capToMax(10, 4)).toBe(4);
    expect(service.capToMax(-10, 4)).toBe(0);
  });

  it('partially stores positive production when storage is nearly full', async () => {
    const { service, rows } = createStorageService();
    rows.set(2, { colonyId: 1, commodityId: 2, amount: 95 });

    const stored = await service.upperStorage(colony, 2, 10, 100);

    expect(stored).toBe(5);
    expect(rows.get(2).amount).toBe(100);
  });

  it('does not create negative storage', async () => {
    const { service, rows } = createStorageService();
    rows.set(2, { colonyId: 1, commodityId: 2, amount: 3 });

    await expect(service.lowerStorage(colony, 2, 4)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(rows.get(2).amount).toBe(3);
  });

  it('reports missing resources', async () => {
    const { service } = createStorageService();

    await expect(service.lowerStorage(colony, 2, 1)).rejects.toThrow(
      'Not enough resources',
    );
  });
});
