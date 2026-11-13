import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In, IsNull, LessThanOrEqual, MoreThan, type EntityManager } from 'typeorm';
import type { TradeDealDto, TradeDealsDto } from '@swuniverse/shared';
import { User } from '../auth/user.entity';
import { NpcKey } from '../auth/npc-account.service';
import { FactionEntity } from '../faction/entities/faction.entity';
import { GameDataService } from '../game-data/game-data.service';
import { PrestigeService } from '../prestige/prestige.service';
import { AdminShipBuildplan } from '../spacecraft/entities/admin-ship-buildplan.entity';
import { ShipClassDef } from '../spacecraft/entities/ship-class-def.entity';
import { TradeAccountStorage } from './entities/trade-account-storage.entity';
import { TradeDeal } from './entities/trade-deal.entity';
import { TradeAuctionBid } from './entities/trade-auction-bid.entity';
import { TradeLicense } from './entities/trade-license.entity';
import { TradePost } from './entities/trade-post.entity';
import type { TradeDealFulfillment } from './trade-deal-fulfillment.port';
import { TradeStorageService } from './trade-storage.service';

export const HUTT_LICENSE_REQUIRED = 'Handelslizenz beim Hutten-Kartell erforderlich';
const NOT_AVAILABLE = 'Das Angebot ist nicht mehr verfügbar';
const NO_SPACE = 'Es steht für diese Transaktion nicht genügend Platz in deinem Warenkonto zur Verfügung';
const ACCOUNT_FULL = 'Dein Warenkonto auf diesem Handelsposten ist voll';

/**
 * STU `ShowDeals` and `DealsTakeOffer` for instant deals at the Hutt Cartel
 * post. A take runs in one transaction under a lock on the post and the deal,
 * so concurrent takes never sell more than the remaining amount.
 */
