import { Inject, Injectable, Optional } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from '../auth/user.entity';
import {
  PLAYER_DELETION_HANDLERS,
  type PlayerDeletionHandler,
} from './player-deletion-handler';

@Injectable()
export class PlayerDeletionService {
  private readonly registered = new Set<PlayerDeletionHandler>();

  constructor(
    private readonly dataSource: DataSource,
    @Optional()
    @Inject(PLAYER_DELETION_HANDLERS)
    private readonly handlers: PlayerDeletionHandler[] = [],
  ) {}

  /**
   * Feature modules register their handler on init, so this module needs no
   * import of them (which would create cycles through the auth module).
   */
  register(handler: PlayerDeletionHandler): void {
    this.registered.add(handler);
  }

  async delete(userId: number): Promise<void> {
    const exists = await this.dataSource.getRepository(User).existsBy({ id: userId });
    if (!exists) return;
    for (const handler of this.sortedHandlers()) {
      await handler.prepare?.(userId);
    }
    await this.dataSource.transaction(async (tx) => {
      const users = tx.getRepository(User);
      const user = await users.findOne({
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) return;
      for (const handler of this.sortedHandlers()) {
        await handler.delete(tx, userId);
      }
      await users.delete(userId);
    });
  }

  private sortedHandlers(): PlayerDeletionHandler[] {
    return [...this.handlers, ...this.registered].sort((a, b) => a.order - b.order);
  }
}
