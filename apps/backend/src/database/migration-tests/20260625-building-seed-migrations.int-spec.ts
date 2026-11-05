import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DataSource, QueryRunner } from 'typeorm';
import { RepairColonyPopulationStats20260625100000 } from '../migrations/20260625100000-repair-colony-population-stats';
import { MigrateBonusFieldBuildings20260702100000 } from '../migrations/20260702100000-migrate-bonus-field-buildings';

describe('building seed migrations (Postgres)', () => {
  let dataSource: DataSource;
  let isolated: DataSource;
  let runner: QueryRunner;
  let schema: string;
  let previousSeedPath: string | undefined;
  const fixture = join(
    __dirname,
    '../../testing/integration/fixtures/migration-buildings.yaml',
  );

  beforeAll(async () => {
    dataSource = await new DataSource({
      type: 'postgres',
      url: process.env.INTEGRATION_DATABASE_URL,
    }).initialize();
  });

  beforeEach(async () => {
    previousSeedPath = process.env.SWU_MIGRATION_BUILDING_SEED_PATH;
    process.env.SWU_MIGRATION_BUILDING_SEED_PATH = fixture;
    schema = `building_migration_${randomUUID().replace(/-/g, '')}`;
    await dataSource.query(`CREATE SCHEMA "${schema}"`);
    isolated = await new DataSource({
      type: 'postgres',
      url: process.env.INTEGRATION_DATABASE_URL,
      schema,
    }).initialize();
    runner = isolated.createQueryRunner();
    await runner.connect();
    await runner.query(`SET search_path TO "${schema}"`);
    await runner.query(`
      CREATE TABLE colonies (id integer PRIMARY KEY, population integer NOT NULL);
      CREATE TABLE colony_stats ("colonyId" integer PRIMARY KEY, workers integer NOT NULL, workless integer NOT NULL, "maxPopulation" integer NOT NULL);
      CREATE TABLE colony_fields (id integer PRIMARY KEY, "colonyId" integer NOT NULL, "fieldType" integer NOT NULL, "terrainTileId" integer, "buildingId" integer, "isBuilding" boolean NOT NULL, "isActive" boolean NOT NULL DEFAULT true);
      INSERT INTO colonies VALUES (1, 999), (2, 999);
      INSERT INTO colony_stats VALUES (1, 10, 5, 0), (2, 80, 5, 0);
      INSERT INTO colony_fields VALUES
        (1, 1, 3, 10001, 101, false, true),
        (2, 1, 3, 10001, 102, false, false),
        (3, 1, 3, 10001, 102, true, true);
    `);
  });

  afterEach(async () => {
    if (previousSeedPath === undefined)
      delete process.env.SWU_MIGRATION_BUILDING_SEED_PATH;
    else process.env.SWU_MIGRATION_BUILDING_SEED_PATH = previousSeedPath;
    try {
      if (runner && !runner.isReleased) {
        if (runner.isTransactionActive) await runner.rollbackTransaction();
        await runner.query('SET search_path TO public');
        await runner.release();
      }
    } finally {
      try {
        if (isolated?.isInitialized) await isolated.destroy();
      } finally {
        if (dataSource?.isInitialized && schema)
          await dataSource.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      }
    }
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it('receives the absolute committed fixture from global setup', () => {
    expect(previousSeedPath).toBe(fixture);
  });

  it.each([
    ['missing file', null],
    ['invalid YAML', 'buildings: ['],
    ['missing buildings', 'other: []'],
    ['empty buildings', 'buildings: []'],
    ['invalid building', 'buildings:\n  - id: nope'],
    [
      'invalid alternative',
      'buildings:\n  - id: 101\n    fieldAlternatives:\n      - fieldtype: nope\n        alternateBuildingId: 102',
    ],
  ])(
    'rejects explicitly configured %s for both migrations',
    async (_label, contents) => {
      const directory = mkdtempSync(join(tmpdir(), 'swu-seed-'));
      try {
        const path = join(directory, 'buildings.yaml');
        if (contents !== null) writeFileSync(path, contents);
        process.env.SWU_MIGRATION_BUILDING_SEED_PATH = path;
        await runner.startTransaction();
        try {
          await expect(
            new RepairColonyPopulationStats20260625100000().up(runner),
          ).rejects.toThrow();
        } finally {
          await runner.rollbackTransaction();
        }
        await expect(
          new MigrateBonusFieldBuildings20260702100000().up(runner),
        ).rejects.toThrow();
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    },
  );

  it('maps bonus buildings once and restores only unchanged mappings on down', async () => {
    const migration = new MigrateBonusFieldBuildings20260702100000();
    await migration.up(runner);
    await migration.up(runner);
    expect(
      await runner.query(
        'SELECT id, "buildingId" FROM colony_fields ORDER BY id',
      ),
    ).toEqual([
      { id: 1, buildingId: 102 },
      { id: 2, buildingId: 102 },
      { id: 3, buildingId: 102 },
    ]);
    expect(
      await runner.query(
        'SELECT * FROM colony_field_bonus_building_backup_20260702100000',
      ),
    ).toEqual([{ fieldId: 1, oldBuildingId: 101, newBuildingId: 102 }]);
    await runner.query(
      'UPDATE colony_fields SET "buildingId" = 103 WHERE id = 1',
    );
    await migration.down(runner);
    expect(
      await runner.query(
        'SELECT id, "buildingId" FROM colony_fields ORDER BY id',
      ),
    ).toEqual([
      { id: 1, buildingId: 103 },
      { id: 2, buildingId: 102 },
      { id: 3, buildingId: 102 },
    ]);
    expect(
      await runner.hasTable(
        'colony_field_bonus_building_backup_20260702100000',
      ),
    ).toBe(false);
    await migration.down(runner);
  });

  it('restores the original bonus building on rollback', async () => {
    const migration = new MigrateBonusFieldBuildings20260702100000();
    await migration.up(runner);
    await migration.down(runner);
    expect(
      await runner.query(
        'SELECT id, "buildingId" FROM colony_fields ORDER BY id',
      ),
    ).toEqual([
      { id: 1, buildingId: 101 },
      { id: 2, buildingId: 102 },
      { id: 3, buildingId: 102 },
    ]);
  });

  it('repairs population using the explicitly selected housing fixture and is repeatable', async () => {
    const migration = new RepairColonyPopulationStats20260625100000();
    for (let run = 0; run < 2; run++) {
      await runner.startTransaction();
      await migration.up(runner);
      await runner.commitTransaction();
      expect(
        await runner.query('SELECT * FROM colony_stats ORDER BY "colonyId"'),
      ).toEqual([
        { colonyId: 1, workers: 10, workless: 5, maxPopulation: 40 },
        { colonyId: 2, workers: 80, workless: 5, maxPopulation: 85 },
      ]);
      expect(await runner.query('SELECT * FROM colonies ORDER BY id')).toEqual([
        { id: 1, population: 15 },
        { id: 2, population: 85 },
      ]);
    }
    await migration.down(runner);
    expect(
      await runner.query('SELECT population FROM colonies ORDER BY id'),
    ).toEqual([{ population: 15 }, { population: 85 }]);
  });
});
