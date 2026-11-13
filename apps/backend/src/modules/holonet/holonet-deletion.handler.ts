import { Injectable, type OnModuleInit } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import type { PlayerDeletionHandler } from '../account-deletion/player-deletion-handler';
import { PlayerDeletionService } from '../account-deletion/player-deletion.service';
import { HolonetCheckpoint } from './entities/holonet-checkpoint.entity';
import { HolonetComment } from './entities/holonet-comment.entity';
import { HolonetPost } from './entities/holonet-post.entity';
import { HolonetRating } from './entities/holonet-rating.entity';

/**
 * STU `KnPostDeletionHandler` (sh-AP-05b): posts and comments stay, written
 * by "Gelöschter Siedler"; the player's own ratings and read marker go.
 */
@Injectable()
export class HolonetDeletionHandler implements PlayerDeletionHandler, OnModuleInit {
  readonly order = 30;

  constructor(private readonly deletions: PlayerDeletionService) {}

  onModuleInit(): void {
    this.deletions.register(this);
  }

  async delete(tx: EntityManager, userId: number): Promise<void> {
    await tx.update(HolonetPost, { authorId: userId }, { authorId: null });
    await tx.update(HolonetComment, { authorId: userId }, { authorId: null });
    await tx.delete(HolonetRating, { userId });
    await tx.delete(HolonetCheckpoint, { userId });
  }
}
