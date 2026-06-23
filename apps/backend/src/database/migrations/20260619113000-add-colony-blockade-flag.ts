import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddColonyBlockadeFlag20260619113000 implements MigrationInterface {
  name = 'AddColonyBlockadeFlag20260619113000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "colony_stats"
        ADD COLUMN IF NOT EXISTS "isBlockaded" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "colony_stats"
        DROP COLUMN IF EXISTS "isBlockaded"
    `);
  }
}
