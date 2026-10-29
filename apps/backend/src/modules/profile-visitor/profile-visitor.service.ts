import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { UserSetting } from '../settings/entities/user-setting.entity';
import type { MaintenanceHandler } from '../tick/maintenance.service';
import { ProfileVisit } from './entities/profile-visit.entity';

export const PROFILE_VISIT_OPTOUT_SETTING = 'profile_visit_optout';

@Injectable()
export class ProfileVisitorService implements MaintenanceHandler {
  readonly name = 'profile-visits';
  constructor(
    @InjectRepository(ProfileVisit)
    private readonly visitorRepo: Repository<ProfileVisit>,
    @InjectRepository(UserSetting)
    private readonly settingRepo: Repository<UserSetting>,
  ) {}

  async registerVisit(
    visitorId: number,
    profileUserId: number,
    visitedAt = new Date(),
  ): Promise<void> {
    if (visitorId === profileUserId) return;

    const optOut = await this.settingRepo.findOneBy({
      userId: visitorId,
      key: PROFILE_VISIT_OPTOUT_SETTING,
    });
    if (optOut?.value === '1') return;

    await this.visitorRepo.upsert(
      { visitorId, profileUserId, visitedAt },
      ['visitorId', 'profileUserId'],
    );
  }

  async getRecentVisitors(profileUserId: number) {
    const visits = await this.visitorRepo.find({
      where: { profileUserId },
      relations: { visitor: true },
      order: { visitedAt: 'DESC' },
      take: 10,
    });
    return visits.map((visit) => ({
      userId: visit.visitorId,
      username: visit.visitor.username,
      displayName: visit.visitor.displayName,
      visitedAt: visit.visitedAt.toISOString(),
    }));
  }

  async run(now: Date): Promise<string> {
    const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const result = await this.visitorRepo.delete({ visitedAt: LessThan(cutoff) });
    return `${result.affected ?? 0} profile visits deleted`;
  }
}
