import { QueryRunner } from 'typeorm';
import { AddCartographyPlans20261016100000 } from '../migrations/20261016100000-add-cartography-plans';

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

describe('AddCartographyPlans20261016100000 migration', () => {
  it('creates cartography plans with player/system and finalization constraints', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddCartographyPlans20261016100000().up(queryRunner);

    expect(queries).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'CREATE TABLE IF NOT EXISTS "cartography_plans"',
        ),
        expect.stringContaining(
          '"remainingFieldIds" jsonb NOT NULL DEFAULT \'[]\'::jsonb',
        ),
        expect.stringContaining(
          'FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE',
        ),
        expect.stringContaining(
          'FOREIGN KEY ("starSystemId") REFERENCES "star_systems"("id") ON DELETE CASCADE',
        ),
        expect.stringContaining(
          'FOREIGN KEY ("finalizingSpacecraftId") REFERENCES "spacecraft"("id") ON DELETE SET NULL',
        ),
        'CREATE UNIQUE INDEX IF NOT EXISTS "UQ_cartography_plans_user_system" ON "cartography_plans" ("userId", "starSystemId")',
        'CREATE UNIQUE INDEX IF NOT EXISTS "UQ_cartography_plans_finalizing_ship" ON "cartography_plans" ("finalizingSpacecraftId") WHERE "status" = \'FINISHING\'',
      ]),
    );
    expect(queries).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining('spacecraft_astrometry_jobs'),
      ]),
    );
  });

  it('removes only the cartography-plan table on rollback', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddCartographyPlans20261016100000().down(queryRunner);

    expect(queries).toEqual(['DROP TABLE IF EXISTS "cartography_plans"']);
  });
});
