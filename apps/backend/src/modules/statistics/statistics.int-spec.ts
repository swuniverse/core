import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
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
import { DatabaseController } from '../database/database.controller';
import { DatabaseService } from '../database/database.service';
import { StatisticsService } from './statistics.service';
import { STATISTIC_METRICS, type StatisticMetric } from './statistic-metrics';

const JWT_SECRET = 'integration-secret';
const HOUR = 3_600_000;

type Point = { t: string; values: Record<string, number> };
type Metric = {
  key: string;
  title: string;
  series: Array<{ key: string; label: string }>;
  points: Point[];
};

describe('database statistics (Postgres, HTTP)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let statistics: StatisticsService;
  let player: User;
  const jwt = new JwtService({ secret: JWT_SECRET });

  const customMetric: StatisticMetric = {
    key: 'test-metric',
    title: 'Testkennzahl',
    aggregation: 'sum',
    series: [{ key: 'hits', label: 'Treffer' }],
    capture: async () => ({ hits: 7 }),
  };

  beforeAll(async () => {
    dataSource = await connectIntegrationDatabase();
    statistics = new StatisticsService(dataSource, [
      ...STATISTIC_METRICS,
      customMetric,
    ]);
    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [DatabaseController],
      providers: [
        { provide: ConfigService, useValue: { get: () => JWT_SECRET } },
        JwtStrategy,
        { provide: DatabaseService, useValue: {} },
        { provide: StatisticsService, useValue: statistics },
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
    const rebels = await factionId(dataSource, Faction.REBEL_ALLIANCE);
    player = await createUser(dataSource, {
      username: 'viewer',
      displayName: 'Viewer',
      faction: Faction.REBEL_ALLIANCE,
      factionId: rebels,
    });
  });

  async function get(
    path: string,
    authenticated = true,
  ): Promise<{ status: number; body: any }> {
    const response = await fetch(`${await app.getUrl()}/api${path}`, {
      headers: authenticated
        ? {
            Authorization: `Bearer ${jwt.sign({
              sub: player.id,
              username: player.username,
              faction: player.faction,
              isAdmin: false,
            })}`,
          }
        : {},
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  }

  async function metric(unit: string, key = 'players'): Promise<Metric> {
    const { status, body } = await get(`/database/statistics?unit=${unit}`);
    expect(status).toBe(200);
    return body.metrics.find((entry: Metric) => entry.key === key);
  }

  const setUsers = (
    users: Array<User>,
    patch: Partial<User>,
  ): Promise<unknown> =>
    dataSource.getRepository(User).update(
      users.map((user) => user.id),
      patch,
    );

  // Viewer (A) plus B and C; the reference time is passed in, so the 24 h
  // window is deterministic.
  async function playGame() {
    const [a] = [player];
    const b = await createUser(dataSource, { username: 'b' });
    const c = await createUser(dataSource, { username: 'c' });
    const t1 = new Date(2026, 2, 2, 8, 0); // Monday
    const t2 = new Date(2026, 2, 2, 20, 0);
    const t3 = new Date(2026, 2, 4, 12, 0);
    const t4 = new Date(2026, 3, 10, 12, 0);

    await setUsers([a], { lastActiveAt: new Date(t1.getTime() - HOUR) });
    await setUsers([b], { lastActiveAt: new Date(t1.getTime() - 72 * HOUR) });
    await setUsers([c], {
      vacationMode: true,
      lastActiveAt: new Date(t1.getTime() - HOUR),
    });
    await statistics.recordSnapshots(t1); // 1 aktiv, 1 inaktiv, 1 Urlaub

    await setUsers([b], { lastActiveAt: new Date(t2.getTime() - HOUR) });
    await statistics.recordSnapshots(t2); // 2 / 0 / 1

    await setUsers([a, b, c], {
      vacationMode: false,
      lastActiveAt: new Date(t3.getTime() - HOUR),
    });
    await statistics.recordSnapshots(t3); // 3 / 0 / 0

    await setUsers([a, b, c], { lastActiveAt: null });
    await statistics.recordSnapshots(t4); // 0 / 3 / 0
  }

  it('shows the player split of every main tick in the tick unit', async () => {
    await playGame();

    const players = await metric('tick');

    expect(players.title).toBe('Spieler');
    expect(players.series.map((s) => s.key)).toEqual([
      'active',
      'inactive',
      'vacation',
    ]);
    expect(players.points.map((p) => p.values)).toEqual([
      { active: 1, inactive: 1, vacation: 1 },
      { active: 2, inactive: 0, vacation: 1 },
      { active: 3, inactive: 0, vacation: 0 },
      { active: 0, inactive: 3, vacation: 0 },
    ]);
  });

  it('keeps the last value of each bucket for daily, weekly and monthly units', async () => {
    await playGame();

    expect((await metric('daily')).points.map((p) => p.values)).toEqual([
      { active: 2, inactive: 0, vacation: 1 }, // 2 March, evening wins
      { active: 3, inactive: 0, vacation: 0 },
      { active: 0, inactive: 3, vacation: 0 },
    ]);
    expect((await metric('weekly')).points.map((p) => p.values)).toEqual([
      { active: 3, inactive: 0, vacation: 0 }, // week of 2 March
      { active: 0, inactive: 3, vacation: 0 },
    ]);
    expect((await metric('monthly')).points.map((p) => p.values)).toEqual([
      { active: 3, inactive: 0, vacation: 0 },
      { active: 0, inactive: 3, vacation: 0 },
    ]);
  });

  it('returns at most 48 points for the tick unit and 30 for daily', async () => {
    const start = new Date(2026, 0, 1).getTime();
    for (let i = 0; i < 50; i++) {
      await statistics.recordSnapshots(new Date(start + i * 24 * HOUR));
    }

    expect((await metric('tick')).points).toHaveLength(48);
    expect((await metric('daily')).points).toHaveLength(30);
  });

  it('does not duplicate snapshots when the same main tick is recorded again', async () => {
    const at = new Date(2026, 2, 2, 8, 0);

    await statistics.recordSnapshots(at);
    await statistics.recordSnapshots(at);

    expect((await metric('tick')).points).toHaveLength(1);
  });

  it('keeps recording and does not throw when a metric fails', async () => {
    const error = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const broken: StatisticMetric = {
      ...customMetric,
      key: 'broken',
      capture: async () => {
        throw new Error('boom');
      },
    };
    const resilient = new StatisticsService(dataSource, [
      broken,
      ...STATISTIC_METRICS,
    ]);

    await expect(
      resilient.recordSnapshots(new Date(2026, 2, 2, 8, 0)),
    ).resolves.toBeUndefined();

    expect((await metric('tick')).points).toHaveLength(1);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it('exposes a newly registered metric without further changes', async () => {
    await statistics.recordSnapshots(new Date(2026, 2, 2, 8, 0));

    const custom = await metric('tick', 'test-metric');

    expect(custom.title).toBe('Testkennzahl');
    expect(custom.series).toEqual([{ key: 'hits', label: 'Treffer' }]);
    expect(custom.points.map((p) => p.values)).toEqual([{ hits: 7 }]);
  });

  // Raw inserts with FK checks off: the metrics only read ownership, so the
  // test does not need a whole map around each ship or colony.
  async function insertRows(
    table: string,
    rows: Array<Record<string, unknown>>,
  ): Promise<void> {
    const runner = dataSource.createQueryRunner();
    try {
      await runner.query(`SET session_replication_role = replica`);
      for (const row of rows) {
        const keys = Object.keys(row);
        await runner.query(
          `INSERT INTO "${table}" (${keys.map((k) => `"${k}"`).join(', ')})
           VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')})`,
          keys.map((k) => row[k]),
        );
      }
    } finally {
      await runner.query(`SET session_replication_role = DEFAULT`);
      await runner.release();
    }
  }

  const lastValues = async (key: string) => {
    const points = (await metric('tick', key)).points;
    return points[points.length - 1].values;
  };

  describe('stock metrics', () => {
    let empire: User;
    let rebel2: User;

    beforeEach(async () => {
      const empireId = await factionId(dataSource, Faction.GALACTIC_EMPIRE);
      empire = await createUser(dataSource, {
        username: 'emp',
        faction: Faction.GALACTIC_EMPIRE,
        factionId: empireId,
        prestige: 30,
      });
      rebel2 = await createUser(dataSource, {
        username: 'reb2',
        faction: Faction.REBEL_ALLIANCE,
        factionId: player.factionId,
        prestige: 20,
      });
      await setUsers([player], { prestige: 10 });
      // a player without faction counts towards no faction series
      await createUser(dataSource, { username: 'nofaction' });
    });

    it('counts ships, colonies and players per faction without an NPC series', async () => {
      const ship = (userId: number, id: number) => ({
        id,
        name: `s${id}`,
        shipClassId: 1,
        userId,
        locationId: 1,
      });
      await insertRows('spacecraft', [
        ship(player.id, 1),
        ship(rebel2.id, 2),
        ship(empire.id, 3),
      ]);
      const colony = (userId: number | null, id: number) => ({
        id,
        name: `c${id}`,
        userId,
        colonyClassId: 1,
      });
      await insertRows('colonies', [
        colony(player.id, 1),
        colony(empire.id, 2),
        colony(empire.id, 3),
        colony(null, 4), // unowned colony belongs to no faction
      ]);

      await statistics.recordSnapshots(new Date(2026, 2, 2, 8, 0));

      for (const key of [
        'ships-by-faction',
        'colonies-by-faction',
        'players-by-faction',
      ]) {
        expect((await metric('tick', key)).series.map((s) => s.key)).toEqual([
          Faction.REBEL_ALLIANCE,
          Faction.GALACTIC_EMPIRE,
        ]);
      }
      expect(await lastValues('ships-by-faction')).toEqual({
        REBEL_ALLIANCE: 2,
        GALACTIC_EMPIRE: 1,
      });
      expect(await lastValues('colonies-by-faction')).toEqual({
        REBEL_ALLIANCE: 1,
        GALACTIC_EMPIRE: 2,
      });
      expect(await lastValues('players-by-faction')).toEqual({
        REBEL_ALLIANCE: 2,
        GALACTIC_EMPIRE: 1,
      });
    });

    it('tracks discovered systems, alliances and total prestige', async () => {
      await insertRows('system_explorations', [
        { userId: player.id, starSystemId: 1 },
        { userId: player.id, starSystemId: 2 },
        { userId: empire.id, starSystemId: 1 },
      ]);
      const rebels = player.factionId;
      await insertRows('alliances', [
        { id: 1, name: 'A1', factionId: rebels },
        { id: 2, name: 'A2', factionId: rebels },
      ]);
      await insertRows('alliance_memberships', [
        { allianceId: 1, userId: player.id },
        { allianceId: 1, userId: rebel2.id },
        { allianceId: 2, userId: empire.id },
      ]);

      await statistics.recordSnapshots(new Date(2026, 2, 2, 8, 0));

      expect(await lastValues('discovered-systems')).toEqual({ systems: 3 });
      expect(await lastValues('alliances')).toEqual({
        count: 2,
        avgMembers: 1.5,
      });
      expect(await lastValues('prestige')).toEqual({ total: 60 });
    });

    it('counts holonet posts and comments', async () => {
      await insertRows('holonet_posts', [
        { id: 1, authorId: player.id, title: 't', body: 'b' },
        { id: 2, authorId: empire.id, title: 't', body: 'b' },
      ]);
      await insertRows('holonet_comments', [
        { postId: 1, authorId: empire.id, body: 'x' },
        { postId: 1, authorId: player.id, body: 'y' },
        { postId: 2, authorId: player.id, body: 'z' },
      ]);

      await statistics.recordSnapshots(new Date(2026, 2, 2, 8, 0));

      expect(await lastValues('holonet')).toEqual({ posts: 2, comments: 3 });
    });
  });

  it('requires login and exposes aggregates only', async () => {
    await statistics.recordSnapshots(new Date(2026, 2, 2, 8, 0));

    expect((await get('/database/statistics', false)).status).toBe(401);

    const { status, body } = await get('/database/statistics?unit=tick');
    expect(status).toBe(200);
    const text = JSON.stringify(body);
    expect(text).not.toContain('viewer');
    expect(text).not.toContain('Viewer');
    expect(text).not.toContain(String(player.email));
  });

  it('rejects an unknown time unit', async () => {
    expect((await get('/database/statistics?unit=yearly')).status).toBe(400);
  });
});
