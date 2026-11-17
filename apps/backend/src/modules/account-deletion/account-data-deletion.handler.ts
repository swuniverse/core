import { Injectable, type OnModuleInit } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { News } from '../news/entities/news.entity';
import { OrderBroadcastAck } from '../order-broadcast/entities/order-broadcast-ack.entity';
import { PrestigeHistoryEntry } from '../prestige/entities/prestige-history-entry.entity';
import type { PlayerDeletionHandler } from './player-deletion-handler';
import { PlayerDeletionService } from './player-deletion.service';

/**
 * STU `UserDeletionHandler` for the account's own data (sh-AP-05b). Settings,
 * notes and tokens follow the user row by cascade; this removes what has no
 * foreign key or would otherwise block.
 */
@Injectable()
export class AccountDataDeletionHandler implements PlayerDeletionHandler, OnModuleInit {
  readonly order = 40;

  constructor(private readonly deletions: PlayerDeletionService) {}

  onModuleInit(): void {
    this.deletions.register(this);
  }

  async delete(tx: EntityManager, userId: number): Promise<void> {
    await tx.delete(PrestigeHistoryEntry, { userId });
    await tx.delete(OrderBroadcastAck, { userId });
    await tx.update(News, { authorId: userId }, { authorId: null });
  }
}
