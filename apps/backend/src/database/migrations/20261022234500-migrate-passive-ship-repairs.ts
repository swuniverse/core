import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Existing repair queues paid their complete material cost when they were
 * created. Mark those jobs completed so the passive repair worker never
 * charges the same repair a second time.
 */
export class MigratePassiveShipRepairs20261022234500
  implements MigrationInterface
{
  name = 'MigratePassiveShipRepairs20261022234500';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "colony_ship_build_queue"
      SET "status" = 'COMPLETED', "stoppedAt" = NULL, "finishesAt" = NOW()
      WHERE "mode" = 'REPAIR'
        AND "status" IN ('QUEUED', 'PAUSED')
        AND "repairSnapshot" IS NOT NULL
    `);
  }

  public async down(): Promise<void> {
    // Completed legacy repairs cannot be distinguished safely from new jobs.
  }
}
