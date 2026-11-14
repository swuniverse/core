import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * ADR-0006 / sc-WP-NAV-3b: the timed hyperspace jump is gone. Ships still in
 * flight go back to their origin (or keep their current valid field) so the
 * discarded jump is not rewarded, then the flight-only columns are dropped.
 */
export class RemoveTimedHyperspaceFlight20261114200000 implements MigrationInterface {
  name = 'RemoveTimedHyperspaceFlight20261114200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "spacecraft"
      SET "locationId" = COALESCE("originLocationId", "locationId"),
          "status" = 'IDLE'
      WHERE "status" = 'IN_FLIGHT'
    `);
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_spacecraft_in_flight_arrival"');
    await queryRunner.query(`
      ALTER TABLE "spacecraft"
        DROP COLUMN IF EXISTS "arrivalAt",
        DROP COLUMN IF EXISTS "originLocationId",
        DROP COLUMN IF EXISTS "targetLocationId",
        DROP COLUMN IF EXISTS "warpCooldown"
    `);
    await queryRunner.query(
      'ALTER TABLE "dashboard_snapshots" DROP COLUMN IF EXISTS "inFlightShipCount"',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "dashboard_snapshots" ADD COLUMN "inFlightShipCount" integer NOT NULL DEFAULT 0',
    );
    await queryRunner.query(`
      ALTER TABLE "spacecraft"
        ADD COLUMN "warpCooldown" integer NOT NULL DEFAULT 0,
        ADD COLUMN "arrivalAt" TIMESTAMP,
        ADD COLUMN "originLocationId" integer REFERENCES "space_locations"("id") ON DELETE SET NULL,
        ADD COLUMN "targetLocationId" integer REFERENCES "space_locations"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_spacecraft_in_flight_arrival" ON "spacecraft" ("arrivalAt") WHERE "status" = 'IN_FLIGHT'`,
    );
  }
}
