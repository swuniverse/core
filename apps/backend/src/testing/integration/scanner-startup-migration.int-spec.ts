import { randomUUID } from 'node:crypto';
import { DataSource, type QueryRunner } from 'typeorm';
import { DisableSpacecraftScanners1795006800000 } from '../../database/migrations/20261118130000-disable-spacecraft-scanners';

describe('scanner startup reconciliation migration', () => {
  let dataSource: DataSource;
  let runner: QueryRunner;
  let schema: string;
  const migration = new DisableSpacecraftScanners1795006800000();

  beforeAll(async () => {
    dataSource = await new DataSource({
      type: 'postgres', url: process.env.INTEGRATION_DATABASE_URL,
    }).initialize();
  });
  beforeEach(async () => {
    schema = `scanner_startup_${randomUUID().replace(/-/g, '')}`;
    runner = dataSource.createQueryRunner();
    await runner.connect();
    await runner.query(`CREATE SCHEMA "${schema}"`);
    await runner.query(`SET search_path TO "${schema}"`);
    await runner.query(`CREATE TABLE spacecraft (id serial PRIMARY KEY, "runtimeSystems" jsonb)`);
    await runner.query(`CREATE TABLE spacecraft_modules (id serial PRIMARY KEY, "spacecraftId" integer, "isActive" boolean, integrity integer)`);
  });
  afterEach(async () => {
    await runner.query('SET search_path TO public');
    await runner.query(`DROP SCHEMA "${schema}" CASCADE`);
    await runner.release();
  });
  afterAll(async () => { await dataSource.destroy(); });

  it('disables both scanners, preserves metadata and module health, and creates no capabilities', async () => {
    const states = [
      { SUBSPACE_SCANNER: { active: true, integrity: 60, cooldown: 2 }, TACHYON_SCANNER: { active: true, integrity: 90, cooldown: 0, lastScanAt: 123 }, SHIELDS: { active: true, integrity: 80 } },
      { SUBSPACE_SCANNER: { active: false, integrity: 100 }, REACTOR: { active: true } },
      {}, null, [],
    ];
    for (const state of states) {
      await runner.query('INSERT INTO spacecraft ("runtimeSystems") VALUES ($1)', [JSON.stringify(state)]);
    }
    await runner.query('INSERT INTO spacecraft_modules ("spacecraftId", "isActive", integrity) VALUES (1, true, 60)');
    const modules = await runner.query('SELECT * FROM spacecraft_modules');
    await migration.up(runner);
    const rows = await runner.query('SELECT "runtimeSystems" FROM spacecraft ORDER BY id');
    expect(rows.map((row: { runtimeSystems: unknown }) => row.runtimeSystems)).toEqual([
      { ...states[0], SUBSPACE_SCANNER: { active: false, integrity: 60, cooldown: 2 }, TACHYON_SCANNER: { active: false, integrity: 90, cooldown: 0, lastScanAt: 123 } },
      ...states.slice(1),
    ]);
    expect(await runner.query('SELECT * FROM spacecraft_modules')).toEqual(modules);
    await migration.up(runner);
    await migration.down(runner);
    expect(await runner.query('SELECT "runtimeSystems" FROM spacecraft ORDER BY id')).toEqual(rows);
  });
});
