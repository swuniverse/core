import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Counts the ticks a colony has been active. A system counts as explored once an own
 * colony stood there for 35 ticks. Existing live colonies are credited with the full count and their systems are entered.
 */
export class ColonyActiveTicks20261127110000 implements MigrationInterface {
  name = 'ColonyActiveTicks20261127110000';

  async up(runner: QueryRunner): Promise<void> {
    await runner.query(
      `ALTER TABLE "colonies" ADD COLUMN IF NOT EXISTS "activeTicks" integer NOT NULL DEFAULT 0`,
    );
    await runner.query(
      `UPDATE "colonies" SET "activeTicks" = 35 WHERE "isAbandoned" = false`,
    );
    await runner.query(
      `INSERT INTO "system_explorations" ("userId", "starSystemId", "discoverySource")
       SELECT DISTINCT "userId", "starSystemId", 'COLONY_ACTIVE' FROM "colonies"
       WHERE "isAbandoned" = false AND "userId" IS NOT NULL AND "starSystemId" IS NOT NULL
       ON CONFLICT DO NOTHING`,
    );
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE "colonies" DROP COLUMN IF EXISTS "activeTicks"`);
  }
}
