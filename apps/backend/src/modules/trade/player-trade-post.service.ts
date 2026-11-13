import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Not, type EntityManager } from 'typeorm';
import { MessageFolder } from '../messaging/message-folder';
import { MessagingService, type TransactionalNotifications } from '../messaging/messaging.service';
import { resolveSpaceLocation } from '../spacecraft/spacecraft-field';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { TradeAccountStorage } from './entities/trade-account-storage.entity';
import { TradeLicenseCondition } from './entities/trade-license-condition.entity';
import { TradeLicense } from './entities/trade-license.entity';
import { TradeOffer } from './entities/trade-offer.entity';
import { TradePost } from './entities/trade-post.entity';

/** STU `UserConstants::USER_FIRST_ID`: player ids, and so player trade networks, start here. */
export const FIRST_PLAYER_USER_ID = 100;
/** STU grants the owner a license up to the maximal timestamp. */
export const UNLIMITED_LICENSE_EXPIRY = new Date('9999-12-31T23:59:59.000Z');
/** STU `TradepostDeletionHandler::ORPHANED_TRADEPOST_NAME`. */
export const ABANDONED_TRADE_POST_NAME = 'Verlassener Handelsposten';
export const ABANDONED_TRADE_POST_MESSAGE = 'Dieser Handelsposten wurde verlassen. Handel ist nicht mehr möglich.';

/** Inclusive random integer like PHP `random_int`. */
export type RandomInt = (min: number, max: number) => number;
const randomInt: RandomInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

/** An abandoned post has no owner any more (tmw-T12c); trading there is over. */
export function isAbandoned(post: Pick<TradePost, 'ownerId'>): boolean {
  return post.ownerId == null;
}

export function assertNotAbandoned<T extends Pick<TradePost, 'ownerId'>>(
  post: T,
): asserts post is T & { ownerId: number } {
  if (isAbandoned(post)) throw new BadRequestException(ABANDONED_TRADE_POST_MESSAGE);
}

/**
 * Player trade posts bound to a station: creation when an outpost is finished
 * (tmw-T12a, STU `StationUtility#createTradepostAndLicense`), and their end
 * by destruction or abandonment (tmw-T12c).
 */
@Injectable()
export class PlayerTradePostService {
  private readonly logger = new Logger(PlayerTradePostService.name);

  constructor(private readonly messaging: MessagingService) {}

  /** Runs inside the station completion transaction; repeat calls keep the existing post. */
  async createForStation(
    manager: EntityManager,
    station: { id: number; userId: number; locationId: number },
    now = new Date(),
  ): Promise<TradePost | null> {
    const existing = await manager.findOneBy(TradePost, { stationId: station.id });
    if (existing) return existing;
    if (await this.locationTaken(manager, station.locationId)) {
      this.logger.warn(`Station ${station.id} shares its field with a trade post; no post created`);
      return null;
    }
    const post = await manager.save(
      TradePost,
      manager.create(TradePost, {
        name: 'Handelsposten',
        description: '',
        networkId: station.userId,
        level: 1,
        transferCapacity: 0,
        storageLimit: 10_000,
        ownerId: station.userId,
        locationId: station.locationId,
        stationId: station.id,
      }),
    );
    await manager.save(
      TradeLicense,
      manager.create(TradeLicense, {
        tradePostId: post.id,
        userId: station.userId,
        startsAt: now,
        expiresAt: UNLIMITED_LICENSE_EXPIRY,
        warningSentAt: null,
      }),
    );
    return post;
  }

  /** One trade post per field (`trade_posts.locationId` is unique). */
  locationTaken(manager: EntityManager, locationId: number): Promise<boolean> {
    return manager.existsBy(TradePost, { locationId });
  }

