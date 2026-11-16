import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStationScrapping20261116170000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE "station_scrapping" (
      "stationId" integer PRIMARY KEY REFERENCES "spacecraft"("id") ON DELETE CASCADE,
      "remainingTicks" integer NOT NULL CHECK ("remainingTicks" > 0),
      "modules" jsonb NOT NULL DEFAULT '[]'::jsonb
    )`);
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP TABLE "station_scrapping"');
  }
}
