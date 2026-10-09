import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserLastActiveAt20261007100000 implements MigrationInterface {
  name = 'AddUserLastActiveAt20261007100000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMP',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "users" DROP COLUMN IF EXISTS "lastActiveAt"',
    );
  }
}
