import { QueryRunner } from 'typeorm';
import { AddUserLastActiveAt20261007100000 } from '../migrations/20261007100000-add-user-last-active-at';

function recordingQueryRunner() {
  const queries: string[] = [];
  const queryRunner = {
    query: jest.fn(async (sql: string) => {
      queries.push(sql.replace(/\s+/g, ' ').trim());
    }),
  } as unknown as QueryRunner;
  return { queries, queryRunner };
}

describe('AddUserLastActiveAt20261007100000 migration', () => {
  it('adds only a nullable timestamp and leaves lastActiveTick alone', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddUserLastActiveAt20261007100000().up(queryRunner);

    expect(queries).toEqual([
      'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMP',
    ]);
  });

  it('drops the column on down', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddUserLastActiveAt20261007100000().down(queryRunner);

    expect(queries).toEqual([
      'ALTER TABLE "users" DROP COLUMN IF EXISTS "lastActiveAt"',
    ]);
  });
});
