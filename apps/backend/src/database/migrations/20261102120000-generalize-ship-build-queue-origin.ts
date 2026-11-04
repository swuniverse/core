import { MigrationInterface, QueryRunner } from 'typeorm';

export class GeneralizeShipBuildQueueOrigin20261102120000 implements MigrationInterface {
  name = 'GeneralizeShipBuildQueueOrigin20261102120000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "colony_ship_build_queue" ADD COLUMN IF NOT EXISTS "source" varchar NOT NULL DEFAULT 'COLONY', ADD COLUMN IF NOT EXISTS "stationId" integer`);
    await queryRunner.query(`ALTER TABLE "colony_ship_build_queue" ALTER COLUMN "colonyId" DROP NOT NULL`);
    await queryRunner.query(`DO $$ BEGIN ALTER TABLE "colony_ship_build_queue" ADD CONSTRAINT "FK_ship_build_queue_station" FOREIGN KEY ("stationId") REFERENCES "spacecraft"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await queryRunner.query(`ALTER TABLE "colony_ship_build_queue" ADD CONSTRAINT "CHK_ship_build_queue_one_source" CHECK (("source" = 'COLONY' AND "colonyId" IS NOT NULL AND "stationId" IS NULL) OR ("source" = 'STATION' AND "stationId" IS NOT NULL AND "colonyId" IS NULL))`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ship_build_queue_station_status" ON "colony_ship_build_queue" ("stationId", "status")`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM "colony_ship_build_queue" WHERE "source" = 'STATION') THEN
        RAISE EXCEPTION 'Cannot roll back ship build queue origin while station jobs exist';
      END IF;
    END $$`);
    await queryRunner.query(`ALTER TABLE "colony_ship_build_queue" DROP CONSTRAINT IF EXISTS "CHK_ship_build_queue_one_source", DROP CONSTRAINT IF EXISTS "FK_ship_build_queue_station"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ship_build_queue_station_status"`);
    await queryRunner.query(`ALTER TABLE "colony_ship_build_queue" ALTER COLUMN "colonyId" SET NOT NULL, DROP COLUMN IF EXISTS "stationId", DROP COLUMN IF EXISTS "source"`);
  }
}
