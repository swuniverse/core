import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ship classes store their build duration in seconds, but the shipyard used to
 * treat the value as minutes, making every build 60x too long. Shrink the
 * remaining time of jobs that were queued with the old calculation.
 */
export class FixShipBuildQueueDurations20261111110000
  implements MigrationInterface
{
  name = 'FixShipBuildQueueDurations20261111110000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "colony_ship_build_queue"
      SET "finishesAt" = LOCALTIMESTAMP + ("finishesAt" - LOCALTIMESTAMP) / 60
      WHERE "status" = 'QUEUED'
        AND "mode" IN ('BUILD', 'RETROFIT')
        AND "finishesAt" > LOCALTIMESTAMP
    `);
  }

  public async down(): Promise<void> {
    // The original remaining time cannot be restored.
  }
}
