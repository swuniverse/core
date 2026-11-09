import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { AddUserCharacters1792756800000 } from '../migrations/20261023120000-add-user-characters';

// Use TypeORM's actual file discovery and recorded migration names, not a
// renamed test class. The search path and migration table are schema-local.
describe('character migration ordering (Postgres)', () => {
  let admin: DataSource;
  let database: DataSource;
  let schema: string;

  beforeAll(async () => {
    admin = await new DataSource({
      type: 'postgres',
      url: process.env.INTEGRATION_DATABASE_URL,
    }).initialize();
  });
  beforeEach(async () => {
    schema = `character_order_${randomUUID().replace(/-/g, '')}`;
    await admin.query(`CREATE SCHEMA "${schema}"`);
    await admin.query(`CREATE TABLE "${schema}".users (id serial PRIMARY KEY)`);
    await admin.query(
      `CREATE TABLE "${schema}".holonet_posts (id serial PRIMARY KEY)`,
    );
    database = await new DataSource({
      type: 'postgres',
      url: process.env.INTEGRATION_DATABASE_URL,
      schema,
      migrationsTableName: 'custom_migration_history',
      migrations: [
        join(__dirname, '../migrations/20261023120000-add-user-characters.ts'),
        join(
          __dirname,
          '../migrations/20261104120000-add-holonet-post-characters.ts',
        ),
        join(
          __dirname,
          '../migrations/20261023110000-prepare-user-characters.ts',
        ),
      ],
      extra: { options: `-c search_path=${schema}` },
    }).initialize();
  });
  afterEach(async () => {
    try {
      if (database?.isInitialized) await database.destroy();
    } finally {
      if (schema)
        await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    }
  });
  afterAll(async () => {
    if (admin?.isInitialized) await admin.destroy();
  });

  it('orders the fresh chain correctly, retains data on legacy rollback, and rolls back the owning migration', async () => {
    const ran = await database.runMigrations({ transaction: 'each' });
    expect(ran.map(({ name }) => name)).toEqual([
      'PrepareUserCharacters20261023110000',
      'AddHolonetPostCharacters20261104120000',
      'AddUserCharacters1792756800000',
    ]);
    await database.query('INSERT INTO users (id) VALUES (1)');
    await database.query('INSERT INTO holonet_posts (id) VALUES (10)');
    await database.query(
      `INSERT INTO user_characters (id, "userId", name) VALUES (2, 1, 'Ada')`,
    );
    await database.query('INSERT INTO holonet_post_characters VALUES (10, 2)');
    await expect(
      database.query('INSERT INTO holonet_post_characters VALUES (10, 999)'),
    ).rejects.toMatchObject({ driverError: { code: '23503' } });
    expect(await database.runMigrations({ transaction: 'each' })).toEqual([]);
    await database.undoLastMigration({ transaction: 'each' });
    expect(
      await database.query('SELECT id, name FROM user_characters'),
    ).toEqual([{ id: 2, name: 'Ada' }]);
    await database.runMigrations({ transaction: 'each' });
    expect(
      await database.query('SELECT * FROM holonet_post_characters'),
    ).toEqual([{ postId: 10, characterId: 2 }]);
    await database.undoLastMigration({ transaction: 'each' });
    expect(
      await database.query('SELECT * FROM holonet_post_characters'),
    ).toEqual([{ postId: 10, characterId: 2 }]);
    await database.undoLastMigration({ transaction: 'each' });
    expect(
      await database.query(
        "SELECT to_regclass('holonet_post_characters') AS name",
      ),
    ).toEqual([{ name: null }]);
    await database.undoLastMigration({ transaction: 'each' });
    expect(
      await database.query("SELECT to_regclass('user_characters') AS name"),
    ).toEqual([{ name: null }]);
  });

  it('preserves a table recorded under the previous calendar migration name', async () => {
    await database.query(`CREATE TABLE user_characters (
      id serial PRIMARY KEY,
      "userId" integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name varchar(60) NOT NULL,
      description text NOT NULL DEFAULT '',
      avatar text,
      "createdAt" timestamp NOT NULL DEFAULT now(),
      "updatedAt" timestamp NOT NULL DEFAULT now()
    )`);
    await database.query(
      'CREATE INDEX "IDX_user_characters_user" ON user_characters ("userId")',
    );
    await database.query(
      `CREATE TABLE custom_migration_history (
        id serial PRIMARY KEY, timestamp bigint NOT NULL, name varchar NOT NULL
      )`,
    );
    await database.query(
      `INSERT INTO custom_migration_history (timestamp, name)
       VALUES (261023120000, 'AddUserCharacters20261023120000')`,
    );
    await database.query('INSERT INTO users (id) VALUES (1)');
    await database.query(
      `INSERT INTO user_characters ("userId", name) VALUES (1, 'Existing')`,
    );

    expect(
      (await database.runMigrations({ transaction: 'each' })).map(
        ({ name }) => name,
      ),
    ).toEqual([
      'PrepareUserCharacters20261023110000',
      'AddHolonetPostCharacters20261104120000',
      'AddUserCharacters1792756800000',
    ]);
    expect(
      await database.query('SELECT "userId", name FROM user_characters'),
    ).toEqual([{ userId: 1, name: 'Existing' }]);

    await database.undoLastMigration({ transaction: 'each' });
    await database.undoLastMigration({ transaction: 'each' });
    await database.undoLastMigration({ transaction: 'each' });
    expect(
      await database.query('SELECT "userId", name FROM user_characters'),
    ).toEqual([{ userId: 1, name: 'Existing' }]);
  });

  it('refuses to adopt an untracked pre-existing table', async () => {
    await database.query(
      'CREATE TABLE user_characters (id integer PRIMARY KEY, marker text)',
    );
    await database.query(`INSERT INTO user_characters VALUES (1, 'untouched')`);
    await expect(
      database.runMigrations({ transaction: 'each' }),
    ).rejects.toMatchObject({ driverError: { code: '42P07' } });
    expect(await database.query('SELECT * FROM user_characters')).toEqual([
      { id: 1, marker: 'untouched' },
    ]);
    expect(
      await database.query('SELECT * FROM custom_migration_history'),
    ).toEqual([]);
  });

  it('rejects a recorded legacy owner when its table is missing', async () => {
    await database.query(
      `CREATE TABLE custom_migration_history (id serial PRIMARY KEY, timestamp bigint NOT NULL, name varchar NOT NULL)`,
    );
    await database.query(
      `INSERT INTO custom_migration_history (timestamp, name) VALUES (1792756800000, 'AddUserCharacters1792756800000')`,
    );
    await expect(
      database.runMigrations({ transaction: 'each' }),
    ).rejects.toThrow(
      'Legacy character migration is recorded but user_characters is missing',
    );
    expect(
      await database.query('SELECT name FROM custom_migration_history'),
    ).toEqual([{ name: 'AddUserCharacters1792756800000' }]);
  });

  it('preserves an existing legacy and holonet history when the bridge is applied and reverted', async () => {
    const legacy = await new DataSource({
      type: 'postgres',
      url: process.env.INTEGRATION_DATABASE_URL,
      schema,
      migrationsTableName: 'custom_migration_history',
      migrations: [AddUserCharacters1792756800000],
      extra: { options: `-c search_path=${schema}` },
    }).initialize();
    try {
      await legacy.runMigrations({ transaction: 'each' });
    } finally {
      await legacy.destroy();
    }
    await database.query('INSERT INTO users (id) VALUES (1)');
    await database.query('INSERT INTO holonet_posts (id) VALUES (10)');
    await database.query(
      `INSERT INTO user_characters (id, "userId", name) VALUES (2, 1, 'Existing')`,
    );
    await database.query(
      'CREATE TABLE holonet_post_characters ("postId" integer REFERENCES holonet_posts(id), "characterId" integer REFERENCES user_characters(id), PRIMARY KEY ("postId", "characterId"))',
    );
    await database.query('INSERT INTO holonet_post_characters VALUES (10, 2)');
    await database.query(
      `INSERT INTO custom_migration_history (timestamp, name) VALUES (261104120000, 'AddHolonetPostCharacters20261104120000')`,
    );
    expect(
      (await database.runMigrations({ transaction: 'each' })).map(
        ({ name }) => name,
      ),
    ).toEqual(['PrepareUserCharacters20261023110000']);
    await database.undoLastMigration({ transaction: 'each' });
    expect(
      await database.query('SELECT id, name FROM user_characters'),
    ).toEqual([{ id: 2, name: 'Existing' }]);
    expect(
      await database.query('SELECT * FROM holonet_post_characters'),
    ).toEqual([{ postId: 10, characterId: 2 }]);
  });

  it('preserves the existing legacy identity, table, rows and rollback ownership', async () => {
    const legacy = await new DataSource({
      type: 'postgres',
      url: process.env.INTEGRATION_DATABASE_URL,
      schema,
      migrationsTableName: 'custom_migration_history',
      migrations: [AddUserCharacters1792756800000],
      extra: { options: `-c search_path=${schema}` },
    }).initialize();
    try {
      await legacy.runMigrations({ transaction: 'each' });
    } finally {
      await legacy.destroy();
    }
    await database.query('INSERT INTO users (id) VALUES (1)');
    await database.query(
      `INSERT INTO user_characters (id, "userId", name) VALUES (2, 1, 'Existing')`,
    );
    const ran = await database.runMigrations({ transaction: 'each' });
    expect(ran.map(({ name }) => name)).toEqual([
      'PrepareUserCharacters20261023110000',
      'AddHolonetPostCharacters20261104120000',
    ]);
    expect(
      await database.query('SELECT id, name FROM user_characters'),
    ).toEqual([{ id: 2, name: 'Existing' }]);
    expect(
      await database.query(
        `SELECT name FROM custom_migration_history WHERE name = 'AddUserCharacters1792756800000'`,
      ),
    ).toEqual([{ name: 'AddUserCharacters1792756800000' }]);
    expect(await database.showMigrations()).toBe(false);
    await database.undoLastMigration({ transaction: 'each' });
    expect(
      await database.query('SELECT id, name FROM user_characters'),
    ).toEqual([{ id: 2, name: 'Existing' }]);
    await database.undoLastMigration({ transaction: 'each' });
    expect(
      await database.query('SELECT id, name FROM user_characters'),
    ).toEqual([{ id: 2, name: 'Existing' }]);
    await database.undoLastMigration({ transaction: 'each' });
    expect(
      await database.query("SELECT to_regclass('user_characters') AS name"),
    ).toEqual([{ name: null }]);
  });
});
