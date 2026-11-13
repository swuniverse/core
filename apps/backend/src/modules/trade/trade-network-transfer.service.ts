import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In, IsNull, MoreThan, Not, type EntityManager } from 'typeorm';
import type { TradeNetworkTransferTargetsDto, TradeNetworkTransferRequestDto } from '@swuniverse/shared';
import { GameDataService } from '../game-data/game-data.service';
import { TradeAccountStorage } from './entities/trade-account-storage.entity';
import { TradeLicense } from './entities/trade-license.entity';
import { TradePost } from './entities/trade-post.entity';
import { assertNotAbandoned } from './player-trade-post.service';
import { TradeTransfer } from './entities/trade-transfer.entity';
import { TradeStorageService } from './trade-storage.service';

const WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * STU `TransferCommodities`: goods move between own accounts of one trade
 * network, capped by stock, free space at the target and the source post's
 * transfer capacity per player within 24 hours. SWU also requires a license
 * at the target and reports every refusal instead of returning silently.
 */
@Injectable()
export class TradeNetworkTransferService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly storage: TradeStorageService,
    private readonly gameData: GameDataService,
  ) {}

  async targets(tradePostId: number, userId: number, now = new Date()): Promise<TradeNetworkTransferTargetsDto> {
    const manager = this.dataSource.manager;
    const post = await manager.findOneBy(TradePost, { id: tradePostId });
    if (!post) throw new NotFoundException('Handelsposten nicht gefunden');
    const licensed = await manager.find(TradeLicense, { where: { userId, expiresAt: MoreThan(now) } });
    const candidates = licensed.length
      ? await manager.find(TradePost, {
          where: { id: In(licensed.map((license) => license.tradePostId)), networkId: post.networkId, ownerId: Not(IsNull()) },
          order: { name: 'ASC', id: 'ASC' },
        })
      : [];
    const targets = [];
    for (const candidate of candidates.filter((entry) => entry.id !== post.id)) {
      const { free } = await this.storage.capacityIn(manager, candidate.id, userId, candidate);
      targets.push({ tradePostId: candidate.id, tradePostName: candidate.name, freeStorage: free });
    }
    return { tradePostId: post.id, ...(await this.capacity(manager, post, userId, now)), targets };
  }

  /** Transfer capacity of a post for each of the player's accounts. */
  async capacities(tradePostIds: number[], userId: number, now = new Date()): Promise<Array<{ tradePostId: number; free: number; capacity: number }>> {
    if (!tradePostIds.length) return [];
    const manager = this.dataSource.manager;
    const posts = await manager.find(TradePost, { where: { id: In(tradePostIds) }, order: { id: 'ASC' } });
    return Promise.all(posts.map(async (post) => ({ tradePostId: post.id, ...(await this.capacity(manager, post, userId, now)) })));
  }

  async transfer(
    tradePostId: number,
    userId: number,
    input: TradeNetworkTransferRequestDto,
    now = new Date(),
  ): Promise<{ message: string; amount: number }> {
    const positive = (value: unknown) => Number.isSafeInteger(value) && (value as number) > 0;
    if (!positive(input?.targetPostId) || !positive(input.commodityId)) {
      throw new BadRequestException('Zielposten und Ware müssen angegeben sein');
    }
    if (!positive(input.amount)) throw new BadRequestException('Menge muss eine positive ganze Zahl sein');
    if (input.targetPostId === tradePostId) throw new BadRequestException('Quell- und Zielposten müssen verschieden sein');

    return this.dataSource.transaction(async (manager) => {
      // Both posts in id order: serializes the capacity and both accounts.
      const locked = await manager.find(TradePost, {
        where: { id: In([tradePostId, input.targetPostId]) },
        order: { id: 'ASC' },
        lock: { mode: 'pessimistic_write' },
      });
      const post = locked.find((entry) => entry.id === tradePostId);
      const target = locked.find((entry) => entry.id === input.targetPostId);
      if (!post) throw new NotFoundException('Handelsposten nicht gefunden');
      if (!target) throw new NotFoundException('Zielposten nicht gefunden');
      // STU `TransferCommodities`: nothing goes to an abandoned post, withdrawing from it stays possible.
      assertNotAbandoned(target);
      if (!(await this.licensed(manager, post.id, userId, now))) {
        throw new BadRequestException('Du benötigst eine gültige Lizenz am Quellposten');
      }
      if (target.networkId !== post.networkId) throw new BadRequestException('Der Zielposten liegt in einem anderen Handelsnetz');
      if (!(await this.licensed(manager, target.id, userId, now))) {
        throw new BadRequestException('Du benötigst eine gültige Lizenz am Zielposten');
      }

      const stock = await manager.findOne(TradeAccountStorage, {
        where: { tradePostId: post.id, userId, commodityId: input.commodityId },
        lock: { mode: 'pessimistic_write' },
      });
      let amount = Math.min(input.amount, stock?.amount ?? 0);
      if (!stock || amount < 1) throw new BadRequestException('Nicht genügend Waren auf dem Handelskonto');
      const { free: freeCapacity } = await this.capacity(manager, post, userId, now);
      if (freeCapacity <= 0) throw new BadRequestException('Du hast an diesem Posten derzeit keine freie Transferkapazität');
      const { free: freeStorage } = await this.storage.capacityIn(manager, target.id, userId, target);
      if (freeStorage <= 0) throw new BadRequestException('Am Zielposten ist kein freier Lagerplatz mehr vorhanden');
      amount = Math.min(amount, freeStorage, freeCapacity);

      const destination =
        (await manager.findOne(TradeAccountStorage, {
          where: { tradePostId: target.id, userId, commodityId: input.commodityId },
          lock: { mode: 'pessimistic_write' },
        })) ?? manager.create(TradeAccountStorage, { tradePostId: target.id, userId, commodityId: input.commodityId, amount: 0 });
      destination.amount += amount;
      await manager.save(destination);
      stock.amount -= amount;
      if (stock.amount === 0) await manager.remove(stock);
      else await manager.save(stock);
      await manager.save(TradeTransfer, manager.create(TradeTransfer, {
        sourceTradePostId: post.id,
        targetTradePostId: target.id,
        userId,
        commodityId: input.commodityId,
        amount,
        createdAt: now,
      }));
      const name = this.gameData.getCommodity(input.commodityId)?.name ?? `Ware #${input.commodityId}`;
      return { message: `Es wurde ${amount} ${name} zum ${target.name} transferiert`, amount };
    });
  }

  /** STU `getSumByPostAndUser`: own transfers from this post within the last 24 hours. */
  private async capacity(manager: EntityManager, post: TradePost, userId: number, now: Date) {
    const result = await manager
      .getRepository(TradeTransfer)
      .createQueryBuilder('transfer')
      .select('COALESCE(SUM(transfer.amount), 0)', 'used')
      .where('transfer.sourceTradePostId = :postId', { postId: post.id })
      .andWhere('transfer.userId = :userId', { userId })
      .andWhere('transfer.createdAt > :since', { since: new Date(now.getTime() - WINDOW_MS) })
      .getRawOne<{ used: string }>();
    const used = Number(result?.used ?? 0);
    return { free: Math.max(0, post.transferCapacity - used), capacity: post.transferCapacity };
  }

  private async licensed(manager: EntityManager, tradePostId: number, userId: number, now: Date): Promise<boolean> {
    return (await manager.countBy(TradeLicense, { tradePostId, userId, expiresAt: MoreThan(now) })) > 0;
  }
}
