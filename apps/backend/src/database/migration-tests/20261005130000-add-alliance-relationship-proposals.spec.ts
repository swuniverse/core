import { QueryRunner } from 'typeorm';
import { AddAllianceRelationshipProposals20261005130000 } from '../migrations/20261005130000-add-alliance-relationship-proposals';

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

describe('AddAllianceRelationshipProposals20261005130000 migration', () => {
  it('creates canonical, directional and same-faction constrained proposals', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddAllianceRelationshipProposals20261005130000().up(queryRunner);

    const sql = queries.join('\n');
    expect(sql).toContain('CREATE TABLE "alliance_relationship_proposals"');
    expect(sql).toContain('UQ_alliance_relationship_proposals_pair');
    expect(sql).toContain('CHK_alliance_relationship_proposals_pair');
    expect(sql).toContain('CHK_alliance_relationship_proposals_direction');
    expect(sql).toContain('CHK_alliance_relationship_proposals_type');
    expect(sql).toContain('CHK_alliance_relationship_proposals_permissions');
    expect(sql).toContain('assert_alliance_relationship_proposal_faction');
    expect(sql).toContain('TRG_alliance_relationship_proposals_same_faction');
  });

  it('drops the proposal trigger and function before its table', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddAllianceRelationshipProposals20261005130000().down(
      queryRunner,
    );

    expect(
      queries.findIndex((query) =>
        query.includes(
          'DROP TRIGGER "TRG_alliance_relationship_proposals_same_faction"',
        ),
      ),
    ).toBeLessThan(
      queries.findIndex((query) =>
        query.includes('DROP TABLE "alliance_relationship_proposals"'),
      ),
    );
  });
});
