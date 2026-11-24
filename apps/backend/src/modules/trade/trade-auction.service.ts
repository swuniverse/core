import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type EntityManager } from 'typeorm';
import { User } from '../auth/user.entity';
import { MessageFolder } from '../messaging/message-folder';
import { MessagingService } from '../messaging/messaging.service';
import { PrestigeService } from '../prestige/prestige.service';
import { TradeAccountStorage } from './entities/trade-account-storage.entity';
import { TradeAuctionBid } from './entities/trade-auction-bid.entity';
import { TradeDeal } from './entities/trade-deal.entity';
import type { TradePost } from './entities/trade-post.entity';
import { HUTT_LICENSE_REQUIRED, TradeDealService, hasLicense, highestBids, huttPost } from './trade-deal.service';

const NOT_AVAILABLE = 'Das Angebot ist nicht mehr verfügbar';

type BidType = 'FIRST' | 'RAISE_OWN' | 'REVISE';
const PRESTIGE_TEXT: Record<BidType | 'REVISE_OLD', (amount: number) => string> = {
  FIRST: (amount) => `-${amount} Prestige: Eingebüßt durch Setzen eines Erstgebots bei einer Auktion des Hutten-Kartells`,
  RAISE_OWN: (amount) => `-${amount} Prestige: Eingebüßt durch Erhöhen deines Maximalgebots bei einer Auktion des Hutten-Kartells`,
  REVISE: (amount) => `-${amount} Prestige: Eingebüßt bei einer Auktion des Hutten-Kartells`,
  REVISE_OLD: (amount) => `${amount} Prestige: Du wurdest bei einer Auktion des Hutten-Kartells überboten und hast dein Prestige zurück erhalten`,
};

/**
 * STU `DealsBidAuction` and `DealsTakeAuction` for Hutt Cartel auctions. Every
 * bid reserves the full maximum; an outbid player gets the whole maximum back.
 * Bids and claims run under locks on the Hutt post and the auction.
 */
