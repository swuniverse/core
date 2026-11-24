import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In, MoreThan, type EntityManager } from 'typeorm';
import type {
  TakeTradeOfferResultDto,
  TradeOfferCommodityOverviewDto,
  TradeOfferListItemDto,
  TradeOfferSearchDto,
  TradeOfferSearchMode,
} from '@swuniverse/shared';
import { User } from '../auth/user.entity';
import { GameDataService } from '../game-data/game-data.service';
import { MessageFolder } from '../messaging/message-folder';
import { MessagingService } from '../messaging/messaging.service';
import { TradeAccountStorage } from './entities/trade-account-storage.entity';
import { TradeLicense } from './entities/trade-license.entity';
import { TradeOffer } from './entities/trade-offer.entity';
import { TradePost } from './entities/trade-post.entity';
import { assertNotAbandoned } from './player-trade-post.service';
import { TradeTransaction } from './entities/trade-transaction.entity';
import { TradeStorageService } from './trade-storage.service';

export const OFFER_PAGE_SIZE = 25;

export interface TradeOfferSearchQuery {
  commodityId?: number | null;
  mode?: TradeOfferSearchMode;
  postId?: number | null;
  page?: number;
}

/**
 * STU `TakeOffer` and `SearchOffers`: players with a license take offers at a
 * post n times, cut to their stock, free space and the remaining count.
 */
