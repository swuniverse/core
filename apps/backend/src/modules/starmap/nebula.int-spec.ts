import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { NebulaService } from './nebula.service';
import { NEBULA_FIELD_IDS } from './generator/nebula-generator';

const settings = {
  seed: 'swu-nebula-v1',
  target: 'BOTH' as const,
  density: 'BALANCED' as const,
};

describe('nebula preview and atomic application (Postgres)', () => {
  let root: DataSource,
    database: DataSource,
    service: NebulaService,
    schema: string;
  beforeAll(async () => {
    root = await new DataSource({
      type: 'postgres',
      url: process.env.INTEGRATION_DATABASE_URL,
    }).initialize();
    schema = `nebula_${randomUUID().replace(/-/g, '')}`;
    await root.query(`CREATE SCHEMA "${schema}"`);
    database = await new DataSource({
      type: 'postgres',
      url: process.env.INTEGRATION_DATABASE_URL,
      extra: { options: `-c search_path=${schema}` },
    }).initialize();
    service = new NebulaService(database);
    await database.query(`
      CREATE TABLE layers (id int PRIMARY KEY, name text, width int, height int);
      CREATE TABLE galaxy_field_types (id int PRIMARY KEY, key text, name text, category text,
        passable boolean, "energyCost" int, damage int, "specialDamage" int DEFAULT 0, effects text, "miningResources" jsonb DEFAULT '[]');
      CREATE TABLE star_systems (id int PRIMARY KEY, "layerId" int, name text, cx int, cy int, "maxX" int, "maxY" int, "systemTypeId" int, "landmarkKey" text);
      CREATE TABLE galaxy_fields (id int PRIMARY KEY, "layerId" int, cx int, cy int, "fieldTypeId" int DEFAULT 1,
        "starSystemId" int, "systemTypeId" int, "isPassable" boolean DEFAULT true, "energyCost" int DEFAULT 0,
        damage int DEFAULT 6, effects text, "effectFlags" text, "passableOverride" boolean, "borderTypeId" int, "adminRegionKey" text);
      CREATE TABLE system_fields (id int PRIMARY KEY, "starSystemId" int, sx int, sy int, "fieldTypeId" int DEFAULT 1,
        "celestialObjectId" int, "isPassable" boolean DEFAULT true, "energyCost" int DEFAULT 0, damage int DEFAULT 6, effects text);
      CREATE TABLE celestial_objects (id int PRIMARY KEY, "starSystemId" int, "posX" int, "posY" int, "classId" int, name text);
      CREATE TABLE users (id int PRIMARY KEY, "starterColonyId" int);
      CREATE TABLE colonies (id int PRIMARY KEY, "starSystemId" int, "systemFieldId" int, "posX" int, "posY" int);
      CREATE TABLE onboarding_selections (id int PRIMARY KEY, "selectedSystemId" int);
      CREATE TABLE space_locations (id int PRIMARY KEY, "galaxyFieldId" int, "systemFieldId" int);
      CREATE TABLE spacecraft (id int PRIMARY KEY, "locationId" int);
      CREATE TABLE wormholes (id int PRIMARY KEY, "entryLayerId" int, "exitLayerId" int, "entryCx" int, "entryCy" int, "exitCx" int, "exitCy" int);
      CREATE TABLE hyperspace_routes (id int PRIMARY KEY, "layerId" int);
      CREATE TABLE hyperspace_route_segments (id int PRIMARY KEY, "routeId" int, "fromSystemId" int, "toSystemId" int, "controlPointJson" jsonb);
    `);
  });
  beforeEach(async () => {
    await database.query(`TRUNCATE layers, galaxy_field_types, star_systems, galaxy_fields, system_fields, celestial_objects,
      users, colonies, onboarding_selections, space_locations, spacecraft, wormholes, hyperspace_routes, hyperspace_route_segments`);
    await database.query(`INSERT INTO galaxy_field_types (id, key, name, category, passable, "energyCost", damage) VALUES
      (1, 'EMPTY_SPACE', 'Weltraum', 'space', true, 0, 6), (9001, 'STAR_CORE', 'Stern', 'star', false, 0, 100)`);
    for (const id of NEBULA_FIELD_IDS)
      await database.query(
        `INSERT INTO galaxy_field_types
      (id, key, name, category, passable, "energyCost", damage, "miningResources") VALUES ($1,$2,$2,'nebula',true,$3,$4,'[{"commodityId":3,"rate":100}]')`,
        [id, `Nebel ${id}`, id % 10, 8 + 2 * (id % 10)],
      );
    await database.query(`INSERT INTO layers VALUES (1,'Test Galaxy',40,40);
      INSERT INTO star_systems VALUES (1,1,'Starter',20,20,22,22,1001,'starter'), (2,1,'Destination',30,30,22,22,1001,NULL);
      INSERT INTO galaxy_fields (id,"layerId",cx,cy) SELECT (y-1)*40+x,1,x,y FROM generate_series(1,40) x CROSS JOIN generate_series(1,40) y;
      UPDATE galaxy_fields SET "starSystemId" = 1, "systemTypeId" = 1001 WHERE cx = 20 AND cy = 20;
      UPDATE galaxy_fields SET "starSystemId" = 2, "systemTypeId" = 1001 WHERE cx = 30 AND cy = 30;
      INSERT INTO system_fields (id,"starSystemId",sx,sy) SELECT (y-1)*22+x,1,x,y FROM generate_series(1,22) x CROSS JOIN generate_series(1,22) y;
      INSERT INTO celestial_objects VALUES (1,1,11,11,9001,'Stern');
      UPDATE system_fields SET "celestialObjectId" = 1, "fieldTypeId" = 9001, "isPassable" = false, damage = 100 WHERE sx = 11 AND sy = 11;
      INSERT INTO colonies VALUES (1,1,47,3,3);
      INSERT INTO users VALUES (1,1);
      INSERT INTO wormholes VALUES (1,1,2,5,5,8,8);
      INSERT INTO hyperspace_routes VALUES (1,1);
      INSERT INTO hyperspace_route_segments VALUES (1,1,1,2,'[{"x":30,"y":20}]');
    `);
  });
  afterAll(async () => {
    await database?.destroy();
    if (schema) await root.query(`DROP SCHEMA "${schema}" CASCADE`);
    await root?.destroy();
  });

  it('previews without writing and protects starts, routes, wormholes, celestial objects and every entry edge', async () => {
    const preview = await service.preview(1, settings);
    expect(preview.summary.changedFields).toBeGreaterThan(0);
    expect(
      (
        await database.query(
          'SELECT count(*)::int AS count FROM galaxy_fields WHERE "fieldTypeId" <> 1',
        )
      )[0].count,
    ).toBe(0);
    for (const map of preview.maps)
      for (const change of map.changes) {
        if (map.scope === 'GALAXY') {
          expect(
            Math.max(Math.abs(change.x - 20), Math.abs(change.y - 20)),
          ).toBeGreaterThan(2);
          expect(
            Math.max(Math.abs(change.x - 5), Math.abs(change.y - 5)),
          ).toBeGreaterThan(2);
          expect(
            !(
              change.x >= 19 &&
              change.x <= 31 &&
              change.y >= 19 &&
              change.y <= 21
            ),
          ).toBe(true);
          expect(
            !(
              change.x >= 29 &&
              change.x <= 31 &&
              change.y >= 19 &&
              change.y <= 31
            ),
          ).toBe(true);
        } else {
          expect(change.x).toBeGreaterThan(1);
          expect(change.x).toBeLessThan(22);
          expect(change.y).toBeGreaterThan(1);
          expect(change.y).toBeLessThan(22);
          expect(
            Math.max(Math.abs(change.x - 11), Math.abs(change.y - 11)),
          ).toBeGreaterThan(1);
          expect(`${change.x},${change.y}`).not.toBe('3,3');
        }
      }
  });

  it('applies both scopes with canonical costs/resources and does not expand when repeated', async () => {
    await database.query(
      `UPDATE galaxy_field_types SET effects = '["SCAN_PENALTY"]' WHERE id IN (100,101,102,120,121,122,140,141,142,170,171,172)`,
    );
    const preview = await service.preview(1, settings);
    // Raw queries need the same simple-json decoding as TypeORM repositories.
    expect(
      preview.summary.byFieldType.every((type) => Array.isArray(type.effects)),
    ).toBe(true);
    expect(
      await service.apply(1, { ...settings, fingerprint: preview.fingerprint }),
    ).toEqual({ changedFields: preview.summary.changedFields });
    for (const table of ['galaxy_fields', 'system_fields']) {
      const rows =
        await database.query(`SELECT f.*, t."energyCost" AS expected_cost, t.damage AS expected_damage, t.effects AS expected_effects
        FROM ${table} f JOIN galaxy_field_types t ON t.id = f."fieldTypeId" WHERE t.category = 'nebula'`);
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.energyCost).toBe(row.expected_cost);
        expect(row.damage).toBe(row.expected_damage);
        expect(row.effects).toBe(row.expected_effects);
      }
    }
    const again = await service.preview(1, settings);
    expect(again.summary.changedFields).toBe(0);
    expect(
      await service.apply(1, { ...settings, fingerprint: again.fingerprint }),
    ).toEqual({ changedFields: 0 });
  });

  it('rejects stale previews and protects new occupants and individual field overrides', async () => {
    const preview = await service.preview(1, settings);
    const changes = preview.maps.find((map) => map.scope === 'GALAXY')!.changes;
    const [occupied, override, effects] = changes;
    await database.query('INSERT INTO space_locations VALUES (1,$1,NULL)', [
      occupied.fieldId,
    ]);
    await database.query('INSERT INTO spacecraft VALUES (1,1)');
    await database.query(
      'UPDATE galaxy_fields SET "passableOverride" = true WHERE id = $1',
      [override.fieldId],
    );
    await database.query(
      `UPDATE galaxy_fields SET effects = '["NO_MEASUREPOINT"]' WHERE id = $1`,
      [effects.fieldId],
    );
    await expect(
      service.apply(1, { ...settings, fingerprint: preview.fingerprint }),
    ).rejects.toThrow(ConflictException);
    const current = await service.preview(1, settings);
    const ids = current.maps
      .find((map) => map.scope === 'GALAXY')!
      .changes.map((change) => change.fieldId);
    expect(ids).not.toContain(occupied.fieldId);
    expect(ids).not.toContain(override.fieldId);
    expect(ids).not.toContain(effects.fieldId);
    expect(
      (
        await database.query(
          'SELECT count(*)::int AS count FROM galaxy_fields WHERE "fieldTypeId" <> 1',
        )
      )[0].count,
    ).toBe(0);
  });

  it('rolls back galaxy changes if a system update fails', async () => {
    const preview = await service.preview(1, settings);
    expect(
      preview.maps.some((map) => map.scope === 'SYSTEM' && map.changes.length),
    ).toBe(true);
    await database.query(`CREATE FUNCTION reject_nebula() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test failure'; END $$;
      CREATE TRIGGER reject_nebula BEFORE UPDATE ON system_fields FOR EACH ROW EXECUTE FUNCTION reject_nebula()`);
    try {
      await expect(
        service.apply(1, { ...settings, fingerprint: preview.fingerprint }),
      ).rejects.toThrow('test failure');
      expect(
        (
          await database.query(
            'SELECT count(*)::int AS count FROM galaxy_fields WHERE "fieldTypeId" <> 1',
          )
        )[0].count,
      ).toBe(0);
    } finally {
      await database.query(
        'DROP TRIGGER reject_nebula ON system_fields; DROP FUNCTION reject_nebula()',
      );
    }
  });

  it('allows only one concurrent application of a preview', async () => {
    const preview = await service.preview(1, settings);
    const results = await Promise.allSettled([
      service.apply(1, { ...settings, fingerprint: preview.fingerprint }),
      service.apply(1, { ...settings, fingerprint: preview.fingerprint }),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
  });

  it('validates settings and rejects an unsafe modified nebula type', async () => {
    await expect(service.preview(1, { ...settings, seed: '' })).rejects.toThrow(
      BadRequestException,
    );
    await database.query(
      'UPDATE galaxy_field_types SET passable = false WHERE id = 102',
    );
    await expect(service.preview(1, settings)).rejects.toThrow(
      BadRequestException,
    );
  });
});