@Injectable()
export class TradeDealService {
  private fulfillment: TradeDealFulfillment | null = null;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly storage: TradeStorageService,
    private readonly prestige: PrestigeService,
    private readonly gameData: GameDataService,
  ) {}

  registerFulfillment(fulfillment: TradeDealFulfillment): void {
    this.fulfillment = fulfillment;
  }

  async list(userId: number, now = new Date()): Promise<TradeDealsDto> {
    const manager = this.dataSource.manager;
    const [user, post] = await Promise.all([manager.findOneBy(User, { id: userId }), huttPost(manager)]);
    if (!user) throw new NotFoundException('Spieler nicht gefunden');
    const licensed = post ? await hasLicense(manager, post.id, userId, now) : false;
    if (!post || !licensed) {
      return {
        hasLicense: false, notice: HUTT_LICENSE_REQUIRED, tradePostId: post?.id ?? null, tradePostName: post?.name ?? null,
        prestige: user.prestige, account: [], deals: [], auctions: [], wonAuctions: [],
      };
    }
    const ownFaction = (deal: TradeDeal) => deal.factionId === null || deal.factionId === user.factionId;
    const deals = (await activeDeals(manager, now)).filter(ownFaction);
    const auctions = (await activeDeals(manager, now, true)).filter(ownFaction);
    const won = await manager.find(TradeDeal, {
      where: { auction: true, auctionUserId: userId, takenAt: IsNull(), endsAt: LessThanOrEqual(now) },
      order: { endsAt: 'ASC', id: 'ASC' },
    });
    const all = [...deals, ...auctions, ...won];
    const wanted = [...new Set(all.flatMap((deal) => (deal.wantCommodityId === null ? [] : [deal.wantCommodityId])))];
    const [account, plans, factions, ownBids] = await Promise.all([
      wanted.length ? manager.find(TradeAccountStorage, { where: { tradePostId: post.id, userId, commodityId: In(wanted) } }) : [],
      this.buildplans(manager, all),
      manager.find(FactionEntity, { where: { id: In(all.flatMap((deal) => (deal.factionId === null ? [] : [deal.factionId]))) } }),
      highestBids(manager, [...auctions, ...won].filter((deal) => deal.auctionUserId === userId)),
    ]);
    const factionNames = new Map(factions.map((faction) => [faction.id, faction.name]));
    return {
      hasLicense: true,
      notice: null,
      tradePostId: post.id,
      tradePostName: post.name,
      prestige: user.prestige,
      account: account.map((row) => ({ commodityId: row.commodityId, amount: row.amount })),
      deals: deals.map((deal) => this.toDto(deal, plans, factionNames)),
      auctions: auctions.map((deal) => {
        const { give, buildplan, kind, factionName, endsAt } = this.toDto(deal, plans, factionNames);
        const own = deal.auctionUserId === userId;
        return {
          id: deal.id, kind, give, buildplan, factionName, endsAt,
          currency: this.currency(deal),
          currentAmount: deal.auctionAmount,
          isHighestBidder: own,
          ownMaxAmount: own ? (ownBids.get(deal.id)?.maxAmount ?? null) : null,
        };
      }),
      wonAuctions: won.map((deal) => {
        const { give, buildplan, kind } = this.toDto(deal, plans, factionNames);
        const price = deal.auctionAmount ?? 0;
        return {
          id: deal.id, kind, give, buildplan,
          currency: this.currency(deal),
          price,
          refund: Math.max(0, (ownBids.get(deal.id)?.maxAmount ?? price) - price),
          endedAt: deal.endsAt.toISOString(),
        };
      }),
    };
  }

  async take(dealId: number, userId: number, requested: number, now = new Date()): Promise<{ message: string; amount: number }> {
    if (!Number.isSafeInteger(requested) || requested < 1) throw new BadRequestException('Zu geringe Anzahl ausgewählt');
    const amount = await this.dataSource.transaction(async (manager) => {
      // Lock order: post, deal, player (prestige), account rows.
      const post = await huttPost(manager, true);
      if (!post) throw new BadRequestException(NOT_AVAILABLE);
      const deal = await manager.findOne(TradeDeal, { where: { id: dealId }, lock: { mode: 'pessimistic_write' } });
      const user = await manager.findOne(User, { where: { id: userId }, lock: { mode: 'pessimistic_write' } });
      if (!user || user.isNpc) throw new ForbiddenException('NPCs können dieses Angebot nicht annehmen');
      if (!deal || deal.auction || deal.startsAt > now || deal.endsAt <= now || (deal.factionId !== null && deal.factionId !== user.factionId)) {
        throw new BadRequestException(NOT_AVAILABLE);
      }
      if (!(await hasLicense(manager, post.id, userId, now))) throw new ForbiddenException(HUTT_LICENSE_REQUIRED);

      let amount = requested;
      if (deal.wantPrestige !== null && user.prestige < deal.wantPrestige) {
        throw new BadRequestException('Du hast nicht genügend Prestige');
      }
      const wantStorage = deal.wantCommodityId === null
        ? null
        : await manager.findOne(TradeAccountStorage, {
            where: { tradePostId: post.id, userId, commodityId: deal.wantCommodityId },
            lock: { mode: 'pessimistic_write' },
          });
      if (deal.wantCommodityId !== null && (wantStorage?.amount ?? 0) < (deal.wantCommodityAmount as number)) {
        throw new BadRequestException(`Nicht genügend ${this.commodityName(deal.wantCommodityId)} auf diesem Handelsposten vorhanden`);
      }

      if (deal.giveCommodityId !== null) {
        const give = deal.giveCommodityAmount as number;
        const { free } = await this.storage.capacityIn(manager, post.id, userId, post);
        if (deal.wantCommodityId !== null) {
          const want = deal.wantCommodityAmount as number;
          if (free <= 0 && give > want) throw new BadRequestException(ACCOUNT_FULL);
          amount = Math.min(amount, Math.floor((wantStorage?.amount ?? 0) / want));
          if (give > want && amount * (give - want) > free) amount = Math.floor(free / (give - want));
        } else {
          // STU subtracts the prestige price from the account space; prestige occupies none.
          if (free <= 0) throw new BadRequestException(ACCOUNT_FULL);
          amount = Math.min(amount, Math.floor(user.prestige / (deal.wantPrestige as number)));
          if (amount * give > free) amount = Math.floor(free / give);
        }
        if (amount <= 0) throw new BadRequestException(NO_SPACE);
      } else {
        amount = 1;
      }

      if (deal.amount !== null) {
        amount = Math.min(amount, deal.amount);
        if (deal.amount === amount) await manager.delete(TradeDeal, { id: deal.id });
        else await manager.update(TradeDeal, { id: deal.id }, { amount: deal.amount - amount });
      }

      await this.deliver(manager, deal, userId, post, amount);
      if (wantStorage) {
        wantStorage.amount -= (deal.wantCommodityAmount as number) * amount;
        if (wantStorage.amount === 0) await manager.remove(wantStorage);
        else await manager.save(wantStorage);
      }
      if (deal.wantPrestige !== null) {
        const price = deal.wantPrestige * amount;
        await this.prestige.change(userId, -price, `-${price} Prestige: Eingebüßt beim Deal des Hutten-Kartells`, manager);
      }
      return amount;
    });
    return { message: `Der Deal wurde ${amount} mal angenommen`, amount };
  }

  /** The deal's item, `times` over: goods to the Hutt account (no space check, like STU `upperStorage`), a ship or a buildplan. */
  async deliver(manager: EntityManager, deal: TradeDeal, userId: number, post: TradePost, times = 1): Promise<void> {
    if (deal.giveCommodityId !== null) {
      await addToAccount(manager, post.id, userId, deal.giveCommodityId, (deal.giveCommodityAmount as number) * times);
    }
    if (deal.buildplanId !== null) {
      if (!this.fulfillment) throw new Error('Trade deal fulfillment is not registered');
      if (deal.ship) await this.fulfillment.createShip(manager, { userId, buildplanId: deal.buildplanId, locationId: post.locationId });
      else await this.fulfillment.grantBuildplan(manager, { userId, buildplanId: deal.buildplanId });
    }
  }

  private async buildplans(manager: EntityManager, deals: TradeDeal[]) {
    const ids = [...new Set(deals.flatMap((deal) => (deal.buildplanId === null ? [] : [deal.buildplanId])))];
    if (!ids.length) return new Map<number, { id: number; name: string; shipClassName: string }>();
    const plans = await manager.find(AdminShipBuildplan, { where: { id: In(ids) } });
    const classes = await manager.find(ShipClassDef, { where: { id: In(plans.map((plan) => plan.shipClassId)) } });
    const className = new Map(classes.map((shipClass) => [shipClass.id, shipClass.name]));
    return new Map(plans.map((plan) => [plan.id, { id: plan.id, name: plan.name, shipClassName: className.get(plan.shipClassId) ?? `Rumpf #${plan.shipClassId}` }]));
  }

  private toDto(
    deal: TradeDeal,
    plans: Map<number, { id: number; name: string; shipClassName: string }>,
    factionNames: Map<number, string>,
  ): TradeDealDto {
    return {
      id: deal.id,
      kind: deal.buildplanId === null ? 'COMMODITY' : deal.ship ? 'SHIP' : 'BUILDPLAN',
      amount: deal.amount,
      give: deal.giveCommodityId === null
        ? null
        : { commodityId: deal.giveCommodityId, commodityName: this.commodityName(deal.giveCommodityId), amount: deal.giveCommodityAmount as number },
      buildplan: deal.buildplanId === null ? null : plans.get(deal.buildplanId) ?? null,
      want: deal.wantCommodityId === null
        ? null
        : { commodityId: deal.wantCommodityId, commodityName: this.commodityName(deal.wantCommodityId), amount: deal.wantCommodityAmount as number },
      wantPrestige: deal.wantPrestige,
      factionName: deal.factionId === null ? null : factionNames.get(deal.factionId) ?? null,
      endsAt: deal.endsAt.toISOString(),
    };
  }

  /** Auction currency: the wanted commodity, or prestige (`null`). */
  currency(deal: TradeDeal) {
    return deal.wantCommodityId === null ? null : { commodityId: deal.wantCommodityId, commodityName: this.commodityName(deal.wantCommodityId) };
  }

  commodityName(id: number): string {
    return this.gameData.getCommodity(id)?.name ?? `Ware #${id}`;
  }
}

