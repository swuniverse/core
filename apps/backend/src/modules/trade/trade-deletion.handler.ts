import { Injectable, type OnModuleInit } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import type { PlayerDeletionHandler } from '../account-deletion/player-deletion-handler';
import { PlayerDeletionService } from '../account-deletion/player-deletion.service';
import { BasicTradeRate } from './entities/basic-trade-rate.entity';
import { TradeAccountStorage } from './entities/trade-account-storage.entity';
import { TradeLicense } from './entities/trade-license.entity';
import { TradeOffer } from './entities/trade-offer.entity';
import { TradeShoutboxEntry } from './entities/trade-shoutbox-entry.entity';
import { LotteryTicket } from './entities/lottery-ticket.entity';
import { TradeAuctionBid } from './entities/trade-auction-bid.entity';
import { TradeDeal } from './entities/trade-deal.entity';
import { TradeTransaction } from './entities/trade-transaction.entity';
import { TradeTransfer } from './entities/trade-transfer.entity';
import { PlayerTradePostService } from './player-trade-post.service';

/**
 * Removes a deleted player's trade data inside the deletion transaction
 * (tmw-T11b). Offers go first, so their reserves never return to an account.
 * Transactions and basic trade rates stay, anonymized, so rankings and rate
 * charts keep their history.
 *
 * Own player trade posts are abandoned first (tmw-T12c): the station goes
 * with the account, accounts of other players stay for withdrawal.
 */
@Injectable()
export class TradeDeletionHandler implements PlayerDeletionHandler, OnModuleInit {
  readonly order = 100;

  constructor(
    private readonly deletions: PlayerDeletionService,
    private readonly playerPosts: PlayerTradePostService,
  ) {}

  onModuleInit(): void {
    this.deletions.register(this);
  }

  async delete(tx: EntityManager, userId: number): Promise<void> {
    // Messages are stored in the deletion transaction; handlers have no commit
    // hook, so the live socket notice is skipped and the inbox shows them later.
    await this.playerPosts.abandonOwnedBy(tx, userId, { manager: tx, afterCommit: [] });
    await tx.delete(TradeOffer, { userId });
    await tx.delete(TradeTransfer, { userId });
    await tx.delete(TradeLicense, { userId });
    await tx.delete(TradeAccountStorage, { userId });
    await tx.delete(TradeShoutboxEntry, { userId });
    await tx.delete(LotteryTicket, { userId });
    // Outbid stakes were refunded in full, so no other bid holds a reserve:
    // an auction led by the deleted player continues without a bid.
    await tx.update(TradeDeal, { auctionUserId: userId }, { auctionUserId: null, auctionAmount: null });
    await tx.delete(TradeAuctionBid, { userId });
    await tx.update(TradeTransaction, { buyerId: userId }, { buyerId: null });
    await tx.update(TradeTransaction, { sellerId: userId }, { sellerId: null });
    await tx.update(BasicTradeRate, { userId }, { userId: null });
  }
}
