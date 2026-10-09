import { DataSource } from 'typeorm';
import { AllianceRole, Faction } from '@swuniverse/shared';
import {
  connectIntegrationDatabase,
  createUser,
  factionId,
  resetDatabase,
} from '../../testing/integration/database';
import { User } from '../auth/user.entity';
import { AllianceService } from './alliance.service';
import { ForumService } from './forum.service';
import { TypeOrmAllianceStore } from './typeorm-alliance.store';
import { TypeOrmForumStore } from './typeorm-forum.store';

const { NONE, PRESIDENT, VICE } = AllianceRole;

/**
 * Lifecycle of the internal cooperation data on real Postgres: dissolution
 * (both paths) and account deletion across forum and alliance chronicle.
 */
describe('alliance internal cooperation lifecycle (Postgres)', () => {
  let dataSource: DataSource;
  let store: TypeOrmAllianceStore;
  let allianceService: AllianceService;
  let forum: ForumService;
  let rebels: number;

  beforeAll(async () => {
    dataSource = await connectIntegrationDatabase();
  });
  afterAll(() => dataSource.destroy());

  beforeEach(async () => {
    await resetDatabase(dataSource);
    rebels = await factionId(dataSource, Faction.REBEL_ALLIANCE);
    store = new TypeOrmAllianceStore(dataSource);
    allianceService = new AllianceService(store, {
      sendSystem: jest.fn().mockResolvedValue(undefined),
    } as never);
    forum = new ForumService(new TypeOrmForumStore(dataSource));
  });

  const rebel = (name: string, overrides: Partial<User> = {}) =>
    createUser(dataSource, {
      username: name,
      displayName: name,
      faction: Faction.REBEL_ALLIANCE,
      factionId: rebels,
      ...overrides,
    });

  async function alliance(
    name: string,
    president: User,
    others: [User, AllianceRole][] = [],
  ) {
    const created = await store.insertAlliance({
      name,
      description: '',
      factionId: rebels,
    });
    await store.insertMembership({
      allianceId: created.id,
      userId: president.id,
      role: PRESIDENT,
    });
    for (const [user, role] of others) {
      await store.insertMembership({
        allianceId: created.id,
        userId: user.id,
        role,
      });
    }
    return created;
  }

  const count = async (table: string) =>
    Number(
      (await dataSource.query(`SELECT COUNT(*) AS n FROM "${table}"`))[0].n,
    );

  async function fillForumAndChronicle(
    allianceId: number,
    user: User,
    president: User = user,
  ) {
    const board = await forum.createBoard(president.id, allianceId, {
      name: 'Strategie',
    });
    const { topicId } = await forum.createTopic(user.id, allianceId, board.id, {
      title: 'Thema',
      text: 'Beitrag',
    });
    await forum.createPost(user.id, allianceId, topicId, { text: 'Antwort' });
    await store.appendAllianceChronicleEntry({
      allianceId,
      eventType: 'MEMBER_JOINED' as never,
      actorUserId: user.id,
      actorName: user.username,
      subjectUserId: user.id,
      subjectName: user.username,
      metadata: null,
    });
    return { boardId: board.id, topicId };
  }

  const FORUM_TABLES = [
    'alliance_forum_boards',
    'alliance_forum_topics',
    'alliance_forum_posts',
  ];

  it('removes forum and alliance chronicle when the president dissolves, and keeps the diplomacy chronicle', async () => {
    const leia = await rebel('leia');
    const han = await rebel('han');
    const rogue = await alliance('Rogue Squadron', leia, [[han, NONE]]);
    const red = await alliance('Red Squadron', await rebel('wedge'));
    const other = await alliance('Gold Squadron', await rebel('jon'));
    const jon = await dataSource
      .getRepository(User)
      .findOneByOrFail({ username: 'jon' });
    await fillForumAndChronicle(other.id, jon);
    await fillForumAndChronicle(rogue.id, han, leia);
    await allianceService.declareWar(leia.id, rogue.id, red.id);
    expect(await count('alliance_diplomacy_chronicle_entries')).toBe(1);

    await allianceService.dissolve(leia.id, rogue.id);

    expect(await store.findAlliance(rogue.id)).toBeNull();
    const rest = await dataSource.query(
      `SELECT (SELECT COUNT(*)::int FROM alliance_forum_boards WHERE "allianceId" = $1) AS boards,
              (SELECT COUNT(*)::int FROM alliance_forum_topics WHERE "allianceId" = $1) AS topics,
              (SELECT COUNT(*)::int FROM alliance_forum_posts p JOIN alliance_forum_topics t ON t.id = p."topicId" WHERE t."allianceId" = $1) AS posts,
              (SELECT COUNT(*)::int FROM alliance_chronicle_entries WHERE "allianceId" = $1) AS chronicle`,
      [rogue.id],
    );
    expect(rest[0]).toEqual({ boards: 0, topics: 0, posts: 0, chronicle: 0 });
    // Other alliances keep their data; no orphans anywhere.
    expect(await count('alliance_forum_boards')).toBe(1);
    expect(await count('alliance_forum_posts')).toBe(2);
    expect(await count('alliance_chronicle_entries')).toBe(1);
    expect(await count('alliance_diplomacy_chronicle_entries')).toBe(1);
  });

  it('removes forum and alliance chronicle when the last member leaves', async () => {
    const leia = await rebel('leia');
    const red = await alliance('Red Squadron', await rebel('wedge'));
    const rogue = await alliance('Rogue Squadron', leia);
    await fillForumAndChronicle(rogue.id, leia);
    await allianceService.declareWar(leia.id, rogue.id, red.id);

    await expect(allianceService.leave(leia.id)).resolves.toEqual({
      dissolved: true,
    });

    for (const table of FORUM_TABLES) expect(await count(table)).toBe(0);
    expect(await count('alliance_chronicle_entries')).toBe(0);
    expect(await count('alliance_diplomacy_chronicle_entries')).toBe(1);
  });

  it('nulls author, moderator, actor and subject references on account deletion but keeps the names', async () => {
    const leia = await rebel('leia', { displayName: 'Leia Organa' });
    const han = await rebel('han', { displayName: 'Han Solo' });
    const wedge = await rebel('wedge', { displayName: 'Wedge Antilles' });
    const rogue = await alliance('Rogue Squadron', leia, [
      [han, NONE],
      [wedge, VICE],
    ]);
    const board = await forum.createBoard(leia.id, rogue.id, {
      name: 'Strategie',
    });
    const first = await forum.createTopic(han.id, rogue.id, board.id, {
      title: 'Gelöscht',
      text: 'Han schreibt',
    });
    const second = await forum.createTopic(han.id, rogue.id, board.id, {
      title: 'Bleibt',
      text: 'Han schreibt',
    });
    const page = await forum.getTopic(han.id, rogue.id, second.topicId);
    await forum.deletePost(wedge.id, rogue.id, page.posts[0].id);
    await forum.deleteTopic(wedge.id, rogue.id, first.topicId);
    await store.appendAllianceChronicleEntry({
      allianceId: rogue.id,
      eventType: 'MEMBER_KICKED' as never,
      actorUserId: wedge.id,
      actorName: 'Wedge Antilles',
      subjectUserId: han.id,
      subjectName: 'Han Solo',
      metadata: null,
    });
    await allianceService.kick(leia.id, rogue.id, han.id);

    await dataSource.query('DELETE FROM "users" WHERE "id" IN ($1, $2)', [
      han.id,
      wedge.id,
    ]);

    const posts = await dataSource.query(
      `SELECT "authorUserId", "authorName", "deletedByUserId", "deletedByName" FROM alliance_forum_posts ORDER BY id`,
    );
    expect(posts).toEqual([
      {
        authorUserId: null,
        authorName: 'Han Solo',
        deletedByUserId: null,
        deletedByName: 'Wedge Antilles',
      },
      {
        authorUserId: null,
        authorName: 'Han Solo',
        deletedByUserId: null,
        deletedByName: 'Wedge Antilles',
      },
    ]);
    const topics = await dataSource.query(
      `SELECT "authorUserId", "authorName", "deletedByUserId", "deletedByName" FROM alliance_forum_topics ORDER BY id`,
    );
    expect(topics[0]).toEqual({
      authorUserId: null,
      authorName: 'Han Solo',
      deletedByUserId: null,
      deletedByName: 'Wedge Antilles',
    });
    const entries = await dataSource.query(
      `SELECT "actorUserId", "actorName", "subjectUserId", "subjectName" FROM alliance_chronicle_entries
       WHERE "eventType" = 'MEMBER_KICKED' ORDER BY id`,
    );
    expect(entries).toEqual([
      {
        actorUserId: null,
        actorName: 'Wedge Antilles',
        subjectUserId: null,
        subjectName: 'Han Solo',
      },
      expect.objectContaining({ actorUserId: leia.id, subjectUserId: null }),
    ]);

    const readable = await forum.getTopic(leia.id, rogue.id, second.topicId);
    expect(readable.posts[0]).toMatchObject({
      author: { userId: null, name: 'Gelöschter Siedler' },
      deleted: { moderatorName: expect.any(String) },
    });
    const chronicle = await allianceService.listChronicle(leia.id, rogue.id);
    expect(chronicle.entries.map((e) => e.subject)).toContainEqual({
      userId: null,
      name: 'Han Solo',
    });
  });

  it('enforces the length limits of forum and chronicle in the database', async () => {
    const leia = await rebel('leia');
    const rogue = await alliance('Rogue Squadron', leia);
    const board = await forum.createBoard(leia.id, rogue.id, {
      name: 'Strategie',
    });
    const { topicId } = await forum.createTopic(leia.id, rogue.id, board.id, {
      title: 'T',
      text: 'x',
    });
    const insertBoard = (name: string) =>
      dataSource.query(
        'INSERT INTO "alliance_forum_boards" ("allianceId", "name") VALUES ($1, $2)',
        [rogue.id, name],
      );
    await expect(insertBoard('abcd')).rejects.toThrow(
      /CHK_alliance_forum_boards_name/,
    );
    await expect(insertBoard('a'.repeat(81))).rejects.toThrow();
    await expect(insertBoard('a'.repeat(80))).resolves.toBeDefined();

    const insertTopic = (title: string) =>
      dataSource.query(
        `INSERT INTO "alliance_forum_topics" ("boardId", "allianceId", "title", "authorName") VALUES ($1, $2, $3, 'x')`,
        [board.id, rogue.id, title],
      );
    await expect(insertTopic('')).rejects.toThrow(
      /CHK_alliance_forum_topics_title/,
    );
    await expect(insertTopic('a'.repeat(121))).rejects.toThrow();

    const insertPost = (text: string) =>
      dataSource.query(
        `INSERT INTO "alliance_forum_posts" ("topicId", "authorName", "text") VALUES ($1, 'x', $2)`,
        [topicId, text],
      );
    await expect(insertPost('')).rejects.toThrow(
      /CHK_alliance_forum_posts_text/,
    );
    await expect(insertPost('a'.repeat(20001))).rejects.toThrow(
      /CHK_alliance_forum_posts_text/,
    );
    await expect(insertPost('a'.repeat(20000))).resolves.toBeDefined();

    const insertEntry = (eventType: string, actorName: string | null) =>
      dataSource.query(
        `INSERT INTO "alliance_chronicle_entries" ("allianceId", "eventType", "actorName") VALUES ($1, $2, $3)`,
        [rogue.id, eventType, actorName],
      );
    await expect(insertEntry('E'.repeat(33), null)).rejects.toThrow();
    await expect(insertEntry('MEMBER_JOINED', 'n'.repeat(256))).rejects.toThrow();
    await expect(
      insertEntry('E'.repeat(32), 'n'.repeat(255)),
    ).resolves.toBeDefined();
  });

  describe('recent topics for the dashboard', () => {
    it('returns the latest live topics of exactly the own alliance, newest first, bounded by the limit', async () => {
      const leia = await rebel('leia');
      const wedge = await rebel('wedge');
      const rogue = await alliance('Rogue Squadron', leia);
      const red = await alliance('Red Squadron', wedge);
      const strategy = await forum.createBoard(leia.id, rogue.id, {
        name: 'Strategie',
      });
      const gone = await forum.createBoard(leia.id, rogue.id, {
        name: 'Verworfen',
      });
      const old = await forum.createTopic(leia.id, rogue.id, strategy.id, {
        title: 'Alt',
        text: 'x',
      });
      const deletedTopic = await forum.createTopic(leia.id, rogue.id, strategy.id, {
        title: 'Weg',
        text: 'x',
      });
      await forum.createTopic(leia.id, rogue.id, gone.id, {
        title: 'Im geloeschten Board',
        text: 'x',
      });
      const fresh = await forum.createTopic(leia.id, rogue.id, strategy.id, {
        title: 'Neu',
        text: 'x',
      });
      const foreignBoard = await forum.createBoard(wedge.id, red.id, {
        name: 'Fremdes Board',
      });
      await forum.createTopic(wedge.id, red.id, foreignBoard.id, {
        title: 'Fremd',
        text: 'x',
      });
      await forum.deleteTopic(leia.id, rogue.id, deletedTopic.topicId);
      await forum.deleteBoard(leia.id, rogue.id, gone.id);
      // A reply bumps the old topic to the top.
      await forum.createPost(leia.id, rogue.id, old.topicId, { text: 'Antwort' });

      const recent = await new TypeOrmForumStore(dataSource).listRecentTopics(
        rogue.id,
        10,
      );
      expect(recent.map((r) => [r.topic.title, r.boardName])).toEqual([
        ['Alt', 'Strategie'],
        ['Neu', 'Strategie'],
      ]);
      expect(recent[1].topic.id).toBe(fresh.topicId);

      const limited = await new TypeOrmForumStore(dataSource).listRecentTopics(
        rogue.id,
        1,
      );
      expect(limited.map((r) => r.topic.title)).toEqual(['Alt']);

      const dashboard = await forum.listRecentTopics(leia.id);
      expect(dashboard.map((t) => t.title)).toEqual(['Alt', 'Neu']);
      expect(await forum.listRecentTopics((await rebel('lando')).id)).toEqual([]);
    });
  });
});
