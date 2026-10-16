import { QueryRunner } from 'typeorm';
import { RetireSpacecraftAstrometryJobs20261016110000 } from '../migrations/20261016110000-retire-spacecraft-astrometry-jobs';

function recordingQueryRunner() {
  const queries: string[] = [];
  const queryRunner = {
    query: jest.fn(async (sql: string) => {
      queries.push(sql.replace(/\s+/g, ' ').trim());
    }),
  } as unknown as QueryRunner;
  return { queries, queryRunner };
}

describe('RetireSpacecraftAstrometryJobs20261016110000 migration', () => {
  it('upgrades an already migrated world by retiring the legacy job table without rewriting the applied plan migration', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new RetireSpacecraftAstrometryJobs20261016110000().up(queryRunner);

    expect(queries).toEqual([
      'DROP TABLE IF EXISTS "spacecraft_astrometry_jobs"',
    ]);
  });

  it('restores the legacy job table and its indexes on rollback', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new RetireSpacecraftAstrometryJobs20261016110000().down(queryRunner);

    expect(queries).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'CREATE TABLE IF NOT EXISTS "spacecraft_astrometry_jobs"',
        ),
        expect.stringContaining(
          'FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE',
        ),
        expect.stringContaining(
          'FOREIGN KEY ("spacecraftId") REFERENCES "spacecraft"("id") ON DELETE CASCADE',
        ),
        expect.stringContaining(
          'FOREIGN KEY ("starSystemId") REFERENCES "star_systems"("id") ON DELETE CASCADE',
        ),
        'CREATE INDEX IF NOT EXISTS "IDX_spacecraft_astrometry_jobs_user" ON "spacecraft_astrometry_jobs" ("userId")',
        'CREATE INDEX IF NOT EXISTS "IDX_spacecraft_astrometry_jobs_ship_status" ON "spacecraft_astrometry_jobs" ("spacecraftId", "status")',
        'CREATE UNIQUE INDEX IF NOT EXISTS "UQ_spacecraft_astrometry_active_ship" ON "spacecraft_astrometry_jobs" ("spacecraftId") WHERE "status" = \'ACTIVE\'',
      ]),
    );
  });
});
