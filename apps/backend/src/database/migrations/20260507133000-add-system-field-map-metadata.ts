import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSystemFieldMapMetadata20260507133000 implements MigrationInterface {
  name = 'AddSystemFieldMapMetadata20260507133000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "system_fields" ADD COLUMN IF NOT EXISTS "regionKey" character varying(64)',
    );
    await queryRunner.query(
      'ALTER TABLE "system_fields" ADD COLUMN IF NOT EXISTS "adminRegionKey" character varying(64)',
    );
    await queryRunner.query(
      'ALTER TABLE "system_fields" ADD COLUMN IF NOT EXISTS "influenceAreaId" integer',
    );
    await queryRunner.query(
      'ALTER TABLE "system_fields" ADD COLUMN IF NOT EXISTS "borderMask" character varying(32)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "system_fields" DROP COLUMN IF EXISTS "borderMask"',
    );
    await queryRunner.query(
      'ALTER TABLE "system_fields" DROP COLUMN IF EXISTS "influenceAreaId"',
    );
    await queryRunner.query(
      'ALTER TABLE "system_fields" DROP COLUMN IF EXISTS "adminRegionKey"',
    );
    await queryRunner.query(
      'ALTER TABLE "system_fields" DROP COLUMN IF EXISTS "regionKey"',
    );
  }
}
