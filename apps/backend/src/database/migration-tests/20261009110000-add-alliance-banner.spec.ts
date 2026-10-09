import { QueryRunner } from 'typeorm';
import { AddAllianceBanner20261009110000 } from '../migrations/20261009110000-add-alliance-banner';

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

describe('AddAllianceBanner20261009110000 migration', () => {
  it('adds only nullable banner columns to alliances', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddAllianceBanner20261009110000().up(queryRunner);

    const sql = queries.join('\n');
    expect(sql).toContain('ALTER TABLE "alliances"');
    expect(sql).toContain('ADD COLUMN "bannerKey" character varying(64)');
    expect(sql).toContain('ADD COLUMN "bannerUpdatedAt" TIMESTAMP');
    expect(sql).not.toMatch(/NOT NULL|DROP|DEFAULT/);
  });

  it('removes the banner columns again on down', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddAllianceBanner20261009110000().down(queryRunner);

    const sql = queries.join('\n');
    expect(sql).toContain('DROP COLUMN "bannerUpdatedAt"');
    expect(sql).toContain('DROP COLUMN "bannerKey"');
  });
});
