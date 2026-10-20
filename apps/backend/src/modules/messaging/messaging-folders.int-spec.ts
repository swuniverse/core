import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { Faction } from '@swuniverse/shared';
import {
  connectIntegrationDatabase,
  createUser,
  factionId,
  resetDatabase,
} from '../../testing/integration/database';
import { User } from '../auth/user.entity';
import { JwtStrategy } from '../auth/jwt.strategy';
import { MessagingController } from './messaging.controller';
import { StatisticsService } from '../statistics/statistics.service';
import { MessagingService } from './messaging.service';
import { Message } from './entities/message.entity';
import { MessageFolder } from './message-folder';

const JWT_SECRET = 'integration-secret';

type Actor = 'leia' | 'han' | 'anonymous';
// HTTP JSON bodies are intentionally inspected as partial REST payloads.
type Response = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any

describe('message folders HTTP contract (Postgres, HTTP)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let rebels: number;
  let users: Record<Exclude<Actor, 'anonymous'>, User>;
  const jwt = new JwtService({ secret: JWT_SECRET });

  beforeAll(async () => {
    dataSource = await connectIntegrationDatabase();
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [MessagingController],
      providers: [
        { provide: ConfigService, useValue: { get: () => JWT_SECRET } },
        JwtStrategy,
        {
          provide: MessagingService,
          useFactory: () =>
            new MessagingService(
              dataSource.getRepository(Message),
              new StatisticsService(dataSource, []),
            ),
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix('api');
    await app.listen(0, '127.0.0.1');
  });

  afterAll(async () => {
    await app?.close();
    await dataSource?.destroy();
  });

  beforeEach(async () => {
    await resetDatabase(dataSource);
    rebels = await factionId(dataSource, Faction.REBEL_ALLIANCE);
    users = {
      leia: await createUser(dataSource, {
        username: 'leia',
        faction: Faction.REBEL_ALLIANCE,
        factionId: rebels,
      }),
      han: await createUser(dataSource, {
        username: 'han',
        faction: Faction.REBEL_ALLIANCE,
        factionId: rebels,
      }),
    };
  });

  async function call(
    actor: Actor,
    path: string,
    method = 'GET',
    body?: unknown,
  ): Promise<Response> {
    const user = actor === 'anonymous' ? null : users[actor];
    const response = await fetch(`${await app.getUrl()}/api${path}`, {
      method,
      headers: {
        ...(user
          ? {
              Authorization: `Bearer ${jwt.sign({
                sub: user.id,
                username: user.username,
                faction: user.faction,
              })}`,
            }
          : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  }

  it('lists every folder with zero counts for empty folders', async () => {
    const response = await call('leia', '/messages/folders');

    expect(response).toMatchObject({
      status: 200,
      body: [
        { folder: 'PERSONAL', unread: 0, total: 0 },
        { folder: 'SHIP', unread: 0, total: 0 },
        { folder: 'COLONY', unread: 0, total: 0 },
        { folder: 'TRADE', unread: 0, total: 0 },
        { folder: MessageFolder.SYSTEM, unread: 0, total: 0 },
        { folder: 'OUTBOX', unread: 0, total: 0 },
        { folder: 'STATION', unread: 0, total: 0 },
      ],
    });
  });

  it('summarizes persisted personal, system and sent messages', async () => {
    const messages = dataSource.getRepository(Message);
    await messages.save([
      messages.create({
        senderId: users.han.id,
        recipientId: users.leia.id,
        subject: 'Ungelesen',
        body: 'private Nachricht',
      }),
      messages.create({
        senderId: users.han.id,
        recipientId: users.leia.id,
        subject: 'Gelesen',
        body: 'private Nachricht',
        isRead: true,
      }),
      messages.create({
        senderId: users.leia.id,
        recipientId: users.leia.id,
        subject: 'System',
        body: 'Systemmeldung',
        isSystem: true,
        folder: MessageFolder.SYSTEM,
      }),
      messages.create({
        senderId: users.leia.id,
        recipientId: users.han.id,
        subject: 'Gesendet',
        body: 'Ausgang',
      }),
    ]);

    const response = await call('leia', '/messages/folders');

    expect(response).toEqual({
      status: 200,
      body: [
        { folder: 'PERSONAL', unread: 1, total: 2 },
        { folder: 'SHIP', unread: 0, total: 0 },
        { folder: 'COLONY', unread: 0, total: 0 },
        { folder: 'TRADE', unread: 0, total: 0 },
        { folder: MessageFolder.SYSTEM, unread: 1, total: 1 },
        { folder: 'OUTBOX', unread: 0, total: 2 },
        { folder: 'STATION', unread: 0, total: 0 },
      ],
    });
  });

  it('filters folders on the server and protects another players messages', async () => {
    const messages = dataSource.getRepository(Message);
    const first = await messages.save(
      messages.create({
        senderId: users.han.id,
        recipientId: users.leia.id,
        subject: 'Erste persönliche Nachricht',
        body: 'one',
      }),
    );
    await messages.save([
      messages.create({
        senderId: users.han.id,
        recipientId: users.leia.id,
        subject: 'Zweite persönliche Nachricht',
        body: 'two',
      }),
      messages.create({
        senderId: users.leia.id,
        recipientId: users.leia.id,
        subject: 'Systemnachricht',
        body: 'system',
        isSystem: true,
        folder: MessageFolder.SYSTEM,
      }),
    ]);

    const personal = await call('leia', '/messages/folders/PERSONAL?page=1');
    expect(personal).toMatchObject({
      status: 200,
      body: {
        total: 2,
        page: 1,
        limit: 20,
      },
    });
    expect(personal.body.data.map((message: Message) => message.subject)).toEqual([
      'Zweite persönliche Nachricht',
      'Erste persönliche Nachricht',
    ]);

    const system = await call('leia', '/messages/folders/SYSTEM');
    expect(system).toMatchObject({ status: 200, body: { total: 1 } });
    expect(system.body.data.map((message: Message) => message.subject)).toEqual([
      'Systemnachricht',
    ]);

    const otherUsersMessage = await call('han', `/messages/${first.id}`);
    expect(otherUsersMessage.status).toBe(200);

    const ownedByHan = await messages.save(
      messages.create({
        senderId: users.han.id,
        recipientId: users.han.id,
        subject: 'Hans persönliche Nachricht',
        body: 'private',
      }),
    );
    const leiaCannotOpenHansMessage = await call(
      'leia',
      `/messages/${ownedByHan.id}`,
    );
    expect(leiaCannotOpenHansMessage.status).toBe(404);

    const opened = await call('leia', `/messages/${first.id}`);
    expect(opened).toMatchObject({ status: 200, body: { isRead: true } });
    expect(await messages.findOneByOrFail({ id: first.id })).toMatchObject({
      isRead: true,
    });
  });

  it('paginates a folder without including messages from another folder', async () => {
    const messages = dataSource.getRepository(Message);
    for (let index = 1; index <= 21; index += 1) {
      await messages.save(
        messages.create({
          senderId: users.han.id,
          recipientId: users.leia.id,
          subject: `Persönlich ${index}`,
          body: 'private Nachricht',
        }),
      );
    }
    await messages.save(
      messages.create({
        senderId: users.leia.id,
        recipientId: users.leia.id,
        subject: 'Systemnachricht',
        body: 'system',
        isSystem: true,
        folder: MessageFolder.SYSTEM,
      }),
    );

    const response = await call('leia', '/messages/folders/PERSONAL?page=2');

    expect(response).toMatchObject({
      status: 200,
      body: { total: 21, page: 2, limit: 20 },
    });
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({ subject: 'Persönlich 1' });
  });

  it('requires authentication for folder summaries and folder messages', async () => {
    expect((await call('anonymous', '/messages/folders')).status).toBe(401);
    expect((await call('anonymous', '/messages/folders/PERSONAL')).status).toBe(
      401,
    );
  });

  it('marks every received message in the selected folder as read', async () => {
    const messages = dataSource.getRepository(Message);
    await messages.save([
      messages.create({
        senderId: users.han.id,
        recipientId: users.leia.id,
        subject: 'Erste persönliche Nachricht',
        body: 'one',
      }),
      messages.create({
        senderId: users.han.id,
        recipientId: users.leia.id,
        subject: 'Zweite persönliche Nachricht',
        body: 'two',
      }),
      messages.create({
        senderId: users.leia.id,
        recipientId: users.leia.id,
        subject: 'Systemnachricht',
        body: 'system',
        isSystem: true,
        folder: MessageFolder.SYSTEM,
      }),
    ]);

    const response = await call(
      'leia',
      '/messages/folders/PERSONAL/mark-read',
      'POST',
    );

    expect(response).toMatchObject({ status: 201, body: { affected: 2 } });
    expect(await messages.countBy({
      recipientId: users.leia.id,
      folder: MessageFolder.PERSONAL,
      isRead: false,
    })).toBe(0);
    expect(await messages.countBy({
      recipientId: users.leia.id,
      folder: MessageFolder.SYSTEM,
      isRead: false,
    })).toBe(1);
  });

  it('empties only the callers selected received folder', async () => {
    const messages = dataSource.getRepository(Message);
    const personal = await messages.save(
      messages.create({
        senderId: users.han.id,
        recipientId: users.leia.id,
        subject: 'Persönlich',
        body: 'one',
      }),
    );
    const system = await messages.save(
      messages.create({
        senderId: users.leia.id,
        recipientId: users.leia.id,
        subject: 'System',
        body: 'system',
        isSystem: true,
        folder: MessageFolder.SYSTEM,
      }),
    );
    const hansMessage = await messages.save(
      messages.create({
        senderId: users.han.id,
        recipientId: users.han.id,
        subject: 'Hans Nachricht',
        body: 'private',
      }),
    );

    const response = await call(
      'leia',
      '/messages/folders/PERSONAL/empty',
      'POST',
    );

    expect(response).toMatchObject({ status: 201, body: { affected: 1 } });
    expect(await messages.findOneByOrFail({ id: personal.id })).toMatchObject({
      deletedByRecipient: true,
      deletedBySender: false,
    });
    expect(await messages.findOneByOrFail({ id: system.id })).toMatchObject({
      deletedByRecipient: false,
    });
    expect(await messages.findOneByOrFail({ id: hansMessage.id })).toMatchObject({
      deletedByRecipient: false,
    });
  });

  it('soft deletes only selected received messages owned by the caller', async () => {
    const messages = dataSource.getRepository(Message);
    const selected = await messages.save(
      messages.create({
        senderId: users.han.id,
        recipientId: users.leia.id,
        subject: 'Leias Nachricht',
        body: 'one',
      }),
    );
    const otherUser = await messages.save(
      messages.create({
        senderId: users.han.id,
        recipientId: users.han.id,
        subject: 'Hans Nachricht',
        body: 'two',
      }),
    );

    const response = await call('leia', '/messages/bulk-delete', 'POST', {
      ids: [selected.id, otherUser.id],
    });

    expect(response).toMatchObject({ status: 201, body: { affected: 1 } });
    expect(await messages.findOneByOrFail({ id: selected.id })).toMatchObject({
      deletedByRecipient: true,
      deletedBySender: false,
    });
    expect(await messages.findOneByOrFail({ id: otherUser.id })).toMatchObject({
      deletedByRecipient: false,
    });
  });

  it('rejects folder-wide actions for the outbox', async () => {
    expect(
      (await call('leia', '/messages/folders/OUTBOX/mark-read', 'POST')).status,
    ).toBe(400);
    expect(
      (await call('leia', '/messages/folders/OUTBOX/empty', 'POST')).status,
    ).toBe(400);
  });
});