  /**
   * STU `TradepostDestruction` inside the station's destruction transaction:
   * every account line and offer reserve is lost with a 50 % chance, otherwise
   * 0–50 % of it (rounded up) becomes salvage for the wreck. The post goes
   * with its accounts, offers and licenses; every account holder is told.
   */
  async destroyForStation(
    manager: EntityManager,
    station: { id: number },
    transaction: TransactionalNotifications,
    random: RandomInt = randomInt,
  ): Promise<Array<{ commodityId: number; amount: number }>> {
    const post = await manager.findOne(TradePost, { where: { stationId: station.id }, lock: { mode: 'pessimistic_write' } });
    if (!post) return [];
    const [accounts, offers] = await Promise.all([
      manager.find(TradeAccountStorage, { where: { tradePostId: post.id }, order: { id: 'ASC' } }),
      manager.find(TradeOffer, { where: { tradePostId: post.id }, order: { id: 'ASC' } }),
    ]);
    const lines = [
      ...accounts.map((account) => ({ commodityId: account.commodityId, amount: account.amount })),
      ...offers.map((offer) => ({ commodityId: offer.offeredCommodityId, amount: offer.reservedAmount })),
    ];
    const salvage = new Map<number, number>();
    for (const line of lines) {
      if (random(0, 1) === 0) continue;
      const amount = Math.ceil((line.amount / 100) * random(0, 50));
      if (amount > 0) salvage.set(line.commodityId, (salvage.get(line.commodityId) ?? 0) + amount);
    }

    const holders = [...new Set([...accounts, ...offers].map((entry) => entry.userId))].sort((left, right) => left - right);
    const coordinates = await this.coordinates(manager, post.locationId);
    await manager.delete(TradePost, { id: post.id });
    for (const userId of holders) {
      await this.messaging.sendSystem(
        userId,
        'Handelsposten zerstört',
        `Der Handelsposten "${post.name}" bei ${coordinates} wurde zerstört. Deine Waren und Angebote dort sind verloren.`,
        undefined,
        MessageFolder.TRADE,
        undefined,
        false,
        transaction,
      );
    }
    return [...salvage].map(([commodityId, amount]) => ({ commodityId, amount }));
  }

  /**
   * STU `TradepostDeletionHandler` inside the deletion transaction: the
   * deleted player's posts lose their owner, name and station, which goes
   * with the account. Other players keep accounts, offers and licenses so
   * they can withdraw; trading there is blocked ({@link assertNotAbandoned}).
   */
  async abandonOwnedBy(manager: EntityManager, userId: number, transaction: TransactionalNotifications): Promise<void> {
    const posts = await manager.find(TradePost, {
      where: { ownerId: userId },
      order: { id: 'ASC' },
      lock: { mode: 'pessimistic_write' },
    });
    for (const post of posts) {
      const [accounts, offers] = await Promise.all([
        manager.find(TradeAccountStorage, { select: { userId: true }, where: { tradePostId: post.id, userId: Not(userId) } }),
        manager.find(TradeOffer, { select: { userId: true }, where: { tradePostId: post.id, userId: Not(userId) } }),
      ]);
      const coordinates = await this.coordinates(manager, post.locationId);
      await manager.update(TradePost, post.id, {
        ownerId: null,
        stationId: null,
        name: ABANDONED_TRADE_POST_NAME,
        description: ABANDONED_TRADE_POST_NAME,
      });
      await manager.delete(TradeLicenseCondition, { tradePostId: post.id });
      const holders = [...new Set([...accounts, ...offers].map((entry) => entry.userId))].sort((left, right) => left - right);
      for (const holderId of holders) {
        await this.messaging.sendSystem(
          holderId,
          'Handelsposten verlassen',
          `Der Handelsposten "${post.name}" bei den Koordinaten ${coordinates} wurde verlassen. Du solltest deine Waren hier schleunigst abholen, sonst gehen sie verloren.`,
          undefined,
          MessageFolder.TRADE,
          undefined,
          false,
          transaction,
        );
      }
    }
  }

  private async coordinates(manager: EntityManager, locationId: number): Promise<string> {
    const location = resolveSpaceLocation(
      await manager.findOne(SpaceLocation, { where: { id: locationId }, relations: ['galaxyField', 'systemField'] }),
    );
    return location ? `${location.x}|${location.y}` : '?|?';
  }
}
