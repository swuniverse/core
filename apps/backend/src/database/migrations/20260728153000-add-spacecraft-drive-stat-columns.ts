import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSpacecraftDriveStatColumns20260728153000
  implements MigrationInterface
{
  name = 'AddSpacecraftDriveStatColumns20260728153000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "spacecraft"
        ADD COLUMN IF NOT EXISTS "epsMax" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "reactorOutput" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "warpdriveMax" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "evadeChance" integer NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      UPDATE "spacecraft"
      SET
        "epsMax" = COALESCE(NULLIF("epsMax", 0), "energyMax", 0),
        "warpdriveMax" = COALESCE(NULLIF("warpdriveMax", 0), "warpSpeed", 0),
        "evadeChance" = COALESCE("evadeChance", 0)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "spacecraft"
        DROP COLUMN IF EXISTS "evadeChance",
        DROP COLUMN IF EXISTS "warpdriveMax",
        DROP COLUMN IF EXISTS "reactorOutput",
        DROP COLUMN IF EXISTS "epsMax"
    `);
  }
}
