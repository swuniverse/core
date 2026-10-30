import { Inject, Injectable, Optional } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from '../auth/user.entity';
import {
  PLAYER_DELETION_HANDLERS,
  type PlayerDeletionHandler,
} from './player-deletion-handler';

@Injectable()
export class PlayerDeletionService {
  constructor(
    private readonly dataSource: DataSource,
    @Optional()
    @Inject(PLAYER_DELETION_HANDLERS)
    private readonly handlers: PlayerDeletionHandler[] = [],
  ) {}

  async delete(userId: number): Promise<void> {
    await this.dataSource.transaction(async (tx) => {
      const users = tx.getRepository(User);
      const user = await users.findOne({
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) return;
      for (const handler of [...this.handlers].sort((a, b) => a.order - b.order)) {
        await handler.delete(tx, userId);
      }
      await users.delete(userId);
    });
  }
}
