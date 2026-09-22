import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSpaceLocations20260922130000 implements MigrationInterface {
  name = 'AddSpaceLocations20260922130000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "space_locations" (
        "id" SERIAL PRIMARY KEY,
        "kind" varchar(16) NOT NULL,
        "galaxyFieldId" integer NULL,
        "systemFieldId" integer NULL,
        CONSTRAINT "CHK_space_locations_field_kind" CHECK (
          ("kind" = 'GALAXY_FIELD' AND "galaxyFieldId" IS NOT NULL AND "systemFieldId" IS NULL)
          OR
          ("kind" = 'SYSTEM_FIELD' AND "galaxyFieldId" IS NULL AND "systemFieldId" IS NOT NULL)
        ),
        CONSTRAINT "FK_space_locations_galaxy_field" FOREIGN KEY ("galaxyFieldId")
          REFERENCES "galaxy_fields"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_space_locations_system_field" FOREIGN KEY ("systemFieldId")
          REFERENCES "system_fields"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_space_locations_galaxy_field" ON "space_locations" ("galaxyFieldId")',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_space_locations_system_field" ON "space_locations" ("systemFieldId")',
    );

    await queryRunner.query(`
      INSERT INTO "space_locations" ("kind", "galaxyFieldId")
      SELECT 'GALAXY_FIELD', field.id FROM "galaxy_fields" field
    `);
    await queryRunner.query(`
      INSERT INTO "space_locations" ("kind", "systemFieldId")
      SELECT 'SYSTEM_FIELD', field.id FROM "system_fields" field
    `);
    await queryRunner.query(`
      CREATE FUNCTION create_galaxy_field_space_location()
      RETURNS trigger AS $function$
      BEGIN
        INSERT INTO "space_locations" ("kind", "galaxyFieldId")
        VALUES ('GALAXY_FIELD', NEW.id);
        RETURN NEW;
      END;
      $function$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER "TRG_galaxy_fields_space_location"
      AFTER INSERT ON "galaxy_fields"
      FOR EACH ROW EXECUTE FUNCTION create_galaxy_field_space_location()
    `);
    await queryRunner.query(`
      CREATE FUNCTION create_system_field_space_location()
      RETURNS trigger AS $function$
      BEGIN
        INSERT INTO "space_locations" ("kind", "systemFieldId")
        VALUES ('SYSTEM_FIELD', NEW.id);
        RETURN NEW;
      END;
      $function$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER "TRG_system_fields_space_location"
      AFTER INSERT ON "system_fields"
      FOR EACH ROW EXECUTE FUNCTION create_system_field_space_location()
    `);

    await queryRunner.query(
      'ALTER TABLE "spacecraft" ADD COLUMN "locationId" integer NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "spacecraft" ADD COLUMN "originLocationId" integer NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "spacecraft" ADD COLUMN "targetLocationId" integer NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "spacecraft_wrecks" ADD COLUMN "locationId" integer NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "colonies" ADD COLUMN "systemFieldId" integer NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "spacecraft_scan_results" ADD COLUMN "locationId" integer NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "colony_scans" ADD COLUMN "locationId" integer NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "game_events" ADD COLUMN "locationId" integer NULL',
    );

    await queryRunner.query(`
      CREATE FUNCTION sync_spacecraft_location_ids()
      RETURNS trigger AS $function$
      BEGIN
        IF NEW."inSystem" = true THEN
          SELECT location.id INTO NEW."locationId"
          FROM "system_fields" field
          JOIN "space_locations" location ON location."systemFieldId" = field.id
          WHERE field."starSystemId" = NEW."starSystemId"
            AND field.sx = NEW."currentSystemFieldX"
            AND field.sy = NEW."currentSystemFieldY";
        ELSIF NEW."currentLayerId" IS NOT NULL THEN
          SELECT location.id INTO NEW."locationId"
          FROM "galaxy_fields" field
          JOIN "space_locations" location ON location."galaxyFieldId" = field.id
          WHERE field."layerId" = NEW."currentLayerId"
            AND field.cx = NEW."posX"
            AND field.cy = NEW."posY";
        ELSE
          NEW."locationId" := NULL;
        END IF;

        IF NEW."flightOrigin" IS NULL THEN
          NEW."originLocationId" := NULL;
        ELSIF NEW."flightOrigin"->>'scope' = 'SYSTEM' THEN
          SELECT location.id INTO NEW."originLocationId"
          FROM "system_fields" field
          JOIN "space_locations" location ON location."systemFieldId" = field.id
          WHERE field."starSystemId" = (NEW."flightOrigin"->>'systemId')::integer
            AND field.sx = (NEW."flightOrigin"->>'x')::integer
            AND field.sy = (NEW."flightOrigin"->>'y')::integer;
        ELSE
          SELECT location.id INTO NEW."originLocationId"
          FROM "galaxy_fields" field
          JOIN "space_locations" location ON location."galaxyFieldId" = field.id
          WHERE field."layerId" = (NEW."flightOrigin"->>'layerId')::integer
            AND field.cx = (NEW."flightOrigin"->>'x')::integer
            AND field.cy = (NEW."flightOrigin"->>'y')::integer;
        END IF;

        IF NEW."targetSystemId" IS NOT NULL THEN
          SELECT location.id INTO NEW."targetLocationId"
          FROM "system_fields" field
          JOIN "space_locations" location ON location."systemFieldId" = field.id
          WHERE field."starSystemId" = NEW."targetSystemId"
            AND field.sx = 1 AND field.sy = 1;
        ELSIF NEW."targetX" IS NOT NULL AND NEW."targetY" IS NOT NULL AND NEW."inSystem" = true THEN
          SELECT location.id INTO NEW."targetLocationId"
          FROM "system_fields" field
          JOIN "space_locations" location ON location."systemFieldId" = field.id
          WHERE field."starSystemId" = NEW."starSystemId"
            AND field.sx = NEW."targetX" AND field.sy = NEW."targetY";
        ELSIF NEW."targetX" IS NOT NULL AND NEW."targetY" IS NOT NULL THEN
          SELECT location.id INTO NEW."targetLocationId"
          FROM "galaxy_fields" field
          JOIN "space_locations" location ON location."galaxyFieldId" = field.id
          WHERE field."layerId" = NEW."currentLayerId"
            AND field.cx = NEW."targetX" AND field.cy = NEW."targetY";
        ELSE
          NEW."targetLocationId" := NULL;
        END IF;
        RETURN NEW;
      END;
      $function$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER "TRG_spacecraft_sync_location_ids"
      BEFORE INSERT OR UPDATE OF "inSystem", "starSystemId", "currentSystemFieldX", "currentSystemFieldY",
        "currentLayerId", "posX", "posY", "flightOrigin", "targetSystemId", "targetX", "targetY"
      ON "spacecraft" FOR EACH ROW EXECUTE FUNCTION sync_spacecraft_location_ids()
    `);
    await queryRunner.query(`
      CREATE FUNCTION sync_spacecraft_wreck_location_id()
      RETURNS trigger AS $function$
      BEGIN
        IF NEW."inSystem" = true THEN
          SELECT location.id INTO NEW."locationId"
          FROM "system_fields" field
          JOIN "space_locations" location ON location."systemFieldId" = field.id
          WHERE field."starSystemId" = NEW."starSystemId"
            AND field.sx = NEW."currentSystemFieldX"
            AND field.sy = NEW."currentSystemFieldY";
        ELSE
          SELECT location.id INTO NEW."locationId"
          FROM "galaxy_fields" field
          JOIN "space_locations" location ON location."galaxyFieldId" = field.id
          WHERE field."layerId" = NEW."currentLayerId"
            AND field.cx = NEW."posX" AND field.cy = NEW."posY";
        END IF;
        RETURN NEW;
      END;
      $function$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER "TRG_spacecraft_wreck_sync_location_id"
      BEFORE INSERT OR UPDATE OF "inSystem", "starSystemId", "currentSystemFieldX", "currentSystemFieldY",
        "currentLayerId", "posX", "posY"
      ON "spacecraft_wrecks" FOR EACH ROW EXECUTE FUNCTION sync_spacecraft_wreck_location_id()
    `);

    await queryRunner.query(`
      UPDATE "spacecraft" ship
      SET "locationId" = location.id
      FROM "system_fields" field
      JOIN "space_locations" location ON location."systemFieldId" = field.id
      WHERE ship."inSystem" = true
        AND field."starSystemId" = ship."starSystemId"
        AND field.sx = ship."currentSystemFieldX"
        AND field.sy = ship."currentSystemFieldY"
    `);
    await queryRunner.query(`
      UPDATE "spacecraft" ship
      SET "locationId" = location.id
      FROM "galaxy_fields" field
      JOIN "space_locations" location ON location."galaxyFieldId" = field.id
      WHERE ship."inSystem" = false
        AND field."layerId" = ship."currentLayerId"
        AND field.cx = ship."posX"
        AND field.cy = ship."posY"
    `);

    await queryRunner.query(`
      UPDATE "spacecraft" ship
      SET "originLocationId" = location.id
      FROM "system_fields" field
      JOIN "space_locations" location ON location."systemFieldId" = field.id
      WHERE ship."flightOrigin"->>'scope' = 'SYSTEM'
        AND field."starSystemId" = (ship."flightOrigin"->>'systemId')::integer
        AND field.sx = (ship."flightOrigin"->>'x')::integer
        AND field.sy = (ship."flightOrigin"->>'y')::integer
    `);
    await queryRunner.query(`
      UPDATE "spacecraft" ship
      SET "originLocationId" = location.id
      FROM "galaxy_fields" field
      JOIN "space_locations" location ON location."galaxyFieldId" = field.id
      WHERE ship."flightOrigin"->>'scope' = 'GALAXY'
        AND field."layerId" = (ship."flightOrigin"->>'layerId')::integer
        AND field.cx = (ship."flightOrigin"->>'x')::integer
        AND field.cy = (ship."flightOrigin"->>'y')::integer
    `);

    await queryRunner.query(`
      UPDATE "spacecraft" ship
      SET "targetLocationId" = location.id
      FROM "system_fields" field
      JOIN "space_locations" location ON location."systemFieldId" = field.id
      WHERE ship."targetSystemId" IS NOT NULL
        AND field."starSystemId" = ship."targetSystemId"
        AND field.sx = 1
        AND field.sy = 1
    `);
    await queryRunner.query(`
      UPDATE "spacecraft" ship
      SET "targetLocationId" = location.id
      FROM "system_fields" field
      JOIN "space_locations" location ON location."systemFieldId" = field.id
      WHERE ship."targetSystemId" IS NULL
        AND ship."inSystem" = true
        AND ship."targetX" IS NOT NULL
        AND ship."targetY" IS NOT NULL
        AND field."starSystemId" = ship."starSystemId"
        AND field.sx = ship."targetX"
        AND field.sy = ship."targetY"
    `);
    await queryRunner.query(`
      UPDATE "spacecraft" ship
      SET "targetLocationId" = location.id
      FROM "galaxy_fields" field
      JOIN "space_locations" location ON location."galaxyFieldId" = field.id
      WHERE ship."targetSystemId" IS NULL
        AND ship."inSystem" = false
        AND ship."targetX" IS NOT NULL
        AND ship."targetY" IS NOT NULL
        AND field."layerId" = ship."currentLayerId"
        AND field.cx = ship."targetX"
        AND field.cy = ship."targetY"
    `);

    await queryRunner.query(`
      UPDATE "spacecraft_wrecks" wreck
      SET "locationId" = location.id
      FROM "system_fields" field
      JOIN "space_locations" location ON location."systemFieldId" = field.id
      WHERE wreck."inSystem" = true
        AND field."starSystemId" = wreck."starSystemId"
        AND field.sx = wreck."currentSystemFieldX"
        AND field.sy = wreck."currentSystemFieldY"
    `);
    await queryRunner.query(`
      UPDATE "spacecraft_wrecks" wreck
      SET "locationId" = location.id
      FROM "galaxy_fields" field
      JOIN "space_locations" location ON location."galaxyFieldId" = field.id
      WHERE wreck."inSystem" = false
        AND field."layerId" = wreck."currentLayerId"
        AND field.cx = wreck."posX"
        AND field.cy = wreck."posY"
    `);
    await queryRunner.query(`
      UPDATE "colonies" colony
      SET "systemFieldId" = field.id
      FROM "system_fields" field
      WHERE field."starSystemId" = colony."starSystemId"
        AND field.sx = colony."posX"
        AND field.sy = colony."posY"
    `);
    await queryRunner.query(`
      UPDATE "spacecraft_scan_results" scan
      SET "locationId" = location.id
      FROM "system_fields" field
      JOIN "space_locations" location ON location."systemFieldId" = field.id
      WHERE scan."starSystemId" IS NOT NULL
        AND field."starSystemId" = scan."starSystemId"
        AND field.sx = scan.x AND field.sy = scan.y
    `);
    await queryRunner.query(`
      UPDATE "spacecraft_scan_results" scan
      SET "locationId" = location.id
      FROM "galaxy_fields" field
      JOIN "space_locations" location ON location."galaxyFieldId" = field.id
      WHERE scan."starSystemId" IS NULL AND scan."layerId" IS NOT NULL
        AND field."layerId" = scan."layerId"
        AND field.cx = scan.x AND field.cy = scan.y
    `);
    await queryRunner.query(`
      UPDATE "colony_scans" scan
      SET "locationId" = location.id
      FROM "colonies" colony
      JOIN "space_locations" location ON location."systemFieldId" = colony."systemFieldId"
      WHERE colony.id = scan."colonyId"
    `);
    await queryRunner.query(`
      UPDATE "game_events" event
      SET "locationId" = location.id
      FROM "system_fields" field
      JOIN "space_locations" location ON location."systemFieldId" = field.id
      WHERE event.scope = 'SYSTEM'
        AND field."starSystemId" = event."systemId"
        AND field.sx = event.x AND field.sy = event.y
    `);
    await queryRunner.query(`
      UPDATE "game_events" event
      SET "locationId" = location.id
      FROM "galaxy_fields" field
      JOIN "space_locations" location ON location."galaxyFieldId" = field.id
      WHERE event.scope = 'GALAXY'
        AND field."layerId" = event."layerId"
        AND field.cx = event.x AND field.cy = event.y
    `);

    await queryRunner.query(`
      DO $migration$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM "galaxy_fields" field
          LEFT JOIN "space_locations" location ON location."galaxyFieldId" = field.id
          WHERE location.id IS NULL
        ) OR EXISTS (
          SELECT 1 FROM "system_fields" field
          LEFT JOIN "space_locations" location ON location."systemFieldId" = field.id
          WHERE location.id IS NULL
        ) THEN
          RAISE EXCEPTION 'Space location backfill did not cover every starmap field';
        END IF;

        IF EXISTS (
          SELECT 1 FROM "spacecraft"
          WHERE "locationId" IS NULL
            AND (("inSystem" = true AND "starSystemId" IS NOT NULL AND "currentSystemFieldX" IS NOT NULL AND "currentSystemFieldY" IS NOT NULL)
              OR ("inSystem" = false AND "currentLayerId" IS NOT NULL))
        ) THEN
          RAISE EXCEPTION 'Spacecraft current location backfill left positioned ships unresolved';
        END IF;

        IF EXISTS (SELECT 1 FROM "spacecraft" WHERE "flightOrigin" IS NOT NULL AND "originLocationId" IS NULL) THEN
          RAISE EXCEPTION 'Spacecraft origin location backfill left origins unresolved';
        END IF;

        IF EXISTS (
          SELECT 1 FROM "spacecraft"
          WHERE ("targetSystemId" IS NOT NULL OR ("targetX" IS NOT NULL AND "targetY" IS NOT NULL))
            AND "targetLocationId" IS NULL
        ) THEN
          RAISE EXCEPTION 'Spacecraft target location backfill left targets unresolved';
        END IF;

        IF EXISTS (SELECT 1 FROM "spacecraft_wrecks" WHERE "locationId" IS NULL) THEN
          RAISE EXCEPTION 'Spacecraft wreck location backfill left wrecks unresolved';
        END IF;

        IF EXISTS (
          SELECT 1 FROM "colonies"
          WHERE "starSystemId" IS NOT NULL AND "systemFieldId" IS NULL
        ) THEN
          RAISE EXCEPTION 'Colony system field backfill left positioned colonies unresolved';
        END IF;

        IF EXISTS (
          SELECT 1 FROM "colony_scans" scan
          JOIN "colonies" colony ON colony.id = scan."colonyId"
          WHERE colony."systemFieldId" IS NOT NULL AND scan."locationId" IS NULL
        ) THEN
          RAISE EXCEPTION 'Colony scan location backfill left positioned scans unresolved';
        END IF;

        IF EXISTS (
          SELECT 1 FROM "game_events"
          WHERE scope IN ('GALAXY', 'SYSTEM')
            AND x IS NOT NULL
            AND y IS NOT NULL
            AND "locationId" IS NULL
        ) THEN
          RAISE EXCEPTION 'Game event location backfill left positioned events unresolved';
        END IF;
      END;
      $migration$
    `);

    await queryRunner.query(
      'CREATE INDEX "IDX_spacecraft_location" ON "spacecraft" ("locationId")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_spacecraft_origin_location" ON "spacecraft" ("originLocationId")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_spacecraft_target_location" ON "spacecraft" ("targetLocationId")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_spacecraft_wreck_location" ON "spacecraft_wrecks" ("locationId")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_colonies_system_field" ON "colonies" ("systemFieldId")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_spacecraft_scan_results_location" ON "spacecraft_scan_results" ("locationId")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_colony_scans_location" ON "colony_scans" ("locationId")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_game_events_location" ON "game_events" ("locationId")',
    );
    await queryRunner.query(
      'ALTER TABLE "spacecraft" ADD CONSTRAINT "FK_spacecraft_location" FOREIGN KEY ("locationId") REFERENCES "space_locations"("id") ON DELETE SET NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "spacecraft" ADD CONSTRAINT "FK_spacecraft_origin_location" FOREIGN KEY ("originLocationId") REFERENCES "space_locations"("id") ON DELETE SET NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "spacecraft" ADD CONSTRAINT "FK_spacecraft_target_location" FOREIGN KEY ("targetLocationId") REFERENCES "space_locations"("id") ON DELETE SET NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "spacecraft_wrecks" ADD CONSTRAINT "FK_spacecraft_wreck_location" FOREIGN KEY ("locationId") REFERENCES "space_locations"("id") ON DELETE SET NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "colonies" ADD CONSTRAINT "FK_colonies_system_field" FOREIGN KEY ("systemFieldId") REFERENCES "system_fields"("id") ON DELETE SET NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "spacecraft_scan_results" ADD CONSTRAINT "FK_spacecraft_scan_results_location" FOREIGN KEY ("locationId") REFERENCES "space_locations"("id") ON DELETE SET NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "colony_scans" ADD CONSTRAINT "FK_colony_scans_location" FOREIGN KEY ("locationId") REFERENCES "space_locations"("id") ON DELETE SET NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "game_events" ADD CONSTRAINT "FK_game_events_location" FOREIGN KEY ("locationId") REFERENCES "space_locations"("id") ON DELETE SET NULL',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "game_events" DROP CONSTRAINT "FK_game_events_location"',
    );
    await queryRunner.query(
      'ALTER TABLE "colony_scans" DROP CONSTRAINT "FK_colony_scans_location"',
    );
    await queryRunner.query(
      'ALTER TABLE "spacecraft_scan_results" DROP CONSTRAINT "FK_spacecraft_scan_results_location"',
    );
    await queryRunner.query('DROP INDEX "IDX_game_events_location"');
    await queryRunner.query('DROP INDEX "IDX_colony_scans_location"');
    await queryRunner.query(
      'DROP INDEX "IDX_spacecraft_scan_results_location"',
    );
    await queryRunner.query(
      'ALTER TABLE "game_events" DROP COLUMN "locationId"',
    );
    await queryRunner.query(
      'ALTER TABLE "colony_scans" DROP COLUMN "locationId"',
    );
    await queryRunner.query(
      'ALTER TABLE "spacecraft_scan_results" DROP COLUMN "locationId"',
    );
    await queryRunner.query(
      'ALTER TABLE "colonies" DROP CONSTRAINT "FK_colonies_system_field"',
    );
    await queryRunner.query('DROP INDEX "IDX_colonies_system_field"');
    await queryRunner.query(
      'ALTER TABLE "colonies" DROP COLUMN "systemFieldId"',
    );
    await queryRunner.query(
      'DROP TRIGGER "TRG_spacecraft_wreck_sync_location_id" ON "spacecraft_wrecks"',
    );
    await queryRunner.query(
      'DROP FUNCTION sync_spacecraft_wreck_location_id()',
    );
    await queryRunner.query(
      'DROP TRIGGER "TRG_spacecraft_sync_location_ids" ON "spacecraft"',
    );
    await queryRunner.query('DROP FUNCTION sync_spacecraft_location_ids()');
    await queryRunner.query(
      'DROP TRIGGER "TRG_system_fields_space_location" ON "system_fields"',
    );
    await queryRunner.query(
      'DROP FUNCTION create_system_field_space_location()',
    );
    await queryRunner.query(
      'DROP TRIGGER "TRG_galaxy_fields_space_location" ON "galaxy_fields"',
    );
    await queryRunner.query(
      'DROP FUNCTION create_galaxy_field_space_location()',
    );
    await queryRunner.query(
      'ALTER TABLE "spacecraft_wrecks" DROP CONSTRAINT "FK_spacecraft_wreck_location"',
    );
    await queryRunner.query(
      'ALTER TABLE "spacecraft" DROP CONSTRAINT "FK_spacecraft_target_location"',
    );
    await queryRunner.query(
      'ALTER TABLE "spacecraft" DROP CONSTRAINT "FK_spacecraft_origin_location"',
    );
    await queryRunner.query(
      'ALTER TABLE "spacecraft" DROP CONSTRAINT "FK_spacecraft_location"',
    );
    await queryRunner.query('DROP INDEX "IDX_spacecraft_wreck_location"');
    await queryRunner.query('DROP INDEX "IDX_spacecraft_target_location"');
    await queryRunner.query('DROP INDEX "IDX_spacecraft_origin_location"');
    await queryRunner.query('DROP INDEX "IDX_spacecraft_location"');
    await queryRunner.query(
      'ALTER TABLE "spacecraft_wrecks" DROP COLUMN "locationId"',
    );
    await queryRunner.query(
      'ALTER TABLE "spacecraft" DROP COLUMN "targetLocationId"',
    );
    await queryRunner.query(
      'ALTER TABLE "spacecraft" DROP COLUMN "originLocationId"',
    );
    await queryRunner.query(
      'ALTER TABLE "spacecraft" DROP COLUMN "locationId"',
    );
    await queryRunner.query('DROP TABLE "space_locations"');
  }
}
