import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStatisticHourCounters20261020120000 implements MigrationInterface {
  name = 'AddStatisticHourCounters20261020120000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "statistic_hour_counters" (
        "metricKey" varchar(64) NOT NULL,
        "hour" TIMESTAMP NOT NULL,
        "count" bigint NOT NULL DEFAULT 0,
        CONSTRAINT "PK_statistic_hour_counters" PRIMARY KEY ("metricKey", "hour")
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "statistic_hour_counters"');
  }
}
