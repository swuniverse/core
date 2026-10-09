import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AllianceRole, Faction } from '@swuniverse/shared';
import {
  connectIntegrationDatabase,
  createUser,
  factionId,
  resetDatabase,
} from '../../testing/integration/database';
import { User } from '../auth/user.entity';
import { JwtStrategy } from '../auth/jwt.strategy';
import { ColonyCrewService } from '../colony/colony-crew.service';
import { ColonySocialService } from '../colony/colony-social.service';
import { ColonyStatsService } from '../colony/colony-stats.service';
import { Colony } from '../colony/entities/colony.entity';
import { ColonyStorage } from '../colony/entities/colony-storage.entity';
import { ColonyChangeable } from '../colony/entities/colony-changeable.entity';
import { ColonyCrewTrainingQueue } from '../colony/entities/colony-crew-training-queue.entity';
import { Crew } from '../colony/entities/crew.entity';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { DashboardController } from '../dashboard/dashboard.controller';
import { DashboardService } from '../dashboard/dashboard.service';
import { GameDataService } from '../game-data/game-data.service';
import { MessagingService } from '../messaging/messaging.service';
import { Layer } from '../starmap/entities/layer.entity';
import { StarSystem } from '../starmap/entities/star-system.entity';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import { AllianceController } from './alliance.controller';
import { AllianceService } from './alliance.service';
import { ALLIANCE_STORE } from './alliance.store';
import { AllianceRateLimiterService } from './alliance-rate-limiter.service';
import { FORUM_STORE } from './forum.store';
import { ForumService } from './forum.service';
import { MemberOverviewService } from './member-overview.service';
import { MEMBER_OPERATIONS_READER } from './member-operations.port';
import { TypeOrmAllianceStore } from './typeorm-alliance.store';
import { TypeOrmForumStore } from './typeorm-forum.store';
import { TypeOrmMemberOperationsReader } from './typeorm-member-operations.reader';

const { NONE, PRESIDENT, VICE, DIPLOMAT } = AllianceRole;
const JWT_SECRET = 'integration-secret';

type Actor =
  | 'president'
  | 'vice'
  | 'diplomat'
  | 'member'
  | 'loner'
  | 'foreignPresident'
  | 'foreignMember'
  | 'anonymous';

type Response = { status: number; body: any };

/**
 * Direct HTTP requests against the real controllers, JWT guard, services and
 * Postgres: the server alone decides who sees or changes forum, chronicle and
 * member data, whatever IDs the client puts into path and body.
 */
