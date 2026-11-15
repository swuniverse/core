import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * tmw-D5c: explicit database catalog per star system. Existing productive
 * systems are backfilled as catalogued; the SWU test system is excluded.
 */
export class AddStarSystemDatabaseCatalog20261115140000 implements MigrationInterface {
  name = 'AddStarSystemDatabaseCatalog20261115140000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "star_systems" ADD COLUMN IF NOT EXISTS "inDatabaseCatalog" boolean NOT NULL DEFAULT true',
    );
    await queryRunner.query(
      `UPDATE "star_systems" SET "inDatabaseCatalog" = false WHERE "landmarkKey" = 'swu-test-system'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "star_systems" DROP COLUMN IF EXISTS "inDatabaseCatalog"');
  }
}
