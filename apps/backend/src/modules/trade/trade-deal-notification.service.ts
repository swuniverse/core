import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In, IsNull, LessThanOrEqual, MoreThan } from 'typeorm';
import { User } from '../auth/user.entity';
import { MessageFolder } from '../messaging/message-folder';
import { MessagingService } from '../messaging/messaging.service';
import { TradeDeal } from './entities/trade-deal.entity';
import { TradeLicense } from './entities/trade-license.entity';
import { huttPost } from './trade-deal.service';

/**
 * STU `NewDealsInformation`: licensed players hear once about newly started
 * deals. Each deal is marked in the same transaction that sends the messages;
 * concurrent runs skip deals another run has locked.
 */
@Injectable()
export class TradeDealNotificationService {
  private readonly logger = new Logger(TradeDealNotificationService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly messaging: MessagingService,
  ) {}

  /** STU runs this with every process tick; one minute matches its 60-second window. */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron(): Promise<void> {
    try {
      const { deals, recipients } = await this.notifyStarted();
      if (deals) this.logger.log(`Announced ${deals} trade deal(s) to ${recipients} player(s)`);
    } catch (error) {
      this.logger.error(`Trade deal announcement failed: ${String(error)}`);
    }
  }

  async notifyStarted(now = new Date()): Promise<{ deals: number; recipients: number }> {
    const afterCommit: Array<() => void> = [];
    const result = await this.dataSource.transaction(async (manager) => {
      const deals = await manager.find(TradeDeal, {
        where: { notifiedAt: IsNull(), startsAt: LessThanOrEqual(now), endsAt: MoreThan(now) },
        order: { id: 'ASC' },
        lock: { mode: 'pessimistic_write', onLocked: 'skip_locked' },
      });
      if (!deals.length) return { deals: 0, recipients: 0 };
      const post = await huttPost(manager);
      const licenses = post
        ? await manager.find(TradeLicense, { where: { tradePostId: post.id, expiresAt: MoreThan(now) } })
        : [];
      const users = licenses.length
        ? await manager.find(User, { where: { id: In(licenses.map((license) => license.userId)), isNpc: false } })
        : [];
      const everyone = deals.some((deal) => deal.factionId === null);
      const factions = new Set(deals.map((deal) => deal.factionId));
      const recipients = users.filter((user) => everyone || factions.has(user.factionId));
      for (const user of recipients) {
        await this.messaging.sendSystem(
          user.id,
          'Das Hutten-Kartell bietet neue Deals an. Du findest sie im Handel unter „Hutten-Deals“.',
          undefined,
          MessageFolder.TRADE,
          undefined,
          false,
          { manager, afterCommit },
        );
      }
      await manager.update(TradeDeal, { id: In(deals.map((deal) => deal.id)) }, { notifiedAt: now });
      return { deals: deals.length, recipients: recipients.length };
    });
    for (const notify of afterCommit) notify();
    return result;
  }
}
