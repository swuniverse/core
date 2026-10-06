import { QueryRunner } from 'typeorm';
import { AddDiplomacyDeliveryLeasesAndRateLimits20261006110000 } from '../migrations/20261006110000-add-diplomacy-delivery-leases-and-rate-limits';

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

describe('AddDiplomacyDeliveryLeasesAndRateLimits20261006110000 migration', () => {
  it('adds durable delivery leases and the cluster-wide rate-limit table', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddDiplomacyDeliveryLeasesAndRateLimits20261006110000().up(
      queryRunner,
    );

    const sql = queries.join('\n');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "leaseToken" varchar(36)');
    expect(sql).toContain(
      'ADD COLUMN IF NOT EXISTS "leaseExpiresAt" TIMESTAMP',
    );
    expect(sql).toContain('IDX_alliance_diplomacy_notifications_claimable');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "diplomacy_rate_limits"');
    expect(sql).toContain('PRIMARY KEY ("actorId", "command")');
  });

  it('removes shared rate-limit state before dropping lease columns', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddDiplomacyDeliveryLeasesAndRateLimits20261006110000().down(
      queryRunner,
    );

    const rateLimitTable = queries.findIndex((query) =>
      query.includes('DROP TABLE IF EXISTS "diplomacy_rate_limits"'),
    );
    const leaseColumns = queries.findIndex((query) =>
      query.includes('DROP COLUMN IF EXISTS "leaseExpiresAt"'),
    );
    expect(rateLimitTable).toBeLessThan(leaseColumns);
  });
});
