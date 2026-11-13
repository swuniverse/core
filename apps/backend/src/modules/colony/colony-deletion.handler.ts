import { Injectable, type OnModuleInit } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import type { PlayerDeletionHandler } from '../account-deletion/player-deletion-handler';
import { PlayerDeletionService } from '../account-deletion/player-deletion.service';
import { ColonyAbandonmentService } from './colony-abandonment.service';
import { Colony } from './entities/colony.entity';

/**
 * Colonies of a deleted player (sh-AP-05d, STU `ColonyDeletionHandler`).
 * SWU keeps its ruin model (col-E2, ADR-0007) instead of STU's reset: every
 * colony, the starter colony included, is given up through the same code
 * path as a voluntary give-up, without refunding queues. Afterwards no colony
 * refers to the player any more, so `colonies.userId` cannot cascade the
 * ruins away. Runs after the ships (200).
 */
@Injectable()
export class ColonyDeletionHandler implements PlayerDeletionHandler, OnModuleInit {
  readonly order = 300;

  constructor(
    private readonly deletions: PlayerDeletionService,
    private readonly abandonment: ColonyAbandonmentService,
  ) {}

  onModuleInit(): void {
    this.deletions.register(this);
  }

  async delete(tx: EntityManager, userId: number): Promise<void> {
    const colonies = await tx.find(Colony, {
      where: { userId, isAbandoned: false },
      relations: ['fields', 'changeable', 'celestialObject'],
      order: { id: 'ASC' },
    });
    for (const colony of colonies) {
      await this.abandonment.abandonInManager(tx, colony, userId);
    }
    // Ruins, including earlier ones of the player, lose every reference; an
    // asteroid exhausted for the player becomes available to everyone again.
    await tx.query(
      `UPDATE "colonies" SET "userId" = NULL, "previousUserId" = NULL
        WHERE "userId" = $1 OR "previousUserId" = $1`,
      [userId],
    );
    // Colony events and queues have no foreign key on the player.
    for (const table of ['colony_events', 'colony_fabrication_queue', 'colony_crew_training_queue', 'colony_ship_build_queue']) {
      await tx.query(`DELETE FROM "${table}" WHERE "userId" = $1`, [userId]);
    }
  }
}
