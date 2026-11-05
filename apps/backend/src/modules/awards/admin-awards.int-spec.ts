import { getRepositoryToken } from '@nestjs/typeorm';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { Faction } from '@swuniverse/shared';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { AdminGuard } from '../auth/admin.guard';
import { GameStatusGuard } from '../game-status/game-status.guard';
import { GameStatusService } from '../game-status/game-status.service';
import { GameStatus } from '../game-status/entities/game-status.entity';
import { JwtStrategy } from '../auth/jwt.strategy';
import { User } from '../auth/user.entity';
import { MessagingService } from '../messaging/messaging.service';
import { PrestigeService } from '../prestige/prestige.service';
import { FactionEntity } from '../faction/entities/faction.entity';
import { FactionModifier } from '../faction/entities/faction-modifier.entity';
import { AdminAwardsController } from './admin-awards.controller';
import { AwardService } from './award.service';
import { Award } from './entities/award.entity';
import { UserAward } from './entities/user-award.entity';

const JWT_SECRET = 'integration-secret';
type Actor = 'admin' | 'player' | 'anonymous';
type HttpResponse = { status: number; body: unknown };

describe('admin awards HTTP access (Postgres, HTTP)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let users: Record<Exclude<Actor, 'anonymous'>, User>;
  const jwt = new JwtService({ secret: JWT_SECRET });

  beforeAll(async () => {
    dataSource = await new DataSource({
      type: 'postgres',
      url: process.env.INTEGRATION_DATABASE_URL,
      entities: [
        User,
        FactionEntity,
        FactionModifier,
        Award,
        UserAward,
        GameStatus,
      ],
      synchronize: true,
      logging: false,
    }).initialize();
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [AdminAwardsController],
      providers: [
        { provide: ConfigService, useValue: { get: () => JWT_SECRET } },
        {
          provide: getRepositoryToken(User),
          useValue: dataSource.getRepository(User),
        },
        {
          provide: getRepositoryToken(Award),
          useValue: dataSource.getRepository(Award),
        },
        JwtStrategy,
        AdminGuard,
        {
          provide: APP_GUARD,
          useFactory: () =>
            new GameStatusGuard(
              new Reflector(),
              {
                getPublicStatus: async () => ({
                  status: 'ONLINE',
                  message: '',
                }),
              } as unknown as GameStatusService,
              jwt,
              { get: () => JWT_SECRET } as unknown as ConfigService,
              dataSource.getRepository(User),
            ),
        },
        {
          provide: AwardService,
          useFactory: () =>
            new AwardService(
              dataSource.getRepository(UserAward),
              { change: jest.fn() } as unknown as PrestigeService,
              { sendSystem: jest.fn() } as unknown as MessagingService,
            ),
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.listen(0, '127.0.0.1');
  });

  afterAll(async () => {
    await app.close();
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await dataSource.query(
      'TRUNCATE "user_awards", "users", "factions", "awards", "game_status" RESTART IDENTITY CASCADE',
    );
    await dataSource.getRepository(GameStatus).save({
      id: 1,
      status: 'ONLINE',
      message: '',
    });
    const factions = dataSource.getRepository(FactionEntity);
    const rebels = await factions.save(
      factions.create({
        key: Faction.REBEL_ALLIANCE,
        name: 'Rebellenallianz',
        colorPrimary: '#ffffff',
        colorSecondary: '#000000',
      }),
    );
    const players = dataSource.getRepository(User);
    users = {
      admin: await players.save(
        players.create({
          username: 'admin',
          email: 'admin@example.test',
          passwordHash: 'x',
          faction: Faction.REBEL_ALLIANCE,
          factionId: rebels.id,
          isAdmin: true,
        }),
      ),
      player: await players.save(
        players.create({
          username: 'player',
          email: 'player@example.test',
          passwordHash: 'x',
          faction: Faction.REBEL_ALLIANCE,
          factionId: rebels.id,
        }),
      ),
    };
    const awards = dataSource.getRepository(Award);
    await awards.save(
      awards.create({
        key: 'COMMUNITY_HELPER',
        description: 'Verdienste um die Gemeinschaft',
        image: '/favicon.ico',
        prestige: 10,
        isNpc: false,
      }),
    );
  });

  async function call(
    actor: Actor,
    method: string,
    path: string,
    body?: unknown,
  ): Promise<HttpResponse> {
    const user = actor === 'anonymous' ? null : users[actor];
    const response = await fetch(`${await app.getUrl()}/api${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(user
          ? {
              Authorization: `Bearer ${jwt.sign({
                sub: user.id,
                username: user.username,
                faction: user.faction,
                isAdmin: user.isAdmin,
              })}`,
            }
          : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    const parsedBody: unknown = text ? JSON.parse(text) : null;
    return { status: response.status, body: parsedBody };
  }

  it('restricts grants to admins and applies idempotent and incremental grants', async () => {
    expect(
      (
        await call('player', 'POST', '/admin/awards/grant', {
          playerId: 2,
          awardKey: 'COMMUNITY_HELPER',
        })
      ).status,
    ).toBe(403);

    const grant = await call('admin', 'POST', '/admin/awards/grant', {
      playerId: users.player.id,
      awardKey: 'COMMUNITY_HELPER',
    });
    expect(grant).toMatchObject({
      status: 201,
      body: { granted: true, count: 1 },
    });

    const duplicate = await call('admin', 'POST', '/admin/awards/grant', {
      playerId: users.player.id,
      awardKey: 'COMMUNITY_HELPER',
    });
    expect(duplicate).toMatchObject({
      status: 201,
      body: { granted: false, count: 1 },
    });

    const incremented = await call('admin', 'POST', '/admin/awards/grant', {
      playerId: users.player.id,
      awardKey: 'COMMUNITY_HELPER',
      incrementExisting: true,
    });
    expect(incremented).toMatchObject({
      status: 201,
      body: { granted: true, count: 2 },
    });
  });

  it('validates grant input and reports missing players and awards as 404', async () => {
    expect(
      (
        await call('admin', 'POST', '/admin/awards/grant', {
          playerId: 1.5,
          awardKey: 'COMMUNITY_HELPER',
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await call('admin', 'POST', '/admin/awards/grant', {
          playerId: users.player.id,
          awardKey: '',
          incrementExisting: 'yes',
        })
      ).status,
    ).toBe(400);

    expect(
      (
        await call('admin', 'POST', '/admin/awards/grant', {
          playerId: 999999,
          awardKey: 'COMMUNITY_HELPER',
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await call('admin', 'POST', '/admin/awards/grant', {
          playerId: users.player.id,
          awardKey: 'UNKNOWN_AWARD',
        })
      ).status,
    ).toBe(404);
  });

  it('exposes persisted award choices only to admins', async () => {
    expect((await call('player', 'GET', '/admin/awards/catalog')).status).toBe(
      403,
    );
    const catalog = await call('admin', 'GET', '/admin/awards/catalog');
    expect(catalog.status).toBe(200);
    expect(catalog.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'COMMUNITY_HELPER',
          description: 'Verdienste um die Gemeinschaft',
        }),
      ]),
    );
  });
});
