import { join } from 'node:path';
import globalSetup from './global-setup';
import globalTeardown from './global-teardown';

describe('integration global lifecycle', () => {
  const originalUrl = process.env.INTEGRATION_DATABASE_URL;
  const originalSeed = process.env.SWU_MIGRATION_BUILDING_SEED_PATH;

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.INTEGRATION_DATABASE_URL;
    else process.env.INTEGRATION_DATABASE_URL = originalUrl;
    if (originalSeed === undefined)
      delete process.env.SWU_MIGRATION_BUILDING_SEED_PATH;
    else process.env.SWU_MIGRATION_BUILDING_SEED_PATH = originalSeed;
  });

  it.each([undefined, '', '/prior/seed.yaml'])(
    'restores prior seed path %s',
    async (prior) => {
      process.env.INTEGRATION_DATABASE_URL = 'postgresql://unused';
      if (prior === undefined)
        delete process.env.SWU_MIGRATION_BUILDING_SEED_PATH;
      else process.env.SWU_MIGRATION_BUILDING_SEED_PATH = prior;
      await globalSetup();
      expect(process.env.SWU_MIGRATION_BUILDING_SEED_PATH).toBe(
        join(
          process.cwd(),
          'apps/backend/src/testing/integration/fixtures/migration-buildings.yaml',
        ),
      );
      await globalTeardown();
      expect(process.env.SWU_MIGRATION_BUILDING_SEED_PATH).toBe(prior);
    },
  );
});
