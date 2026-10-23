import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailVerification20261023120000 implements MigrationInterface {
  name = 'AddEmailVerification20261023120000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP',
    );
    await queryRunner.query(
      'UPDATE "users" SET "emailVerifiedAt" = now() WHERE "emailVerifiedAt" IS NULL',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "users" DROP COLUMN IF EXISTS "emailVerifiedAt"',
    );
  }
}
