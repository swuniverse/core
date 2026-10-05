import { QueryRunner } from 'typeorm';
import { AddAllianceRelationships20261005120000 } from '../migrations/20261005120000-add-alliance-relationships';

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

describe('AddAllianceRelationships20261005120000 migration', () => {
  it('creates an extensible party model and constrained active relationships', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddAllianceRelationships20261005120000().up(queryRunner);

    const sql = queries.join('\n');
    expect(sql).toContain('CREATE TABLE "diplomacy_parties"');
    expect(sql).toContain('CHK_diplomacy_parties_one_subject');
    expect(sql).toContain('UQ_diplomacy_parties_alliance');
    expect(sql).toContain('UQ_diplomacy_parties_user');
    expect(sql).toContain('INSERT INTO "diplomacy_parties" ("allianceId") SELECT "id" FROM "alliances"');
    expect(sql).toContain('CREATE TABLE "alliance_relationships"');
    expect(sql).toContain('CHK_alliance_relationships_canonical_pair');
    expect(sql).toContain('CHK_alliance_relationships_vassalage');
    expect(sql).toContain('CHK_alliance_relationships_permissions');
    expect(sql).toContain('CHK_alliance_relationships_contract_length');
    expect(sql).toContain('char_length(btrim("contract")) <= 20000');
    expect(sql).toContain('CHK_alliance_relationships_war_contract');
    expect(sql).toContain('UQ_alliance_relationships_active_pair');
    expect(sql).toContain('assert_alliance_relationship_faction');
  });

  it('drops relationships before their party table', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddAllianceRelationships20261005120000().down(queryRunner);

    expect(queries.findIndex((query) => query.includes('DROP TABLE "alliance_relationships"'))).toBeLessThan(
      queries.findIndex((query) => query.includes('DROP TABLE "diplomacy_parties"')),
    );
  });
});
