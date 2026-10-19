import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddColonyScanDeposits20261019170000 implements MigrationInterface {
  name = 'AddColonyScanDeposits20261019170000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "colony_scans"
      ADD COLUMN IF NOT EXISTS "deposits" text
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "colony_scans"
      DROP COLUMN IF EXISTS "deposits"
    `);
  }
}
