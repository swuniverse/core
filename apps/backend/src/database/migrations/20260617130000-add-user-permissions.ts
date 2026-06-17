import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserPermissions20260617130000 implements MigrationInterface {
  name = 'AddUserPermissions20260617130000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "permissions" text NOT NULL DEFAULT '[]'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "permissions"`);
  }
}
