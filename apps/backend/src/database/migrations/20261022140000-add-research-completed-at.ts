import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddResearchCompletedAt20261022140000 implements MigrationInterface {
  name = 'AddResearchCompletedAt20261022140000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "research" ADD COLUMN IF NOT EXISTS "completedAt" timestamp',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "research" DROP COLUMN IF EXISTS "completedAt"',
    );
  }
}
