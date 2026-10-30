import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStationShipRepairs20261030190000 implements MigrationInterface {
  name = 'AddStationShipRepairs20261030190000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "station_ship_repairs" (
        "id" SERIAL PRIMARY KEY,
        "stationId" integer NOT NULL,
        "shipId" integer NOT NULL UNIQUE,
        "finishesAt" timestamp,
        "stoppedAt" timestamp,
        "isStopped" boolean NOT NULL DEFAULT false,
        CONSTRAINT "FK_station_ship_repairs_station" FOREIGN KEY ("stationId") REFERENCES "spacecraft"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_station_ship_repairs_ship" FOREIGN KEY ("shipId") REFERENCES "spacecraft"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_station_ship_repairs_station" ON "station_ship_repairs" ("stationId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "spacecraft" ADD COLUMN "passiveRepair" boolean NOT NULL DEFAULT false`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "spacecraft" DROP COLUMN IF EXISTS "passiveRepair"`,
    );
    await queryRunner.query('DROP TABLE IF EXISTS "station_ship_repairs"');
  }
}
