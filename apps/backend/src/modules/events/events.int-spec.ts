import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
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
import { JwtStrategy } from '../auth/jwt.strategy';
import { User } from '../auth/user.entity';
import { GameStatusGuard } from '../game-status/game-status.guard';
import { GameStatusService } from '../game-status/game-status.service';
import { EventsController } from './events.controller';
import { GameEvent, GameEventType } from './entities/game-event.entity';
import { ExplorationState } from '../starmap/entities/exploration-state.entity';
import { SystemExploration } from '../starmap/entities/system-exploration.entity';
import { ExplorationService } from '../starmap/exploration.service';
import { GameEventService } from './game-event.service';

const JWT_SECRET = 'integration-secret';

type Actor = 'player' | 'anonymous';
type Response = { status: number; body: unknown };

describe('global events HTTP contract (Postgres, HTTP)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let player: User;
  const jwt = new JwtService({ secret: JWT_SECRET });

  beforeAll(async () => {
    dataSource = await connectIntegrationDatabase();
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [EventsController],
      providers: [
        { provide: ConfigService, useValue: { get: () => JWT_SECRET } },
        JwtStrategy,
        {
          provide: ExplorationService,
          useFactory: () =>
            new ExplorationService(
              dataSource.getRepository(ExplorationState),
              dataSource.getRepository(SystemExploration),
            ),
        },
        {
          provide: GameEventService,
          useFactory: (exploration: ExplorationService) =>
            new GameEventService(dataSource.getRepository(GameEvent), exploration),
          inject: [ExplorationService],
        },
        {
          provide: GameStatusService,
          useValue: {
            isMaintenance: jest.fn().mockResolvedValue(false),
            getPublicStatus: jest
              .fn()
              .mockResolvedValue({ status: 'ONLINE', message: '' }),
          },
        },
        Reflector,
        { provide: APP_GUARD, useClass: GameStatusGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.listen(0, '127.0.0.1');
  });

  afterAll(async () => {
    await app?.close();
    await dataSource?.destroy();
  });

  beforeEach(async () => {
    await resetDatabase(dataSource);
    const rebels = await factionId(dataSource, Faction.REBEL_ALLIANCE);
    player = await createUser(dataSource, {
      username: 'player',
      displayName: 'Player',
      faction: Faction.REBEL_ALLIANCE,
      factionId: rebels,
    });
  });

  async function call(actor: Actor, query = ''): Promise<Response> {
    const response = await fetch(`${await app.getUrl()}/api/events/recent${query}`, {
      headers:
        actor === 'anonymous'
          ? undefined
          : {
              Authorization: `Bearer ${jwt.sign({
                sub: player.id,
                username: player.username,
                faction: player.faction,
              })}`,
            },
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  }

  async function createEvent(input: {
    type: GameEventType;
    text: string;
    createdAt: Date;
    scope?: 'GALAXY' | 'SYSTEM' | null;
    layerId?: number | null;
    systemId?: number | null;
    x?: number | null;
    y?: number | null;
  }) {
    return dataSource.getRepository(GameEvent).save({
      ...input,
      scope: input.scope ?? null,
      layerId: input.layerId ?? null,
      systemId: input.systemId ?? null,
      x: input.x ?? null,
      y: input.y ?? null,
      locationId: null,
      location: null,
    });
  }

  it('requires authentication before returning global events', async () => {
    await createEvent({
      type: GameEventType.SYSTEM_ENTERED,
      text: 'Hidden event',
      createdAt: new Date('2026-10-13T10:00:00.000Z'),
    });

    const response = await call('anonymous');

    expect(response.status).toBe(401);
    expect(JSON.stringify(response.body)).not.toContain('Hidden event');
  });

  it('rejects players while the game is in maintenance', async () => {
    const gameStatus = app.get(GameStatusService) as {
      isMaintenance: jest.Mock;
      getPublicStatus: jest.Mock;
    };
    gameStatus.isMaintenance.mockResolvedValueOnce(true);
    gameStatus.getPublicStatus.mockResolvedValueOnce({
      status: 'MAINTENANCE',
      message: 'Update läuft.',
    });

    const response = await call('player');

    expect(response).toMatchObject({
      status: 403,
      body: { code: 'GAME_MAINTENANCE', message: 'Update läuft.' },
    });
  });

  it('filters, searches, limits, sorts, counts and only exposes explored locations', async () => {
    await createEvent({
      type: GameEventType.SPACECRAFT_DESTROYED,
      text: 'Rebel frigate destroyed',
      createdAt: new Date('2026-10-13T08:00:00.000Z'),
      scope: 'GALAXY',
      layerId: 7,
      x: 4,
      y: 8,
    });
    await createEvent({
      type: GameEventType.HYPERSPACE_INTERCEPTED,
      text: 'Imperial fleet intercepted',
      createdAt: new Date('2026-10-13T09:00:00.000Z'),
      scope: 'SYSTEM',
      systemId: 9,
      x: 2,
      y: 5,
    });
    await createEvent({
      type: GameEventType.SPACECRAFT_DESTROYED,
      text: 'Imperial corvette destroyed',
      createdAt: new Date('2026-10-13T10:00:00.000Z'),
      scope: 'GALAXY',
      layerId: 8,
      x: 1,
      y: 3,
    });

    await dataSource.getRepository(ExplorationState).save({
      userId: player.id,
      layerId: 8,
      cx: 1,
      cy: 3,
    });

    const filtered = await call(
      'player',
      '?type=SPACECRAFT_DESTROYED&search=imperial&limit=1',
    );

    expect(filtered).toMatchObject({
      status: 200,
      body: {
        events: [
          {
            type: GameEventType.SPACECRAFT_DESTROYED,
            text: 'Imperial corvette destroyed',
            scope: 'GALAXY',
            layerId: 8,
            systemId: null,
            x: 1,
            y: 3,
            locationId: null,
            location: null,
            createdAt: '2026-10-13T10:00:00.000Z',
          },
        ],
        counts: {
          [GameEventType.SPACECRAFT_DESTROYED]: 2,
          [GameEventType.HYPERSPACE_INTERCEPTED]: 1,
          [GameEventType.SYSTEM_ENTERED]: 0,
        },
      },
    });

    const hidden = await call('player', '?search=frigate');
    expect(hidden).toEqual({
      status: 200,
      body: {
        events: [
          {
            id: expect.any(Number),
            type: GameEventType.SPACECRAFT_DESTROYED,
            text: 'Rebel frigate destroyed',
            scope: null,
            layerId: null,
            systemId: null,
            x: null,
            y: null,
            locationId: null,
            location: null,
            createdAt: '2026-10-13T08:00:00.000Z',
          },
        ],
        counts: {
          [GameEventType.SPACECRAFT_DESTROYED]: 2,
          [GameEventType.HYPERSPACE_INTERCEPTED]: 1,
          [GameEventType.SYSTEM_ENTERED]: 0,
        },
      },
    });

    const empty = await call('player', '?search=does-not-exist');
    expect(empty).toEqual({
      status: 200,
      body: {
        events: [],
        counts: {
          [GameEventType.SPACECRAFT_DESTROYED]: 2,
          [GameEventType.HYPERSPACE_INTERCEPTED]: 1,
          [GameEventType.SYSTEM_ENTERED]: 0,
        },
      },
    });
  });
});
