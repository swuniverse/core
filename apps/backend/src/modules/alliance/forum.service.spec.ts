import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AllianceRole, FORUM_DELETED_AUTHOR_NAME } from '@swuniverse/shared';
import { AllianceRateLimiterService } from './alliance-rate-limiter.service';
import { ForumService } from './forum.service';
import { InMemoryForumStore } from './testing/in-memory-forum.store';
import { InMemoryAllianceStore } from './testing/in-memory-alliance.store';

const { NONE, PRESIDENT, VICE, DIPLOMAT } = AllianceRole;

function setup(limiter?: AllianceRateLimiterService) {
  const alliances = new InMemoryAllianceStore();
  const forumStore = new InMemoryForumStore(alliances);
  let tick = Date.UTC(2026, 9, 9);
  const service = new ForumService(forumStore, limiter, () => new Date((tick += 1000)));
  alliances.addPlayer(1, 'Leia');
  alliances.addPlayer(2, 'Han');
  alliances.addPlayer(3, 'Wedge');
  alliances.addPlayer(4, 'Mon');
  alliances.addPlayer(5, 'Fremd');
  alliances.addPlayer(6, 'Allianzlos');
  const rogue = alliances.seedAlliance({ name: 'Rogue Squadron' }, [
    [1, PRESIDENT],
    [2, VICE],
    [3, DIPLOMAT],
    [4, NONE],
  ]);
  const other = alliances.seedAlliance({ name: 'Red Squadron' }, [[5, PRESIDENT]]);
  return { alliances, forumStore, service, rogue, other };
}

