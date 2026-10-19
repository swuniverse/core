import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCartographyCompletionOutcome20261016120000 implements MigrationInterface {
  name = 'AddCartographyCompletionOutcome20261016120000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cartography_plans"
      ADD COLUMN IF NOT EXISTS "completionOutcome" varchar(16)
    `);
    await queryRunner.query(`
      ALTER TABLE "cartography_plans"
      ADD CONSTRAINT "CHK_cartography_plans_completion_outcome"
      CHECK (
        "completionOutcome" IS NULL OR
        "completionOutcome" IN ('SUCCESS', 'INVALIDATED')
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cartography_plans"
      DROP CONSTRAINT IF EXISTS "CHK_cartography_plans_completion_outcome"
    `);
    await queryRunner.query(`
      ALTER TABLE "cartography_plans"
      DROP COLUMN IF EXISTS "completionOutcome"
    `);
  }
}
