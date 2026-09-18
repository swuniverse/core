import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSpacecraftEntryDirection20260910203000 implements MigrationInterface {
  name = 'AddSpacecraftEntryDirection20260910203000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "spacecraft"
      ADD COLUMN IF NOT EXISTS "lastGalaxyFlightDirection" varchar(6)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "spacecraft"
      DROP COLUMN IF EXISTS "lastGalaxyFlightDirection"
    `);
  }
}
