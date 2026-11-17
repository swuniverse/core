import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddColonyFieldDome20261021130000 implements MigrationInterface {
  name = 'AddColonyFieldDome20261021130000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "colony_fields"
      ADD COLUMN IF NOT EXISTS "hasDome" boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "domeFinishesAt" timestamp
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "colony_fields"
      DROP COLUMN IF EXISTS "domeFinishesAt",
      DROP COLUMN IF EXISTS "hasDome"
    `);
  }
}
