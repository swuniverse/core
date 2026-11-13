import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  Optional,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, In, MoreThan, type EntityManager } from 'typeorm';
import type {
  BasicTradeAccountDto,
  BasicTradeChartDto,
  BasicTradeOverviewDto,
  BasicTradeRequestDto,
} from '@swuniverse/shared';
import { User } from '../auth/user.entity';
import { GameDataService } from '../game-data/game-data.service';
import { BasicTradeRate } from './entities/basic-trade-rate.entity';
import { TradeAccountStorage } from './entities/trade-account-storage.entity';
import { TradeLicense } from './entities/trade-license.entity';
import { TradePost } from './entities/trade-post.entity';
import { TradeStorageService } from './trade-storage.service';

/** SWU currency in place of STU Latinum. */
export const AURODIUM_COMMODITY_ID = 50;
/** STU `BasicTradeItem` and `TradeEnum`. */
export const BASIC_TRADE_VALUE_SCALE = 100;
export const BASIC_TRADE_SELL_BUY_ALPHA = 1.1;
export const BASIC_TRADE_LATEST_RATE_AMOUNT = 5;
export const BASIC_TRADE_BUY_MODIFIER = -10;
export const BASIC_TRADE_SELL_MODIFIER = 10;
export const BASIC_TRADE_CHART_LIMIT = { min: 5, max: 100, default: 25 } as const;

type Direction = 'buy' | 'sell';

/** Optional epoch-millisecond clock for deterministic tests. */
export const BASIC_TRADE_CLOCK = Symbol('BASIC_TRADE_CLOCK');

export function basicTradeBuyValue(value: number): number {
  return Math.trunc(value / BASIC_TRADE_VALUE_SCALE);
}

export function basicTradeSellValue(value: number): number {
  return Math.trunc((value / BASIC_TRADE_VALUE_SCALE) * BASIC_TRADE_SELL_BUY_ALPHA);
}

/**
 * STU rate update: the newest value plus the trade's modifier and the
 * modifiers of the older latest rates, scaled and averaged over n + 1.
 * The newest rate only provides the base value, as in STU.
 */
export function nextBasicTradeValue(latestNewestFirst: Array<Pick<BasicTradeRate, 'value' | 'buySell'>>, modifier: number): number {
  const [newest, ...older] = latestNewestFirst;
  const summand = modifier + older.reduce((sum, rate) => sum + rate.buySell, 0);
  return newest.value + Math.trunc((summand * BASIC_TRADE_VALUE_SCALE) / (latestNewestFirst.length + 1));
}

/**
 * Basic trade after STU `BasicTradeBuy`/`BasicTradeSell`: Aurodium for goods
 * at licensed NPC posts of a faction network, at a rate shared by the network.
 */
