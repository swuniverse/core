import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFieldMiningResources20261116140000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(
      `ALTER TABLE "galaxy_field_types" ADD COLUMN "miningResources" jsonb NOT NULL DEFAULT '[]'::jsonb`,
    );
    await runner.query(
      `UPDATE "galaxy_field_types" SET "miningResources" = '[{"commodityId":3,"rate":100}]'::jsonb WHERE "key" = 'NEBULA' OR "category" IN ('nebula','system_nebula')`,
    );
    await runner.query(
      `UPDATE "galaxy_field_types" SET "miningResources" = '[{"commodityId":9,"rate":100},{"commodityId":10,"rate":100}]'::jsonb WHERE "key" IN ('ASTEROID_FIELD','ASTEROID_CLUSTER') OR "category" = 'asteroid'`,
    );
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query(
      `ALTER TABLE "galaxy_field_types" DROP COLUMN "miningResources"`,
    );
  }
}
