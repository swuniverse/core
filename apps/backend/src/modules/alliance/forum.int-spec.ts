import { DataSource } from 'typeorm';
import { AllianceRole, Faction } from '@swuniverse/shared';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  connectIntegrationDatabase,
  createUser,
  factionId,
  resetDatabase,
} from '../../testing/integration/database';
import { User } from '../auth/user.entity';
import { ForumService } from './forum.service';
import { TypeOrmAllianceStore } from './typeorm-alliance.store';
import { TypeOrmForumStore } from './typeorm-forum.store';

const { NONE, PRESIDENT } = AllianceRole;

describe('alliance forum persistence (Postgres)', () => {
  let dataSource: DataSource;
  let allianceStore: TypeOrmAllianceStore;
  let service: ForumService;
  let rebels: number;

  beforeAll(async () => {
    dataSource = await connectIntegrationDatabase();
  });
  afterAll(() => dataSource.destroy());

  beforeEach(async () => {
    await resetDatabase(dataSource);
    rebels = await factionId(dataSource, Faction.REBEL_ALLIANCE);
    allianceStore = new TypeOrmAllianceStore(dataSource);
    service = new ForumService(new TypeOrmForumStore(dataSource));
  });

  const rebel = (overrides: Partial<User> = {}) =>
    createUser(dataSource, {
      faction: Faction.REBEL_ALLIANCE,
      factionId: rebels,
      ...overrides,
    });

  async function alliance(name: string, presidentId: number, members: number[] = []) {
    const created = await allianceStore.insertAlliance({
      name,
      description: '',
      factionId: rebels,
    });
    await allianceStore.insertMembership({
      allianceId: created.id,
      userId: presidentId,
      role: PRESIDENT,
    });
    for (const userId of members) {
      await allianceStore.insertMembership({
        allianceId: created.id,
        userId,
        role: NONE,
      });
    }
    return created;
  }

  const count = async (table: string) =>
    Number((await dataSource.query(`SELECT COUNT(*) AS n FROM "${table}"`))[0].n);

  it('creates boards, topics and posts and reads them back with statistics and order', async () => {
    const leia = await rebel();
    const han = await rebel();
    const rogue = await alliance('Rogue Squadron', leia.id, [han.id]);
    const board = await service.createBoard(leia.id, rogue.id, { name: 'Strategie' });
    const first = await service.createTopic(han.id, rogue.id, board.id, {
      title: 'Erstes',
      text: 'Hallo',
    });
    const second = await service.createTopic(han.id, rogue.id, board.id, {
      title: 'Zweites',
      text: 'Hallo',
    });
    await service.createPost(leia.id, rogue.id, first.topicId, { text: 'Antwort' });

    const overview = await service.listBoards(han.id, rogue.id);
    expect(overview.boards[0]).toMatchObject({
      topicCount: 2,
      postCount: 3,
      lastPost: { topicId: first.topicId, author: { name: expect.any(String) } },
    });
    const topics = await service.listTopics(han.id, rogue.id, board.id);
    expect(topics.topics.map((t) => t.id)).toEqual([first.topicId, second.topicId]);
    const topic = await service.getTopic(han.id, rogue.id, first.topicId);
    expect(topic.posts.map((p) => p.text)).toEqual(['Hallo', 'Antwort']);
  });

  it('hides the forum from outsiders and other alliances', async () => {
    const leia = await rebel();
    const outsider = await rebel();
    const rogue = await alliance('Rogue Squadron', leia.id);
    const red = await alliance('Red Squadron', outsider.id);
    const board = await service.createBoard(leia.id, rogue.id, { name: 'Strategie' });
    await expect(service.listBoards(outsider.id, rogue.id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.listTopics(outsider.id, red.id, board.id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('cascades alliance dissolution to boards, topics and posts', async () => {
    const leia = await rebel();
    const rogue = await alliance('Rogue Squadron', leia.id);
    const board = await service.createBoard(leia.id, rogue.id, { name: 'Strategie' });
    await service.createTopic(leia.id, rogue.id, board.id, { title: 'T', text: 'x' });
    expect(await count('alliance_forum_posts')).toBe(1);

    await allianceStore.deleteAlliance(rogue.id);

    expect(await count('alliance_forum_boards')).toBe(0);
    expect(await count('alliance_forum_topics')).toBe(0);
    expect(await count('alliance_forum_posts')).toBe(0);
  });

  it('nulls author references on account deletion but keeps the captured name', async () => {
    const leia = await rebel();
    const han = await rebel({ displayName: 'Han Solo' });
    const rogue = await alliance('Rogue Squadron', leia.id, [han.id]);
    const board = await service.createBoard(leia.id, rogue.id, { name: 'Strategie' });
    const { topicId } = await service.createTopic(han.id, rogue.id, board.id, {
      title: 'T',
      text: 'x',
    });

    await dataSource.query('DELETE FROM "users" WHERE "id" = $1', [han.id]);

    const rows = await dataSource.query(
      'SELECT "authorUserId", "authorName" FROM "alliance_forum_posts"',
    );
    expect(rows).toEqual([{ authorUserId: null, authorName: 'Han Solo' }]);
    const page = await service.getTopic(leia.id, rogue.id, topicId);
    expect(page.posts[0].author).toMatchObject({
      userId: null,
      name: 'Gelöschter Siedler',
    });
  });

  it('enforces length limits in the database', async () => {
    const leia = await rebel();
    const rogue = await alliance('Rogue Squadron', leia.id);
    await expect(
      dataSource.query(
        'INSERT INTO "alliance_forum_boards" ("allianceId", "name") VALUES ($1, $2)',
        [rogue.id, 'abcd'],
      ),
    ).rejects.toThrow(/CHK_alliance_forum_boards_name/);
    const board = await service.createBoard(leia.id, rogue.id, { name: 'Strategie' });
    await expect(
      dataSource.query(
        `INSERT INTO "alliance_forum_topics" ("boardId", "allianceId", "title", "authorName") VALUES ($1, $2, '', 'x')`,
        [board.id, rogue.id],
      ),
    ).rejects.toThrow(/CHK_alliance_forum_topics_title/);
    const { topicId } = await service.createTopic(leia.id, rogue.id, board.id, {
      title: 'T',
      text: 'x',
    });
    await expect(
      dataSource.query(
        `INSERT INTO "alliance_forum_posts" ("topicId", "authorName", "text") VALUES ($1, 'x', $2)`,
        [topicId, 'a'.repeat(20001)],
      ),
    ).rejects.toThrow(/CHK_alliance_forum_posts_text/);
  });

  it('holds the board limit under concurrent creation', async () => {
    const leia = await rebel();
    const rogue = await alliance('Rogue Squadron', leia.id);
    for (let i = 0; i < 48; i += 1) {
      await service.createBoard(leia.id, rogue.id, { name: `Board ${i + 10}` });
    }
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, (_, i) =>
        new ForumService(new TypeOrmForumStore(dataSource)).createBoard(
          leia.id,
          rogue.id,
          { name: `Parallel ${i}` },
        ),
      ),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(2);
    for (const rejected of results.filter((r) => r.status === 'rejected')) {
      expect((rejected as PromiseRejectedResult).reason).toBeInstanceOf(BadRequestException);
    }
    expect(await count('alliance_forum_boards')).toBe(50);
  });

  it('never adds a post to a topic that was deleted concurrently', async () => {
    const leia = await rebel();
    const rogue = await alliance('Rogue Squadron', leia.id);
    const board = await service.createBoard(leia.id, rogue.id, { name: 'Strategie' });
    const { topicId } = await service.createTopic(leia.id, rogue.id, board.id, {
      title: 'T',
      text: 'x',
    });
    // Simulate a moderator transaction that holds the topic lock while deleting.
    const runner = dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    await runner.query('SELECT 1 FROM "alliance_forum_topics" WHERE "id" = $1 FOR UPDATE', [topicId]);
    const reply = service.createPost(leia.id, rogue.id, topicId, { text: 'zu spät' });
    await new Promise((resolve) => setTimeout(resolve, 200));
    await runner.query(
      'UPDATE "alliance_forum_topics" SET "deletedAt" = now() WHERE "id" = $1',
      [topicId],
    );
    await runner.commitTransaction();
    await runner.release();

    await expect(reply).rejects.toBeInstanceOf(NotFoundException);
    expect(await count('alliance_forum_posts')).toBe(1);
  });
  it('soft-deletes posts, topics and boards, blanking texts and freeing the board limit', async () => {
    const leia = await rebel({ displayName: 'Leia Organa' });
    const han = await rebel();
    const rogue = await alliance('Rogue Squadron', leia.id, [han.id]);
    const board = await service.createBoard(leia.id, rogue.id, { name: 'Strategie' });
    const keep = await service.createTopic(han.id, rogue.id, board.id, { title: 'Bleibt', text: 'a' });
    const gone = await service.createTopic(han.id, rogue.id, board.id, { title: 'Weg', text: 'b' });
    await service.createPost(han.id, rogue.id, gone.topicId, { text: 'c' });
    const page = await service.getTopic(leia.id, rogue.id, keep.topicId);

    await service.deletePost(leia.id, rogue.id, page.posts[0].id);
    const moderated = await service.getTopic(han.id, rogue.id, keep.topicId);
    expect(moderated.posts[0]).toMatchObject({ text: null, deleted: { moderatorName: 'Leia Organa' } });
    const row = (await dataSource.query('SELECT * FROM "alliance_forum_posts" WHERE "id" = $1', [page.posts[0].id]))[0];
    expect(row).toMatchObject({ text: '', deletedByUserId: leia.id, deletedByName: 'Leia Organa' });

    await service.deleteTopic(leia.id, rogue.id, gone.topicId);
    await expect(service.getTopic(han.id, rogue.id, gone.topicId)).rejects.toBeInstanceOf(NotFoundException);
    expect(await count('alliance_forum_posts')).toBe(3);
    expect(
      Number((await dataSource.query(`SELECT COUNT(*) AS n FROM "alliance_forum_posts" WHERE "text" <> ''`))[0].n),
    ).toBe(0);

    await service.deleteBoard(leia.id, rogue.id, board.id);
    await expect(service.listTopics(han.id, rogue.id, board.id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.getTopic(han.id, rogue.id, keep.topicId)).rejects.toBeInstanceOf(NotFoundException);
    expect((await service.listBoards(han.id, rogue.id)).boards).toEqual([]);
    const topics = await dataSource.query('SELECT "deletedAt", "deletedByName" FROM "alliance_forum_topics"');
    expect(topics.every((t: { deletedAt: Date | null }) => t.deletedAt)).toBe(true);
  });

  it('refuses a post and a post deletion on a topic whose board is deleted concurrently', async () => {
    const leia = await rebel();
    const rogue = await alliance('Rogue Squadron', leia.id);
    const board = await service.createBoard(leia.id, rogue.id, { name: 'Strategie' });
    const { topicId } = await service.createTopic(leia.id, rogue.id, board.id, { title: 'T', text: 'x' });
    const [post] = (await service.getTopic(leia.id, rogue.id, topicId)).posts;
    const runner = dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    await runner.query('SELECT 1 FROM "alliance_forum_boards" WHERE "id" = $1 FOR UPDATE', [board.id]);
    const reply = service.createPost(leia.id, rogue.id, topicId, { text: 'zu spät' });
    const moderate = service.deletePost(leia.id, rogue.id, post.id);
    await new Promise((resolve) => setTimeout(resolve, 200));
    await runner.query('UPDATE "alliance_forum_boards" SET "deletedAt" = now() WHERE "id" = $1', [board.id]);
    await runner.commitTransaction();
    await runner.release();
    await expect(reply).rejects.toBeInstanceOf(NotFoundException);
    await expect(moderate).rejects.toBeInstanceOf(NotFoundException);
    expect(await count('alliance_forum_posts')).toBe(1);
  });

  it('serialises a concurrent topic deletion with a reply: no live post survives in a deleted topic', async () => {
    const leia = await rebel();
    const rogue = await alliance('Rogue Squadron', leia.id);
    const board = await service.createBoard(leia.id, rogue.id, { name: 'Strategie' });
    const { topicId } = await service.createTopic(leia.id, rogue.id, board.id, { title: 'T', text: 'x' });
    const make = () => new ForumService(new TypeOrmForumStore(dataSource));
    await Promise.allSettled([
      make().createPost(leia.id, rogue.id, topicId, { text: 'y' }),
      make().deleteTopic(leia.id, rogue.id, topicId),
    ]);
    const live = await dataSource.query(`SELECT COUNT(*) AS n FROM "alliance_forum_posts" WHERE "text" <> ''`);
    expect(Number(live[0].n)).toBe(0);
  });
});
