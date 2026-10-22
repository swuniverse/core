import { QueryRunner } from 'typeorm';
import { AddAccountTokens20261022140000 } from '../migrations/20261022140000-add-account-tokens';

const compact = (sql: string): string => sql.replace(/\s+/g, ' ').trim();

function recordingQueryRunner() {
  const queries: string[] = [];
  return {
    queries,
    queryRunner: { query: jest.fn(async (sql: string) => queries.push(compact(sql))) } as unknown as QueryRunner,
  };
}

describe('AddAccountTokens20261022140000 migration', () => {
  it('creates reusable account tokens with purpose, expiry, consumption, and cascade ownership', async () => {
    const { queries, queryRunner } = recordingQueryRunner();
    await new AddAccountTokens20261022140000().up(queryRunner);
    expect(queries.join(' ')).toContain('CREATE TYPE "account_token_purpose_enum"');
    expect(queries.join(' ')).toContain('CREATE TABLE IF NOT EXISTS "account_tokens"');
    expect(queries.join(' ')).toContain('UNIQUE ("tokenHash")');
    expect(queries.join(' ')).toContain('ON DELETE CASCADE');
    expect(queries.join(' ')).toContain(
      'CREATE INDEX IF NOT EXISTS "IDX_account_tokens_user_purpose_created"',
    );
  });

  it('removes the reusable token schema on rollback', async () => {
    const { queries, queryRunner } = recordingQueryRunner();
    await new AddAccountTokens20261022140000().down(queryRunner);
    expect(queries).toEqual([
      'DROP TABLE IF EXISTS "account_tokens"',
      'DROP TYPE IF EXISTS "account_token_purpose_enum"',
    ]);
  });
});
