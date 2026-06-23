import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShipBuildplanFields20260618133000 implements MigrationInterface {
  name = 'AddShipBuildplanFields20260618133000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "colony_ship_build_queue"
        ADD COLUMN IF NOT EXISTS "buildPlanName" varchar(255),
        ADD COLUMN IF NOT EXISTS "moduleTypes" jsonb NOT NULL DEFAULT '[]'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "colony_ship_build_queue"
        DROP COLUMN IF EXISTS "moduleTypes",
        DROP COLUMN IF EXISTS "buildPlanName"
    `);
  }
}
