import { DataSource } from 'typeorm';
import { Faction } from '@swuniverse/shared';
import {
  connectIntegrationDatabase,
  createUser,
  factionId,
  resetDatabase,
} from '../../testing/integration/database';
import { Message } from '../../modules/messaging/entities/message.entity';
import { MessageFolder } from '../../modules/messaging/message-folder';
import { MigrateColonyEvents20261013120000 } from '../migrations/20261013120000-migrate-colony-events';

type LegacyColonyEvent = {
  id: number;
  colonyId: number;
  userId: number;
  type: string;
  severity: string;
  title: string;
  message: string;
  payload: Record<string, unknown>;
  tickId: number | null;
  readAt: Date | null;
  createdAt: Date;
};

describe('MigrateColonyEvents20261013120000 migration (Postgres)', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = await connectIntegrationDatabase();
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  beforeEach(async () => {
    await resetDatabase(dataSource);
  });

  it('copies each colony event once while preserving recipient, timestamps, read status, and origin metadata', async () => {
    const rebels = await factionId(dataSource, Faction.REBEL_ALLIANCE);
    const [leia, han] = await Promise.all([
      createUser(dataSource, {
        username: 'leia',
        faction: Faction.REBEL_ALLIANCE,
        factionId: rebels,
      }),
      createUser(dataSource, {
        username: 'han',
        faction: Faction.REBEL_ALLIANCE,
        factionId: rebels,
      }),
    ]);
    const createdAt = new Date('2026-10-12T08:15:00.000Z');
    const readAt = new Date('2026-10-12T09:30:00.000Z');
    const [unread, read] = await Promise.all([
      insertColonyEvent(dataSource, {
        colonyId: 44,
        userId: leia.id,
        type: 'STORAGE_FULL',
        severity: 'WARNING',
        title: 'Lager voll',
        message: 'Die Speicher sind voll.',
        payload: { resource: 'Tibanna-Gas' },
        tickId: 73,
        createdAt,
        readAt: null,
      }),
      insertColonyEvent(dataSource, {
        colonyId: 55,
        userId: han.id,
        type: 'COLONY_ATTACKED',
        severity: 'CRITICAL',
        title: 'Kolonie angegriffen',
        message: 'Schildgenerator getroffen.',
        payload: { attacker: 'Piraten' },
        tickId: 74,
        createdAt: new Date('2026-10-11T12:00:00.000Z'),
        readAt,
      }),
    ]);

    const runner = dataSource.createQueryRunner();
    await runner.connect();
    try {
      await new MigrateColonyEvents20261013120000().up(runner);
      await new MigrateColonyEvents20261013120000().up(runner);
    } finally {
      await runner.release();
    }

    const messages = await dataSource.getRepository(Message).find({
      order: { recipientId: 'ASC' },
    });

    expect(messages).toHaveLength(2);
    expect(messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          recipientId: leia.id,
          senderId: leia.id,
          subject: unread.title,
          body: unread.message,
          isRead: false,
          isSystem: true,
          folder: MessageFolder.COLONY,
          createdAt,
          deliveryKey: `colony-event:${unread.id}`,
        }),
        expect.objectContaining({
          recipientId: han.id,
          senderId: han.id,
          subject: read.title,
          body: read.message,
          isRead: true,
          isSystem: true,
          folder: MessageFolder.COLONY,
          createdAt: read.createdAt,
          deliveryKey: `colony-event:${read.id}`,
        }),
      ]),
    );

    const metadata = await dataSource.query<
      Array<{
        eventId: number;
        eventType: string;
        severity: string;
        colonyId: number;
        origin: string;
        payload: Record<string, unknown>;
        tickId: number | null;
      }>
    >(`
      SELECT
        "originEventId" AS "eventId",
        "originEventType" AS "eventType",
        "originSeverity" AS "severity",
        "originColonyId" AS "colonyId",
        "originKind" AS "origin",
        "originPayload" AS "payload",
        "originTickId" AS "tickId"
      FROM "messages"
      ORDER BY "recipientId" ASC
    `);

    expect(metadata).toEqual([
      {
        eventId: unread.id,
        eventType: unread.type,
        severity: unread.severity,
        colonyId: unread.colonyId,
        origin: 'COLONY_EVENT',
        payload: unread.payload,
        tickId: unread.tickId,
      },
      {
        eventId: read.id,
        eventType: read.type,
        severity: read.severity,
        colonyId: read.colonyId,
        origin: 'COLONY_EVENT',
        payload: read.payload,
        tickId: read.tickId,
      },
    ]);
  });
});

async function insertColonyEvent(
  dataSource: DataSource,
  event: Omit<LegacyColonyEvent, 'id'>,
): Promise<LegacyColonyEvent> {
  const [inserted] = await dataSource.query<LegacyColonyEvent[]>(
    `
      INSERT INTO "colony_events" (
        "colonyId", "userId", "type", "severity", "title", "message",
        "payload", "tickId", "createdAt", "readAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `,
    [
      event.colonyId,
      event.userId,
      event.type,
      event.severity,
      event.title,
      event.message,
      JSON.stringify(event.payload),
      event.tickId,
      event.createdAt,
      event.readAt,
    ],
  );
  return inserted;
}