/** The post of the Hutt Cartel NPC (STU `DEALS_FERG_TRADEPOST_ID`). */
export async function huttPost(manager: EntityManager, lock = false): Promise<TradePost | null> {
  const owner = await manager.findOne(User, { select: { id: true }, where: { npcKey: NpcKey.HUTT_CARTEL } });
  if (!owner) return null;
  const post = await manager.findOne(TradePost, { where: { ownerId: owner.id }, order: { id: 'ASC' } });
  if (!post || !lock) return post;
  return manager.findOne(TradePost, { where: { id: post.id }, lock: { mode: 'pessimistic_write' } });
}

/** STU `hasFergLicense`. */
export async function hasLicense(manager: EntityManager, tradePostId: number, userId: number, now: Date): Promise<boolean> {
  return (await manager.countBy(TradeLicense, { tradePostId, userId, expiresAt: MoreThan(now) })) > 0;
}

/** Started, not ended instant deals (or auctions), oldest first. */
export function activeDeals(manager: EntityManager, now: Date, auction = false): Promise<TradeDeal[]> {
  return manager.find(TradeDeal, {
    where: { auction, startsAt: LessThanOrEqual(now), endsAt: MoreThan(now) },
    order: { id: 'ASC' },
  });
}

/** STU `getHighestBid`: the newest bid of the current highest bidder, per auction. */
export async function highestBids(manager: EntityManager, deals: TradeDeal[]): Promise<Map<number, TradeAuctionBid>> {
  const withBidder = deals.filter((deal) => deal.auctionUserId !== null);
  if (!withBidder.length) return new Map();
  const bids = await manager.find(TradeAuctionBid, {
    where: withBidder.map((deal) => ({ dealId: deal.id, userId: deal.auctionUserId as number })),
    order: { id: 'ASC' },
  });
  return new Map(bids.map((bid) => [bid.dealId, bid]));
}

async function addToAccount(manager: EntityManager, tradePostId: number, userId: number, commodityId: number, amount: number) {
  const row =
    (await manager.findOne(TradeAccountStorage, {
      where: { tradePostId, userId, commodityId },
      lock: { mode: 'pessimistic_write' },
    })) ?? manager.create(TradeAccountStorage, { tradePostId, userId, commodityId, amount: 0 });
  row.amount += amount;
  await manager.save(row);
}

