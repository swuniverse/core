import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSpacecraftOperatingMode20260908150000 implements MigrationInterface {
  name = 'AddSpacecraftOperatingMode20260908150000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "spacecraft"
      ADD COLUMN IF NOT EXISTS "operatingMode" varchar NOT NULL DEFAULT 'NORMAL'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "spacecraft" DROP COLUMN IF EXISTS "operatingMode"
    `);
  }
}
