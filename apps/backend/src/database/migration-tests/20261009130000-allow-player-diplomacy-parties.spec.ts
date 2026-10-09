import { QueryRunner } from 'typeorm';
import { AllowPlayerDiplomacyParties20261009130000 } from '../migrations/20261009130000-allow-player-diplomacy-parties';

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

const PARTY_COLUMNS = [
  '"firstPartyType"',
  '"secondPartyType"',
  '"lordPartyType"',
  '"vassalPartyType"',
  '"endReason"',
];

describe('AllowPlayerDiplomacyParties20261009130000 migration', () => {
  it('lets the faction triggers resolve alliance and player parties', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AllowPlayerDiplomacyParties20261009130000().up(queryRunner);

    const sql = queries.join('\n');
    expect(sql).toContain(
      'CREATE OR REPLACE FUNCTION assert_alliance_relationship_faction()',
    );
    expect(sql).toContain(
      'CREATE OR REPLACE FUNCTION assert_alliance_relationship_proposal_faction()',
    );
    expect(sql).toContain('JOIN "users"');
    expect(sql).not.toContain('currently require alliance parties');
    expect(sql).not.toContain('require two distinct alliance parties');
  });

  it('extends the chronicle for player sides and the end reason without rewriting rows', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AllowPlayerDiplomacyParties20261009130000().up(queryRunner);

    const sql = queries.join('\n');
    for (const column of PARTY_COLUMNS) {
      expect(sql).toContain(`ADD COLUMN ${column}`);
    }
    expect(sql).toContain("'ALLIANCE'");
    expect(sql).toContain("'PLAYER'");
    expect(sql).toContain("'PARTY_JOINED_ALLIANCE'");
    expect(sql).toContain('"firstAllianceName" TYPE character varying(255)');
    expect(sql).toContain('"secondAllianceName" TYPE character varying(255)');
    expect(sql).toContain(
      'DROP CONSTRAINT "CHK_alliance_diplomacy_chronicle_entries_pair"',
    );
    expect(sql).toContain(
      '"firstPartyType" <> "secondPartyType" OR "firstAllianceId" <> "secondAllianceId"',
    );
    // Existing rows stay as they are: the immutability trigger is never touched
    // on the way up and no row is updated or deleted.
    expect(sql).not.toContain('TRG_alliance_diplomacy_chronicle_entries_immutable');
    expect(sql).not.toMatch(
      /UPDATE "alliance_diplomacy_chronicle_entries"|DELETE FROM/,
    );
  });

  it('indexes the chronicle per party type', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AllowPlayerDiplomacyParties20261009130000().up(queryRunner);

    const sql = queries.join('\n');
    expect(sql).toContain(
      '"firstPartyType", "firstAllianceId", "occurredAt" DESC, "id" DESC',
    );
    expect(sql).toContain(
      '"secondPartyType", "secondAllianceId", "occurredAt" DESC, "id" DESC',
    );
  });

  it('rolls back to alliance-only triggers and drops the added chronicle columns', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AllowPlayerDiplomacyParties20261009130000().down(queryRunner);

    const sql = queries.join('\n');
    expect(sql).toContain('currently require alliance parties');
    expect(sql).toContain('require two distinct alliance parties');
    for (const column of PARTY_COLUMNS) {
      expect(sql).toContain(`DROP COLUMN ${column}`);
    }
    expect(sql).toContain('CHECK ( "firstAllianceId" <> "secondAllianceId" )');
    // Player-party chronicle rows are removed under a disabled, re-enabled trigger.
    const disable = queries.findIndex((query) =>
      query.includes('DISABLE TRIGGER "TRG_alliance_diplomacy_chronicle_entries_immutable"'),
    );
    const remove = queries.findIndex((query) =>
      query.startsWith('DELETE FROM "alliance_diplomacy_chronicle_entries"'),
    );
    const enable = queries.findIndex((query) =>
      query.includes('ENABLE TRIGGER "TRG_alliance_diplomacy_chronicle_entries_immutable"'),
    );
    expect(disable).toBeGreaterThanOrEqual(0);
    expect(disable).toBeLessThan(remove);
    expect(remove).toBeLessThan(enable);
  });
});
