import { join } from 'node:path';
import { PostgreSqlContainer } from '@testcontainers/postgresql';

declare global {
  var __INTEGRATION_CONTAINER__: { stop(): Promise<unknown> } | undefined;
  var __INTEGRATION_PREVIOUS_ENV__:
    | { seed: string | undefined; url: string | undefined }
    | undefined;
}

/**
 * Provides a Postgres 16 database for the integration suite.
 * INTEGRATION_DATABASE_URL wins; otherwise a Testcontainers instance is
 * started. The URL reaches the test workers via the environment. Migrations
 * run on first connect (see database.ts), because global setup runs outside
 * Jest's module resolution.
 */
export default async function globalSetup(): Promise<void> {
  globalThis.__INTEGRATION_PREVIOUS_ENV__ = {
    seed: process.env.SWU_MIGRATION_BUILDING_SEED_PATH,
    url: process.env.INTEGRATION_DATABASE_URL,
  };
  process.env.SWU_MIGRATION_BUILDING_SEED_PATH = join(
    __dirname,
    'fixtures/migration-buildings.yaml',
  );
  try {
    if (process.env.INTEGRATION_DATABASE_URL) return;
    const container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('swuniverse_test')
      .start();
    globalThis.__INTEGRATION_CONTAINER__ = container;
    process.env.INTEGRATION_DATABASE_URL = container.getConnectionUri();
  } catch (error) {
    const { seed } = globalThis.__INTEGRATION_PREVIOUS_ENV__;
    if (seed === undefined) delete process.env.SWU_MIGRATION_BUILDING_SEED_PATH;
    else process.env.SWU_MIGRATION_BUILDING_SEED_PATH = seed;
    globalThis.__INTEGRATION_PREVIOUS_ENV__ = undefined;
    throw error;
  }
}