async function expectError(promise: Promise<unknown>, type: new (...a: never[]) => Error) {
  const error = await promise.then(
    () => {
      throw new Error('expected rejection');
    },
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(type);
}

async function boardWithTopic(ctx: ReturnType<typeof setup>, text = 'Hallo [b]Welt[/b]') {
  const board = await ctx.service.createBoard(1, ctx.rogue.id, { name: 'Allgemein' });
  const { topicId } = await ctx.service.createTopic(4, ctx.rogue.id, board.id, {
    title: 'Willkommen',
    text,
  });
  return { board, topicId };
}

describe('ForumService', () => {
  describe('boards', () => {
    it('lets only president and vice create boards', async () => {
      const { service, rogue } = setup();
      await service.createBoard(1, rogue.id, { name: 'Strategie' });
      await service.createBoard(2, rogue.id, { name: 'Taktik' });
      await expectError(service.createBoard(3, rogue.id, { name: 'Diplomatie' }), ForbiddenException);
      await expectError(service.createBoard(4, rogue.id, { name: 'Nebenbei' }), ForbiddenException);
    });

    it('returns NotFound for outsiders, loners and foreign alliance ids', async () => {
      const { service, rogue, other } = setup();
      await expectError(service.listBoards(5, rogue.id), NotFoundException);
      await expectError(service.listBoards(6, rogue.id), NotFoundException);
      await expectError(service.createBoard(5, rogue.id, { name: 'Eindringling' }), NotFoundException);
      await expectError(service.listBoards(1, other.id), NotFoundException);
      await expectError(service.listBoards(1, 999), NotFoundException);
    });

    it('validates the name after trimming by unicode characters', async () => {
      const { service, rogue } = setup();
      await expectError(service.createBoard(1, rogue.id, { name: '  abcd  ' }), BadRequestException);
      await expectError(service.createBoard(1, rogue.id, { name: undefined as never }), BadRequestException);
      await expectError(service.createBoard(1, rogue.id, { name: 'a'.repeat(81) }), BadRequestException);
      await service.createBoard(1, rogue.id, { name: '  abcde  ' });
      await service.createBoard(1, rogue.id, { name: 'a'.repeat(80) });
      // 80 emoji are 80 characters although each is two UTF-16 units.
      await service.createBoard(1, rogue.id, { name: '😀'.repeat(80) });
      await expectError(service.createBoard(1, rogue.id, { name: '😀'.repeat(81) }), BadRequestException);
      // Combining marks count as characters: 4 letters + 1 combining mark = 5.
      await service.createBoard(1, rogue.id, { name: 'abcd́' });
      await expectError(service.createBoard(1, rogue.id, { name: 'abć' }), BadRequestException);
    });

    it('allows at most 50 boards per alliance', async () => {
      const { service, rogue, other } = setup();
      for (let i = 0; i < 50; i += 1) {
        await service.createBoard(1, rogue.id, { name: `Board ${i + 10}` });
      }
      await expectError(service.createBoard(1, rogue.id, { name: 'Zu viel' }), BadRequestException);
      await service.createBoard(5, other.id, { name: 'Eigenes' });
    });

    it('reports capabilities and board statistics', async () => {
      const ctx = setup();
      const { board } = await boardWithTopic(ctx);
      const asMember = await ctx.service.listBoards(4, ctx.rogue.id);
      expect(asMember.capabilities.manageBoards).toBe(false);
      const asVice = await ctx.service.listBoards(2, ctx.rogue.id);
      expect(asVice.capabilities.manageBoards).toBe(true);
      expect(asMember.boards[0]).toMatchObject({
        id: board.id,
        topicCount: 1,
        postCount: 1,
        lastPost: { topicTitle: 'Willkommen', author: { name: 'Mon' } },
      });
    });
  });

  describe('topics and posts', () => {
    it('lets every member create topics and reply, landing on the page with the post', async () => {
      const ctx = setup();
      const { service, rogue } = ctx;
      const board = await service.createBoard(1, rogue.id, { name: 'Allgemein' });
      for (const userId of [1, 2, 3, 4]) {
        const { topicId, page } = await service.createTopic(userId, rogue.id, board.id, {
          title: `Thema von ${userId}`,
          text: 'Text',
        });
        expect(page).toBe(1);
        await service.createPost(userId, rogue.id, topicId, { text: 'Antwort' });
      }
    });

    it('creates the topic with its first post and moves board and topic activity', async () => {
      const ctx = setup();
      const { board, topicId } = await boardWithTopic(ctx);
      const first = await ctx.service.getTopic(1, ctx.rogue.id, topicId);
      expect(first.posts).toHaveLength(1);
      expect(first.posts[0].text).toBe('Hallo [b]Welt[/b]');
      const before = (await ctx.service.listBoards(1, ctx.rogue.id)).boards[0].lastActivityAt;
      await ctx.service.createPost(2, ctx.rogue.id, topicId, { text: 'Antwort' });
      const after = (await ctx.service.listBoards(1, ctx.rogue.id)).boards[0];
      expect(after.lastActivityAt > before).toBe(true);
      expect(after.id).toBe(board.id);
    });

    it('validates title and text by unicode characters after trimming', async () => {
      const ctx = setup();
      const board = await ctx.service.createBoard(1, ctx.rogue.id, { name: 'Allgemein' });
      const create = (title: string, text: string) =>
        ctx.service.createTopic(4, ctx.rogue.id, board.id, { title, text });
      await expectError(create('   ', 'x'), BadRequestException);
      await expectError(create('t', '   '), BadRequestException);
      await expectError(create('a'.repeat(121), 'x'), BadRequestException);
      await expectError(create('t', 'a'.repeat(20001)), BadRequestException);
      await create('😀'.repeat(120), '😀'.repeat(20000));
      await expectError(create('😀'.repeat(121), 'x'), BadRequestException);
    });

    it('hides unknown, foreign and cross-alliance objects behind NotFound', async () => {
      const ctx = setup();
      const { board, topicId } = await boardWithTopic(ctx);
      await expectError(ctx.service.getTopic(5, ctx.rogue.id, topicId), NotFoundException);
      await expectError(ctx.service.getTopic(5, ctx.other.id, topicId), NotFoundException);
      await expectError(ctx.service.getTopic(1, ctx.other.id, topicId), NotFoundException);
      await expectError(ctx.service.getTopic(1, ctx.rogue.id, 999), NotFoundException);
      await expectError(ctx.service.listTopics(5, ctx.other.id, board.id), NotFoundException);
      await expectError(ctx.service.createPost(5, ctx.other.id, topicId, { text: 'x' }), NotFoundException);
      await expectError(
        ctx.service.createTopic(5, ctx.other.id, board.id, { title: 'x', text: 'x' }),
        NotFoundException,
      );
    });

    it('treats a board id of another alliance as not found even for own-alliance members', async () => {
      const ctx = setup();
      const foreign = await ctx.service.createBoard(5, ctx.other.id, { name: 'Fremdes Board' });
      await expectError(ctx.service.listTopics(1, ctx.rogue.id, foreign.id), NotFoundException);
    });

    it('revokes access immediately after leaving or being kicked', async () => {
      const ctx = setup();
      const { topicId } = await boardWithTopic(ctx);
      await ctx.alliances.deleteMembership(ctx.rogue.id, 4);
      await expectError(ctx.service.getTopic(4, ctx.rogue.id, topicId), NotFoundException);
      await expectError(ctx.service.createPost(4, ctx.rogue.id, topicId, { text: 'x' }), NotFoundException);
      await ctx.alliances.deleteMembership(ctx.rogue.id, 3);
      await expectError(ctx.service.listBoards(3, ctx.rogue.id), NotFoundException);
    });

    it('revokes board creation when the vice loses office', async () => {
      const ctx = setup();
      await ctx.alliances.setRole(ctx.rogue.id, 2, NONE);
      await expectError(ctx.service.createBoard(2, ctx.rogue.id, { name: 'Taktik' }), ForbiddenException);
    });

    it('shows the existing forum to a new member', async () => {
      const ctx = setup();
      const { topicId } = await boardWithTopic(ctx);
      await ctx.alliances.insertMembership({ allianceId: ctx.rogue.id, userId: 6, role: NONE });
      const page = await ctx.service.getTopic(6, ctx.rogue.id, topicId);
      expect(page.posts).toHaveLength(1);
    });

    it('shows author, faction, office title and falls back to Gelöschter Siedler', async () => {
      const ctx = setup();
      const board = await ctx.service.createBoard(1, ctx.rogue.id, { name: 'Allgemein' });
      const { topicId } = await ctx.service.createTopic(1, ctx.rogue.id, board.id, {
        title: 'Thema',
        text: 'Befehl',
      });
      await ctx.service.createPost(4, ctx.rogue.id, topicId, { text: 'Antwort' });
      const page = await ctx.service.getTopic(4, ctx.rogue.id, topicId);
      expect(page.posts[0].author).toEqual({
        userId: 1,
        name: 'Leia',
        factionName: 'Rebellenallianz',
        roleTitle: 'Präsident',
      });
      expect(page.posts[1].author.roleTitle).toBeNull();

      ctx.forumStore.deleteAccount(4);
      const after = await ctx.service.getTopic(1, ctx.rogue.id, topicId);
      expect(after.posts[1].author).toEqual({
        userId: null,
        name: FORUM_DELETED_AUTHOR_NAME,
        factionName: null,
        roleTitle: null,
      });
      expect(after.posts[1].capabilities.edit).toBe(false);
    });

    it('sorts topics important first, then by latest activity, and paginates', async () => {
      const ctx = setup();
      const board = await ctx.service.createBoard(1, ctx.rogue.id, { name: 'Allgemein' });
      const ids: number[] = [];
      for (let i = 0; i < 21; i += 1) {
        ids.push(
          (await ctx.service.createTopic(4, ctx.rogue.id, board.id, { title: `T${i}`, text: 'x' })).topicId,
        );
      }
      // Reply to the oldest topic: it becomes the most recently active.
      await ctx.service.createPost(4, ctx.rogue.id, ids[0], { text: 'hoch' });
      const first = await ctx.service.listTopics(1, ctx.rogue.id, board.id);
      expect(first.topics).toHaveLength(20);
      expect(first.topics[0].title).toBe('T0');
      expect(first.topics[1].title).toBe('T20');
      expect(first.pagination).toEqual({ page: 1, pageSize: 20, totalItems: 21, totalPages: 2 });
      const second = await ctx.service.listTopics(1, ctx.rogue.id, board.id, 2);
      expect(second.topics.map((t) => t.title)).toEqual(['T1']);
    });

    it('puts important topics first', async () => {
      const ctx = setup();
      const board = await ctx.service.createBoard(1, ctx.rogue.id, { name: 'Allgemein' });
      await ctx.service.createTopic(4, ctx.rogue.id, board.id, { title: 'Alt', text: 'x' });
      await ctx.service.createTopic(4, ctx.rogue.id, board.id, { title: 'Neu', text: 'x' });
      const topics = (await ctx.service.listTopics(1, ctx.rogue.id, board.id)).topics;
      const alt = topics.find((t) => t.title === 'Alt')!;
      // Mark important through the store (moderation arrives in a later ticket).
      const snapshot = ctx.forumStore.snapshot();
      expect(snapshot.topics).toHaveLength(2);
      ctx.forumStore.markImportantForTest(alt.id);
      const sorted = (await ctx.service.listTopics(1, ctx.rogue.id, board.id)).topics;
      expect(sorted.map((t) => t.title)).toEqual(['Alt', 'Neu']);
      expect(sorted[0].important).toBe(true);
    });

    it('lists 20 posts per page chronologically and points a new reply to its page', async () => {
      const ctx = setup();
      const { topicId } = await boardWithTopic(ctx, 'Post 1');
      let last = { postId: 0, page: 1 };
      for (let i = 2; i <= 21; i += 1) {
        last = await ctx.service.createPost(4, ctx.rogue.id, topicId, { text: `Post ${i}` });
      }
      expect(last.page).toBe(2);
      const first = await ctx.service.getTopic(1, ctx.rogue.id, topicId);
      expect(first.posts).toHaveLength(20);
      expect(first.posts[0].text).toBe('Post 1');
      expect(first.posts[19].text).toBe('Post 20');
      const second = await ctx.service.getTopic(1, ctx.rogue.id, topicId, last.page);
      expect(second.posts.map((p) => p.text)).toEqual(['Post 21']);
      expect(second.pagination.totalPages).toBe(2);
    });

    it('exposes per-post capabilities from the server', async () => {
      const ctx = setup();
      const { topicId } = await boardWithTopic(ctx);
      const asAuthor = await ctx.service.getTopic(4, ctx.rogue.id, topicId);
      expect(asAuthor.posts[0].capabilities).toEqual({ edit: true, delete: false });
      expect(asAuthor.topic.capabilities).toEqual({ rename: false, setImportant: false, delete: false });
      const asVice = await ctx.service.getTopic(2, ctx.rogue.id, topicId);
      expect(asVice.posts[0].capabilities).toEqual({ edit: false, delete: true });
      expect(asVice.topic.capabilities).toEqual({ rename: true, setImportant: true, delete: true });
      const asDiplomat = await ctx.service.getTopic(3, ctx.rogue.id, topicId);
      expect(asDiplomat.posts[0].capabilities).toEqual({ edit: false, delete: false });
    });
  });

  describe('rate limiting', () => {
    it('limits topic creation and posting per member with German messages', async () => {
      const limiter = AllianceRateLimiterService.forTesting({
        commands: {
          'forum-topic': { windowMs: 60_000, maximumAttempts: 1, message: 'Zu viele Themen' },
          'forum-post': { windowMs: 60_000, maximumAttempts: 1, message: 'Zu viele Beiträge' },
        },
      });
      const ctx = setup(limiter);
      const board = await ctx.service.createBoard(1, ctx.rogue.id, { name: 'Allgemein' });
      const { topicId } = await ctx.service.createTopic(4, ctx.rogue.id, board.id, {
        title: 'Eins',
        text: 'x',
      });
      await expect(
        ctx.service.createTopic(4, ctx.rogue.id, board.id, { title: 'Zwei', text: 'x' }),
      ).rejects.toThrow('Zu viele Themen');
      await ctx.service.createPost(4, ctx.rogue.id, topicId, { text: 'a' });
      await expect(ctx.service.createPost(4, ctx.rogue.id, topicId, { text: 'b' })).rejects.toThrow(
        'Zu viele Beiträge',
      );
      // Another member has their own budget.
      await ctx.service.createPost(1, ctx.rogue.id, topicId, { text: 'c' });
    });

    it('ships German default policies for the forum commands', () => {
      const limiter = new AllianceRateLimiterService();
      expect(AllianceRateLimiterService.defaultCommands['forum-topic'].message).toMatch(/Themen/);
      expect(AllianceRateLimiterService.defaultCommands['forum-post'].message).toMatch(/Beiträge/);
      expect(limiter).toBeDefined();
    });
  });
});
