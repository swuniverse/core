import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In, type EntityManager } from 'typeorm';
import type { SpacecraftRuntimeSystemsDto } from '@swuniverse/shared';
import { User } from '../auth/user.entity';
import { MessageFolder } from '../messaging/message-folder';
import { MessagingService } from '../messaging/messaging.service';
import { CargoItem } from '../spacecraft/entities/cargo-item.entity';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import { TradeAccountStorage } from './entities/trade-account-storage.entity';
import { TradeLicenseCondition } from './entities/trade-license-condition.entity';
import { TradeLicense } from './entities/trade-license.entity';
import { TradePost } from './entities/trade-post.entity';
import { TradePostPresencePolicy } from './trade-post-presence.policy';

export type TradeLicensePurchaseInput =
  | { method: 'ship'; shipId: number; payShipId: number }
  | { method: 'account'; shipId: number; accountPostId: number };

export interface TradeLicensePurchaseResult {
  license: Pick<TradeLicense, 'id' | 'tradePostId' | 'startsAt' | 'expiresAt'>;
  message: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * STU `BuyTradeLicense`, made atomic: payment, owner credit and license are
 * written in one transaction, and both payment sources are authorized.
 */
@Injectable()
export class TradeLicensePurchaseService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly presence: TradePostPresencePolicy,
    private readonly messaging: MessagingService,
  ) {}

  async purchase(
    tradePostId: number,
    userId: number,
    input: TradeLicensePurchaseInput,
  ): Promise<TradeLicensePurchaseResult> {
    this.validate(input);
    const afterCommit: Array<() => void> = [];
    const license = await this.dataSource.transaction(async (manager) => {
      const post = await manager.findOne(TradePost, {
        where: { id: tradePostId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!post) throw new NotFoundException('Handelsposten nicht gefunden');
      const condition = await manager.findOneBy(TradeLicenseCondition, { tradePostId });
      if (!condition) {
        throw new BadRequestException('Dieser Handelsposten vergibt keine Lizenzen');
      }
      const now = new Date();
      const existing = await manager.findOne(TradeLicense, {
        where: { tradePostId, userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (existing && existing.expiresAt > now) {
        throw new BadRequestException('Du besitzt bereits eine gültige Lizenz für diesen Handelsposten');
      }

      const ships = await this.lockShips(manager, input);
      const ship = ships.get(input.shipId);
      if (!ship || !this.isAt(ship, post, userId)) {
        throw new BadRequestException('Das Schiff befindet sich nicht am Handelsposten');
      }
      if (input.method === 'ship') {
        await this.payFromShip(manager, ships.get(input.payShipId), post, userId, condition);
      } else {
        await this.payFromAccount(manager, input.accountPostId, post, userId, condition);
      }
      await this.creditOwner(manager, post, condition);

      const startsAt = now;
      const expiresAt = new Date(now.getTime() + condition.durationDays * DAY_MS);
      const saved = await manager.save(
        TradeLicense,
        existing
          ? Object.assign(existing, { startsAt, expiresAt, warningSentAt: null })
          : manager.create(TradeLicense, { tradePostId, userId, startsAt, expiresAt, warningSentAt: null }),
      );
      const buyer = await manager.findOneBy(User, { id: userId });
      await this.messaging.sendSystem(
        post.ownerId,
        'Handelslizenz verkauft',
        `${buyer?.username ?? 'Ein Siedler'} hat am ${post.name} eine Handelslizenz gekauft.`,
        undefined,
        MessageFolder.TRADE,
        undefined,
        false,
        { manager, afterCommit },
      );
      return saved;
    });
    for (const notify of afterCommit) notify();
    return {
      license: {
        id: license.id,
        tradePostId: license.tradePostId,
        startsAt: license.startsAt,
        expiresAt: license.expiresAt,
      },
      message: 'Handelslizenz wurde erteilt',
    };
  }

  private async payFromShip(
    manager: EntityManager,
    payShip: Spacecraft | undefined,
    post: TradePost,
    userId: number,
    condition: TradeLicenseCondition,
  ): Promise<void> {
    if (!payShip || payShip.userId !== userId) {
      throw new BadRequestException('Das Zahlschiff gehört nicht dir');
    }
    if (!this.isAt(payShip, post, userId)) {
      throw new BadRequestException('Das Zahlschiff befindet sich nicht am Handelsposten');
    }
    const cargo = await manager.findOne(CargoItem, {
      where: { spacecraftId: payShip.id, commodityId: condition.commodityId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!cargo || cargo.amount < condition.amount) {
      throw new BadRequestException('Nicht genügend Waren im Frachtraum');
    }
    cargo.amount -= condition.amount;
    if (cargo.amount === 0) await manager.remove(cargo);
    else await manager.save(cargo);
  }

  private async payFromAccount(
    manager: EntityManager,
    accountPostId: number,
    post: TradePost,
    userId: number,
    condition: TradeLicenseCondition,
  ): Promise<void> {
    const accountPost = await manager.findOneBy(TradePost, { id: accountPostId });
    if (!accountPost) throw new BadRequestException('Warenkonto nicht gefunden');
    if (accountPost.networkId !== post.networkId) {
      throw new BadRequestException('Das Warenkonto liegt in einem anderen Handelsnetz');
    }
    const storage = await manager.findOne(TradeAccountStorage, {
      where: { tradePostId: accountPostId, userId, commodityId: condition.commodityId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!storage || storage.amount < condition.amount) {
      throw new BadRequestException('Nicht genügend Waren auf dem Handelskonto');
    }
    storage.amount -= condition.amount;
    if (storage.amount === 0) await manager.remove(storage);
    else await manager.save(storage);
  }

  /** STU `upperStorage` on the owner's account at the licensed post, without a capacity check. */
  private async creditOwner(manager: EntityManager, post: TradePost, condition: TradeLicenseCondition): Promise<void> {
    const storage =
      (await manager.findOne(TradeAccountStorage, {
        where: { tradePostId: post.id, userId: post.ownerId, commodityId: condition.commodityId },
        lock: { mode: 'pessimistic_write' },
      })) ??
      manager.create(TradeAccountStorage, {
        tradePostId: post.id,
        userId: post.ownerId,
        commodityId: condition.commodityId,
        amount: 0,
      });
    storage.amount += condition.amount;
    await manager.save(storage);
  }

  /** Locks the initiating and the paying ship in id order. */
  private async lockShips(manager: EntityManager, input: TradeLicensePurchaseInput): Promise<Map<number, Spacecraft>> {
    const ids = [...new Set([input.shipId, ...(input.method === 'ship' ? [input.payShipId] : [])])].sort((a, b) => a - b);
    const ships = await manager.find(Spacecraft, {
      where: { id: In(ids) },
      order: { id: 'ASC' },
      lock: { mode: 'pessimistic_write' },
    });
    return new Map(ships.map((ship) => [ship.id, ship]));
  }

  private isAt(ship: Spacecraft, post: TradePost, userId: number): boolean {
    return this.presence.isAt(
      { ...ship, runtimeSystems: ship.runtimeSystems as SpacecraftRuntimeSystemsDto },
      post,
      userId,
    );
  }

  private validate(input: TradeLicensePurchaseInput): void {
    const id = (value: unknown) => Number.isSafeInteger(value) && (value as number) > 0;
    if (input?.method !== 'ship' && input?.method !== 'account') {
      throw new BadRequestException('Unbekannte Zahlart');
    }
    if (!id(input.shipId)) throw new BadRequestException('Schiff muss eine gültige ID haben');
    if (input.method === 'ship' && !id(input.payShipId)) {
      throw new BadRequestException('Zahlschiff muss eine gültige ID haben');
    }
    if (input.method === 'account' && !id(input.accountPostId)) {
      throw new BadRequestException('Warenkonto muss eine gültige ID haben');
    }
  }
}
