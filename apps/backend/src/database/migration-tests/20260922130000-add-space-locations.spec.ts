import { QueryRunner } from 'typeorm';
import { AddSpaceLocations20260922130000 } from '../migrations/20260922130000-add-space-locations';

const compact = (sql: string): string => sql.replace(/\s+/g, ' ').trim();

const recordingQueryRunner = () => {
  const queries: string[] = [];
  const queryRunner = {
    query: jest.fn(async (sql: string) => {
      queries.push(compact(sql));
    }),
  } as unknown as QueryRunner;

  return { queries, queryRunner };
};

const indexOfQuery = (queries: string[], fragment: string): number => {
  const index = queries.findIndex((query) => query.includes(fragment));
  expect(index).toBeGreaterThanOrEqual(0);
  return index;
};

describe('AddSpaceLocations20260922130000 migration', () => {
  it('creates the location schema before backfilling and constraining consumers', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddSpaceLocations20260922130000().up(queryRunner);

    const createTable = indexOfQuery(queries, 'CREATE TABLE "space_locations"');
    const galaxyIndex = indexOfQuery(
      queries,
      'CREATE UNIQUE INDEX "IDX_space_locations_galaxy_field"',
    );
    const galaxyLocations = indexOfQuery(
      queries,
      `INSERT INTO "space_locations" ("kind", "galaxyFieldId")`,
    );
    const addSpacecraftColumn = indexOfQuery(
      queries,
      'ALTER TABLE "spacecraft" ADD COLUMN "locationId"',
    );
    const backfillSpacecraft = indexOfQuery(
      queries,
      'UPDATE "spacecraft" ship SET "locationId"',
    );
    const validation = indexOfQuery(queries, 'DO $migration$');
    const spacecraftIndex = indexOfQuery(
      queries,
      'CREATE INDEX "IDX_spacecraft_location"',
    );
    const spacecraftForeignKey = indexOfQuery(
      queries,
      'ADD CONSTRAINT "FK_spacecraft_location"',
    );

    expect(queries[createTable]).toEqual(
      expect.stringContaining(
        `CHECK ( ("kind" = 'GALAXY_FIELD' AND "galaxyFieldId" IS NOT NULL AND "systemFieldId" IS NULL) OR ("kind" = 'SYSTEM_FIELD' AND "galaxyFieldId" IS NULL AND "systemFieldId" IS NOT NULL) )`,
      ),
    );
    expect(queries[createTable]).toEqual(
      expect.stringContaining(
        'FOREIGN KEY ("galaxyFieldId") REFERENCES "galaxy_fields"("id") ON DELETE CASCADE',
      ),
    );
    expect(queries[createTable]).toEqual(
      expect.stringContaining(
        'FOREIGN KEY ("systemFieldId") REFERENCES "system_fields"("id") ON DELETE CASCADE',
      ),
    );
    expect(createTable).toBeLessThan(galaxyIndex);
    expect(galaxyIndex).toBeLessThan(galaxyLocations);
    expect(galaxyLocations).toBeLessThan(addSpacecraftColumn);
    expect(addSpacecraftColumn).toBeLessThan(backfillSpacecraft);
    expect(backfillSpacecraft).toBeLessThan(validation);
    expect(validation).toBeLessThan(spacecraftIndex);
    expect(spacecraftIndex).toBeLessThan(spacecraftForeignKey);
  });

  it('backfills every introduced location reference using canonical coordinates', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddSpaceLocations20260922130000().up(queryRunner);

    const sql = queries.join('\n');
    expect(sql).toContain(
      'UPDATE "spacecraft" ship SET "locationId" = location.id FROM "system_fields" field',
    );
    expect(sql).toContain(
      'UPDATE "spacecraft" ship SET "locationId" = location.id FROM "galaxy_fields" field',
    );
    expect(sql).toContain(
      'UPDATE "spacecraft" ship SET "originLocationId" = location.id FROM "system_fields" field',
    );
    expect(sql).toContain(
      'UPDATE "spacecraft" ship SET "originLocationId" = location.id FROM "galaxy_fields" field',
    );
    expect(sql).toContain(
      'UPDATE "spacecraft" ship SET "targetLocationId" = location.id FROM "system_fields" field',
    );
    expect(sql).toContain(
      'UPDATE "spacecraft_wrecks" wreck SET "locationId" = location.id',
    );
    expect(sql).toContain(
      'UPDATE "colonies" colony SET "systemFieldId" = field.id',
    );
    expect(sql).toContain(
      'UPDATE "spacecraft_scan_results" scan SET "locationId" = location.id',
    );
    expect(sql).toContain(
      'UPDATE "colony_scans" scan SET "locationId" = location.id',
    );
    expect(sql).toContain(
      'UPDATE "game_events" event SET "locationId" = location.id',
    );
  });

  it('installs valid trigger functions for new fields and legacy location writes', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddSpaceLocations20260922130000().up(queryRunner);

    const functions = queries.filter((query) =>
      query.startsWith('CREATE FUNCTION'),
    );
    expect(functions).toHaveLength(4);
    for (const fn of functions) {
      expect(fn).toMatch(/RETURN NEW; END; \$function\$ LANGUAGE plpgsql$/);
    }

    const sql = queries.join('\n');
    expect(sql).toContain(
      'CREATE TRIGGER "TRG_galaxy_fields_space_location" AFTER INSERT ON "galaxy_fields"',
    );
    expect(sql).toContain(
      'CREATE TRIGGER "TRG_system_fields_space_location" AFTER INSERT ON "system_fields"',
    );
    expect(sql).toContain(
      'CREATE TRIGGER "TRG_spacecraft_sync_location_ids" BEFORE INSERT OR UPDATE OF',
    );
    expect(sql).toContain(
      'CREATE TRIGGER "TRG_spacecraft_wreck_sync_location_id" BEFORE INSERT OR UPDATE OF',
    );
    expect(
      indexOfQuery(
        queries,
        'CREATE FUNCTION create_galaxy_field_space_location()',
      ),
    ).toBeLessThan(
      indexOfQuery(
        queries,
        'CREATE TRIGGER "TRG_galaxy_fields_space_location"',
      ),
    );
    expect(
      indexOfQuery(queries, 'CREATE FUNCTION sync_spacecraft_location_ids()'),
    ).toBeLessThan(
      indexOfQuery(
        queries,
        'CREATE TRIGGER "TRG_spacecraft_sync_location_ids"',
      ),
    );
  });

  it('validates unresolved canonical and legacy locations before adding constraints', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddSpaceLocations20260922130000().up(queryRunner);

    const validation = queries[indexOfQuery(queries, 'DO $migration$')];
    expect(validation).toMatch(/END; \$migration\$$/);
    expect(validation).toContain(
      'Space location backfill did not cover every starmap field',
    );
    expect(validation).toContain(
      'Spacecraft current location backfill left positioned ships unresolved',
    );
    expect(validation).toContain(
      'Spacecraft origin location backfill left origins unresolved',
    );
    expect(validation).toContain(
      'Spacecraft target location backfill left targets unresolved',
    );
    expect(validation).toContain(
      'Spacecraft wreck location backfill left wrecks unresolved',
    );
    expect(validation).toContain(
      'Colony system field backfill left positioned colonies unresolved',
    );
    expect(validation).toContain(
      'Colony scan location backfill left positioned scans unresolved',
    );
    expect(validation).toContain(
      'Game event location backfill left positioned events unresolved',
    );
  });

  it('drops dependent constraints and triggers before columns and the location table', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddSpaceLocations20260922130000().down(queryRunner);

    const dropConsumerForeignKeys = [
      'FK_game_events_location',
      'FK_colony_scans_location',
      'FK_spacecraft_scan_results_location',
      'FK_colonies_system_field',
      'FK_spacecraft_wreck_location',
      'FK_spacecraft_target_location',
      'FK_spacecraft_origin_location',
      'FK_spacecraft_location',
    ].map((name) => indexOfQuery(queries, `DROP CONSTRAINT "${name}"`));
    const dropLocationTable = indexOfQuery(
      queries,
      'DROP TABLE "space_locations"',
    );

    for (const foreignKey of dropConsumerForeignKeys) {
      expect(foreignKey).toBeLessThan(dropLocationTable);
    }
    for (const index of [
      'IDX_game_events_location',
      'IDX_colony_scans_location',
      'IDX_spacecraft_scan_results_location',
      'IDX_colonies_system_field',
      'IDX_spacecraft_wreck_location',
      'IDX_spacecraft_target_location',
      'IDX_spacecraft_origin_location',
      'IDX_spacecraft_location',
    ]) {
      expect(indexOfQuery(queries, `DROP INDEX "${index}"`)).toBeLessThan(
        dropLocationTable,
      );
    }
    for (const column of [
      'ALTER TABLE "game_events" DROP COLUMN "locationId"',
      'ALTER TABLE "colony_scans" DROP COLUMN "locationId"',
      'ALTER TABLE "spacecraft_scan_results" DROP COLUMN "locationId"',
      'ALTER TABLE "colonies" DROP COLUMN "systemFieldId"',
      'ALTER TABLE "spacecraft_wrecks" DROP COLUMN "locationId"',
      'ALTER TABLE "spacecraft" DROP COLUMN "targetLocationId"',
      'ALTER TABLE "spacecraft" DROP COLUMN "originLocationId"',
      'ALTER TABLE "spacecraft" DROP COLUMN "locationId"',
    ]) {
      expect(indexOfQuery(queries, column)).toBeLessThan(dropLocationTable);
    }
    expect(
      indexOfQuery(
        queries,
        'DROP TRIGGER "TRG_spacecraft_wreck_sync_location_id"',
      ),
    ).toBeLessThan(
      indexOfQuery(
        queries,
        'DROP FUNCTION sync_spacecraft_wreck_location_id()',
      ),
    );
    expect(
      indexOfQuery(queries, 'DROP TRIGGER "TRG_spacecraft_sync_location_ids"'),
    ).toBeLessThan(
      indexOfQuery(queries, 'DROP FUNCTION sync_spacecraft_location_ids()'),
    );
    expect(queries.at(-1)).toBe('DROP TABLE "space_locations"');
  });
});
