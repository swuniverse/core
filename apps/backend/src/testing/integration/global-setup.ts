import { PostgreSqlContainer } from '@testcontainers/postgresql';

declare global {
  // eslint-disable-next-line no-var
  var __INTEGRATION_CONTAINER__: { stop(): Promise<unknown> } | undefined;
}

/**
 * Provides a Postgres 16 database for the integration suite.
 * INTEGRATION_DATABASE_URL wins; otherwise a Testcontainers instance is
 * started. The URL reaches the test workers via the environment. Migrations
 * run on first connect (see database.ts), because global setup runs outside
 * Jest's module resolution.
 */
export default async function globalSetup(): Promise<void> {
  if (process.env.INTEGRATION_DATABASE_URL) return;
  const container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('swuniverse_test')
    .start();
  globalThis.__INTEGRATION_CONTAINER__ = container;
  process.env.INTEGRATION_DATABASE_URL = container.getConnectionUri();
}
