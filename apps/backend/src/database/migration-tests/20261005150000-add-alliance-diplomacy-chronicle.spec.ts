import { QueryRunner } from 'typeorm';
import { AddAllianceDiplomacyChronicle20261005150000 } from '../migrations/20261005150000-add-alliance-diplomacy-chronicle';

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

describe('AddAllianceDiplomacyChronicle20261005150000 migration', () => {
  it('creates an append-only public snapshot table with chronological indexes', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddAllianceDiplomacyChronicle20261005150000().up(queryRunner);

    const sql = queries.join('\n');
    expect(sql).toContain('CREATE TABLE "alliance_diplomacy_chronicle_entries"');
    expect(sql).toContain('firstAllianceName');
    expect(sql).toContain('secondAllianceName');
    expect(sql).not.toContain('contract');
    expect(sql).toContain('IDX_alliance_diplomacy_chronicle_entries_first_order');
    expect(sql).toContain('IDX_alliance_diplomacy_chronicle_entries_second_order');
    expect(sql).toContain('TRG_alliance_diplomacy_chronicle_entries_immutable');
  });

  it('drops the immutability trigger and function before the table', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddAllianceDiplomacyChronicle20261005150000().down(queryRunner);

    const table = queries.findIndex((query) =>
      query.includes('DROP TABLE "alliance_diplomacy_chronicle_entries"'),
    );
    expect(
      queries.findIndex((query) =>
        query.includes('DROP TRIGGER "TRG_alliance_diplomacy_chronicle_entries_immutable"'),
      ),
    ).toBeLessThan(table);
    expect(
      queries.findIndex((query) =>
        query.includes('DROP FUNCTION reject_alliance_diplomacy_chronicle_mutation()'),
      ),
    ).toBeLessThan(table);
  });
});
