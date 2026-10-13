import { INestApplication, ValidationPipe } from '@nestjs/common';
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
import { AdminGuard } from '../auth/admin.guard';
import { GameStatusController } from './game-status.controller';
import { GameStatus } from './entities/game-status.entity';
import { GameStatusService } from './game-status.service';

const JWT_SECRET = 'integration-secret';

type Actor = 'admin' | 'player' | 'anonymous';
type Response = { status: number; body: any };

describe('game status HTTP access (Postgres, HTTP)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let rebels: number;
  let users: Record<Exclude<Actor, 'anonymous'>, User>;
  const jwt = new JwtService({ secret: JWT_SECRET });

  beforeAll(async () => {
    dataSource = await connectIntegrationDatabase();
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [GameStatusController],
      providers: [
        { provide: ConfigService, useValue: { get: () => JWT_SECRET } },
        JwtStrategy,
        AdminGuard,
        {
          provide: GameStatusService,
          useFactory: () =>
            new GameStatusService(dataSource.getRepository(GameStatus)),
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
    await resetDatabase(dataSource);
    rebels = await factionId(dataSource, Faction.REBEL_ALLIANCE);
    users = {
      admin: await createUser(dataSource, {
        username: 'admin',
        displayName: 'Admin',
        faction: Faction.REBEL_ALLIANCE,
        factionId: rebels,
        isAdmin: true,
      }),
      player: await createUser(dataSource, {
        username: 'player',
        displayName: 'Player',
        faction: Faction.REBEL_ALLIANCE,
        factionId: rebels,
      }),
    };
  });

  async function call(
    actor: Actor,
    method: string,
    path: string,
    body?: unknown,
  ): Promise<Response> {
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
    return { status: response.status, body: text ? JSON.parse(text) : null };
  }

  it('keeps the public status visible and restricts status changes to administrators', async () => {
    expect((await call('anonymous', 'GET', '/game-status')).status).toBe(200);
    expect(
      (await call('player', 'PATCH', '/game-status', { status: 'MAINTENANCE' }))
        .status,
    ).toBe(403);

    const updated = await call('admin', 'PATCH', '/game-status', {
      status: 'MAINTENANCE',
      message: 'Update läuft.',
    });

    expect(updated).toMatchObject({
      status: 200,
      body: { status: 'MAINTENANCE', message: 'Update läuft.' },
    });
  });

  it('reports a maintenance marker while preserving public status access', async () => {
    const updated = await call('admin', 'PATCH', '/game-status', {
      status: 'MAINTENANCE',
      message: 'Update läuft.',
    });

    expect(updated).toMatchObject({
      status: 200,
      body: { status: 'MAINTENANCE', message: 'Update läuft.' },
    });
    expect((await call('anonymous', 'GET', '/game-status')).body).toEqual({
      status: 'MAINTENANCE',
      message: 'Update läuft.',
    });
  });
});
