import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/** A player's last activity is refreshed at most this often. */
export const LAST_ACTIVITY_THROTTLE_MS = 5 * 60_000;

@Injectable()
export class LastActivityService {
  private readonly logger = new Logger(LastActivityService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Stamps `users.lastActiveAt`, at most once per throttle window per player.
   * The throttle lives in the conditional UPDATE so it holds across instances
   * and concurrent requests. Never throws: failures are logged only.
   */
  async record(userId: number): Promise<void> {
    const now = new Date();
    const threshold = new Date(now.getTime() - LAST_ACTIVITY_THROTTLE_MS);
    try {
      await this.dataSource.query(
        `UPDATE "users" SET "lastActiveAt" = $2
         WHERE "id" = $1
           AND ("lastActiveAt" IS NULL OR "lastActiveAt" <= $3)`,
        [userId, now, threshold],
      );
    } catch (error) {
      this.logger.warn(
        `Failed to record last activity for user ${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
