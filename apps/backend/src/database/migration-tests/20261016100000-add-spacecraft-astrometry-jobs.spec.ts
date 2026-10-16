import { QueryRunner } from 'typeorm';
import { AddSpacecraftAstrometryJobs20261016100000 } from '../migrations/20261016100000-add-spacecraft-astrometry-jobs';

const compact = (sql: string): string => sql.replace(/\s+/g, ' ').trim();

function recordingQueryRunner() {
  const queries: string[] = [];
  const queryRunner = {
    query: jest.fn(async (sql: string) => {
      queries.push(compact(sql));
    }),
  } as unknown as QueryRunner;
  return { queries, queryRunner };
}

describe('AddSpacecraftAstrometryJobs20261016100000 migration', () => {
  it('creates a partial unique index for active jobs per spacecraft', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddSpacecraftAstrometryJobs20261016100000().up(queryRunner);

    expect(queries).toContain(
      'CREATE UNIQUE INDEX IF NOT EXISTS "UQ_spacecraft_astrometry_active_ship" ON "spacecraft_astrometry_jobs" ("spacecraftId") WHERE "status" = \'ACTIVE\'',
    );
  });
});
