import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSpacecraftRuntimeResourceFields20260728170000
  implements MigrationInterface
{
  name = 'AddSpacecraftRuntimeResourceFields20260728170000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "spacecraft"
        ADD COLUMN IF NOT EXISTS "warpdrive" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "runtimeSystems" jsonb NOT NULL DEFAULT '{}'::jsonb
    `);
    await queryRunner.query(`
      UPDATE "spacecraft"
      SET "warpdrive" = COALESCE(NULLIF("warpdrive", 0), "warpdriveMax", "warpSpeed", 0)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "spacecraft"
        DROP COLUMN IF EXISTS "runtimeSystems",
        DROP COLUMN IF EXISTS "warpdrive"
    `);
  }
}
