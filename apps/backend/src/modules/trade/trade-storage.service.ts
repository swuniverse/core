import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { TradeAccountStorage } from './entities/trade-account-storage.entity';
import { TradeOffer } from './entities/trade-offer.entity';
import { TradePost } from './entities/trade-post.entity';

export interface TradeStorageCapacity {
  stock: number;
  reserved: number;
  occupied: number;
  free: number;
  capacity: number;
}

@Injectable()
export class TradeStorageService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  getCapacity(tradePostId: number, userId: number): Promise<TradeStorageCapacity> {
    return this.capacity(this.dataSource.manager, tradePostId, userId);
  }

  add(
    tradePostId: number,
    userId: number,
    commodityId: number,
    amount: number,
  ): Promise<TradeAccountStorage> {
    this.assertPositiveAmount(amount);
    return this.dataSource.transaction(async (manager) => {
      const repositories = this.repositories(manager);
      const post = await this.lockPost(repositories.posts, tradePostId);
      let storage = await repositories.accounts.findOne({
        where: { tradePostId, userId, commodityId },
        lock: { mode: 'pessimistic_write' },
      });
      const capacity = await this.capacity(
        manager,
        tradePostId,
        userId,
        post,
      );
      if (amount > capacity.free) {
        throw new BadRequestException('Nicht genügend Platz auf dem Handelskonto');
      }
      storage ??= repositories.accounts.create({
        tradePostId,
        userId,
        commodityId,
        amount: 0,
      });
      storage.amount += amount;
      return repositories.accounts.save(storage);
    });
  }

  remove(
    tradePostId: number,
    userId: number,
    commodityId: number,
    amount: number,
  ): Promise<TradeAccountStorage | null> {
    this.assertPositiveAmount(amount);
    return this.dataSource.transaction(async (manager) => {
      const repositories = this.repositories(manager);
      await this.lockPost(repositories.posts, tradePostId);
      const storage = await repositories.accounts.findOne({
        where: { tradePostId, userId, commodityId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!storage || storage.amount < amount) {
        throw new BadRequestException(
          'Nicht genügend Waren auf dem Handelskonto',
        );
      }
      storage.amount -= amount;
      if (storage.amount === 0) {
        await repositories.accounts.remove(storage);
        return null;
      }
      return repositories.accounts.save(storage);
    });
  }

  private async capacity(
    manager: EntityManager,
    tradePostId: number,
    userId: number,
    lockedPost?: TradePost,
  ): Promise<TradeStorageCapacity> {
    const { posts, accounts, offers } = this.repositories(manager);
    const post = lockedPost ?? (await posts.findOneBy({ id: tradePostId }));
    if (!post) throw new NotFoundException('Handelsposten nicht gefunden');
    const [stock, reserved] = await Promise.all([
      this.sum(accounts, 'account', 'account.amount', tradePostId, userId),
      this.sum(offers, 'offer', 'offer.reservedAmount', tradePostId, userId),
    ]);
    const occupied = stock + reserved;
    return {
      stock,
      reserved,
      occupied,
      free: Math.max(0, post.storageLimit - occupied),
      capacity: post.storageLimit,
    };
  }

  private async sum<T extends TradeAccountStorage | TradeOffer>(
    repository: Repository<T>,
    alias: string,
    column: string,
    tradePostId: number,
    userId: number,
  ): Promise<number> {
    const result = await repository
      .createQueryBuilder(alias)
      .select(`COALESCE(SUM(${column}), 0)`, 'total')
      .where(`${alias}.tradePostId = :tradePostId`, { tradePostId })
      .andWhere(`${alias}.userId = :userId`, { userId })
      .getRawOne<{ total: string }>();
    return Number(result?.total ?? 0);
  }

  private repositories(manager: EntityManager) {
    return {
      posts: manager.getRepository(TradePost),
      accounts: manager.getRepository(TradeAccountStorage),
      offers: manager.getRepository(TradeOffer),
    };
  }

  private async lockPost(repository: Repository<TradePost>, id: number) {
    const post = await repository.findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!post) throw new NotFoundException('Handelsposten nicht gefunden');
    return post;
  }

  private assertPositiveAmount(amount: number) {
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw new BadRequestException('Menge muss eine positive Ganzzahl sein');
    }
  }
}