@Injectable()
export class TradeAuctionService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly deals: TradeDealService,
    private readonly prestige: PrestigeService,
    private readonly messaging: MessagingService,
  ) {}

  async bid(dealId: number, userId: number, maxAmount: number, now = new Date()): Promise<{ message: string }> {
    if (!Number.isSafeInteger(maxAmount) || maxAmount < 1) throw new BadRequestException('Zu geringe Anzahl ausgewählt');
    const afterCommit: Array<() => void> = [];
    const message = await this.dataSource.transaction(async (manager) => {
      const transaction = { manager, afterCommit };
      const { post, deal, user } = await this.lock(manager, dealId, userId);
      if (!deal.auction || deal.factionId !== null && deal.factionId !== user.factionId || deal.startsAt > now) {
        throw new BadRequestException(NOT_AVAILABLE);
      }
      if (deal.endsAt <= now) throw new BadRequestException('Die Auktion ist bereits beendet');
      if (maxAmount <= (deal.auctionAmount ?? 0)) throw new BadRequestException('Zu geringe Anzahl ausgewählt');
      if (!(await hasLicense(manager, post.id, userId, now))) throw new ForbiddenException(HUTT_LICENSE_REQUIRED);

      const highest = (await highestBids(manager, [deal])).get(deal.id) ?? null;
      if (!highest) {
        await this.collect(manager, deal, post, user, maxAmount, 'FIRST');
        await manager.save(TradeAuctionBid, manager.create(TradeAuctionBid, { dealId: deal.id, userId, maxAmount }));
        await manager.update(TradeDeal, { id: deal.id }, { auctionUserId: userId, auctionAmount: 1 });
        return `Du hast das erste Gebot abgegeben. Dein Maximalgebot liegt bei ${maxAmount}`;
      }
      if (highest.userId === userId) {
        if (maxAmount <= highest.maxAmount) {
          throw new BadRequestException('Dein neues Maximalgebot muss über deinem bisherigen Maximalgebot liegen');
        }
        await this.collect(manager, deal, post, user, maxAmount - highest.maxAmount, 'RAISE_OWN');
        await manager.update(TradeAuctionBid, { id: highest.id }, { maxAmount });
        return `Dein Maximalgebot wurde auf ${maxAmount} erhöht`;
      }
      if (maxAmount <= highest.maxAmount) {
        // The highest bid holds; nothing is collected, the price rises.
        await this.assertAvailable(manager, deal, post, user, maxAmount);
        const amount = Math.min(maxAmount + 1, highest.maxAmount);
        await manager.update(TradeDeal, { id: deal.id }, { auctionAmount: amount });
        await this.messaging.sendSystem(
          highest.userId,
          `Ein Spieler hat auf eine Auktion des Hutten-Kartells geboten, aber dein Maximalgebot nicht überschritten. Dein Höchstgebot liegt nun bei ${amount} ${this.currencyName(deal)}`,
          undefined, MessageFolder.TRADE, undefined, false, transaction,
        );
        return `Dein Maximalgebot hat nicht ausgereicht. Höchstgebot liegt nun bei ${amount}`;
      }
      await this.collect(manager, deal, post, user, maxAmount, 'REVISE');
      await this.refund(manager, deal, post, highest.userId, highest.maxAmount, PRESTIGE_TEXT.REVISE_OLD(highest.maxAmount));
      await this.messaging.sendSystem(
        highest.userId,
        `Du wurdest bei einer Auktion des Hutten-Kartells von ${user.username} überboten und hast ${highest.maxAmount} ${this.currencyName(deal)} zurück bekommen. Das aktuelle Gebot liegt bei: ${highest.maxAmount + 1} ${this.currencyName(deal)}`,
        undefined, MessageFolder.TRADE, undefined, false, transaction,
      );
      await manager.save(TradeAuctionBid, manager.create(TradeAuctionBid, { dealId: deal.id, userId, maxAmount }));
      await manager.update(TradeDeal, { id: deal.id }, { auctionUserId: userId, auctionAmount: highest.maxAmount + 1 });
      return `Gebot wurde auf ${highest.maxAmount + 1} erhöht. Dein Maximalgebot liegt bei ${maxAmount}. Du bist nun Meistbietender!`;
    });
    for (const notify of afterCommit) notify();
    return { message };
  }

  /** STU `DealsTakeAuction`: the winner claims once and gets back what the maximum exceeded the price. */
  async claim(dealId: number, userId: number, now = new Date()): Promise<{ message: string }> {
    const messages = await this.dataSource.transaction(async (manager) => {
      const { post, deal } = await this.lock(manager, dealId, userId);
      if (!deal.auction || deal.auctionUserId !== userId) throw new BadRequestException('Du hast diese Auktion nicht gewonnen');
      if (deal.takenAt) throw new BadRequestException('Der Gewinn wurde bereits abgeholt');
      if (deal.endsAt > now) throw new BadRequestException('Die Auktion läuft noch');
      if (!(await hasLicense(manager, post.id, userId, now))) throw new ForbiddenException(HUTT_LICENSE_REQUIRED);
      const highest = (await highestBids(manager, [deal])).get(deal.id);
      if (!highest) throw new BadRequestException('Zu dieser Auktion liegt kein Gebot vor');

      const result: string[] = [];
      const refund = highest.maxAmount - (deal.auctionAmount ?? highest.maxAmount);
      if (refund > 0) {
        await this.refund(
          manager, deal, post, userId, refund,
          `${refund} Prestige: Du hast Prestige bei einer Auktion zurückerhalten, weil dein Maximalgebot über dem Höchstgebot lag`,
        );
        result.push(`Dir wurden ${refund} ${this.currencyName(deal)} gutgeschrieben`);
      }
      await this.deals.deliver(manager, deal, userId, post);
      result.push(
        deal.giveCommodityId !== null
          ? `Du hast ${deal.giveCommodityAmount} ${this.deals.commodityName(deal.giveCommodityId)} erhalten`
          : deal.ship ? 'Du hast dein Schiff erhalten' : 'Du hast deinen Bauplan erhalten',
      );
      await manager.update(TradeDeal, { id: deal.id }, { takenAt: now });
      return result;
    });
    return { message: messages.join('. ') };
  }

  /** Lock order: Hutt post, auction, player. */
  private async lock(manager: EntityManager, dealId: number, userId: number) {
    const post = await huttPost(manager, true);
    if (!post) throw new BadRequestException(NOT_AVAILABLE);
    const deal = await manager.findOne(TradeDeal, { where: { id: dealId }, lock: { mode: 'pessimistic_write' } });
    if (!deal) throw new BadRequestException(NOT_AVAILABLE);
    const user = await manager.findOne(User, { where: { id: userId }, lock: { mode: 'pessimistic_write' } });
    if (!user || user.isNpc) throw new ForbiddenException('NPCs können dieses Angebot nicht annehmen');
    return { post, deal, user };
  }

  /** STU `isEnoughAvailable`. */
  private async assertAvailable(manager: EntityManager, deal: TradeDeal, post: TradePost, user: User, amount: number): Promise<TradeAccountStorage | null> {
    if (deal.wantCommodityId === null) {
      if (amount > user.prestige) throw new BadRequestException(`Du hast nicht genügend Prestige, benötigt: ${amount - user.prestige}`);
      return null;
    }
    const storage = await manager.findOne(TradeAccountStorage, {
      where: { tradePostId: post.id, userId: user.id, commodityId: deal.wantCommodityId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!storage || storage.amount < amount) {
      throw new BadRequestException(`Nicht genügend ${this.currencyName(deal)} auf diesem Handelsposten vorhanden`);
    }
    return storage;
  }

  /** STU `checkAndCollectCosts` without the refund part. */
  private async collect(manager: EntityManager, deal: TradeDeal, post: TradePost, user: User, amount: number, type: BidType): Promise<void> {
    const storage = await this.assertAvailable(manager, deal, post, user, amount);
    if (!storage) {
      await this.prestige.change(user.id, -amount, PRESTIGE_TEXT[type](amount), manager);
      return;
    }
    storage.amount -= amount;
    if (storage.amount === 0) await manager.remove(storage);
    else await manager.save(storage);
  }

  private async refund(manager: EntityManager, deal: TradeDeal, post: TradePost, userId: number, amount: number, prestigeText: string): Promise<void> {
    if (deal.wantCommodityId === null) {
      await this.prestige.change(userId, amount, prestigeText, manager);
      return;
    }
    const row =
      (await manager.findOne(TradeAccountStorage, {
        where: { tradePostId: post.id, userId, commodityId: deal.wantCommodityId },
        lock: { mode: 'pessimistic_write' },
      })) ?? manager.create(TradeAccountStorage, { tradePostId: post.id, userId, commodityId: deal.wantCommodityId, amount: 0 });
    row.amount += amount;
    await manager.save(row);
  }

  private currencyName(deal: TradeDeal): string {
    return deal.wantCommodityId === null ? 'Prestige' : this.deals.commodityName(deal.wantCommodityId);
  }
}

