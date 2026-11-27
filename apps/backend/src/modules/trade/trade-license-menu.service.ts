import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In, MoreThanOrEqual } from 'typeorm';
import type {
  SpacecraftRuntimeSystemsDto,
  TradeLicenseMenuDto,
  TradePostAtSpacecraftDto,
} from '@swuniverse/shared';
import { GameDataService } from '../game-data/game-data.service';
import { CargoItem } from '../spacecraft/entities/cargo-item.entity';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import { TradeAccountStorage } from './entities/trade-account-storage.entity';
import { TradeLicenseCondition } from './entities/trade-license-condition.entity';
import { TradeLicense } from './entities/trade-license.entity';
import { TradePost } from './entities/trade-post.entity';
import { TradePostPresencePolicy } from './trade-post-presence.policy';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Read model for the license dialogs: only options the purchase and renewal
 * endpoints would accept right now. Those endpoints stay authoritative.
 */
@Injectable()
export class TradeLicenseMenuService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly presence: TradePostPresencePolicy,
    private readonly gameData: GameDataService,
  ) {}

  async getMenu(tradePostId: number, userId: number, shipId: number | null, now = new Date()): Promise<TradeLicenseMenuDto> {
    const manager = this.dataSource.manager;
    const post = await manager.findOneBy(TradePost, { id: tradePostId });
    if (!post) throw new NotFoundException('Handelsposten nicht gefunden');
    const [condition, license] = await Promise.all([
      manager.findOneBy(TradeLicenseCondition, { tradePostId }),
      manager.findOneBy(TradeLicense, { tradePostId, userId }),
    ]);
    const valid = license && license.expiresAt > now ? license : null;

    const accounts = condition
      ? await this.payingAccounts(post, userId, condition)
      : [];
    const ship = shipId == null ? null : await manager.findOneBy(Spacecraft, { id: shipId, userId });
    const shipReason = shipId == null
      ? 'Lizenzen werden über das Handelsmenü eines eigenen Schiffs am Posten gekauft'
      : !ship
        ? 'Schiff nicht gefunden'
        : this.presence.reason(this.presenceShip(ship), post, userId);
    const payShips =
      condition && ship && !shipReason ? await this.payingShips(post, userId, condition) : [];
    const rejection = !condition
      ? 'Dieser Handelsposten vergibt keine Lizenzen'
      : valid
        ? 'Du besitzt bereits eine gültige Lizenz für diesen Handelsposten'
        : shipReason ??
          (payShips.length || accounts.length ? null : 'Keine Zahlquelle mit ausreichendem Bestand');

    return {
      tradePostId: post.id,
      tradePostName: post.name,
      networkId: post.networkId,
      isOwner: post.ownerId === userId,
      condition: condition
        ? {
            commodityId: condition.commodityId,
            commodityName: this.commodityName(condition.commodityId),
            amount: condition.amount,
            durationDays: condition.durationDays,
          }
        : null,
      license: valid
        ? { id: valid.id, startsAt: valid.startsAt.toISOString(), expiresAt: valid.expiresAt.toISOString() }
        : null,
      renewalExpiresAt:
        license && condition
          ? new Date(Math.max(now.getTime(), license.expiresAt.getTime()) + condition.durationDays * DAY_MS).toISOString()
          : null,
      purchase: { shipId: ship?.id ?? null, rejection, payShips: rejection ? [] : payShips },
      accounts,
      tradeableCommodities:
        post.ownerId === userId
          ? this.gameData
              .getAllCommodities()
              .filter((commodity) => commodity.isTradeable)
              .map((commodity) => ({ id: commodity.id, name: commodity.name }))
              .sort((left, right) => left.name.localeCompare(right.name, 'de'))
          : [],
    };
  }

  async getPostAtSpacecraft(shipId: number, userId: number): Promise<TradePostAtSpacecraftDto | null> {
    const ship = await this.dataSource.manager.findOneBy(Spacecraft, { id: shipId, userId });
    if (!ship) throw new NotFoundException('Schiff nicht gefunden');
    const post = await this.dataSource.manager.findOneBy(TradePost, { locationId: ship.locationId });
    if (!post) return null;
    return {
      tradePostId: post.id,
      tradePostName: post.name,
      reason: this.presence.reason(this.presenceShip(ship), post, userId),
    };
  }

  private async payingShips(post: TradePost, userId: number, condition: TradeLicenseCondition) {
    const ships = await this.dataSource.manager.find(Spacecraft, {
      where: { userId, locationId: post.locationId },
      order: { name: 'ASC', id: 'ASC' },
    });
    const present = ships.filter((ship) => this.presence.isAt(this.presenceShip(ship), post, userId));
    if (!present.length) return [];
    const cargo = await this.dataSource.manager.find(CargoItem, {
      where: {
        spacecraftId: In(present.map((ship) => ship.id)),
        commodityId: condition.commodityId,
        amount: MoreThanOrEqual(condition.amount),
      },
    });
    const amountByShip = new Map(cargo.map((item) => [item.spacecraftId, item.amount]));
    return present
      .filter((ship) => amountByShip.has(ship.id))
      .map((ship) => ({ id: ship.id, name: ship.name, amount: amountByShip.get(ship.id) as number }));
  }

  private async payingAccounts(post: TradePost, userId: number, condition: TradeLicenseCondition) {
    const networkPosts = await this.dataSource.manager.find(TradePost, {
      where: { networkId: post.networkId },
      order: { name: 'ASC', id: 'ASC' },
    });
    const storages = await this.dataSource.manager.find(TradeAccountStorage, {
      where: {
        tradePostId: In(networkPosts.map((entry) => entry.id)),
        userId,
        commodityId: condition.commodityId,
        amount: MoreThanOrEqual(condition.amount),
      },
    });
    const amountByPost = new Map(storages.map((storage) => [storage.tradePostId, storage.amount]));
    return networkPosts
      .filter((entry) => amountByPost.has(entry.id))
      .map((entry) => ({ tradePostId: entry.id, tradePostName: entry.name, amount: amountByPost.get(entry.id) as number }));
  }

  private presenceShip(ship: Spacecraft) {
    return { ...ship, runtimeSystems: ship.runtimeSystems as SpacecraftRuntimeSystemsDto };
  }

  private commodityName(id: number): string {
    return this.gameData.getCommodity(id)?.name ?? `Ware #${id}`;
  }
}
