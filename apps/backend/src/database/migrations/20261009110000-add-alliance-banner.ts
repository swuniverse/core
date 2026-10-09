import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAllianceBanner20261009110000 implements MigrationInterface {
  name = 'AddAllianceBanner20261009110000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "alliances"
        ADD COLUMN "bannerKey" character varying(64),
        ADD COLUMN "bannerUpdatedAt" TIMESTAMP
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "alliances"
        DROP COLUMN "bannerUpdatedAt",
        DROP COLUMN "bannerKey"
    `);
  }
}