describe('alliance internal cooperation requests (Postgres, HTTP)', () => {
  let dataSource: DataSource;
  let rebels: number;
  let app: INestApplication;
  let w: Awaited<ReturnType<typeof world>>;
  const jwt = new JwtService({ secret: JWT_SECRET });

  beforeAll(async () => {
    dataSource = await connectIntegrationDatabase();
    const gameData = new GameDataService();
    gameData.onModuleInit();
    const stats = new ColonyStatsService(gameData);
    const crew = new ColonyCrewService(
      dataSource.getRepository(Colony),
      dataSource.getRepository(ColonyChangeable),
      dataSource.getRepository(ColonyCrewTrainingQueue),
      dataSource.getRepository(Crew),
      dataSource.getRepository(CrewAssignment),
      dataSource.getRepository(Spacecraft),
      stats,
      new ColonySocialService(gameData),
    );
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [AllianceController, DashboardController],
      providers: [
        { provide: ConfigService, useValue: { get: () => JWT_SECRET } },
        JwtStrategy,
        AllianceService,
        ForumService,
        MemberOverviewService,
        {
          provide: ALLIANCE_STORE,
          useFactory: () => new TypeOrmAllianceStore(dataSource),
        },
        {
          provide: FORUM_STORE,
          useFactory: () => new TypeOrmForumStore(dataSource),
        },
        {
          provide: MEMBER_OPERATIONS_READER,
          useValue: new TypeOrmMemberOperationsReader(
            dataSource,
            crew,
            stats,
            gameData,
          ),
        },
        {
          provide: MessagingService,
          useValue: { sendSystem: async () => undefined },
        },
        {
          provide: AllianceRateLimiterService,
          useValue: { check: async () => undefined },
        },
        {
          // The dashboard route under test only delegates to the real ForumService.
          provide: DashboardService,
          inject: [ForumService],
          useFactory: (forum: ForumService) => ({
            getForumTopics: (userId: number) => forum.listRecentTopics(userId),
          }),
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
    w = await world();
  });

  async function call(
    actor: Actor,
    method: string,
    path: string,
    body?: unknown,
  ): Promise<Response> {
    const user = actor === 'anonymous' ? null : w.users[actor];
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
              })}`,
            }
          : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  }

  // --- World -----------------------------------------------------------

  async function world() {
    const store = new TypeOrmAllianceStore(dataSource);
    const player = (username: string) =>
      createUser(dataSource, {
        username,
        displayName: username,
        faction: Faction.REBEL_ALLIANCE,
        factionId: rebels,
      });
    const users: Record<Exclude<Actor, 'anonymous'>, User> = {
      president: await player('leia'),
      vice: await player('mon'),
      diplomat: await player('bail'),
      member: await player('han'),
      loner: await player('lando'),
      foreignPresident: await player('wedge'),
      foreignMember: await player('biggs'),
    };
    const found = async (
      name: string,
      president: User,
      others: [User, AllianceRole][],
    ) => {
      const alliance = await store.insertAlliance({
        name,
        description: '',
        factionId: rebels,
      });
      await store.insertMembership({
        allianceId: alliance.id,
        userId: president.id,
        role: PRESIDENT,
      });
      for (const [user, role] of others) {
        await store.insertMembership({
          allianceId: alliance.id,
          userId: user.id,
          role,
        });
      }
      return alliance;
    };
    const rogue = await found('Rogue Squadron', users.president, [
      [users.vice, VICE],
      [users.diplomat, DIPLOMAT],
      [users.member, NONE],
    ]);
    const red = await found('Red Squadron', users.foreignPresident, [
      [users.foreignMember, NONE],
    ]);

    const forum = new ForumService(new TypeOrmForumStore(dataSource));
    const content = async (
      allianceId: number,
      president: User,
      author: User,
    ) => {
      const board = await forum.createBoard(president.id, allianceId, {
        name: 'Strategie',
      });
      const topic = await forum.createTopic(author.id, allianceId, board.id, {
        title: 'Thema',
        text: 'Erster Beitrag',
      });
      const page = await forum.getTopic(author.id, allianceId, topic.topicId);
      return {
        boardId: board.id,
        topicId: topic.topicId,
        postId: page.posts[0].id,
      };
    };
    const own = await content(rogue.id, users.president, users.member);
    const foreign = await content(
      red.id,
      users.foreignPresident,
      users.foreignMember,
    );
    const second = await content(rogue.id, users.president, users.member);

    const layer = await dataSource
      .getRepository(Layer)
      .save({ name: 'L', width: 100, height: 100 });
    const system = await dataSource.getRepository(StarSystem).save({
      name: 'Hoth',
      layerId: layer.id,
      cx: 1,
      cy: 1,
      systemTypeId: 1,
    });
    const colony = (user: User) =>
      dataSource.getRepository(Colony).save({
        name: `Basis ${user.username}`,
        userId: user.id,
        starSystemId: system.id,
        posX: 2,
        posY: 5,
        colonyClassId: 1,
        energy: 1,
        energyMax: 10,
        population: 1,
        populationMax: 10,
        storageUsed: 1,
        storageMax: 10,
      });
    const colonies = {
      member: await colony(users.member),
      foreign: await colony(users.foreignMember),
      loner: await colony(users.loner),
    };
    for (const c of Object.values(colonies)) {
      await dataSource
        .getRepository(ColonyStorage)
        .save({ colonyId: c.id, commodityId: 1, amount: 7 });
    }
    return { users, rogue, red, own, foreign, second, colonies };
  }

  const expectStatuses = async (
    expected: Partial<Record<Actor, number>>,
    request: (actor: Actor) => Promise<Response>,
  ) => {
    for (const [actor, status] of Object.entries(expected) as [
      Actor,
      number,
    ][]) {
      const { status: actual } = await request(actor);
      expect({ actor, status: actual }).toEqual({ actor, status });
    }
  };

  const MEMBERS = { president: 200, vice: 200, diplomat: 200, member: 200 };
  const OUTSIDERS = { loner: 404, foreignPresident: 404, foreignMember: 404 };
  const ANON = { anonymous: 401 };

  // --- Forum reads -------------------------------------------------------

  it('shows forum boards, topics and posts only to members of exactly this alliance', async () => {
    const expected = { ...MEMBERS, ...OUTSIDERS, ...ANON };
    await expectStatuses(expected, (a) =>
      call(a, 'GET', `/alliances/${w.rogue.id}/forum/boards`),
    );
    await expectStatuses(expected, (a) =>
      call(
        a,
        'GET',
        `/alliances/${w.rogue.id}/forum/boards/${w.own.boardId}/topics`,
      ),
    );
    await expectStatuses(expected, (a) =>
      call(a, 'GET', `/alliances/${w.rogue.id}/forum/topics/${w.own.topicId}`),
    );
  });

  it('answers manipulated ids in the path as not found, never with foreign content', async () => {
    const { rogue, red, own, foreign } = w;
    for (const path of [
      `/alliances/${rogue.id}/forum/boards/${foreign.boardId}/topics`,
      `/alliances/${rogue.id}/forum/topics/${foreign.topicId}`,
      `/alliances/${red.id}/forum/boards/${own.boardId}/topics`,
      `/alliances/${red.id}/forum/topics/${own.topicId}`,
      `/alliances/${rogue.id}/forum/boards/999999/topics`,
      `/alliances/${rogue.id}/forum/topics/999999`,
    ]) {
      for (const actor of ['president', 'member'] as const) {
        const result = await call(actor, 'GET', path);
        expect({ path, actor, status: result.status }).toEqual({
          path,
          actor,
          status: 404,
        });
        expect(JSON.stringify(result.body)).not.toContain('Erster Beitrag');
      }
    }
    const garbage = await call(
      'president',
      'GET',
      `/alliances/${rogue.id}/forum/topics/abc`,
    );
    expect(garbage.status).toBe(400);
  });

  // --- Forum writes ------------------------------------------------------

  it('lets only president and vice create boards', async () => {
    await expectStatuses(
      {
        diplomat: 403,
        member: 403,
        ...OUTSIDERS,
        ...ANON,
        vice: 201,
        president: 201,
      },
      (a) =>
        call(a, 'POST', `/alliances/${w.rogue.id}/forum/boards`, {
          name: 'Neues Board',
        }),
    );
  });

  it('lets every member create topics and posts, but only in boards and topics of their own alliance', async () => {
    const { rogue, red, own, foreign } = w;
    await expectStatuses(
      {
        ...OUTSIDERS,
        ...ANON,
        member: 201,
        diplomat: 201,
        vice: 201,
        president: 201,
      },
      (a) =>
        call(
          a,
          'POST',
          `/alliances/${rogue.id}/forum/boards/${own.boardId}/topics`,
          { title: 'Hallo', text: 'Text' },
        ),
    );
    await expectStatuses(
      { ...OUTSIDERS, ...ANON, member: 201, diplomat: 201 },
      (a) =>
        call(
          a,
          'POST',
          `/alliances/${rogue.id}/forum/topics/${own.topicId}/posts`,
          { text: 'Antwort' },
        ),
    );
    for (const path of [
      `/alliances/${rogue.id}/forum/boards/${foreign.boardId}/topics`,
      `/alliances/${red.id}/forum/boards/${own.boardId}/topics`,
    ]) {
      expect(
        (await call('president', 'POST', path, { title: 'X', text: 'Y' }))
          .status,
      ).toBe(404);
    }
    for (const path of [
      `/alliances/${rogue.id}/forum/topics/${foreign.topicId}/posts`,
      `/alliances/${red.id}/forum/topics/${own.topicId}/posts`,
    ]) {
      expect((await call('member', 'POST', path, { text: 'Y' })).status).toBe(
        404,
      );
    }
    const [{ n }] = await dataSource.query(
      `SELECT COUNT(*)::int AS n FROM alliance_forum_posts WHERE "topicId" = $1`,
      [foreign.topicId],
    );
    expect(n).toBe(1);
  });

  it('ignores author, alliance and moderation fields smuggled into request bodies', async () => {
    const { rogue, red, own, users } = w;
    const created = await call(
      'member',
      'POST',
      `/alliances/${rogue.id}/forum/boards/${own.boardId}/topics`,
      {
        title: 'Hallo',
        text: 'Text',
        authorUserId: users.president.id,
        authorName: 'Leia',
        allianceId: red.id,
        boardId: 999999,
        important: true,
      },
    );
    expect(created.status).toBe(201);
    const [row] = await dataSource.query(
      `SELECT "authorUserId", "authorName", "allianceId", "boardId", "important" FROM alliance_forum_topics WHERE id = $1`,
      [created.body.topicId],
    );
    expect(row).toEqual({
      authorUserId: users.member.id,
      authorName: 'han',
      allianceId: rogue.id,
      boardId: own.boardId,
      important: false,
    });
    const reply = await call(
      'diplomat',
      'POST',
      `/alliances/${rogue.id}/forum/topics/${own.topicId}/posts`,
      { text: 'Antwort', authorUserId: users.president.id, topicId: 999999 },
    );
    expect(reply.status).toBe(201);
    const [post] = await dataSource.query(
      `SELECT "authorUserId", "topicId" FROM alliance_forum_posts ORDER BY id DESC LIMIT 1`,
    );
    expect(post).toEqual({
      authorUserId: users.diplomat.id,
      topicId: own.topicId,
    });
  });

  it('lets only the author edit a post, never a moderator or a foreign alliance', async () => {
    const { rogue, red, own, foreign } = w;
    const path = (alliance: number, post: number) =>
      `/alliances/${alliance}/forum/posts/${post}`;
    await expectStatuses(
      { president: 403, vice: 403, diplomat: 403, ...OUTSIDERS, ...ANON },
      (a) => call(a, 'PATCH', path(rogue.id, own.postId), { text: 'Gehackt' }),
    );
    for (const [actor, alliance, post] of [
      ['member', red.id, own.postId],
      ['member', rogue.id, foreign.postId],
      ['foreignMember', rogue.id, foreign.postId],
    ] as const) {
      expect(
        (await call(actor, 'PATCH', path(alliance, post), { text: 'Neu' }))
          .status,
      ).toBe(404);
    }
    const [unchanged] = await dataSource.query(
      `SELECT "text" FROM alliance_forum_posts WHERE id = $1`,
      [own.postId],
    );
    expect(unchanged.text).toBe('Erster Beitrag');
    expect(
      (await call('member', 'PATCH', path(rogue.id, own.postId), { text: 'Neu' }))
        .status,
    ).toBe(200);
  });

  it('lets only president and vice moderate boards, topics and posts', async () => {
    const { rogue, red, own, foreign, second } = w;
    const denied = { diplomat: 403, member: 403, ...OUTSIDERS, ...ANON };

    await expectStatuses({ ...denied, vice: 200 }, (a) =>
      call(a, 'PATCH', `/alliances/${rogue.id}/forum/boards/${own.boardId}`, {
        name: 'Umbenannt',
      }),
    );
    await expectStatuses({ ...denied, president: 200 }, (a) =>
      call(a, 'PATCH', `/alliances/${rogue.id}/forum/topics/${own.topicId}`, {
        title: 'Neu',
      }),
    );
    await expectStatuses({ ...denied, vice: 200 }, (a) =>
      call(
        a,
        'PUT',
        `/alliances/${rogue.id}/forum/topics/${own.topicId}/important`,
        { important: true },
      ),
    );

    for (const [method, path, body] of [
      ['PATCH', `/alliances/${rogue.id}/forum/boards/${foreign.boardId}`, { name: 'Gehackt' }],
      ['PATCH', `/alliances/${red.id}/forum/boards/${own.boardId}`, { name: 'Gehackt' }],
      ['DELETE', `/alliances/${rogue.id}/forum/boards/${foreign.boardId}`, undefined],
      ['PATCH', `/alliances/${rogue.id}/forum/topics/${foreign.topicId}`, { title: 'Gehackt' }],
      ['PUT', `/alliances/${rogue.id}/forum/topics/${foreign.topicId}/important`, { important: true }],
      ['DELETE', `/alliances/${rogue.id}/forum/topics/${foreign.topicId}`, undefined],
      ['DELETE', `/alliances/${red.id}/forum/topics/${own.topicId}`, undefined],
      ['DELETE', `/alliances/${rogue.id}/forum/posts/${foreign.postId}`, undefined],
      ['DELETE', `/alliances/${red.id}/forum/posts/${own.postId}`, undefined],
    ] as const) {
      const result = await call('president', method, path, body);
      expect({ method, path, status: result.status }).toEqual({
        method,
        path,
        status: 404,
      });
    }
    const [foreignRows] = await dataSource.query(
      `SELECT (SELECT "name" FROM alliance_forum_boards WHERE id = $1) AS board,
              (SELECT "deletedAt" FROM alliance_forum_boards WHERE id = $1) AS "boardDeleted",
              (SELECT "deletedAt" FROM alliance_forum_topics WHERE id = $2) AS "topicDeleted",
              (SELECT "important" FROM alliance_forum_topics WHERE id = $2) AS important,
              (SELECT "deletedAt" FROM alliance_forum_posts WHERE id = $3) AS "postDeleted"`,
      [foreign.boardId, foreign.topicId, foreign.postId],
    );
    expect(foreignRows).toEqual({
      board: 'Strategie',
      boardDeleted: null,
      topicDeleted: null,
      important: false,
      postDeleted: null,
    });

    await expectStatuses({ ...denied, vice: 200 }, (a) =>
      call(a, 'DELETE', `/alliances/${rogue.id}/forum/posts/${second.postId}`),
    );
    await expectStatuses({ ...denied, president: 200 }, (a) =>
      call(a, 'DELETE', `/alliances/${rogue.id}/forum/topics/${second.topicId}`),
    );
    await expectStatuses({ ...denied, vice: 200 }, (a) =>
      call(a, 'DELETE', `/alliances/${rogue.id}/forum/boards/${second.boardId}`),
    );
  });

  // --- Chronicle ---------------------------------------------------------

  it('shows the internal chronicle to members of exactly this alliance and never leaks it via the diplomacy chronicle', async () => {
    await expectStatuses({ ...MEMBERS, ...OUTSIDERS, ...ANON }, (a) =>
      call(a, 'GET', `/alliances/${w.rogue.id}/chronicle`),
    );
    expect(
      (await call('president', 'GET', `/alliances/${w.red.id}/chronicle`)).status,
    ).toBe(404);
    expect(
      (
        await call(
          'foreignMember',
          'GET',
          `/alliances/${w.rogue.id}/chronicle?cursor=abc&limit=-5`,
        )
      ).status,
    ).toBe(404);
    const diplomacy = await call(
      'loner',
      'GET',
      `/alliances/${w.rogue.id}/diplomacy/chronicle`,
    );
    expect(diplomacy.status).toBe(200);
    expect(diplomacy.body.entries).toEqual([]);
    expect(
      (await call('anonymous', 'GET', `/alliances/${w.rogue.id}/diplomacy/chronicle`))
        .status,
    ).toBe(401);
  });

  // --- Member overview ---------------------------------------------------

  it('shows the member overview only to president and vice of exactly this alliance', async () => {
    await expectStatuses(
      { president: 200, vice: 200, diplomat: 403, member: 403, ...OUTSIDERS, ...ANON },
      (a) => call(a, 'GET', `/alliances/${w.rogue.id}/member-overview`),
    );
    expect(
      (await call('president', 'GET', `/alliances/${w.red.id}/member-overview`))
        .status,
    ).toBe(404);
    const overview = await call(
      'vice',
      'GET',
      `/alliances/${w.rogue.id}/member-overview`,
    );
    expect(
      overview.body.members.map((m: { userId: number }) => m.userId).sort(),
    ).toEqual(
      [w.users.president, w.users.vice, w.users.diplomat, w.users.member]
        .map((u) => u.id)
        .sort(),
    );
  });

  it('shows colony stock only for colonies of current members, to president and vice only', async () => {
    const { rogue, red, colonies } = w;
    const stock = (alliance: number, colony: number) =>
      `/alliances/${alliance}/member-overview/colonies/${colony}/stock`;
    await expectStatuses(
      { president: 200, vice: 200, diplomat: 403, member: 403, ...OUTSIDERS, ...ANON },
      (a) => call(a, 'GET', stock(rogue.id, colonies.member.id)),
    );
    const ok = await call('president', 'GET', stock(rogue.id, colonies.member.id));
    expect(ok.body.items).toEqual([
      expect.objectContaining({ commodityId: 1, amount: 7 }),
    ]);
    for (const path of [
      stock(rogue.id, colonies.foreign.id),
      stock(rogue.id, colonies.loner.id),
      stock(rogue.id, 999999),
      stock(red.id, colonies.member.id),
    ]) {
      const result = await call('president', 'GET', path);
      expect({ path, status: result.status }).toEqual({ path, status: 404 });
    }
    expect(
      (await call('foreignPresident', 'GET', stock(red.id, colonies.member.id)))
        .status,
    ).toBe(404);
    expect(
      (await call('president', 'GET', `${stock(rogue.id, 1)}x`)).status,
    ).toBe(404);
  });

  it('drops the colony of a player who left the alliance from the stock route', async () => {
    const { rogue, colonies, users } = w;
    await dataSource.query(
      `DELETE FROM alliance_memberships WHERE "userId" = $1`,
      [users.member.id],
    );
    const result = await call(
      'president',
      'GET',
      `/alliances/${rogue.id}/member-overview/colonies/${colonies.member.id}/stock`,
    );
    expect(result.status).toBe(404);
  });

  // --- Dashboard ---------------------------------------------------------

  it('lists dashboard forum topics of the own alliance only, ignoring a manipulated alliance id', async () => {
    const { rogue, red } = w;
    const own = await call(
      'diplomat',
      'GET',
      `/dashboard/forum-topics?allianceId=${red.id}`,
    );
    expect(own.status).toBe(200);
    expect(own.body.length).toBeGreaterThan(0);
    expect(
      own.body.every((t: { allianceId: number }) => t.allianceId === rogue.id),
    ).toBe(true);
    const foreign = await call(
      'foreignMember',
      'GET',
      `/dashboard/forum-topics?allianceId=${rogue.id}`,
    );
    expect(
      foreign.body.every(
        (t: { allianceId: number }) => t.allianceId === red.id,
      ),
    ).toBe(true);
    expect(
      (await call('loner', 'GET', `/dashboard/forum-topics?allianceId=${rogue.id}`))
        .body,
    ).toEqual([]);
    expect((await call('anonymous', 'GET', '/dashboard/forum-topics')).status).toBe(
      401,
    );
  });
});
