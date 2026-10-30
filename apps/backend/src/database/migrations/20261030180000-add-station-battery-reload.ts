import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStationBatteryReload20261030180000 implements MigrationInterface {
  name = 'AddStationBatteryReload20261030180000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "spacecraft" ADD COLUMN "reloadBattery" boolean NOT NULL DEFAULT false`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "spacecraft" DROP COLUMN IF EXISTS "reloadBattery"`,
    );
  }
}
