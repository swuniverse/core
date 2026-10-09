import { QueryRunner } from 'typeorm';
import { AddAllianceAssetDeletions20261009120000 } from '../migrations/20261009120000-add-alliance-asset-deletions';

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

describe('AddAllianceAssetDeletions20261009120000 migration', () => {
  it('only adds a new table without foreign keys and touches nothing existing', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddAllianceAssetDeletions20261009120000().up(queryRunner);

    const sql = queries.join('\n');
    expect(sql).toContain('CREATE TABLE "alliance_asset_deletions"');
    expect(sql).toContain('"assetKey" character varying(64) NOT NULL');
    expect(sql).toContain('"attempts" integer NOT NULL DEFAULT 0');
    expect(sql).toContain('"nextAttemptAt" TIMESTAMP NOT NULL');
    expect(sql).toContain('UNIQUE ("assetKey")');
    expect(sql).not.toMatch(/FOREIGN KEY|REFERENCES|ALTER TABLE|DROP/);
  });

  it('drops the table again on down', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddAllianceAssetDeletions20261009120000().down(queryRunner);

    expect(queries.join('\n')).toContain(
      'DROP TABLE "alliance_asset_deletions"',
    );
  });
});
