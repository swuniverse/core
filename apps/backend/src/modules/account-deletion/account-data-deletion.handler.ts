import { Injectable, type OnModuleInit } from '@nestjs/common';
import { In, IsNull, type EntityManager } from 'typeorm';
import { InviteKey, InviteKeyStatus } from '../auth/invite-key.entity';
import { News } from '../news/entities/news.entity';
import { PrestigeHistoryEntry } from '../prestige/entities/prestige-history-entry.entity';
import type { PlayerDeletionHandler } from './player-deletion-handler';
import { PlayerDeletionService } from './player-deletion.service';

/**
 * STU `UserDeletionHandler` for the account's own data (sh-AP-05b). Settings,
 * notes, invite quota and tokens follow the user row by cascade; this removes
 * what has no foreign key or would otherwise block. Used invite keys keep
 * existing without personal reference (`SET NULL`).
 */
@Injectable()
export class AccountDataDeletionHandler implements PlayerDeletionHandler, OnModuleInit {
  readonly order = 40;

  constructor(private readonly deletions: PlayerDeletionService) {}

  onModuleInit(): void {
    this.deletions.register(this);
  }

  async delete(tx: EntityManager, userId: number): Promise<void> {
    const unused = { usedByUserId: IsNull(), status: In([InviteKeyStatus.Available, InviteKeyStatus.Revoked]) };
    await tx.delete(InviteKey, { ...unused, createdByUserId: userId });
    await tx.delete(InviteKey, { ...unused, ownerUserId: userId });
    await tx.delete(PrestigeHistoryEntry, { userId });
    await tx.update(News, { authorId: userId }, { authorId: null });
  }
}
