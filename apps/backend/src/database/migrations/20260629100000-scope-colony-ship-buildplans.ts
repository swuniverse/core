import { MigrationInterface, QueryRunner } from 'typeorm';

export class ScopeColonyShipBuildplans20260629100000
  implements MigrationInterface
{
  name = 'ScopeColonyShipBuildplans20260629100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "colony_ship_buildplans"
        ADD COLUMN IF NOT EXISTS "colonyId" integer
    `);
    await queryRunner.query(`
      UPDATE "colony_ship_buildplans" buildplan
      SET "colonyId" = colony."id"
      FROM (
        SELECT DISTINCT ON ("userId") "id", "userId"
        FROM "colonies"
        ORDER BY "userId", "id"
      ) colony
      WHERE buildplan."colonyId" IS NULL
        AND buildplan."userId" = colony."userId"
    `);
    await queryRunner.query(`
      DELETE FROM "colony_ship_buildplans"
      WHERE "colonyId" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "colony_ship_buildplans"
        ALTER COLUMN "colonyId" SET NOT NULL
    `);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_colony_ship_buildplans_user_signature"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_colony_ship_buildplans_colony_name" ON "colony_ship_buildplans" ("colonyId", "name")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_colony_ship_buildplans_colony_signature" ON "colony_ship_buildplans" ("colonyId", "signature")`,
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_colony_ship_buildplans_colony'
        ) THEN
          ALTER TABLE "colony_ship_buildplans"
            ADD CONSTRAINT "FK_colony_ship_buildplans_colony"
            FOREIGN KEY ("colonyId") REFERENCES "colonies"("id") ON DELETE CASCADE;
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "colony_ship_buildplans"
        DROP CONSTRAINT IF EXISTS "FK_colony_ship_buildplans_colony"
    `);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_colony_ship_buildplans_colony_signature"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_colony_ship_buildplans_colony_name"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_colony_ship_buildplans_user_signature" ON "colony_ship_buildplans" ("userId", "signature")`,
    );
    await queryRunner.query(`
      ALTER TABLE "colony_ship_buildplans"
        DROP COLUMN IF EXISTS "colonyId"
    `);
  }
}
