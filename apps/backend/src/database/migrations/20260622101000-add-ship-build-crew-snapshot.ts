import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShipBuildCrewSnapshot20260622101000 implements MigrationInterface {
  name = 'AddShipBuildCrewSnapshot20260622101000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "colony_ship_build_queue"
        ADD COLUMN IF NOT EXISTS "crewAssigned" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "crewIds" jsonb NOT NULL DEFAULT '[]'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "colony_ship_build_queue"
        DROP COLUMN IF EXISTS "crewIds",
        DROP COLUMN IF EXISTS "crewAssigned"
    `);
  }
}
