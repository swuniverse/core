import { randomUUID } from 'node:crypto';
import { DataSource, QueryRunner } from 'typeorm';
import { AddStarSystemDatabaseCatalog20261115140000 } from '../../database/migrations/20261115140000-add-star-system-database-catalog';

describe('star system database catalog migration', () => {
  let dataSource: DataSource;
  let runner: QueryRunner;
  let schema: string;
  const migration = new AddStarSystemDatabaseCatalog20261115140000();

  beforeAll(async () => {
    dataSource = await new DataSource({ type: 'postgres', url: process.env.INTEGRATION_DATABASE_URL }).initialize();
  });

  beforeEach(async () => {
    schema = `star_catalog_${randomUUID().replace(/-/g, '')}`;
    runner = dataSource.createQueryRunner();
    await runner.connect();
    await runner.query(`CREATE SCHEMA "${schema}"`);
    await runner.query(`SET search_path TO "${schema}"`);
    await runner.query('CREATE TABLE "star_systems" ("id" serial PRIMARY KEY, "name" varchar NOT NULL, "landmarkKey" varchar(64))');
    await runner.query(`INSERT INTO "star_systems" ("name", "landmarkKey") VALUES ('Tatooine', NULL), ('Kessel', 'kessel'), ('SWU-Test', 'swu-test-system')`);
  });

  afterEach(async () => {
    await runner.query('SET search_path TO public');
    await runner.query(`DROP SCHEMA "${schema}" CASCADE`);
    await runner.release();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('backfills existing systems as catalogued and excludes the SWU test system', async () => {
    await migration.up(runner);

    expect(await runner.query('SELECT "name", "inDatabaseCatalog" FROM "star_systems" ORDER BY "id"')).toEqual([
      { name: 'Tatooine', inDatabaseCatalog: true },
      { name: 'Kessel', inDatabaseCatalog: true },
      { name: 'SWU-Test', inDatabaseCatalog: false },
    ]);
    await runner.query(`INSERT INTO "star_systems" ("name") VALUES ('Neu')`);
    expect((await runner.query(`SELECT "inDatabaseCatalog" FROM "star_systems" WHERE "name" = 'Neu'`))[0]).toEqual({
      inDatabaseCatalog: true,
    });
  });
});
