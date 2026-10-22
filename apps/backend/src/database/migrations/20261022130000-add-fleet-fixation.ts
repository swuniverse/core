import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFleetFixation20261022130000 implements MigrationInterface {
  name = 'AddFleetFixation20261022130000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "fleets" ADD COLUMN IF NOT EXISTS "isFixed" boolean NOT NULL DEFAULT false',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "fleets" DROP COLUMN IF EXISTS "isFixed"',
    );
  }
}
