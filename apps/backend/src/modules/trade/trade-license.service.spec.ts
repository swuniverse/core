import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { GameDataService } from '../game-data/game-data.service';
import { TradeLicenseCondition } from './entities/trade-license-condition.entity';
import { TradePost } from './entities/trade-post.entity';
import { TradeLicenseService } from './trade-license.service';

function repository<T extends ObjectLiteral>() {
  return {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
  } as unknown as jest.Mocked<Repository<T>>;
}

describe('TradeLicenseService', () => {
  const posts = repository<TradePost>();
  const conditions = repository<TradeLicenseCondition>();
  const gameData = {
    getCommodity: jest.fn(),
    getAllCommodities: jest.fn(),
  } as unknown as jest.Mocked<GameDataService>;
  const service = new TradeLicenseService(posts, conditions, gameData, {} as never);

  beforeEach(() => jest.clearAllMocks());

  it('lets only the post owner read license conditions', async () => {
    posts.findOneBy.mockResolvedValue({ id: 7, ownerId: 3 } as TradePost);
    conditions.findOneBy.mockResolvedValue({
      id: 1,
      tradePostId: 7,
      commodityId: 50,
      amount: 10,
      durationDays: 30,
    } as TradeLicenseCondition);

    await expect(service.getCondition(7, 3)).resolves.toEqual(
      expect.objectContaining({ tradePostId: 7, commodityId: 50 }),
    );
    posts.findOneBy.mockResolvedValueOnce(null);
    await expect(service.getCondition(7, 4)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it.each([
    [{ commodityId: 50, amount: 0, durationDays: 30 }, 'Menge'],
    [{ commodityId: 50, amount: 10, durationDays: 0 }, 'Lizenzdauer'],
    [{ commodityId: 50, amount: 10, durationDays: 366 }, 'Lizenzdauer'],
    [{ commodityId: 50.5, amount: 10, durationDays: 30 }, 'Ware'],
  ])('rejects invalid condition %j', async (condition, message) => {
    posts.findOneBy.mockResolvedValue({ id: 7, ownerId: 3 } as TradePost);

    await expect(service.setCondition(7, 3, condition)).rejects.toThrow(
      message,
    );
  });

  it('rejects commodities not marked tradeable by server game data', async () => {
    posts.findOneBy.mockResolvedValue({ id: 7, ownerId: 3 } as TradePost);
    gameData.getCommodity.mockReturnValue({ id: 50, isTradeable: false } as never);

    await expect(
      service.setCondition(7, 3, {
        commodityId: 50,
        amount: 10,
        durationDays: 30,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates the condition without changing existing licenses', async () => {
    posts.findOneBy.mockResolvedValue({ id: 7, ownerId: 3 } as TradePost);
    gameData.getCommodity.mockReturnValue({ id: 50, isTradeable: true } as never);
    conditions.findOneBy.mockResolvedValue({
      id: 8,
      tradePostId: 7,
      commodityId: 1,
      amount: 1,
      durationDays: 1,
    } as TradeLicenseCondition);

    await service.setCondition(7, 3, {
      commodityId: 50,
      amount: 10,
      durationDays: 30,
    });

    expect(conditions.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 8,
        tradePostId: 7,
        commodityId: 50,
        amount: 10,
        durationDays: 30,
      }),
    );
  });
});
