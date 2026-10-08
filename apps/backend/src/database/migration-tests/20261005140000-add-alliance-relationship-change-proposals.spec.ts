import { QueryRunner } from 'typeorm';
import { AddAllianceRelationshipChangeProposals20261005140000 } from '../migrations/20261005140000-add-alliance-relationship-change-proposals';

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

describe('AddAllianceRelationshipChangeProposals20261005140000 migration', () => {
  it('creates one confidential, directional replacement state per active relationship', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddAllianceRelationshipChangeProposals20261005140000().up(
      queryRunner,
    );

    const sql = queries.join('\n');
    expect(sql).toContain(
      'CREATE TABLE "alliance_relationship_change_proposals"',
    );
    expect(sql).toContain(
      'UQ_alliance_relationship_change_proposals_relationship',
    );
    expect(sql).toContain(
      'CHK_alliance_relationship_change_proposals_contract_length',
    );
    expect(sql).toContain(
      'assert_alliance_relationship_change_proposal_shape',
    );
    expect(sql).toContain(
      'TRG_alliance_relationship_change_proposals_shape',
    );
  });

  it('drops the shape trigger and function before its table', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddAllianceRelationshipChangeProposals20261005140000().down(
      queryRunner,
    );

    expect(
      queries.findIndex((query) =>
        query.includes(
          'DROP TRIGGER "TRG_alliance_relationship_change_proposals_shape"',
        ),
      ),
    ).toBeLessThan(
      queries.findIndex((query) =>
        query.includes('DROP TABLE "alliance_relationship_change_proposals"'),
      ),
    );
  });
});
