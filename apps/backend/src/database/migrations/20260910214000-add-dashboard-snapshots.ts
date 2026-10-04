import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDashboardSnapshots20260910214000 implements MigrationInterface {
  name = 'AddDashboardSnapshots20260910214000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "dashboard_snapshots" (
      "id" SERIAL NOT NULL,
      "playerCount" integer NOT NULL,
      "activePlayerCount" integer NOT NULL,
      "colonyCount" integer NOT NULL,
      "shipCount" integer NOT NULL,
      "inFlightShipCount" integer NOT NULL,
      "holonetPostCount" integer NOT NULL,
      "recordedAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_dashboard_snapshots" PRIMARY KEY ("id")
    )`);
    await queryRunner.query('CREATE INDEX "IDX_dashboard_snapshots_recorded" ON "dashboard_snapshots" ("recordedAt")');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "dashboard_snapshots"');
  }
}
