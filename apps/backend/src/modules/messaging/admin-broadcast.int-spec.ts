import { randomUUID } from 'crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Faction, type AdminBroadcastResultDto } from '@swuniverse/shared';
import {
  connectIntegrationDatabase,
  createUser,
  resetDatabase,
} from '../../testing/integration/database';
import { JwtStrategy } from '../auth/jwt.strategy';
import { User } from '../auth/user.entity';
import { MailService } from '../mail/mail.service';
import { UserSetting } from '../settings/entities/user-setting.entity';
import { UserSettingsReader } from '../settings/user-settings-reader';
import { StatisticsService } from '../statistics/statistics.service';
import { GameGateway } from '../websocket/game.gateway';
import { AdminBroadcastService } from './admin-broadcast.service';
import { Message } from './entities/message.entity';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';

const JWT_SECRET = 'admin-broadcast-test-secret';

describe('admin broadcast (Postgres, HTTP)', () => {
  let dataSource: DataSource;
  let app: INestApplication;
  let env: Record<string, string> = { JWT_SECRET };
  const sendMail = jest.fn(async ({ to }: { to: string }) => !to.startsWith('broken'));
  const emitToUser = jest.fn();
  const jwt = new JwtService({ secret: JWT_SECRET });

  beforeAll(async () => {
    dataSource = await connectIntegrationDatabase();
    const repo = <T extends object>(entity: new () => T) => ({
      provide: getRepositoryToken(entity),
      useFactory: () => dataSource.getRepository(entity),
    });
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [MessagingController],
      providers: [
        { provide: ConfigService, useValue: { get: (key: string) => env[key] } },
        repo(User),
        repo(Message),
        repo(UserSetting),
        JwtStrategy,
        MessagingService,
        AdminBroadcastService,
        UserSettingsReader,
        { provide: StatisticsService, useValue: { countEvent: jest.fn() } },
        { provide: GameGateway, useValue: { emitToUser } },
        { provide: MailService, useValue: { isEnabled: () => true, sendMail } },
      ],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.listen(0, '127.0.0.1');
  });

  afterAll(async () => {
    await app.close();
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await resetDatabase(dataSource);
    env = { JWT_SECRET };
    sendMail.mockClear();
    emitToUser.mockClear();
  });

  async function call<T>(user: User, method: string, path: string, body?: unknown) {
    const response = await fetch(`${await app.getUrl()}/api/messages${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt.sign({ sub: user.id, username: user.username, isAdmin: user.isAdmin })}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: (await response.json()) as T };
  }

  async function world() {
    const admin = await createUser(dataSource, { isAdmin: true, faction: Faction.REBEL_ALLIANCE });
    const rebel = await createUser(dataSource, { faction: Faction.REBEL_ALLIANCE, email: 'rebel@example.test' });
    const muted = await createUser(dataSource, { faction: Faction.REBEL_ALLIANCE, email: 'muted@example.test' });
    const imperial = await createUser(dataSource, { faction: Faction.GALACTIC_EMPIRE, email: 'broken@example.test' });
    const npc = await createUser(dataSource, { isNpc: true, faction: Faction.REBEL_ALLIANCE });
    await dataSource.getRepository(UserSetting).save({ userId: muted.id, key: 'email_notification', value: '0' });
    return { admin, rebel, muted, imperial, npc };
  }

  const broadcast = (overrides: Record<string, unknown> = {}) => ({
    broadcastId: randomUUID(),
    subject: 'Wartung',
    body: 'Morgen ab 20 Uhr ist [b]Wartung[/b].',
    target: 'ALL',
    alsoEmail: false,
    ...overrides,
  });

  const systemMessages = () =>
    dataSource.getRepository(Message).find({ where: { isSystem: true }, order: { recipientId: 'ASC' } });

  it('is admin only', async () => {
    const { rebel } = await world();

    expect((await call(rebel, 'POST', '/admin/broadcast', broadcast())).status).toBe(403);
    expect((await call(rebel, 'GET', '/admin/broadcast/audience')).status).toBe(403);
    expect(await systemMessages()).toHaveLength(0);
  });

  it('delivers one system message per player, excludes NPCs and is idempotent per broadcast id', async () => {
    const { admin, rebel, muted, imperial } = await world();
    const request = broadcast();

    const first = await call<AdminBroadcastResultDto>(admin, 'POST', '/admin/broadcast', request);
    const repeated = await call<AdminBroadcastResultDto>(admin, 'POST', '/admin/broadcast', request);

    expect(first).toEqual({ status: 201, body: { recipients: 4, emailsSent: 0 } });
    expect(repeated.body).toEqual({ recipients: 4, emailsSent: 0 });
    const messages = await systemMessages();
    expect(messages.map((message) => message.recipientId)).toEqual([admin.id, rebel.id, muted.id, imperial.id]);
    expect(messages[1]).toMatchObject({
      subject: 'Wartung',
      body: 'Morgen ab 20 Uhr ist [b]Wartung[/b].',
      folder: 'SYSTEM',
      deliveryKey: `broadcast:${request.broadcastId}:${rebel.id}`,
    });
    expect(emitToUser).toHaveBeenCalledTimes(4);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('filters by faction', async () => {
    const { admin, imperial } = await world();

    const audience = await call(admin, 'GET', `/admin/broadcast/audience?target=${Faction.GALACTIC_EMPIRE}`);
    const result = await call(admin, 'POST', '/admin/broadcast', broadcast({ target: Faction.GALACTIC_EMPIRE }));

    expect(audience.body).toEqual({ recipients: 1, emailRecipients: 1, emailEnabled: true });
    expect(result.body).toEqual({ recipients: 1, emailsSent: 0 });
    expect((await systemMessages()).map((message) => message.recipientId)).toEqual([imperial.id]);
  });

  it('mails only players with email notifications, once, and counts only sent mails', async () => {
    const { admin } = await world();
    const request = broadcast({ alsoEmail: true });

    const audience = await call(admin, 'GET', '/admin/broadcast/audience');
    const first = await call(admin, 'POST', '/admin/broadcast', request);
    await call(admin, 'POST', '/admin/broadcast', request);

    expect(audience.body).toEqual({ recipients: 4, emailRecipients: 3, emailEnabled: true });
    expect(first.body).toEqual({ recipients: 4, emailsSent: 2 });
    expect(sendMail.mock.calls.map(([mail]) => mail.to).sort()).toEqual([
      'broken@example.test',
      expect.stringMatching(/^pilot\d+@example\.test$/),
      'rebel@example.test',
    ]);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ subject: 'Wartung', text: 'Morgen ab 20 Uhr ist [b]Wartung[/b].' }),
    );
  });

  it('validates subject, body, target and broadcast id', async () => {
    const { admin } = await world();

    for (const invalid of [
      { subject: ' ' },
      { subject: 'x'.repeat(256) },
      { body: 'kurz' },
      { target: 'HUTTS' },
      { broadcastId: 'nope' },
    ]) {
      expect((await call(admin, 'POST', '/admin/broadcast', broadcast(invalid))).status).toBe(400);
    }
    expect(await systemMessages()).toHaveLength(0);
  });
});
