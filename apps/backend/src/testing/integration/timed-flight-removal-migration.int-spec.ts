import { randomUUID } from 'node:crypto';
import { DataSource, QueryRunner } from 'typeorm';
import { RemoveTimedHyperspaceFlight20261114200000 } from '../../database/migrations/20261114200000-remove-timed-hyperspace-flight';

describe('timed hyperspace flight removal migration', () => {
  let dataSource: DataSource;
  let runner: QueryRunner;
  let schema: string;
  const migration = new RemoveTimedHyperspaceFlight20261114200000();

  beforeAll(async () => {
    dataSource = await new DataSource({
      type: 'postgres',
      url: process.env.INTEGRATION_DATABASE_URL,
    }).initialize();
  });

  beforeEach(async () => {
    schema = `timed_flight_${randomUUID().replace(/-/g, '')}`;
    runner = dataSource.createQueryRunner();
    await runner.connect();
    await runner.query(`CREATE SCHEMA "${schema}"`);
    await runner.query(`SET search_path TO "${schema}"`);
    await runner.query('CREATE TABLE "space_locations" ("id" serial PRIMARY KEY)');
    await runner.query(`
      CREATE TABLE "spacecraft" (
        "id" serial PRIMARY KEY,
        "status" varchar NOT NULL DEFAULT 'IDLE',
        "locationId" integer REFERENCES "space_locations"("id"),
        "warpCooldown" integer NOT NULL DEFAULT 0,
        "arrivalAt" TIMESTAMP,
        "originLocationId" integer REFERENCES "space_locations"("id") ON DELETE SET NULL,
        "targetLocationId" integer REFERENCES "space_locations"("id") ON DELETE SET NULL
      )
    `);
    await runner.query(
      `CREATE INDEX "IDX_spacecraft_in_flight_arrival" ON "spacecraft" ("arrivalAt") WHERE "status" = 'IN_FLIGHT'`,
    );
    await runner.query(
      'CREATE TABLE "dashboard_snapshots" ("id" serial PRIMARY KEY, "inFlightShipCount" integer NOT NULL)',
    );
    await runner.query('INSERT INTO "space_locations" ("id") SELECT generate_series(1, 3)');
  });

  afterEach(async () => {
    await runner.query('SET search_path TO public');
    await runner.query(`DROP SCHEMA "${schema}" CASCADE`);
    await runner.release();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('returns ships in flight to their origin instead of the target and drops the flight columns', async () => {
    await runner.query(`
      INSERT INTO "spacecraft" ("status", "locationId", "originLocationId", "targetLocationId", "arrivalAt", "warpCooldown") VALUES
        ('IN_FLIGHT', 2, 1, 3, NOW() + interval '1 hour', 3),
        ('IN_FLIGHT', 2, NULL, 3, NOW(), 2),
        ('IDLE', 3, NULL, NULL, NULL, 1)
    `);

    await migration.up(runner);

    expect(await runner.query('SELECT "id", "status", "locationId" FROM "spacecraft" ORDER BY "id"')).toEqual([
      { id: 1, status: 'IDLE', locationId: 1 },
      { id: 2, status: 'IDLE', locationId: 2 },
      { id: 3, status: 'IDLE', locationId: 3 },
    ]);
    const columns = await runner.query(
      `SELECT table_name, column_name FROM information_schema.columns
       WHERE table_schema = $1 AND column_name IN ('arrivalAt', 'originLocationId', 'targetLocationId', 'warpCooldown', 'inFlightShipCount')`,
      [schema],
    );
    expect(columns).toEqual([]);
    expect(
      await runner.query(`SELECT indexname FROM pg_indexes WHERE schemaname = $1 AND indexname = 'IDX_spacecraft_in_flight_arrival'`, [schema]),
    ).toEqual([]);
  });

  it('restores the dropped columns empty on rollback', async () => {
    await migration.up(runner);

    await migration.down(runner);

    const columns: Array<{ column_name: string }> = await runner.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = 'spacecraft' ORDER BY column_name`,
      [schema],
    );
    expect(columns.map((column) => column.column_name)).toEqual(
      expect.arrayContaining(['arrivalAt', 'originLocationId', 'targetLocationId', 'warpCooldown']),
    );
  });
});
