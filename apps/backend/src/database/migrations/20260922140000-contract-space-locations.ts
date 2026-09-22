import { MigrationInterface, QueryRunner } from 'typeorm';

export class ContractSpaceLocations20260922140000 implements MigrationInterface {
  name = 'ContractSpaceLocations20260922140000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // The removed starter flow was the only supported source of unplaced ships.
    await queryRunner.query(
      'DELETE FROM "spacecraft" WHERE "locationId" IS NULL',
    );
    await queryRunner.query(`
      DO $contract$
      BEGIN
        IF EXISTS (SELECT 1 FROM "spacecraft_wrecks" WHERE "locationId" IS NULL) THEN
          RAISE EXCEPTION 'Contract blocked: unresolved wreck locations';
        END IF;
        IF EXISTS (
          SELECT 1 FROM "spacecraft"
          WHERE "originLocationId" IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM "space_locations" location
              WHERE location.id = "spacecraft"."originLocationId"
            )
        ) THEN
          RAISE EXCEPTION 'Contract blocked: unresolved spacecraft origin locations';
        END IF;
        IF EXISTS (
          SELECT 1 FROM "spacecraft"
          WHERE "targetLocationId" IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM "space_locations" location
              WHERE location.id = "spacecraft"."targetLocationId"
            )
        ) THEN
          RAISE EXCEPTION 'Contract blocked: unresolved spacecraft target locations';
        END IF;
      END
      $contract$;
    `);

    await queryRunner.query(
      'DROP TRIGGER IF EXISTS "TRG_spacecraft_wreck_sync_location_id" ON "spacecraft_wrecks"',
    );
    await queryRunner.query(
      'DROP FUNCTION IF EXISTS sync_spacecraft_wreck_location_id()',
    );
    await queryRunner.query(
      'DROP TRIGGER IF EXISTS "TRG_spacecraft_sync_location_ids" ON "spacecraft"',
    );
    await queryRunner.query(
      'DROP FUNCTION IF EXISTS sync_spacecraft_location_ids()',
    );

    await queryRunner.query(
      'ALTER TABLE "spacecraft" DROP CONSTRAINT "FK_spacecraft_location"',
    );
    await queryRunner.query(
      'ALTER TABLE "spacecraft_wrecks" DROP CONSTRAINT "FK_spacecraft_wreck_location"',
    );
    await queryRunner.query(
      'ALTER TABLE "spacecraft" ALTER COLUMN "locationId" SET NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "spacecraft_wrecks" ALTER COLUMN "locationId" SET NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "spacecraft" ADD CONSTRAINT "FK_spacecraft_location" FOREIGN KEY ("locationId") REFERENCES "space_locations"("id") ON DELETE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "spacecraft_wrecks" ADD CONSTRAINT "FK_spacecraft_wreck_location" FOREIGN KEY ("locationId") REFERENCES "space_locations"("id") ON DELETE CASCADE',
    );

    await queryRunner.query(
      'ALTER TABLE "spacecraft" DROP CONSTRAINT IF EXISTS "FK_spacecraft_star_system"',
    );
    await queryRunner.query(
      'ALTER TABLE "spacecraft" DROP CONSTRAINT IF EXISTS "FK_spacecraft_layer"',
    );
    await queryRunner.query(
      'ALTER TABLE "spacecraft" DROP CONSTRAINT IF EXISTS "FK_spacecraft_celestial_object"',
    );
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_spacecraft_star_system"');
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_spacecraft_wreck_layer_position"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_spacecraft_wreck_system_position"',
    );
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN "starterShipId"');
    await queryRunner.query(`
      ALTER TABLE "spacecraft"
        DROP COLUMN "starSystemId",
        DROP COLUMN "currentLayerId",
        DROP COLUMN "celestialObjectId",
        DROP COLUMN "inSystem",
        DROP COLUMN "currentSystemFieldX",
        DROP COLUMN "currentSystemFieldY",
        DROP COLUMN "posX",
        DROP COLUMN "posY",
        DROP COLUMN "targetSystemId",
        DROP COLUMN "targetX",
        DROP COLUMN "targetY",
        DROP COLUMN "flightOrigin"
    `);
    await queryRunner.query(`
      ALTER TABLE "spacecraft_wrecks"
        DROP COLUMN "currentLayerId",
        DROP COLUMN "starSystemId",
        DROP COLUMN "inSystem",
        DROP COLUMN "posX",
        DROP COLUMN "posY",
        DROP COLUMN "currentSystemFieldX",
        DROP COLUMN "currentSystemFieldY"
    `);
  }

  async down(): Promise<void> {
    throw new Error(
      'The local SpaceLocation contract migration is intentionally destructive and cannot be rolled back.',
    );
  }
}
