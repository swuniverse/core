import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddResourceResearchProgress20260527103000 implements MigrationInterface {
  name = 'AddResourceResearchProgress20260527103000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "research" ADD COLUMN IF NOT EXISTS "remainingPoints" integer',
    );
    await queryRunner.query(
      'ALTER TABLE "research" ADD COLUMN IF NOT EXISTS "spentPoints" integer NOT NULL DEFAULT 0',
    );
    await queryRunner.query(
      'ALTER TABLE "research" ADD COLUMN IF NOT EXISTS "sourceCommodityId" integer',
    );
    await queryRunner.query(
      'ALTER TABLE "research" ADD COLUMN IF NOT EXISTS "blockedReason" varchar(255)',
    );
    await queryRunner.query(
      'ALTER TABLE "research" ADD COLUMN IF NOT EXISTS "lastAdvancedAt" timestamp',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "research" DROP COLUMN IF EXISTS "lastAdvancedAt"',
    );
    await queryRunner.query(
      'ALTER TABLE "research" DROP COLUMN IF EXISTS "blockedReason"',
    );
    await queryRunner.query(
      'ALTER TABLE "research" DROP COLUMN IF EXISTS "sourceCommodityId"',
    );
    await queryRunner.query(
      'ALTER TABLE "research" DROP COLUMN IF EXISTS "spentPoints"',
    );
    await queryRunner.query(
      'ALTER TABLE "research" DROP COLUMN IF EXISTS "remainingPoints"',
    );
  }
}
