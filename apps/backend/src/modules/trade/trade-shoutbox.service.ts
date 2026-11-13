import { BadRequestException, ForbiddenException, Inject, Injectable, Optional } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, MoreThan, type EntityManager } from 'typeorm';
import type { TradeShoutboxDto } from '@swuniverse/shared';
import { User } from '../auth/user.entity';
import { TradeLicense } from './entities/trade-license.entity';
import { TradePost } from './entities/trade-post.entity';
import { TradeShoutboxEntry } from './entities/trade-shoutbox-entry.entity';
import { tradeNetworkName } from './trade-network';

/** STU `TradeShoutboxRepository::deleteHistory` keeps 30 entries per network. */
export const TRADE_SHOUTBOX_LIMIT = 30;
const MESSAGE_LENGTH = 200;
const RATE_WINDOW_MS = 60_000;
const RATE_MAXIMUM = 5;
export const TRADE_SHOUTBOX_CLOCK = Symbol('TRADE_SHOUTBOX_CLOCK');

/**
 * STU `AddShoutBoxEntry` and `ShowShoutBoxList`: players licensed at any post
 * of a network read and write its shoutbox. Writes per network are serialized,
 * so trimming and the rate limit stay exact under concurrent posts.
 */
@Injectable()
export class TradeShoutboxService {
  private readonly clock: () => Date;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Optional() @Inject(TRADE_SHOUTBOX_CLOCK) clock?: () => Date,
  ) {
    this.clock = clock ?? (() => new Date());
  }

  async list(networkId: number, userId: number): Promise<TradeShoutboxDto> {
    const manager = this.dataSource.manager;
    await this.assertLicensed(manager, networkId, userId);
    const entries = await manager.find(TradeShoutboxEntry, {
      where: { networkId },
      order: { id: 'DESC' },
      take: TRADE_SHOUTBOX_LIMIT,
    });
    const users = new Map(
      (entries.length ? await manager.find(User, { select: { id: true, username: true }, where: entries.map((entry) => ({ id: entry.userId })) }) : [])
        .map((user) => [user.id, user.username]),
    );
    return {
      networkId,
      networkName: tradeNetworkName(networkId),
      entries: entries.map((entry) => ({
        id: entry.id,
        userId: entry.userId,
        username: users.get(entry.userId) ?? `Spieler #${entry.userId}`,
        message: entry.message,
        createdAt: entry.createdAt.toISOString(),
      })),
    };
  }

  async post(networkId: number, userId: number, message: string): Promise<TradeShoutboxDto> {
    const text = cleanMessage(message);
    await this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`trade-shoutbox:${networkId}`]);
      const now = this.clock();
      await this.assertLicensed(manager, networkId, userId, now);
      if (!text) throw new BadRequestException('Die Nachricht ist leer');
      const recent = await manager.countBy(TradeShoutboxEntry, {
        networkId,
        userId,
        createdAt: MoreThan(new Date(now.getTime() - RATE_WINDOW_MS)),
      });
      if (recent >= RATE_MAXIMUM) throw new BadRequestException('Du schreibst zu schnell. Bitte warte einen Moment');
      await manager.save(TradeShoutboxEntry, manager.create(TradeShoutboxEntry, { networkId, userId, message: text, createdAt: now }));
      await manager.query(
        `DELETE FROM "trade_shoutbox_entries" WHERE "networkId" = $1 AND "id" NOT IN (
          SELECT "id" FROM "trade_shoutbox_entries" WHERE "networkId" = $1 ORDER BY "id" DESC LIMIT $2
        )`,
        [networkId, TRADE_SHOUTBOX_LIMIT],
      );
    });
    return this.list(networkId, userId);
  }

  /** STU `hasLicenseByUserAndNetwork`. */
  private async assertLicensed(manager: EntityManager, networkId: number, userId: number, now = this.clock()): Promise<void> {
    const licensed = await manager
      .getRepository(TradeLicense)
      .createQueryBuilder('license')
      .innerJoin(TradePost, 'post', 'post.id = license.tradePostId')
      .where('license.userId = :userId', { userId })
      .andWhere('post.networkId = :networkId', { networkId })
      .andWhere('license.expiresAt > :now', { now })
      .getExists();
    if (!licensed) throw new ForbiddenException('Du benötigst eine gültige Lizenz in diesem Handelsnetz');
  }
}

/** STU `substr(strip_tags($msg), 0, 200)`, counted in characters instead of bytes. */
function cleanMessage(message: unknown): string {
  if (typeof message !== 'string') return '';
  const text = message
    .replace(/<[^>]*>?/g, '')
    .split('')
    .map((char) => (char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127 ? ' ' : char))
    .join('')
    .trim();
  return [...text].slice(0, MESSAGE_LENGTH).join('').trim();
}
