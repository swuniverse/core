import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In, LessThan } from 'typeorm';
import { GameDataService } from '../game-data/game-data.service';
import { MessageFolder } from '../messaging/message-folder';
import { MessagingService } from '../messaging/messaging.service';
import type { MaintenanceHandler } from '../tick/maintenance.service';
import { TradeAccountStorage } from './entities/trade-account-storage.entity';
import { TradeOffer } from './entities/trade-offer.entity';
import { TradePost } from './entities/trade-post.entity';

/** STU `OldTradeOffersDeletion::OFFER_MAX_AGE`: two weeks. */
export const TRADE_OFFER_MAX_AGE_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Daily maintenance after STU `OldTradeOffersDeletion`: offers older than two
 * weeks return their reserve to the account and the owner gets one message.
 */
@Injectable()
export class TradeOfferMaintenanceService implements MaintenanceHandler {
  readonly name = 'trade-offers';

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly messaging: MessagingService,
    private readonly gameData: GameDataService,
  ) {}

  async run(now: Date): Promise<string> {
    const afterCommit: Array<() => void> = [];
    const count = await this.dataSource.transaction(async (manager) => {
      const offers = await manager.find(TradeOffer, {
        where: { createdAt: LessThan(new Date(now.getTime() - TRADE_OFFER_MAX_AGE_DAYS * DAY_MS)) },
        order: { userId: 'ASC', tradePostId: 'ASC', id: 'ASC' },
        lock: { mode: 'pessimistic_write' },
      });
      if (!offers.length) return 0;
      const posts = new Map(
        (await manager.find(TradePost, { where: { id: In([...new Set(offers.map((offer) => offer.tradePostId))]) } }))
          .map((post) => [post.id, post.name]),
      );
      const lines = new Map<number, string[]>();
      const lastPost = new Map<number, number>();
      for (const offer of offers) {
        const userLines = lines.get(offer.userId) ?? ['Deine folgenden Angebote wurden gelöscht und der Inhalt wieder deinen lagernden Waren zugeschrieben.'];
        if (lastPost.get(offer.userId) !== offer.tradePostId) {
          userLines.push(`\n${posts.get(offer.tradePostId) ?? `Handelsposten #${offer.tradePostId}`}:`);
          lastPost.set(offer.userId, offer.tradePostId);
        }
        userLines.push(
          `${offer.offerCount} x angeboten: ${offer.offeredAmount} ${this.commodityName(offer.offeredCommodityId)}, verlangt: ${offer.wantedAmount} ${this.commodityName(offer.wantedCommodityId)}`,
        );
        lines.set(offer.userId, userLines);
        if (offer.reservedAmount > 0) {
          const stock =
            (await manager.findOne(TradeAccountStorage, {
              where: { tradePostId: offer.tradePostId, userId: offer.userId, commodityId: offer.offeredCommodityId },
              lock: { mode: 'pessimistic_write' },
            })) ??
            manager.create(TradeAccountStorage, {
              tradePostId: offer.tradePostId,
              userId: offer.userId,
              commodityId: offer.offeredCommodityId,
              amount: 0,
            });
          stock.amount += offer.reservedAmount;
          await manager.save(stock);
        }
      }
      await manager.delete(TradeOffer, { id: In(offers.map((offer) => offer.id)) });
      for (const [userId, text] of lines) {
        await this.messaging.sendSystem(userId, text.join('\n'), undefined, MessageFolder.TRADE, undefined, false, {
          manager,
          afterCommit,
        });
      }
      return offers.length;
    });
    for (const notify of afterCommit) notify();
    return `${count} Angebote verfallen`;
  }

  private commodityName(id: number): string {
    return this.gameData.getCommodity(id)?.name ?? `Ware #${id}`;
  }
}
