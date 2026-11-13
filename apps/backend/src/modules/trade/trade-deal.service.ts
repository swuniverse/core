import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In, LessThanOrEqual, MoreThan, type EntityManager } from 'typeorm';
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
      return { hasLicense: false, notice: HUTT_LICENSE_REQUIRED, tradePostId: post?.id ?? null, tradePostName: post?.name ?? null, prestige: user.prestige, account: [], deals: [] };
    }
    const deals = (await activeDeals(manager, now)).filter((deal) => deal.factionId === null || deal.factionId === user.factionId);
    const wanted = [...new Set(deals.flatMap((deal) => (deal.wantCommodityId === null ? [] : [deal.wantCommodityId])))];
    const [account, plans, factions] = await Promise.all([
      wanted.length ? manager.find(TradeAccountStorage, { where: { tradePostId: post.id, userId, commodityId: In(wanted) } }) : [],
      this.buildplans(manager, deals),
      manager.find(FactionEntity, { where: { id: In(deals.flatMap((deal) => (deal.factionId === null ? [] : [deal.factionId]))) } }),
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

      if (deal.giveCommodityId !== null) {
        await addToAccount(manager, post.id, userId, deal.giveCommodityId, (deal.giveCommodityAmount as number) * amount);
      }
      if (deal.buildplanId !== null) {
        if (!this.fulfillment) throw new Error('Trade deal fulfillment is not registered');
        if (deal.ship) await this.fulfillment.createShip(manager, { userId, buildplanId: deal.buildplanId, locationId: post.locationId });
        else await this.fulfillment.grantBuildplan(manager, { userId, buildplanId: deal.buildplanId });
      }
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

  private commodityName(id: number): string {
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

/** Started, not ended instant deals, oldest first. */
export function activeDeals(manager: EntityManager, now: Date): Promise<TradeDeal[]> {
  return manager.find(TradeDeal, {
    where: { auction: false, startsAt: LessThanOrEqual(now), endsAt: MoreThan(now) },
    order: { id: 'ASC' },
  });
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

