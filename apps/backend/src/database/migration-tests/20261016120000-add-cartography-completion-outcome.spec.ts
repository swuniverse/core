import { QueryRunner } from 'typeorm';
import { AddCartographyCompletionOutcome20261016120000 } from '../migrations/20261016120000-add-cartography-completion-outcome';

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

describe('AddCartographyCompletionOutcome20261016120000 migration', () => {
  it('adds the nullable outcome without reclassifying legacy terminal plans', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddCartographyCompletionOutcome20261016120000().up(queryRunner);

    expect(queries).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'ADD COLUMN IF NOT EXISTS "completionOutcome" varchar(16)',
        ),
        expect.stringContaining(
          'CHECK ( "completionOutcome" IS NULL OR "completionOutcome" IN (\'SUCCESS\', \'INVALIDATED\') )',
        ),
      ]),
    );
    expect(queries).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining('UPDATE "cartography_plans"'),
      ]),
    );
  });

  it('removes the outcome constraint and column on rollback', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddCartographyCompletionOutcome20261016120000().down(queryRunner);

    expect(queries).toEqual([
      'ALTER TABLE "cartography_plans" DROP CONSTRAINT IF EXISTS "CHK_cartography_plans_completion_outcome"',
      'ALTER TABLE "cartography_plans" DROP COLUMN IF EXISTS "completionOutcome"',
    ]);
  });
});
