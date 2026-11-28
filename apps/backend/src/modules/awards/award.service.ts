import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Repository } from 'typeorm';
import { OrderBroadcastService } from '../order-broadcast/order-broadcast.service';
import { MessagingService } from '../messaging/messaging.service';
import { PrestigeService } from '../prestige/prestige.service';
import { Award } from './entities/award.entity';
import { UserAward } from './entities/user-award.entity';
import { AWARD_REVOKED_ORDER, awardOrderMessage } from './faction-awards';

@Injectable()
export class AwardService {
  constructor(
    @InjectRepository(UserAward)
    private readonly userAwardRepo: Repository<UserAward>,
    private readonly prestigeService: PrestigeService,
    private readonly messagingService: MessagingService,
    @Optional() private readonly orders?: OrderBroadcastService,
  ) {}

  /** A trailing `*` matches any award with that prefix (e.g. `NAVIGATOR_REBEL_L*`). */
  async hasAward(userId: number, awardKey: string): Promise<boolean> {
    if (awardKey.endsWith('*')) {
      return this.userAwardRepo.existsBy({
        userId,
        awardKey: Like(`${awardKey.slice(0, -1).replace(/[\\%_]/g, '\\$&')}%`),
      });
    }
    return this.userAwardRepo.existsBy({ userId, awardKey });
  }

  async grant(
    userId: number,
    awardKey: string,
    options: { incrementExisting?: boolean } = {},
  ): Promise<{ granted: boolean; count: number }> {
    const result = await this.userAwardRepo.manager.transaction(async (manager) => {
      const award = await manager
        .getRepository(Award)
        .findOneBy({ key: awardKey });
      if (!award) throw new NotFoundException(`Award ${awardKey} not found`);

      const repository = manager.getRepository(UserAward);
      const insert = await repository
        .createQueryBuilder()
        .insert()
        .into(UserAward)
        .values({ userId, awardKey, count: 1 })
        .orIgnore()
        .returning('id')
        .execute();
      const inserted = insert.raw
        ? insert.raw.length > 0
        : insert.identifiers.length > 0;

      let userAward = await repository.findOneBy({ userId, awardKey });
      if (!userAward) throw new Error('Award grant was not persisted');
      if (!inserted && !options.incrementExisting) {
        return { granted: false, count: userAward.count, firstGrant: false };
      }
      if (!inserted) {
        await repository.increment({ userId, awardKey }, 'count', 1);
        userAward = await repository.findOneBy({ userId, awardKey });
        if (!userAward) throw new Error('Award increment was not persisted');
      }

      await this.prestigeService.change(
        userId,
        award.prestige,
        `${award.prestige} Prestige erhalten für den Erhalt des Awards "${award.description}"`,
        manager,
      );
      if (inserted) {
        await this.messagingService.sendSystem(
          userId,
          `Du hast den Award ${award.description} erhalten`,
          `award:${award.key}:${userId}`,
        );
      }
      return { granted: true, count: userAward.count, firstGrant: inserted };
    });
    if (result.firstGrant) {
      await this.applyAwardEffects(userId, awardKey);
      await this.sendOrder(userId, awardKey);
    }
    return { granted: result.granted, count: result.count };
  }

  /** Holders of any of the keys (optionally limited to the given players). */
  async findHolders(keys: string[], userIds?: number[]): Promise<Array<{ userId: number; awardKey: string }>> {
    if (keys.length === 0 || userIds?.length === 0) return [];
    const where = userIds
      ? { awardKey: In(keys), userId: In(userIds) }
      : { awardKey: In(keys) };
    const rows = await this.userAwardRepo.find({ where, select: { userId: true, awardKey: true } });
    return rows.map(({ userId, awardKey }) => ({ userId, awardKey }));
  }

  /**
   * Withdraws an award together with its effects. Prestige is not taken back; a later
   * re-grant pays it out again. Returns false when the player did not own the award.
   */
  async revoke(userId: number, awardKey: string): Promise<boolean> {
    const deleted = await this.userAwardRepo.delete({ userId, awardKey });
    if (!deleted.affected) return false;
    await this.revertAwardEffects(userId, awardKey);
    if (this.orders) {
      try {
        await this.orders.send(AWARD_REVOKED_ORDER, userId);
      } catch {
        // The award is withdrawn either way.
      }
    }
    return true;
  }

  /** Inverse of the Astro-Droide bonus: ceil(base * 1.05) = max  =>  base = floor(max / 1.05). */
  private async revertAwardEffects(userId: number, awardKey: string): Promise<void> {
    if (!awardKey.startsWith('ASTRO_DROID_')) return;
    await this.userAwardRepo.manager.query(
      `UPDATE "spacecraft" SET "warpdriveMax" = FLOOR("warpdriveMax" / 1.05),
         "warpdrive" = LEAST("warpdrive", FLOOR("warpdriveMax" / 1.05))
       WHERE "userId" = $1 AND "warpdriveMax" > 0`,
      [userId],
    );
  }

  /** Order 66 of a faction award; sent after the grant so a failed order never rolls it back. */
  private async sendOrder(userId: number, awardKey: string): Promise<void> {
    const message = awardOrderMessage(awardKey);
    if (!message || !this.orders) return;
    try {
      await this.orders.send(message, userId);
    } catch {
      // The award is granted either way; the system message above still informs the player.
    }
  }

  /** Astro-Droide: Hyperantrieb +5 % (aufgerundet) on the player's existing ships. */
  private async applyAwardEffects(userId: number, awardKey: string): Promise<void> {
    if (!awardKey.startsWith('ASTRO_DROID_')) return;
    await this.userAwardRepo.manager.query(
      `UPDATE "spacecraft" SET "warpdriveMax" = CEIL("warpdriveMax" * 1.05) WHERE "userId" = $1 AND "warpdriveMax" > 0`,
      [userId],
    );
  }
}
