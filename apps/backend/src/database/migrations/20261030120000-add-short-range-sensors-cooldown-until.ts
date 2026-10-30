import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShortRangeSensorsCooldownUntil20261030120000 implements MigrationInterface {
  name = 'AddShortRangeSensorsCooldownUntil20261030120000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "spacecraft" ADD COLUMN IF NOT EXISTS "shortRangeSensorsCooldownUntil" timestamp`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "spacecraft" DROP COLUMN IF EXISTS "shortRangeSensorsCooldownUntil"`);
  }
}
