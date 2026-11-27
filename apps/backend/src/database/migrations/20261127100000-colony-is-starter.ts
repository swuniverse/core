import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Marks the onboarding colony. Starter colonies get no special ores (primary or secondary
 * source); the flag is derived once from users.starterColonyId and set on creation afterwards.
 */
export class ColonyIsStarter20261127100000 implements MigrationInterface {
  name = 'ColonyIsStarter20261127100000';

  async up(runner: QueryRunner): Promise<void> {
    await runner.query(
      `ALTER TABLE "colonies" ADD COLUMN IF NOT EXISTS "isStarter" boolean NOT NULL DEFAULT false`,
    );
    await runner.query(
      `UPDATE "colonies" SET "isStarter" = true
       WHERE "id" IN (SELECT "starterColonyId" FROM "users" WHERE "starterColonyId" IS NOT NULL)`,
    );
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE "colonies" DROP COLUMN IF EXISTS "isStarter"`);
  }
}
