import { DataSource } from 'typeorm';
import { Faction } from '@swuniverse/shared';
import { User } from '../../modules/auth/user.entity';
import { FactionEntity } from '../../modules/faction/entities/faction.entity';
import { createIntegrationDataSource } from './data-source';

// Tables filled by migrations with reference data; truncating them would
// break later tests.
const PRESERVED_TABLES = new Set([
  'migrations',
  'factions',
  'faction_modifiers',
  'galaxy_field_types',
  'border_types',
  'map_regions',
]);

/**
 * Opens a connection to the integration database and applies pending
 * migrations. Call {@link resetDatabase} in `beforeEach` for a clean state
 * per test.
 */
export async function connectIntegrationDatabase(): Promise<DataSource> {
  const url = process.env.INTEGRATION_DATABASE_URL;
  if (!url) {
    throw new Error(
      'INTEGRATION_DATABASE_URL missing – run via `nx run backend:test-integration`',
    );
  }
  const dataSource = await createIntegrationDataSource(url).initialize();
  // Files run sequentially (maxWorkers: 1), so this cannot race.
  if (await dataSource.showMigrations()) {
    await dataSource.runMigrations({ transaction: 'each' });
  }
  return dataSource;
}

/** Truncates every table except migration-seeded reference data. */
export async function resetDatabase(dataSource: DataSource): Promise<void> {
  const rows: Array<{ tablename: string }> = await dataSource.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
  );
  const tables = rows
    .map((row) => row.tablename)
    .filter((table) => !PRESERVED_TABLES.has(table))
    .map((table) => `"${table}"`);
  if (tables.length) {
    await dataSource.query(
      `TRUNCATE ${tables.join(', ')} RESTART IDENTITY CASCADE`,
    );
  }
  await ensureFactions(dataSource);
}

// Factions are normally seeded on app start (FactionService.seedDefaults).
async function ensureFactions(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(FactionEntity);
  for (const [key, name] of [
    [Faction.REBEL_ALLIANCE, 'Rebellenallianz'],
    [Faction.GALACTIC_EMPIRE, 'Galaktisches Imperium'],
  ] as const) {
    if (await repo.existsBy({ key })) continue;
    await repo.insert({
      key,
      name,
      colorPrimary: '#ffffff',
      colorSecondary: '#000000',
    });
  }
}

export async function factionId(
  dataSource: DataSource,
  key: Faction,
): Promise<number> {
  const faction = await dataSource
    .getRepository(FactionEntity)
    .findOneByOrFail({ key });
  return faction.id;
}

let userCounter = 0;

export async function createUser(
  dataSource: DataSource,
  overrides: Partial<User> = {},
): Promise<User> {
  userCounter += 1;
  const repo = dataSource.getRepository(User);
  return repo.save(
    repo.create({
      username: `pilot${userCounter}`,
      email: `pilot${userCounter}@example.test`,
      passwordHash: 'x',
      ...overrides,
    }),
  );
}
