import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveUserDashboardLayout20260919120000
  implements MigrationInterface
{
  name = 'RemoveUserDashboardLayout20260919120000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "dashboardLayout"
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "dashboardLayout" text NULL
    `);
  }
}
