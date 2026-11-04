import { randomUUID } from 'node:crypto';
import { DataSource, QueryRunner } from 'typeorm';
import { AddNoteCollection20261104170000 } from '../../database/migrations/20261104170000-add-note-collection';

describe('note collection migration', () => {
  let dataSource: DataSource;
  let runner: QueryRunner;
  let schema: string;
  const migration = new AddNoteCollection20261104170000();

  beforeAll(async () => {
    dataSource = await new DataSource({
      type: 'postgres',
      url: process.env.INTEGRATION_DATABASE_URL,
    }).initialize();
  });

  beforeEach(async () => {
    schema = `notes_migration_${randomUUID().replace(/-/g, '')}`;
    runner = dataSource.createQueryRunner();
    await runner.connect();
    await runner.query(`CREATE SCHEMA "${schema}"`);
    await runner.query(`SET search_path TO "${schema}"`);
    await runner.query(`CREATE TABLE "users" ("id" serial PRIMARY KEY, "notes" text)`);
  });

  afterEach(async () => {
    await runner.query('SET search_path TO public');
    await runner.query(`DROP SCHEMA "${schema}" CASCADE`);
    await runner.release();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('migrates only non-empty legacy text without altering any characters and removes the old field', async () => {
    const legacyTexts = [null, '', '  \n\t', 'Persönlich: "Hallo"\n世界', 'x'.repeat(100_000)];
    for (const text of legacyTexts) {
      await runner.query('INSERT INTO "users" ("notes") VALUES ($1)', [text]);
    }

    await migration.up(runner);

    expect(await runner.query('SELECT "userId", "title", "text" FROM "notes" ORDER BY "userId"')).toEqual([
      { userId: 3, title: 'Notizzettel', text: '  \n\t' },
      { userId: 4, title: 'Notizzettel', text: 'Persönlich: "Hallo"\n世界' },
      { userId: 5, title: 'Notizzettel', text: 'x'.repeat(100_000) },
    ]);
    expect(await runner.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'users' AND column_name = 'notes'`, [schema])).toEqual([]);
  });

  it('restores a single legacy note exactly and leaves users without notes empty on rollback', async () => {
    const text = '  Persönlich\n世界\t' + 'x'.repeat(100_000);
    await runner.query('INSERT INTO "users" ("notes") VALUES ($1), (NULL)', [text]);
    await migration.up(runner);

    await migration.down(runner);

    expect(await runner.query('SELECT "id", "notes" FROM "users" ORDER BY "id"')).toEqual([
      { id: 1, notes: text },
      { id: 2, notes: null },
    ]);
    expect(await runner.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name = 'notes'`, [schema])).toEqual([]);
  });

  it('preserves every title, text and date as JSON when a collection cannot fit the legacy single-note model', async () => {
    await runner.query(`INSERT INTO "users" ("notes") VALUES ('original')`);
    await migration.up(runner);
    await runner.query(`UPDATE "notes" SET "createdAt" = '2026-01-02T03:04:05Z', "updatedAt" = '2026-01-03T03:04:05Z'`);
    await runner.query(`INSERT INTO "notes" ("userId", "title", "text", "createdAt", "updatedAt") VALUES (1, '世界 "Titel"', $1, '2026-02-03T04:05:06Z', '2026-02-04T04:05:06Z')`, ['body\n\t' + 'y'.repeat(100_000)]);

    await migration.down(runner);

    const [{ notes }] = await runner.query('SELECT "notes" FROM "users" WHERE "id" = 1');
    expect(JSON.parse(notes)).toEqual([
      {
        id: 1,
        title: 'Notizzettel',
        text: 'original',
        createdAt: '2026-01-02T03:04:05+00:00',
        updatedAt: '2026-01-03T03:04:05+00:00',
      },
      {
        id: 2,
        title: '世界 "Titel"',
        text: 'body\n\t' + 'y'.repeat(100_000),
        createdAt: '2026-02-03T04:05:06+00:00',
        updatedAt: '2026-02-04T04:05:06+00:00',
      },
    ]);
  });

  it('does not overwrite text in an unexpectedly restored legacy field', async () => {
    await runner.query(`INSERT INTO "users" ("notes") VALUES ('collection text')`);
    await migration.up(runner);
    await runner.query(`ALTER TABLE "users" ADD COLUMN "notes" text`);
    await runner.query(`UPDATE "users" SET "notes" = 'existing legacy text'`);

    await migration.down(runner);

    const [{ notes }] = await runner.query('SELECT "notes" FROM "users" WHERE "id" = 1');
    expect(notes).toBe('existing legacy text\n\ncollection text');
  });

  it('enforces title bounds and deletes notes when their owner is deleted', async () => {
    await runner.query(`INSERT INTO "users" ("notes") VALUES (NULL)`);
    await migration.up(runner);

    await expect(runner.query(`INSERT INTO "notes" ("userId", "title") VALUES (1, '')`)).rejects.toThrow();
    await expect(runner.query(`INSERT INTO "notes" ("userId", "title") VALUES (1, $1)`, ['a'.repeat(101)])).rejects.toThrow();
    await runner.query(`INSERT INTO "notes" ("userId", "title") VALUES (1, 'a'), (1, $1)`, ['a'.repeat(100)]);
    await runner.query('DELETE FROM "users" WHERE "id" = 1');
    expect(await runner.query('SELECT * FROM "notes"')).toEqual([]);
  });
});
