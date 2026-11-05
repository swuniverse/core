import { join } from 'node:path';
import { migrationBuildingSeedPath } from '../migrations/support/building-seed-path';

describe('migration building seed path', () => {
  const previous = process.env.SWU_MIGRATION_BUILDING_SEED_PATH;
  afterEach(() => {
    if (previous === undefined)
      delete process.env.SWU_MIGRATION_BUILDING_SEED_PATH;
    else process.env.SWU_MIGRATION_BUILDING_SEED_PATH = previous;
  });

  it('uses the original game-data path when no override is set', () => {
    delete process.env.SWU_MIGRATION_BUILDING_SEED_PATH;
    expect(migrationBuildingSeedPath()).toBe(
      join(process.cwd(), 'game-data/data/buildings/stu-buildings.yaml'),
    );
  });
});
