import { BadRequestException } from '@nestjs/common';
import type {
  DataSource,
  EntityManager,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import { TradeAccountStorage } from './entities/trade-account-storage.entity';
import { TradeOffer } from './entities/trade-offer.entity';
import { TradePost } from './entities/trade-post.entity';
import { TradeStorageService } from './trade-storage.service';

const repository = <T extends ObjectLiteral>() =>
  ({
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
    remove: jest.fn(async (value) => value),
    createQueryBuilder: jest.fn(),
  }) as unknown as jest.Mocked<Repository<T>>;

describe('TradeStorageService', () => {
  let posts: jest.Mocked<Repository<TradePost>>;
  let accounts: jest.Mocked<Repository<TradeAccountStorage>>;
  let offers: jest.Mocked<Repository<TradeOffer>>;
  let manager: jest.Mocked<EntityManager>;
  let dataSource: jest.Mocked<DataSource>;
  let service: TradeStorageService;

  beforeEach(() => {
    posts = repository<TradePost>();
    accounts = repository<TradeAccountStorage>();
    offers = repository<TradeOffer>();
    manager = {
      getRepository: jest.fn((entity) => {
        if (entity === TradePost) return posts;
        if (entity === TradeAccountStorage) return accounts;
        return offers;
      }),
    } as unknown as jest.Mocked<EntityManager>;
    dataSource = {
      manager,
      transaction: jest.fn(async (work) => work(manager)),
    } as unknown as jest.Mocked<DataSource>;
    service = new TradeStorageService(dataSource);
  });

  it('reports account stock, reserved offers, occupancy, and free space', async () => {
    posts.findOneBy.mockResolvedValue({ id: 4, storageLimit: 100 } as TradePost);
    accounts.createQueryBuilder.mockReturnValue(sumQuery(35));
    offers.createQueryBuilder.mockReturnValue(sumQuery(15));

    await expect(service.getCapacity(4, 9)).resolves.toEqual({
      stock: 35,
      reserved: 15,
      occupied: 50,
      free: 50,
      capacity: 100,
    });
  });

  it('rejects additions that exceed free space', async () => {
    posts.findOne.mockResolvedValue({ id: 4, storageLimit: 10 } as TradePost);
    accounts.findOne.mockResolvedValue({ amount: 7 } as TradeAccountStorage);
    accounts.createQueryBuilder.mockReturnValue(sumQuery(7));
    offers.createQueryBuilder.mockReturnValue(sumQuery(2));

    await expect(service.add(4, 9, 1, 2)).rejects.toThrow(BadRequestException);
    expect(accounts.save).not.toHaveBeenCalled();
  });

  it('locks the post and account before adding stock', async () => {
    const item = { id: 3, tradePostId: 4, userId: 9, commodityId: 1, amount: 3 };
    posts.findOne.mockResolvedValue({ id: 4, storageLimit: 10 } as TradePost);
    accounts.findOne.mockResolvedValue(item as TradeAccountStorage);
    accounts.createQueryBuilder.mockReturnValue(sumQuery(3));
    offers.createQueryBuilder.mockReturnValue(sumQuery(0));

    await expect(service.add(4, 9, 1, 4)).resolves.toMatchObject({ amount: 7 });
    expect(posts.findOne).toHaveBeenCalledWith({
      where: { id: 4 },
      lock: { mode: 'pessimistic_write' },
    });
    expect(accounts.findOne).toHaveBeenCalledWith({
      where: { tradePostId: 4, userId: 9, commodityId: 1 },
      lock: { mode: 'pessimistic_write' },
    });
  });

  it('rejects removing more stock than available', async () => {
    posts.findOne.mockResolvedValue({ id: 4, storageLimit: 10 } as TradePost);
    accounts.findOne.mockResolvedValue({ amount: 3 } as TradeAccountStorage);

    await expect(service.remove(4, 9, 1, 4)).rejects.toThrow(
      'Nicht genügend Waren auf dem Handelskonto',
    );
  });
});

function sumQuery(total: number) {
  const query = {
    select: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    getRawOne: jest.fn().mockResolvedValue({ total: String(total) }),
  };
  query.select.mockReturnValue(query);
  query.where.mockReturnValue(query);
  query.andWhere.mockReturnValue(query);
  return query as never;
}
