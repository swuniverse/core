import { QueryRunner } from 'typeorm';
import { AddAllianceChronicle20261009100000 } from '../migrations/20261009100000-add-alliance-chronicle';

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

describe('AddAllianceChronicle20261009100000 migration', () => {
  it('creates an additive chronicle table with cascade, nulling references and an ordered index', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddAllianceChronicle20261009100000().up(queryRunner);

    const sql = queries.join('\n');
    expect(sql).toContain('CREATE TABLE "alliance_chronicle_entries"');
    expect(sql).toContain('"actorName" character varying(255)');
    expect(sql).toContain('"subjectName" character varying(255)');
    expect(sql).toContain('"metadata" jsonb');
    expect(sql).toMatch(
      /FK_alliance_chronicle_entries_alliance" FOREIGN KEY \("allianceId"\) REFERENCES "alliances"\("id"\) ON DELETE CASCADE/,
    );
    expect(sql).toMatch(
      /FK_alliance_chronicle_entries_actor" FOREIGN KEY \("actorUserId"\) REFERENCES "users"\("id"\) ON DELETE SET NULL/,
    );
    expect(sql).toMatch(
      /FK_alliance_chronicle_entries_subject" FOREIGN KEY \("subjectUserId"\) REFERENCES "users"\("id"\) ON DELETE SET NULL/,
    );
    expect(sql).toContain('("allianceId", "occurredAt" DESC, "id" DESC)');
    expect(sql).not.toMatch(/DROP|ALTER/);
  });

  it('drops the index before the table', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddAllianceChronicle20261009100000().down(queryRunner);

    expect(queries[0]).toContain(
      'DROP INDEX "IDX_alliance_chronicle_entries_order"',
    );
    expect(queries[1]).toContain('DROP TABLE "alliance_chronicle_entries"');
  });
});
