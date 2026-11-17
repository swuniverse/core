import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailVerification20261023120000 implements MigrationInterface {
  name = 'AddEmailVerification20261023120000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Databases coming from main already ran
    // 20261111100000-email-verification-remove-invites (open registration).
    // There the column exists and NULL means "registered, not yet confirmed",
    // so only backfill when this migration creates the column.
    if (await queryRunner.hasColumn('users', 'emailVerifiedAt')) return;
    await queryRunner.query(
      'ALTER TABLE "users" ADD COLUMN "emailVerifiedAt" TIMESTAMP',
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
