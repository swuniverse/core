import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Partielle Indizes fuer die minuetlichen Tick-Crons (Warp-Ankuenfte,
 * Bau-/Terraforming-Abschluesse). Nur die wenigen aktiven Zeilen werden indiziert.
 */
export class AddTickLookupIndexes20261004150000 implements MigrationInterface {
  name = 'AddTickLookupIndexes20261004150000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_spacecraft_in_flight_arrival" ON "spacecraft" ("arrivalAt") WHERE "status" = 'IN_FLIGHT'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_colony_fields_build_finishes" ON "colony_fields" ("buildFinishesAt") WHERE "isBuilding" = true`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_colony_fields_terraforming_finishes" ON "colony_fields" ("terraformingFinishesAt") WHERE "terraformingId" IS NOT NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_colony_fields_terraforming_finishes"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_colony_fields_build_finishes"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_spacecraft_in_flight_arrival"`,
    );
  }
}