@Injectable()
export class BasicTradeService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BasicTradeService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly storage: TradeStorageService,
    private readonly gameData: GameDataService,
    @Optional() @Inject(BASIC_TRADE_CLOCK) private readonly clock: () => number = Date.now,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const created = await this.seed();
    if (created) this.logger.log(`Seeded ${created} basic trade start rates`);
  }

  /** One start rate per configured network and commodity; existing histories stay. */
  async seed(): Promise<number> {
    const config = this.gameData.getBasicTradeConfig();
    let created = 0;
    for (const networkId of config.networks) {
      for (const { commodityId, startValue } of config.commodities) {
        const exists = await this.dataSource.manager.exists(BasicTradeRate, { where: { networkId, commodityId } });
        if (exists) continue;
        await this.dataSource.manager.save(BasicTradeRate, {
          networkId,
          commodityId,
          buySell: 0,
          value: startValue,
          rateId: randomUUID(),
          userId: null,
          dateMs: this.clock(),
        });
        created++;
      }
    }
    return created;
  }

  buy(userId: number, input: BasicTradeRequestDto) {
    return this.trade(userId, input, 'buy');
  }

  sell(userId: number, input: BasicTradeRequestDto) {
    return this.trade(userId, input, 'sell');
  }

  async getOverview(userId: number, requestedLimit?: number): Promise<BasicTradeOverviewDto> {
    const limit = Math.min(
      BASIC_TRADE_CHART_LIMIT.max,
      Math.max(BASIC_TRADE_CHART_LIMIT.min, Math.trunc(requestedLimit ?? BASIC_TRADE_CHART_LIMIT.default)),
    );
    const manager = this.dataSource.manager;
    const posts = await this.licensedNpcPosts(manager, userId);
    const networks = [...new Set(posts.map((post) => post.networkId))].filter((networkId) =>
      this.gameData.getBasicTradeConfig().networks.includes(networkId),
    );
    const commodities = this.gameData.getBasicTradeConfig().commodities.map((entry) => entry.commodityId);
    const newest = new Map<string, BasicTradeRate>();
    const charts: BasicTradeChartDto[] = [];
    for (const networkId of networks) {
      for (const commodityId of commodities) {
        const [latest, totalTradeCount] = await Promise.all([
          manager.find(BasicTradeRate, {
            where: { networkId, commodityId },
            order: { dateMs: 'DESC', id: 'DESC' },
            take: limit,
          }),
          manager.count(BasicTradeRate, { where: { networkId, commodityId } }),
        ]);
        if (!latest.length) continue;
        newest.set(`${networkId}:${commodityId}`, latest[0]);
        charts.push({
          networkId,
          commodityId,
          commodityName: this.commodityName(commodityId),
          totalTradeCount,
          points: latest.reverse().map((rate) => ({ value: rate.value, dateMs: rate.dateMs })),
        });
      }
    }
    const stocks = posts.length
      ? await manager.find(TradeAccountStorage, { where: { userId, tradePostId: In(posts.map((post) => post.id)) } })
      : [];
    const stockOf = (tradePostId: number, commodityId: number) =>
      stocks.find((row) => row.tradePostId === tradePostId && row.commodityId === commodityId)?.amount ?? 0;
    const accounts: BasicTradeAccountDto[] = posts
      .filter((post) => networks.includes(post.networkId))
      .map((post) => ({
        tradePostId: post.id,
        tradePostName: post.name,
        networkId: post.networkId,
        aurodium: stockOf(post.id, AURODIUM_COMMODITY_ID),
        items: commodities.flatMap((commodityId) => {
          const rate = newest.get(`${post.networkId}:${commodityId}`);
          return rate
            ? [{
                commodityId,
                commodityName: this.commodityName(commodityId),
                rateId: rate.rateId,
                buyValue: basicTradeBuyValue(rate.value),
                sellValue: basicTradeSellValue(rate.value),
                stored: stockOf(post.id, commodityId),
              }]
            : [];
        }),
      }));
    return { accounts, charts, limit };
  }

  private async trade(userId: number, input: BasicTradeRequestDto, direction: Direction): Promise<{ message: string }> {
    if (!Number.isSafeInteger(input?.postId) || typeof input.rateId !== 'string' || !input.rateId) {
      throw new BadRequestException('Handelsposten und Kurs müssen angegeben sein');
    }
    const verb = direction === 'buy' ? 'gekauft' : 'verkauft';
    await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOneBy(User, { id: userId });
      if (!user || user.isNpc) throw new ForbiddenException('NPCs können dieses Angebot nicht annehmen');
      const rate = await manager.findOneBy(BasicTradeRate, { rateId: input.rateId });
      if (!rate) throw new BadRequestException(`Kurs nicht gefunden - es konnte nicht ${verb} werden`);
      const post = await manager.findOne(TradePost, { where: { id: input.postId }, lock: { mode: 'pessimistic_write' } });
      if (!post || post.networkId !== rate.networkId || !(await this.isLicensedNpcPost(manager, post, userId))) {
        throw new BadRequestException('Du benötigst eine gültige Lizenz an einem NPC-Handelsposten dieses Netzes');
      }
      // Serializes the rate history of one network and commodity.
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`basic-trade:${rate.networkId}:${rate.commodityId}`]);
      const latest = await manager.find(BasicTradeRate, {
        where: { networkId: rate.networkId, commodityId: rate.commodityId },
        order: { dateMs: 'DESC', id: 'DESC' },
        take: BASIC_TRADE_LATEST_RATE_AMOUNT,
      });
      if (latest[0]?.id !== rate.id) {
        throw new BadRequestException(`Kurs wurde zwischenzeitlich aktualisiert - es konnte nicht ${verb} werden`);
      }
      const { free } = await this.storage.capacityIn(manager, post.id, userId, post);
      if (free <= 0) {
        throw new BadRequestException(`Dein Warenkonto auf diesem Handelsposten ist überfüllt - es konnte nicht ${verb} werden`);
      }
      if (direction === 'buy') {
        await this.take(manager, post.id, userId, AURODIUM_COMMODITY_ID, 1, 'Dein Warenkonto verfügt über kein Aurodium - es konnte nicht gekauft werden');
        await this.give(manager, post.id, userId, rate.commodityId, basicTradeBuyValue(rate.value));
      } else {
        await this.take(manager, post.id, userId, rate.commodityId, basicTradeSellValue(rate.value), 'Dein Warenkonto verfügt nicht über ausreichend Waren - es konnte nicht verkauft werden');
        await this.give(manager, post.id, userId, AURODIUM_COMMODITY_ID, 1);
      }
      const modifier = direction === 'buy' ? BASIC_TRADE_BUY_MODIFIER : BASIC_TRADE_SELL_MODIFIER;
      await manager.save(BasicTradeRate, {
        networkId: rate.networkId,
        commodityId: rate.commodityId,
        buySell: modifier,
        value: nextBasicTradeValue(latest, modifier),
        rateId: randomUUID(),
        userId,
        dateMs: Math.max(this.clock(), latest[0].dateMs + 1),
      });
    });
    return { message: direction === 'buy' ? 'Die Waren wurden gekauft' : 'Die Waren wurden verkauft' };
  }

  private async take(manager: EntityManager, tradePostId: number, userId: number, commodityId: number, amount: number, missing: string) {
    const row = await manager.findOne(TradeAccountStorage, {
      where: { tradePostId, userId, commodityId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!row || row.amount < amount || amount < 1) throw new BadRequestException(missing);
    row.amount -= amount;
    if (row.amount === 0) await manager.remove(row);
    else await manager.save(row);
  }

  /** STU `upperStorage`: no space check beyond the account not being full. */
  private async give(manager: EntityManager, tradePostId: number, userId: number, commodityId: number, amount: number) {
    if (amount <= 0) return;
    const row =
      (await manager.findOne(TradeAccountStorage, {
        where: { tradePostId, userId, commodityId },
        lock: { mode: 'pessimistic_write' },
      })) ?? manager.create(TradeAccountStorage, { tradePostId, userId, commodityId, amount: 0 });
    row.amount += amount;
    await manager.save(row);
  }

  private async isLicensedNpcPost(manager: EntityManager, post: TradePost, userId: number): Promise<boolean> {
    const [owner, licensed] = await Promise.all([
      manager.findOneBy(User, { id: post.ownerId }),
      manager.exists(TradeLicense, { where: { tradePostId: post.id, userId, expiresAt: MoreThan(new Date()) } }),
    ]);
    return owner?.isNpc === true && licensed;
  }

  /** STU `getByUserLicenseOnlyNPC`. */
  private async licensedNpcPosts(manager: EntityManager, userId: number): Promise<TradePost[]> {
    const licenses = await manager.find(TradeLicense, {
      where: { userId, expiresAt: MoreThan(new Date()) },
      relations: ['tradePost'],
    });
    const posts = licenses.map((license) => license.tradePost);
    if (!posts.length) return [];
    const npcOwners = new Set(
      (await manager.find(User, { select: { id: true }, where: { id: In(posts.map((post) => post.ownerId)), isNpc: true } }))
        .map((owner) => owner.id),
    );
    return posts
      .filter((post) => npcOwners.has(post.ownerId))
      .sort((left, right) => left.networkId - right.networkId || left.name.localeCompare(right.name, 'de'));
  }

  private commodityName(id: number): string {
    return this.gameData.getCommodity(id)?.name ?? `Ware #${id}`;
  }
}
