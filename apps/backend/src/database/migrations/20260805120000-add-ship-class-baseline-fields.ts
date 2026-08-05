import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShipClassBaselineFields20260805120000
  implements MigrationInterface
{
  name = 'AddShipClassBaselineFields20260805120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ship_class_defs"
        ADD COLUMN IF NOT EXISTS "reactorBase" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "warpdriveBase" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "evadeBase" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "hitChanceBase" integer NOT NULL DEFAULT 75,
        ADD COLUMN IF NOT EXISTS "sensorRangeBase" integer NOT NULL DEFAULT 2
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ship_class_defs"
        DROP COLUMN IF EXISTS "sensorRangeBase",
        DROP COLUMN IF EXISTS "hitChanceBase",
        DROP COLUMN IF EXISTS "evadeBase",
        DROP COLUMN IF EXISTS "warpdriveBase",
        DROP COLUMN IF EXISTS "reactorBase"
    `);
  }
}
