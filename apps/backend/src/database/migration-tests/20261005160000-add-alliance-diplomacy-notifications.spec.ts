import { QueryRunner } from 'typeorm';
import { AddAllianceDiplomacyNotifications20261005160000 } from '../migrations/20261005160000-add-alliance-diplomacy-notifications';

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

describe('AddAllianceDiplomacyNotifications20261005160000 migration', () => {
  it('creates durable pending diplomacy notification intents', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddAllianceDiplomacyNotifications20261005160000().up(queryRunner);

    const sql = queries.join('\n');
    expect(sql).toContain('CREATE TABLE "alliance_diplomacy_notifications"');
    expect(sql).toContain('recipientUserId');
    expect(sql).toContain('deliveredAt');
    expect(sql).toContain('IDX_alliance_diplomacy_notifications_pending');
  });

  it('drops the pending index before the notification table', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddAllianceDiplomacyNotifications20261005160000().down(queryRunner);

    const table = queries.findIndex((query) =>
      query.includes('DROP TABLE "alliance_diplomacy_notifications"'),
    );
    expect(
      queries.findIndex((query) =>
        query.includes('DROP INDEX "IDX_alliance_diplomacy_notifications_pending"'),
      ),
    ).toBeLessThan(table);
  });
});
