import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShipClassTorpedoFlightFields20260806090000
  implements MigrationInterface
{
  name = 'AddShipClassTorpedoFlightFields20260806090000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ship_class_defs"
        ADD COLUMN IF NOT EXISTS "torpedoStorageBase" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "flightEnergyCost" integer NOT NULL DEFAULT 1
    `);
    await queryRunner.query(`
      ALTER TABLE "ship_class_defs"
        DROP COLUMN IF EXISTS "warpBase"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ship_class_defs"
        ADD COLUMN IF NOT EXISTS "warpBase" integer NOT NULL DEFAULT 2
    `);
    await queryRunner.query(`
      ALTER TABLE "ship_class_defs"
        DROP COLUMN IF EXISTS "flightEnergyCost",
        DROP COLUMN IF EXISTS "torpedoStorageBase"
    `);
  }
}
