import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * tmw-K8b1: a cartography plan targets exactly one star system or map region
 * (STU `AstronomicalEntry`: `systems_id` or `region_id`); existing plans
 * become `SYSTEM` plans unchanged. Personal region discoveries get a table.
 */
export class AddCartographyTargetsAndRegionDiscoveries20261115200000 implements MigrationInterface {
  name = 'AddCartographyTargetsAndRegionDiscoveries20261115200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cartography_plans"
        ADD COLUMN IF NOT EXISTS "targetType" varchar(16) NOT NULL DEFAULT 'SYSTEM',
        ADD COLUMN IF NOT EXISTS "mapRegionId" integer,
        ALTER COLUMN "starSystemId" DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "cartography_plans"
        DROP CONSTRAINT IF EXISTS "FK_cartography_plans_region",
        DROP CONSTRAINT IF EXISTS "CHK_cartography_plans_target",
        ADD CONSTRAINT "FK_cartography_plans_region" FOREIGN KEY ("mapRegionId") REFERENCES "map_regions"("id") ON DELETE CASCADE,
        ADD CONSTRAINT "CHK_cartography_plans_target" CHECK (
          ("targetType" = 'SYSTEM' AND "starSystemId" IS NOT NULL AND "mapRegionId" IS NULL)
          OR ("targetType" = 'REGION' AND "mapRegionId" IS NOT NULL AND "starSystemId" IS NULL)
        )
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_cartography_plans_user_system"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_cartography_plans_user_system" ON "cartography_plans" ("userId", "starSystemId") WHERE "starSystemId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_cartography_plans_user_region" ON "cartography_plans" ("userId", "mapRegionId") WHERE "mapRegionId" IS NOT NULL`,
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "region_discoveries" (
        "id" SERIAL NOT NULL,
        "userId" integer NOT NULL,
        "mapRegionId" integer NOT NULL,
        "source" varchar(32) NOT NULL,
        "discoveredAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_region_discoveries" PRIMARY KEY ("id"),
        CONSTRAINT "FK_region_discoveries_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_region_discoveries_region" FOREIGN KEY ("mapRegionId") REFERENCES "map_regions"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_region_discoveries_source" CHECK ("source" IN ('CARTOGRAPHY'))
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_region_discoveries_user_region" ON "region_discoveries" ("userId", "mapRegionId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_region_discoveries_region" ON "region_discoveries" ("mapRegionId")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "region_discoveries"`);
    await queryRunner.query(`DELETE FROM "cartography_plans" WHERE "targetType" = 'REGION'`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_cartography_plans_user_region"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_cartography_plans_user_system"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_cartography_plans_user_system" ON "cartography_plans" ("userId", "starSystemId")`,
    );
    await queryRunner.query(`
      ALTER TABLE "cartography_plans"
        DROP CONSTRAINT IF EXISTS "CHK_cartography_plans_target",
        DROP CONSTRAINT IF EXISTS "FK_cartography_plans_region",
        DROP COLUMN IF EXISTS "mapRegionId",
        DROP COLUMN IF EXISTS "targetType",
        ALTER COLUMN "starSystemId" SET NOT NULL
    `);
  }
}
