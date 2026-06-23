import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddColonyFieldIntegrity20260617120000 implements MigrationInterface {
  name = 'AddColonyFieldIntegrity20260617120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "colony_fields"
        ADD COLUMN IF NOT EXISTS "integrity" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "maxIntegrity" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "activateAfterBuild" boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS "reactivateAfterUpgrade" integer
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "colony_fields"
        DROP COLUMN IF EXISTS "reactivateAfterUpgrade",
        DROP COLUMN IF EXISTS "activateAfterBuild",
        DROP COLUMN IF EXISTS "maxIntegrity",
        DROP COLUMN IF EXISTS "integrity"
    `);
  }
}
