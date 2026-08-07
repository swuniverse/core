import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserDashboardLayout20260807120000 implements MigrationInterface {
  name = 'AddUserDashboardLayout20260807120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "dashboardLayout" text NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "dashboardLayout"
    `);
  }
}
