import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddColonyShipBuildplanSnapshot20260620101000 implements MigrationInterface {
  name = 'AddColonyShipBuildplanSnapshot20260620101000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "colony_ship_build_queue"
        ADD COLUMN IF NOT EXISTS "buildPlanId" integer,
        ADD COLUMN IF NOT EXISTS "buildPlanSignature" varchar(128),
        ADD COLUMN IF NOT EXISTS "moduleCommodityIds" jsonb NOT NULL DEFAULT '[]'
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_colony_ship_queue_buildplan" ON "colony_ship_build_queue" ("buildPlanId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_colony_ship_queue_buildplan"`,
    );
    await queryRunner.query(`
      ALTER TABLE "colony_ship_build_queue"
        DROP COLUMN IF EXISTS "moduleCommodityIds",
        DROP COLUMN IF EXISTS "buildPlanSignature",
        DROP COLUMN IF EXISTS "buildPlanId"
    `);
  }
}
