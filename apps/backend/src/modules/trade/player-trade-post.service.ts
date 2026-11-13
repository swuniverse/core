import { Injectable, Logger } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { TradeLicense } from './entities/trade-license.entity';
import { TradePost } from './entities/trade-post.entity';

/** STU `UserConstants::USER_FIRST_ID`: player ids, and so player trade networks, start here. */
export const FIRST_PLAYER_USER_ID = 100;
/** STU grants the owner a license up to the maximal timestamp. */
export const UNLIMITED_LICENSE_EXPIRY = new Date('9999-12-31T23:59:59.000Z');

/**
 * STU `StationUtility#createTradepostAndLicense` (tmw-T12a): a finished outpost
 * station becomes a trade post of its own network, numbered after the owner.
 */
@Injectable()
export class PlayerTradePostService {
  private readonly logger = new Logger(PlayerTradePostService.name);

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
}
