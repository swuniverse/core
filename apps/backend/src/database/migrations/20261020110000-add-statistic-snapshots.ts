import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStatisticSnapshots20261020110000 implements MigrationInterface {
  name = 'AddStatisticSnapshots20261020110000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "statistic_snapshots" (
        "id" SERIAL NOT NULL,
        "metricKey" varchar(64) NOT NULL,
        "seriesKey" varchar(64) NOT NULL,
        "recordedAt" TIMESTAMP NOT NULL,
        "value" double precision NOT NULL,
        CONSTRAINT "PK_statistic_snapshots" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "UQ_statistic_snapshots_series_time" ON "statistic_snapshots" ("metricKey", "seriesKey", "recordedAt")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_statistic_snapshots_metric_time" ON "statistic_snapshots" ("metricKey", "recordedAt")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "statistic_snapshots"');
  }
}
