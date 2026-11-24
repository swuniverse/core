import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In, IsNull, LessThanOrEqual, type EntityManager } from 'typeorm';
import { GameDataService } from '../game-data/game-data.service';
import { MessageFolder } from '../messaging/message-folder';
import { MessagingService } from '../messaging/messaging.service';
import type { MaintenanceHandler } from '../tick/maintenance.service';
import { TradeLicenseCondition } from './entities/trade-license-condition.entity';
import { TradeLicense } from './entities/trade-license.entity';
import { TradePost } from './entities/trade-post.entity';

const DAY_MS = 24 * 60 * 60 * 1000;
/** STU `OldTradeLicenseDeletion::INFORM_ABOUT_ALMOST_EXPIRED_IN_DAYS`. */
export const TRADE_LICENSE_WARNING_DAYS = 7;

/**
 * Daily maintenance after STU `OldTradeLicenseDeletion`: deletes expired
 * licenses with a notice and warns once on entering the seven-day window.
 */
@Injectable()
export class TradeLicenseMaintenanceService implements MaintenanceHandler {
  readonly name = 'trade-licenses';

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly messaging: MessagingService,
    private readonly gameData: GameDataService,
  ) {}

  async run(now: Date): Promise<string> {
    const afterCommit: Array<() => void> = [];
    const summary = await this.dataSource.transaction(async (manager) => {
      const transaction = { manager, afterCommit };
      const expired = await manager.find(TradeLicense, {
        where: { expiresAt: LessThanOrEqual(now) },
        order: { id: 'ASC' },
        lock: { mode: 'pessimistic_write' },
      });
      const almostExpired = (await manager.find(TradeLicense, {
        where: {
          expiresAt: LessThanOrEqual(new Date(now.getTime() + TRADE_LICENSE_WARNING_DAYS * DAY_MS)),
          warningSentAt: IsNull(),
        },
        order: { id: 'ASC' },
        lock: { mode: 'pessimistic_write' },
      })).filter((license) => license.expiresAt > now);
      const tradePostIds = [...new Set([...expired, ...almostExpired].map((license) => license.tradePostId))];
      const postNames = new Map(
        (tradePostIds.length ? await manager.find(TradePost, { where: { id: In(tradePostIds) } }) : [])
          .map((post) => [post.id, post.name]),
      );
      const offers = await this.offers(manager, tradePostIds);

      for (const license of expired) {
        await this.messaging.sendSystem(
          license.userId,
          `Deine Lizenz am Handelsposten ${postNames.get(license.tradePostId) ?? license.tradePostId} ist abgelaufen.${offers.get(license.tradePostId) ?? ''}`,
          undefined,
          MessageFolder.SYSTEM,
          undefined,
          false,
          transaction,
        );
      }
      if (expired.length) await manager.delete(TradeLicense, { id: In(expired.map((license) => license.id)) });

      for (const license of almostExpired) {
        const days = Math.floor((license.expiresAt.getTime() - now.getTime()) / DAY_MS) + 1;
        await this.messaging.sendSystem(
          license.userId,
          `Deine Lizenz am Handelsposten ${postNames.get(license.tradePostId) ?? license.tradePostId} läuft in weniger als ${days} ${days === 1 ? 'Tag' : 'Tagen'} ab.${offers.get(license.tradePostId) ?? ''}`,
          undefined,
          MessageFolder.SYSTEM,
          undefined,
          false,
          transaction,
        );
        await manager.update(TradeLicense, license.id, { warningSentAt: now });
      }
      return `${almostExpired.length} gewarnt, ${expired.length} gelöscht`;
    });
    for (const notify of afterCommit) notify();
    return summary;
  }

  /** The current price per post, appended to both notices like STU. */
  private async offers(manager: EntityManager, tradePostIds: number[]): Promise<Map<number, string>> {
    if (!tradePostIds.length) return new Map();
    const conditions = await manager.find(TradeLicenseCondition, { where: { tradePostId: In(tradePostIds) } });
    return new Map(conditions.map((condition) => [
      condition.tradePostId,
      `\nEine neue Lizenz für ${condition.durationDays} Tage kostet aktuell ${condition.amount} ${this.gameData.getCommodity(condition.commodityId)?.name ?? `Ware ${condition.commodityId}`}.`,
    ]));
  }
}
