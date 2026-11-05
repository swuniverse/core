import { randomUUID } from 'node:crypto';
import { DataSource, QueryRunner } from 'typeorm';
import { AddSpacecraftTakeovers20261102090000 } from '../migrations/20261102090000-add-spacecraft-takeovers';

describe('spacecraft takeover migration (Postgres)', () => {
  let dataSource: DataSource;
  let runner: QueryRunner;
  let schema: string;
  const migration = new AddSpacecraftTakeovers20261102090000();

  beforeAll(async () => {
    dataSource = await new DataSource({
      type: 'postgres',
      url: process.env.INTEGRATION_DATABASE_URL,
    }).initialize();
  });

  beforeEach(async () => {
    schema = `takeover_migration_${randomUUID().replace(/-/g, '')}`;
    runner = dataSource.createQueryRunner();
    await runner.connect();
    await runner.query(`CREATE SCHEMA "${schema}"`);
    await runner.query(`SET search_path TO "${schema}"`);
    // The predecessor schema has plural users and integer spacecraft/user keys.
    await runner.query(`
      CREATE TABLE "users" ("id" SERIAL PRIMARY KEY);
      CREATE TABLE "spacecraft" ("id" SERIAL PRIMARY KEY);
      INSERT INTO "users" ("id") VALUES (1), (2), (3);
      INSERT INTO "spacecraft" ("id") VALUES (10), (20), (30);
    `);
  });

  afterEach(async () => {
    try {
      if (runner && !runner.isReleased) {
        if (runner.isTransactionActive) await runner.rollbackTransaction();
        await runner.query('SET search_path TO public');
        await runner.release();
      }
    } finally {
      if (dataSource?.isInitialized && schema)
        await dataSource.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    }
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it('creates foreign keys against the predecessor users and spacecraft and rolls back cleanly', async () => {
    await migration.up(runner);
    await migration.up(runner);
    expect(
      await runner.query(`
      SELECT a.attname AS column_name, c.confrelid::regclass::text AS referenced_table,
             c.confdeltype AS on_delete
      FROM pg_constraint c
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
      WHERE c.conrelid = 'spacecraft_takeovers'::regclass AND c.contype = 'f'
      ORDER BY a.attname
    `),
    ).toEqual([
      {
        column_name: 'attackerId',
        referenced_table: 'spacecraft',
        on_delete: 'c',
      },
      {
        column_name: 'attackerUserId',
        referenced_table: 'users',
        on_delete: 'c',
      },
      {
        column_name: 'targetId',
        referenced_table: 'spacecraft',
        on_delete: 'c',
      },
      {
        column_name: 'targetUserId',
        referenced_table: 'users',
        on_delete: 'c',
      },
    ]);
    await runner.query(
      `INSERT INTO spacecraft_takeovers ("attackerId", "targetId", "attackerUserId", "targetUserId", "prestigeCost") VALUES (10, 20, 1, 2, 50)`,
    );
    expect(
      await runner.query(
        'SELECT "ticksRemaining", "prestigeCost" FROM spacecraft_takeovers',
      ),
    ).toEqual([{ ticksRemaining: 10, prestigeCost: 50 }]);
    await expect(
      runner.query(
        `INSERT INTO spacecraft_takeovers ("attackerId", "targetId", "attackerUserId", "targetUserId", "prestigeCost") VALUES (30, 10, 999, 2, 50)`,
      ),
    ).rejects.toMatchObject({ driverError: { code: '23503' } });
    await expect(
      runner.query(
        `INSERT INTO spacecraft_takeovers ("attackerId", "targetId", "attackerUserId", "targetUserId", "prestigeCost") VALUES (30, 10, 1, 999, 50)`,
      ),
    ).rejects.toMatchObject({ driverError: { code: '23503' } });
    await expect(
      runner.query(
        `INSERT INTO spacecraft_takeovers ("attackerId", "targetId", "attackerUserId", "targetUserId", "prestigeCost") VALUES (10, 30, 1, 2, 50)`,
      ),
    ).rejects.toMatchObject({ driverError: { code: '23505' } });
    await runner.query('DELETE FROM "users" WHERE id = 2');
    expect(await runner.query('SELECT * FROM spacecraft_takeovers')).toEqual(
      [],
    );
    await migration.down(runner);
    await migration.down(runner);
    expect(
      await runner.query("SELECT to_regclass('spacecraft_takeovers') AS name"),
    ).toEqual([{ name: null }]);
    expect(await runner.query('SELECT id FROM "users" ORDER BY id')).toEqual([
      { id: 1 },
      { id: 3 },
    ]);
    expect(
      await runner.query('SELECT id FROM "spacecraft" ORDER BY id'),
    ).toEqual([{ id: 10 }, { id: 20 }, { id: 30 }]);
  });
});
