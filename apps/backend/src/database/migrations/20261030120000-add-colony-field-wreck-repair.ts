import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddColonyFieldWreckRepair20261030120000
  implements MigrationInterface
{
  name = 'AddColonyFieldWreckRepair20261030120000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "colony_fields"
      ADD COLUMN IF NOT EXISTS "wreckRepaired" boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "wreckRepairFinishesAt" timestamp
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "colony_fields"
      DROP COLUMN IF EXISTS "wreckRepairFinishesAt",
      DROP COLUMN IF EXISTS "wreckRepaired"
    `);
  }
}
