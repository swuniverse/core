import { QueryRunner } from 'typeorm';
import { AddDiplomacyNotificationDeliveryKey20261006100000 } from '../migrations/20261006100000-add-diplomacy-notification-delivery-key';

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

describe('AddDiplomacyNotificationDeliveryKey20261006100000 migration', () => {
  it('backfills unique outbox keys and adds idempotency keys to messages', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddDiplomacyNotificationDeliveryKey20261006100000().up(queryRunner);

    const sql = queries.join('\n');
    expect(sql).toContain('ADD COLUMN "deliveryKey" varchar(100)');
    expect(sql).toContain("'alliance-diplomacy-notification:' || \"id\"::text");
    expect(sql).toContain('UQ_alliance_diplomacy_notifications_delivery_key');
    expect(sql).toContain('UQ_messages_delivery_key');
  });

  it('drops message and outbox keys in dependency order', async () => {
    const { queries, queryRunner } = recordingQueryRunner();

    await new AddDiplomacyNotificationDeliveryKey20261006100000().down(queryRunner);

    const messageIndex = queries.findIndex((query) =>
      query.includes('DROP INDEX "UQ_messages_delivery_key"'),
    );
    const messageColumn = queries.findIndex((query) =>
      query.includes('ALTER TABLE "messages" DROP COLUMN "deliveryKey"'),
    );
    expect(messageIndex).toBeLessThan(messageColumn);
  });
});
