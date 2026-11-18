jest.mock('../auth/user.entity', () => ({ User: class User {} }));
jest.mock('./entities/trade-account-storage.entity', () => ({ TradeAccountStorage: class TradeAccountStorage {} }));
jest.mock('./entities/trade-offer.entity', () => ({ TradeOffer: class TradeOffer {} }));
jest.mock('./entities/trade-license.entity', () => ({ TradeLicense: class TradeLicense {} }));
jest.mock('./entities/trade-license-condition.entity', () => ({ TradeLicenseCondition: class TradeLicenseCondition {} }));
jest.mock('./trade-query.service', () => ({ TradeQueryService: class TradeQueryService {} }));
jest.mock('./trade-network-transfer.service', () => ({ TradeNetworkTransferService: class TradeNetworkTransferService {} }));

import { User } from '../auth/user.entity';
import { TradeAccountStorage } from './entities/trade-account-storage.entity';
import { TradeLicenseCondition } from './entities/trade-license-condition.entity';
import { TradeLicense } from './entities/trade-license.entity';
import { TradeOffer } from './entities/trade-offer.entity';
import { TradeAccountBoxService } from './trade-account-box.service';

const NOW = new Date('2026-11-18T12:00:00Z');

function fixture({
  ownerId = 5,
  ownerIsNpc = true,
  licenses = [] as Array<{ tradePostId: number; expiresAt: Date }>,
  condition = null as null | { tradePostId: number; commodityId: number; amount: number; durationDays: number },
  occupied = 30,
  limit = 100,
} = {}) {
  const rows = new Map<unknown, unknown[]>([
    [TradeAccountStorage, [{ tradePostId: 3, userId: 42, commodityId: 2, amount: 30 }]],
    [TradeOffer, [
      { tradePostId: 3, offeredCommodityId: 2, reservedAmount: 10 },
      { tradePostId: 3, offeredCommodityId: 2, reservedAmount: 5 },
    ]],
    [User, ownerIsNpc ? [{ id: ownerId }] : []],
    // The real query filters expired licenses with MoreThan(now); mirror it here.
    [TradeLicense, licenses.filter((row) => row.expiresAt > NOW)],
    [TradeLicenseCondition, condition ? [condition] : []],
  ]);
  const manager = { find: jest.fn(async (entity: unknown) => rows.get(entity) ?? []) };
  const query = {
    listPosts: jest.fn().mockResolvedValue([
      { id: 3, name: 'Mos Espa', networkId: 1, owner: { id: ownerId, name: 'Hutten' }, location: null },
      { id: 9, name: 'Fremd', networkId: 1, owner: null, location: null },
    ]),
  };
  const storage = {
    getCapacity: jest.fn().mockResolvedValue({
      stock: occupied, reserved: 15, occupied, free: Math.max(0, limit - occupied), capacity: limit, isOverStorage: occupied > limit,
    }),
  };
  const transfers = { capacities: jest.fn().mockResolvedValue([{ tradePostId: 3, free: 40, capacity: 200 }]) };
  const service = new TradeAccountBoxService(
    { manager } as never, query as never, storage as never, transfers as never,
  );
  return { service, manager, storage };
}

describe('TradeAccountBoxService', () => {
  it('builds one box per own account with stock and summed offer reserves', async () => {
    const { service, storage } = fixture();

    const [box, ...rest] = await service.list(42, NOW);

    expect(rest).toEqual([]);
    expect(box).toMatchObject({
      tradePostId: 3,
      name: 'Mos Espa',
      isNpcPost: true,
      stock: [{ commodityId: 2, amount: 30 }],
      offerStock: [{ commodityId: 2, amount: 15 }],
      storage: { occupied: 30, limit: 100, isOverStorage: false },
      transferCapacity: { free: 40, capacity: 200 },
      licenseCondition: null,
      isOwner: false,
    });
    // Space comes from the shared TradeStorageService calculation.
    expect(storage.getCapacity).toHaveBeenCalledWith(3, 42);
  });

  it('reports an overfull account', async () => {
    const { service } = fixture({ occupied: 120, limit: 100 });

    const [box] = await service.list(42, NOW);

    expect(box.storage).toEqual({ occupied: 120, limit: 100, isOverStorage: true });
  });

  it('counts only valid licenses, the owner license included', async () => {
    const { service } = fixture({
      licenses: [
        { tradePostId: 3, expiresAt: new Date('2026-11-20T00:00:00Z') },
        { tradePostId: 3, expiresAt: new Date('2026-11-25T00:00:00Z') },
        { tradePostId: 3, expiresAt: new Date('2026-11-01T00:00:00Z') },
      ],
    });

    const [box] = await service.list(42, NOW);

    expect(box.issuedLicenseCount).toBe(2);
  });

  it('hides the transfer capacity at a player post and shows the condition to its owner', async () => {
    const { service } = fixture({
      ownerId: 42,
      ownerIsNpc: false,
      condition: { tradePostId: 3, commodityId: 7, amount: 4, durationDays: 14 },
    });

    const [box] = await service.list(42, NOW);

    expect(box).toMatchObject({
      isNpcPost: false,
      isOwner: true,
      transferCapacity: null,
      licenseCondition: { commodityId: 7, amount: 4, durationDays: 14 },
    });
  });

  it('returns no boxes without stock or offers', async () => {
    const { service, manager } = fixture();
    manager.find.mockResolvedValue([]);

    await expect(service.list(42, NOW)).resolves.toEqual([]);
  });
});
