import { Injectable, type OnModuleInit } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import type { PlayerDeletionHandler } from '../account-deletion/player-deletion-handler';
import { PlayerDeletionService } from '../account-deletion/player-deletion.service';
import { BasicTradeRate } from './entities/basic-trade-rate.entity';
import { TradeAccountStorage } from './entities/trade-account-storage.entity';
import { TradeLicense } from './entities/trade-license.entity';
import { TradeOffer } from './entities/trade-offer.entity';
import { TradeShoutboxEntry } from './entities/trade-shoutbox-entry.entity';
import { TradeTransaction } from './entities/trade-transaction.entity';
import { TradeTransfer } from './entities/trade-transfer.entity';

/**
 * Removes a deleted player's trade data inside the deletion transaction
 * (tmw-T11b). Offers go first, so their reserves never return to an account.
 * Transactions and basic trade rates stay, anonymized, so rankings and rate
 * charts keep their history.
 *
 * Extend this handler when the matching system exists: auction bids with
 * promotion of the next valid bid (tmw-T8b) and lottery tickets (tmw-T9). Own player trade posts follow the post
 * abandonment of tmw-T12c; until then `trade_posts.ownerId` restricts.
 */
@Injectable()
export class TradeDeletionHandler implements PlayerDeletionHandler, OnModuleInit {
  readonly order = 100;

  constructor(private readonly deletions: PlayerDeletionService) {}

  onModuleInit(): void {
    this.deletions.register(this);
  }

  async delete(tx: EntityManager, userId: number): Promise<void> {
    await tx.delete(TradeOffer, { userId });
    await tx.delete(TradeTransfer, { userId });
    await tx.delete(TradeLicense, { userId });
    await tx.delete(TradeAccountStorage, { userId });
    await tx.delete(TradeShoutboxEntry, { userId });
    await tx.update(TradeTransaction, { buyerId: userId }, { buyerId: null });
    await tx.update(TradeTransaction, { sellerId: userId }, { sellerId: null });
    await tx.update(BasicTradeRate, { userId }, { userId: null });
  }
}
