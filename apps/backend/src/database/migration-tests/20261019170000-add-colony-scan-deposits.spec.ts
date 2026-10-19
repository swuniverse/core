import { QueryRunner } from 'typeorm';
import { AddColonyScanDeposits20261019170000 } from '../migrations/20261019170000-add-colony-scan-deposits';

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

describe('AddColonyScanDeposits20261019170000 migration', () => {
  it('adds the nullable colony scan deposit snapshot idempotently', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddColonyScanDeposits20261019170000().up(queryRunner);

    expect(queries).toEqual([
      'ALTER TABLE "colony_scans" ADD COLUMN IF NOT EXISTS "deposits" text',
    ]);
  });

  it('removes the deposit snapshot column on rollback', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddColonyScanDeposits20261019170000().down(queryRunner);

    expect(queries).toEqual([
      'ALTER TABLE "colony_scans" DROP COLUMN IF EXISTS "deposits"',
    ]);
  });
});
