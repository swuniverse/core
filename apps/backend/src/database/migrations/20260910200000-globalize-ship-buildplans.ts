import { MigrationInterface, QueryRunner } from 'typeorm';

export class GlobalizeShipBuildplans20260910200000 implements MigrationInterface {
  name = 'GlobalizeShipBuildplans20260910200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "colony_ship_buildplans" DROP CONSTRAINT IF EXISTS "FK_colony_ship_buildplans_colony"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_colony_ship_buildplans_colony_name"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_colony_ship_buildplans_colony_signature"',
    );
    await queryRunner.query(`
      WITH ranked AS (
        SELECT "id", row_number() OVER (PARTITION BY "userId", "name" ORDER BY "id") AS n
        FROM "colony_ship_buildplans"
      )
      UPDATE "colony_ship_buildplans" plan
      SET "name" = plan."name" || ' #' || plan."id"
      FROM ranked
      WHERE plan."id" = ranked."id" AND ranked.n > 1
    `);
    await queryRunner.query(
      'ALTER TABLE "colony_ship_buildplans" DROP COLUMN IF EXISTS "colonyId"',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_colony_ship_buildplans_user_name" ON "colony_ship_buildplans" ("userId", "name")',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_colony_ship_buildplans_user_signature" ON "colony_ship_buildplans" ("userId", "signature")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_colony_ship_buildplans_user_name"',
    );
    await queryRunner.query(
      'ALTER TABLE "colony_ship_buildplans" ADD COLUMN IF NOT EXISTS "colonyId" integer',
    );
  }
}
