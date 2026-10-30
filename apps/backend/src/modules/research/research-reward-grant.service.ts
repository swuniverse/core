import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { GameDataService } from '../game-data/game-data.service';
import {
  ResearchRewardGrant,
  ResearchRewardGrantStatus,
} from './entities/research-reward-grant.entity';

export type ReserveGrantResult =
  | { outcome: 'no-mapping' }
  | { outcome: 'already-granted' }
  | { outcome: 'reserved' | 'resumed'; grant: ResearchRewardGrant };

/**
 * Transactional store for research ship reward grants. All operations take the
 * caller's EntityManager so reserve, ship spawn and complete share one
 * transaction; the unique (userId, techId) key serializes concurrent callers.
 */
@Injectable()
export class ResearchRewardGrantService {
  constructor(private readonly gameData: GameDataService) {}

  async reserve(
    manager: EntityManager,
    userId: number,
    techId: number,
  ): Promise<ReserveGrantResult> {
    // Without an explicit reward mapping no grant row may exist.
    if (this.gameData.getTech(techId)?.shipReward === undefined) {
      return { outcome: 'no-mapping' };
    }
    const repo = manager.getRepository(ResearchRewardGrant);
    // A concurrent insert blocks on the unique index until its transaction ends.
    const insert = await repo
      .createQueryBuilder()
      .insert()
      .values({ userId, techId, status: ResearchRewardGrantStatus.RESERVED })
      .orIgnore()
      .execute();
    const inserted =
      (insert.raw?.length ?? insert.identifiers?.length ?? 0) > 0;

    const grant = await repo.findOne({
      where: { userId, techId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!grant) return { outcome: 'no-mapping' };
    if (grant.status === ResearchRewardGrantStatus.COMPLETED) {
      return { outcome: 'already-granted' };
    }
    return { outcome: inserted ? 'reserved' : 'resumed', grant };
  }

  /** Marks a reserved grant as granted; false if it was already completed. */
  async complete(
    manager: EntityManager,
    userId: number,
    techId: number,
    now: Date = new Date(),
  ): Promise<boolean> {
    const result = await manager
      .getRepository(ResearchRewardGrant)
      .createQueryBuilder()
      .update()
      .set({ status: ResearchRewardGrantStatus.COMPLETED, grantedAt: now })
      .where(
        '"userId" = :userId AND "techId" = :techId AND "status" = :status',
        {
          userId,
          techId,
          status: ResearchRewardGrantStatus.RESERVED,
        },
      )
      .execute();
    return (result.affected ?? 0) > 0;
  }
}
