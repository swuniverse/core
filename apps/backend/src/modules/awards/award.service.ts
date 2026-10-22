import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessagingService } from '../messaging/messaging.service';
import { PrestigeService } from '../prestige/prestige.service';
import { Award } from './entities/award.entity';
import { UserAward } from './entities/user-award.entity';

@Injectable()
export class AwardService {
  constructor(
    @InjectRepository(UserAward)
    private readonly userAwardRepo: Repository<UserAward>,
    private readonly prestigeService: PrestigeService,
    private readonly messagingService: MessagingService,
  ) {}

  async grant(
    userId: number,
    awardKey: string,
    options: { incrementExisting?: boolean } = {},
  ): Promise<{ granted: boolean; count: number }> {
    return this.userAwardRepo.manager.transaction(async (manager) => {
      const award = await manager.getRepository(Award).findOneBy({ key: awardKey });
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
      const inserted = insert.identifiers.length > 0;

      let userAward = await repository.findOneBy({ userId, awardKey });
      if (!userAward) throw new Error('Award grant was not persisted');
      if (!inserted && !options.incrementExisting) {
        return { granted: false, count: userAward.count };
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
          'Award erhalten',
          `Du hast den Award ${award.description} erhalten`,
          `award:${award.key}:${userId}`,
        );
      }
      return { granted: true, count: userAward.count };
    });
  }
}