@Injectable()
export class TradeOfferMarketService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly storage: TradeStorageService,
    private readonly messaging: MessagingService,
    private readonly gameData: GameDataService,
  ) {}

  async take(offerId: number, userId: number, requested: number): Promise<TakeTradeOfferResultDto> {
    if (!Number.isSafeInteger(requested) || requested < 1) {
      throw new BadRequestException('Die Anzahl muss mindestens 1 sein');
    }
    const afterCommit: Array<() => void> = [];
    const taken = await this.dataSource.transaction(async (manager) => {
      const taker = await manager.findOneBy(User, { id: userId });
      if (taker?.isNpc) throw new ForbiddenException('NPC-Konten können keine Angebote annehmen');
      const known = await manager.findOneBy(TradeOffer, { id: offerId });
      if (!known) throw new BadRequestException('Das Angebot ist nicht mehr verfügbar');
      // Post before offer, as offer creation does, so capacity checks serialize.
      const post = await manager.findOne(TradePost, { where: { id: known.tradePostId }, lock: { mode: 'pessimistic_write' } });
      const offer = await manager.findOne(TradeOffer, { where: { id: offerId }, lock: { mode: 'pessimistic_write' } });
      if (!post || !offer) throw new BadRequestException('Das Angebot ist nicht mehr verfügbar');
      assertNotAbandoned(post);
      if (!(await this.hasLicense(manager, post.id, userId))) {
        throw new BadRequestException('Du benötigst eine gültige Lizenz für diesen Handelsposten');
      }
      if (offer.userId === userId) throw new BadRequestException('Eigene Angebote können nicht angenommen werden');

      const wantedName = this.commodityName(offer.wantedCommodityId);
      const payment = await manager.findOne(TradeAccountStorage, {
        where: { tradePostId: post.id, userId, commodityId: offer.wantedCommodityId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!payment || payment.amount < offer.wantedAmount) {
        throw new BadRequestException(`Nicht genügend ${wantedName} auf diesem Handelsposten vorhanden`);
      }
      const { free } = await this.storage.capacityIn(manager, post.id, userId, post);
      if (free <= 0 && offer.offeredAmount > offer.wantedAmount) {
        throw new BadRequestException('Dein Warenkonto auf diesem Handelsposten ist voll');
      }
      const amount = this.takeable(offer, requested, payment.amount, free);
      if (amount <= 0) {
        throw new BadRequestException('Es steht für diese Transaktion nicht genügend Platz in deinem Warenkonto zur Verfügung');
      }

      offer.offerCount -= amount;
      offer.reservedAmount = offer.offerCount * offer.offeredAmount;
      if (offer.offerCount === 0) await manager.remove(offer);
      else await manager.save(offer);
      payment.amount -= amount * offer.wantedAmount;
      if (payment.amount === 0) await manager.remove(payment);
      else await manager.save(payment);
      await this.addToAccount(manager, post.id, userId, offer.offeredCommodityId, amount * offer.offeredAmount);
      // STU upperStorage: the offering player is credited without a space check.
      await this.addToAccount(manager, post.id, offer.userId, offer.wantedCommodityId, amount * offer.wantedAmount);
      await manager.save(
        manager.create(TradeTransaction, {
          tradePostId: post.id,
          buyerId: userId,
          sellerId: offer.userId,
          wantedCommodityId: offer.wantedCommodityId,
          wantedAmount: amount * offer.wantedAmount,
          offeredCommodityId: offer.offeredCommodityId,
          offeredAmount: amount * offer.offeredAmount,
        }),
      );
      await this.messaging.sendSystem(
        offer.userId,
        `${taker?.username ?? 'Ein Siedler'} hat dein Angebot ${amount}-mal angenommen: Am ${post.name} wurden insgesamt ${amount * offer.offeredAmount} ${this.commodityName(offer.offeredCommodityId)} gegen ${amount * offer.wantedAmount} ${wantedName} getauscht.`,
        undefined,
        MessageFolder.TRADE,
        undefined,
        false,
        { manager, afterCommit },
      );
      return amount;
    });
    for (const notify of afterCommit) notify();
    return { taken, message: `Das Angebot wurde ${taken} mal angenommen` };
  }

  async search(userId: number, query: TradeOfferSearchQuery): Promise<TradeOfferSearchDto> {
    const manager = this.dataSource.manager;
    const page = Math.max(1, Math.floor(query.page ?? 1));
    const licensedPosts = await this.licensedPosts(manager, userId);
    const postIds = licensedPosts.map((post) => post.id);
    let items: TradeOffer[] = [];
    let total = 0;
    if (postIds.length && (query.postId == null || postIds.includes(query.postId))) {
      const builder = manager
        .getRepository(TradeOffer)
        .createQueryBuilder('offer')
        .leftJoinAndSelect('offer.tradePost', 'post')
        .leftJoinAndSelect('offer.user', 'owner')
        .where('offer.tradePostId IN (:...postIds)', { postIds: query.postId != null ? [query.postId] : postIds });
      if (query.commodityId) {
        const mode = query.mode ?? 'both';
        if (mode === 'offer') builder.andWhere('offer.offeredCommodityId = :commodityId', { commodityId: query.commodityId });
        else if (mode === 'demand') builder.andWhere('offer.wantedCommodityId = :commodityId', { commodityId: query.commodityId });
        else builder.andWhere('(offer.offeredCommodityId = :commodityId OR offer.wantedCommodityId = :commodityId)', { commodityId: query.commodityId });
      }
      [items, total] = await builder
        .orderBy('offer.createdAt', 'DESC')
        .addOrderBy('offer.id', 'DESC')
        .skip((page - 1) * OFFER_PAGE_SIZE)
        .take(OFFER_PAGE_SIZE)
        .getManyAndCount();
    }
    return {
      items: await this.toItems(manager, userId, items),
      total,
      page,
      pageSize: OFFER_PAGE_SIZE,
      licensedPosts,
      commodities: this.tradeableCommodities(),
    };
  }

  async byCommodity(userId: number, commodityId: number): Promise<TradeOfferCommodityOverviewDto> {
    const manager = this.dataSource.manager;
    const postIds = (await this.licensedPosts(manager, userId)).map((post) => post.id);
    const offers = postIds.length
      ? await manager.find(TradeOffer, {
          where: [
            { tradePostId: In(postIds), offeredCommodityId: commodityId },
            { tradePostId: In(postIds), wantedCommodityId: commodityId },
          ],
          relations: ['tradePost', 'user'],
        })
      : [];
    const items = await this.toItems(manager, userId, offers);
    // Best deals first: most goods per unit paid or least paid per unit received.
    const perUnit = (item: TradeOfferListItemDto) => item.offeredAmount / item.wantedAmount;
    return {
      commodityId,
      commodityName: this.commodityName(commodityId),
      offered: items.filter((item) => item.offeredCommodityId === commodityId).sort((a, b) => perUnit(b) - perUnit(a)),
      wanted: items.filter((item) => item.wantedCommodityId === commodityId).sort((a, b) => perUnit(b) - perUnit(a)),
    };
  }

  /** STU cuts: payment stock, free space for the net gain, remaining offers. */
  private takeable(offer: TradeOffer, requested: number, stock: number, free: number): number {
    let amount = Math.min(requested, Math.floor(stock / offer.wantedAmount));
    const netGain = offer.offeredAmount - offer.wantedAmount;
    if (netGain > 0 && amount * netGain > free) amount = Math.floor(free / netGain);
    return Math.min(amount, offer.offerCount);
  }

  private async toItems(manager: EntityManager, userId: number, offers: TradeOffer[]): Promise<TradeOfferListItemDto[]> {
    const postIds = [...new Set(offers.map((offer) => offer.tradePostId))];
    const stocks = postIds.length
      ? await manager.find(TradeAccountStorage, { where: { userId, tradePostId: In(postIds) } })
      : [];
    const free = new Map<number, number>();
    for (const postId of postIds) free.set(postId, (await this.storage.capacityIn(manager, postId, userId)).free);
    const stockOf = (postId: number, commodityId: number) =>
      stocks.find((row) => row.tradePostId === postId && row.commodityId === commodityId)?.amount ?? 0;
    return offers.map((offer) => {
      const isOwn = offer.userId === userId;
      return {
        id: offer.id,
        tradePostId: offer.tradePostId,
        tradePostName: offer.tradePost.name,
        networkId: offer.tradePost.networkId,
        ownerName: offer.user?.username ?? `Spieler #${offer.userId}`,
        isOwn,
        offeredCommodityId: offer.offeredCommodityId,
        offeredCommodityName: this.commodityName(offer.offeredCommodityId),
        offeredAmount: offer.offeredAmount,
        wantedCommodityId: offer.wantedCommodityId,
        wantedCommodityName: this.commodityName(offer.wantedCommodityId),
        wantedAmount: offer.wantedAmount,
        offerCount: offer.offerCount,
        reservedAmount: offer.reservedAmount,
        createdAt: offer.createdAt.toISOString(),
        maxTake: isOwn
          ? 0
          : Math.max(0, this.takeable(offer, offer.offerCount, stockOf(offer.tradePostId, offer.wantedCommodityId), free.get(offer.tradePostId) ?? 0)),
      };
    });
  }

  private async licensedPosts(manager: EntityManager, userId: number) {
    const licenses = await manager.find(TradeLicense, {
      where: { userId, expiresAt: MoreThan(new Date()) },
      relations: ['tradePost'],
    });
    return licenses
      .map((license) => ({ id: license.tradePostId, name: license.tradePost.name }))
      .sort((left, right) => left.name.localeCompare(right.name, 'de'));
  }

  private async addToAccount(manager: EntityManager, tradePostId: number, userId: number, commodityId: number, amount: number) {
    const row =
      (await manager.findOne(TradeAccountStorage, {
        where: { tradePostId, userId, commodityId },
        lock: { mode: 'pessimistic_write' },
      })) ?? manager.create(TradeAccountStorage, { tradePostId, userId, commodityId, amount: 0 });
    row.amount += amount;
    await manager.save(row);
  }

  private async hasLicense(manager: EntityManager, tradePostId: number, userId: number): Promise<boolean> {
    return manager.exists(TradeLicense, { where: { tradePostId, userId, expiresAt: MoreThan(new Date()) } });
  }

  private tradeableCommodities() {
    return this.gameData
      .getAllCommodities()
      .filter((commodity) => commodity.isTradeable)
      .map((commodity) => ({ id: commodity.id, name: commodity.name }))
      .sort((left, right) => left.name.localeCompare(right.name, 'de'));
  }

  private commodityName(id: number): string {
    return this.gameData.getCommodity(id)?.name ?? `Ware #${id}`;
  }
}
