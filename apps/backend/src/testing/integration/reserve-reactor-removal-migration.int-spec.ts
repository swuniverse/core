import { randomUUID } from 'node:crypto';
import { DataSource, QueryRunner } from 'typeorm';
import { ReserveReactor1794888000000 } from '../../database/migrations/20261117040000-reserve-reactor';
import { RemoveReserveReactor1794927600000 } from '../../database/migrations/20261117150000-remove-reserve-reactor';

describe('withdrawn reserve reactor migration', () => {
  let dataSource: DataSource;
  let runner: QueryRunner;
  let schema: string;
  const migration = new RemoveReserveReactor1794927600000();

  beforeAll(async () => {
    dataSource = await new DataSource({
      type: 'postgres',
      url: process.env.INTEGRATION_DATABASE_URL,
    }).initialize();
  });

  beforeEach(async () => {
    schema = `reactor_removal_${randomUUID().replace(/-/g, '')}`;
    runner = dataSource.createQueryRunner();
    await runner.connect();
    await runner.query(`CREATE SCHEMA "${schema}"`);
    await runner.query(`SET search_path TO "${schema}"`);
    await runner.query(`CREATE TABLE spacecraft (
      id serial PRIMARY KEY, status varchar NOT NULL DEFAULT 'IDLE',
      "runtimeSystems" jsonb
    )`);
    await runner.query(`CREATE TABLE spacecraft_modules (
      id serial PRIMARY KEY, "spacecraftId" integer REFERENCES spacecraft(id),
      "moduleType" varchar, integrity integer, "isActive" boolean
    )`);
    await runner.query(`INSERT INTO spacecraft ("runtimeSystems") VALUES
      ('{"REACTOR":{"active":false,"integrity":60},"WARPDRIVE":{"active":true,"integrity":100}}')`);
    await runner.query(`INSERT INTO spacecraft_modules
      ("spacecraftId", "moduleType", integrity, "isActive")
      VALUES (1, 'Hypermaterie-Reaktor', 60, false)`);
    await new ReserveReactor1794888000000().up(runner);
  });

  afterEach(async () => {
    await runner.query('SET search_path TO public');
    await runner.query(`DROP SCHEMA "${schema}" CASCADE`);
    await runner.release();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  async function triggers(): Promise<Array<{ trigger_name: string }>> {
    return runner.query(
      `SELECT trigger_name FROM information_schema.triggers
       WHERE trigger_schema = $1 AND trigger_name LIKE 'TR_reserve_reactor%'
       GROUP BY trigger_name ORDER BY trigger_name`,
      [schema],
    );
  }

  it('removes both triggers and functions without changing standard reactors, including on repeat', async () => {
    expect(await triggers()).toHaveLength(2);
    const ships = await runner.query('SELECT * FROM spacecraft');
    const modules = await runner.query('SELECT * FROM spacecraft_modules');

    await migration.up(runner);
    await migration.up(runner);

    expect(await triggers()).toEqual([]);
    expect(
      await runner.query(
        `SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = $1 AND p.proname IN
         ('maintain_reserve_reactor', 'synchronize_reserve_reactor_module')`,
        [schema],
      ),
    ).toEqual([]);
    expect(await runner.query('SELECT * FROM spacecraft')).toEqual(ships);
    expect(await runner.query('SELECT * FROM spacecraft_modules')).toEqual(
      modules,
    );
  });

  it('restores the historical schema for a rollback and can remove it again', async () => {
    await migration.up(runner);
    await migration.down(runner);
    expect(await triggers()).toHaveLength(2);
    await migration.up(runner);
    expect(await triggers()).toEqual([]);
  });
});
