import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  AllianceRole,
  FORUM_BOARD_NAME_MAX,
  FORUM_BOARD_NAME_MIN,
  FORUM_DELETED_AUTHOR_NAME,
  FORUM_MAX_BOARDS,
  FORUM_PAGE_SIZE,
  FORUM_POST_MAX,
  FORUM_POST_MIN,
  FORUM_TOPIC_TITLE_MAX,
  FORUM_TOPIC_TITLE_MIN,
  type CreateForumBoardRequest,
  type CreateForumPostRequest,
  type CreateForumPostResponse,
  type CreateForumTopicRequest,
  type CreateForumTopicResponse,
  type ForumAuthorDto,
  type ForumBoardDto,
  type ForumBoardPageDto,
  type ForumOverviewDto,
  type ForumPaginationDto,
  type ForumPostDto,
  type ForumTopicPageDto,
} from '@swuniverse/shared';
import { mayActOnAlliance } from './alliance-permissions';
import { AllianceRateLimiterService } from './alliance-rate-limiter.service';
import {
  FORUM_STORE,
  type ForumAuthorRecord,
  type ForumBoardRecord,
  type ForumMemberRecord,
  type ForumPostRecord,
  type ForumStore,
  type ForumTopicRecord,
} from './forum.store';

const ERR = {
  notFound: 'Das Forum oder der Beitrag existiert nicht',
  forbidden: 'Dazu fehlt Dir die Berechtigung',
  boardNameLength: `Der Boardname muss aus ${FORUM_BOARD_NAME_MIN} bis ${FORUM_BOARD_NAME_MAX} Zeichen bestehen`,
  topicTitleLength: `Der Titel muss aus ${FORUM_TOPIC_TITLE_MIN} bis ${FORUM_TOPIC_TITLE_MAX} Zeichen bestehen`,
  postLength: `Der Beitrag muss aus ${FORUM_POST_MIN} bis ${FORUM_POST_MAX} Zeichen bestehen`,
  boardLimit: `Eine Allianz kann höchstens ${FORUM_MAX_BOARDS} Boards haben`,
} as const;

export type ForumClock = () => Date;
export const FORUM_CLOCK = Symbol('FORUM_CLOCK');

/**
 * Alliance forum: boards, topics and posts. Every call authorizes against the
 * requester's current membership. Foreign, deleted and non-existent objects are
 * uniformly NotFound; missing rights on own objects are Forbidden.
 */
@Injectable()
export class ForumService {
  constructor(
    @Inject(FORUM_STORE) private readonly store: ForumStore,
    private readonly rateLimiter?: AllianceRateLimiterService,
    @Optional() @Inject(FORUM_CLOCK) private readonly now: ForumClock = () =>
      new Date(),
  ) {}

  // --- Reads ---

  async listBoards(
    viewerId: number,
    allianceId: number,
  ): Promise<ForumOverviewDto> {
    const viewer = await this.requireMember(viewerId, allianceId);
    const summaries = await this.store.listBoardSummaries(allianceId);
    const authors = await this.authorsOf(
      summaries.flatMap((s) =>
        s.lastPost?.authorUserId ? [s.lastPost.authorUserId] : [],
      ),
    );
    const moderate = this.mayModerate(viewer);
    return {
      allianceId,
      boards: summaries.map(({ board, topicCount, postCount, lastPost }) => ({
        id: board.id,
        name: board.name,
        topicCount,
        postCount,
        lastActivityAt: board.lastActivityAt.toISOString(),
        lastPost: lastPost && {
          topicId: lastPost.topicId,
          topicTitle: lastPost.topicTitle,
          author: this.authorDto(
            viewer,
            authors,
            lastPost.authorUserId,
            lastPost.authorName,
          ),
          createdAt: lastPost.createdAt.toISOString(),
        },
        capabilities: { rename: moderate, delete: moderate },
      })),
      capabilities: { manageBoards: moderate },
    };
  }

  async listTopics(
    viewerId: number,
    allianceId: number,
    boardId: number,
    page?: number,
  ): Promise<ForumBoardPageDto> {
    const viewer = await this.requireMember(viewerId, allianceId);
    const board = await this.requireBoard(this.store, viewer, boardId);
    const current = this.pageNumber(page);
    const { topics, total } = await this.store.listTopics(
      board.id,
      (current - 1) * FORUM_PAGE_SIZE,
      FORUM_PAGE_SIZE,
    );
    const authors = await this.authorsOf(
      topics.flatMap((t) => (t.topic.authorUserId ? [t.topic.authorUserId] : [])),
    );
    const moderate = this.mayModerate(viewer);
    return {
      allianceId,
      board: {
        id: board.id,
        name: board.name,
        capabilities: { rename: moderate, delete: moderate },
      },
      topics: topics.map(({ topic, postCount }) => ({
        id: topic.id,
        title: topic.title,
        important: topic.important,
        author: this.authorDto(
          viewer,
          authors,
          topic.authorUserId,
          topic.authorName,
        ),
        createdAt: topic.createdAt.toISOString(),
        lastActivityAt: topic.lastActivityAt.toISOString(),
        postCount,
        capabilities: this.topicCapabilities(viewer),
      })),
      pagination: this.pagination(current, total),
      capabilities: { manageBoards: moderate },
    };
  }

  async getTopic(
    viewerId: number,
    allianceId: number,
    topicId: number,
    page?: number,
  ): Promise<ForumTopicPageDto> {
    const viewer = await this.requireMember(viewerId, allianceId);
    const { topic, board } = await this.requireTopic(
      this.store,
      viewer,
      topicId,
    );
    const current = this.pageNumber(page);
    const [posts, total] = await Promise.all([
      this.store.listPosts(
        topic.id,
        (current - 1) * FORUM_PAGE_SIZE,
        FORUM_PAGE_SIZE,
      ),
      this.store.countPosts(topic.id),
    ]);
    const authors = await this.authorsOf(
      posts.flatMap((p) => (p.authorUserId ? [p.authorUserId] : [])),
    );
    return {
      allianceId,
      board: { id: board.id, name: board.name },
      topic: {
        id: topic.id,
        title: topic.title,
        important: topic.important,
        capabilities: this.topicCapabilities(viewer),
      },
      posts: posts.map((post) => this.postDto(viewer, authors, post)),
      pagination: this.pagination(current, total),
    };
  }

  // --- Writes ---

  async createBoard(
    viewerId: number,
    allianceId: number,
    request: CreateForumBoardRequest,
  ): Promise<ForumBoardDto> {
    const viewer = await this.requireMember(viewerId, allianceId);
    if (!this.mayModerate(viewer)) throw new ForbiddenException(ERR.forbidden);
    const name = this.validated(
      request?.name,
      FORUM_BOARD_NAME_MIN,
      FORUM_BOARD_NAME_MAX,
      ERR.boardNameLength,
    );
    const board = await this.store.transaction(async (store) => {
      await store.lockAlliance(allianceId);
      if ((await store.countBoards(allianceId)) >= FORUM_MAX_BOARDS) {
        throw new BadRequestException(ERR.boardLimit);
      }
      return store.insertBoard({ allianceId, name, now: this.now() });
    });
    return {
      id: board.id,
      name: board.name,
      topicCount: 0,
      postCount: 0,
      lastPost: null,
      lastActivityAt: board.lastActivityAt.toISOString(),
      capabilities: { rename: true, delete: true },
    };
  }

  async createTopic(
    viewerId: number,
    allianceId: number,
    boardId: number,
    request: CreateForumTopicRequest,
  ): Promise<CreateForumTopicResponse> {
    const viewer = await this.requireMember(viewerId, allianceId);
    await this.requireBoard(this.store, viewer, boardId);
    const title = this.validated(
      request?.title,
      FORUM_TOPIC_TITLE_MIN,
      FORUM_TOPIC_TITLE_MAX,
      ERR.topicTitleLength,
    );
    const text = this.validated(
      request?.text,
      FORUM_POST_MIN,
      FORUM_POST_MAX,
      ERR.postLength,
    );
    await this.rateLimiter?.check(viewerId, 'forum-topic');
    return this.store.transaction(async (store) => {
      const board = await store.lockBoard(boardId);
      if (!board || board.deletedAt || board.allianceId !== allianceId) {
        throw new NotFoundException(ERR.notFound);
      }
      const now = this.now();
      const topic = await store.insertTopic({
        boardId,
        allianceId,
        title,
        authorUserId: viewerId,
        authorName: viewer.name,
        now,
      });
      await store.insertPost({
        topicId: topic.id,
        authorUserId: viewerId,
        authorName: viewer.name,
        text,
        now,
      });
      await store.setBoardActivity(boardId, now);
      return { topicId: topic.id, page: 1 };
    });
  }

  async createPost(
    viewerId: number,
    allianceId: number,
    topicId: number,
    request: CreateForumPostRequest,
  ): Promise<CreateForumPostResponse> {
    const viewer = await this.requireMember(viewerId, allianceId);
    await this.requireTopic(this.store, viewer, topicId);
    const text = this.validated(
      request?.text,
      FORUM_POST_MIN,
      FORUM_POST_MAX,
      ERR.postLength,
    );
    await this.rateLimiter?.check(viewerId, 'forum-post');
    return this.store.transaction(async (store) => {
      // Lock order: board, then topic. Re-check under lock so a concurrently
      // deleted topic or board never receives a new post.
      const initial = await store.findTopic(topicId);
      if (initial) await store.lockBoard(initial.boardId);
      await store.lockTopic(topicId);
      const { topic } = await this.requireTopic(store, viewer, topicId);
      const now = this.now();
      const post = await store.insertPost({
        topicId,
        authorUserId: viewerId,
        authorName: viewer.name,
        text,
        now,
      });
      await store.setTopicActivity(topic.id, now);
      await store.setBoardActivity(topic.boardId, now);
      const total = await store.countPosts(topic.id);
      return { postId: post.id, page: this.pagination(1, total).totalPages };
    });
  }

  // --- Authorization helpers (reused by moderation and editing tickets) ---

  /** Current member of exactly this alliance, else NotFound. */
  protected async requireMember(
    userId: number,
    allianceId: number,
  ): Promise<ForumMemberRecord> {
    const member = await this.store.findMember(userId);
    if (!member || member.allianceId !== allianceId) {
      throw new NotFoundException(ERR.notFound);
    }
    return member;
  }

  protected async requireBoard(
    store: ForumStore,
    viewer: ForumMemberRecord,
    boardId: number,
  ): Promise<ForumBoardRecord> {
    const board = await store.findBoard(boardId);
    if (!board || board.deletedAt || board.allianceId !== viewer.allianceId) {
      throw new NotFoundException(ERR.notFound);
    }
    return board;
  }

  protected async requireTopic(
    store: ForumStore,
    viewer: ForumMemberRecord,
    topicId: number,
  ): Promise<{ topic: ForumTopicRecord; board: ForumBoardRecord }> {
    const topic = await store.findTopic(topicId);
    if (!topic || topic.deletedAt || topic.allianceId !== viewer.allianceId) {
      throw new NotFoundException(ERR.notFound);
    }
    const board = await this.requireBoard(store, viewer, topic.boardId);
    return { topic, board };
  }

  protected mayModerate(viewer: ForumMemberRecord): boolean {
    return mayActOnAlliance(viewer.role, 'moderateForum');
  }

  // --- Mapping ---

  private topicCapabilities(viewer: ForumMemberRecord) {
    const moderate = this.mayModerate(viewer);
    return { rename: moderate, setImportant: moderate, delete: moderate };
  }

  private postDto(
    viewer: ForumMemberRecord,
    authors: Map<number, ForumAuthorRecord>,
    post: ForumPostRecord,
  ): ForumPostDto {
    const deleted = post.deletedAt !== null;
    return {
      id: post.id,
      author: this.authorDto(viewer, authors, post.authorUserId, post.authorName),
      // The stored text of a deleted post is already empty; never deliver it.
      text: deleted ? null : post.text,
      createdAt: post.createdAt.toISOString(),
      editedAt: post.editedAt?.toISOString() ?? null,
      deleted: deleted
        ? {
            deletedAt: post.deletedAt!.toISOString(),
            moderatorName: post.deletedByName,
          }
        : null,
      capabilities: {
        edit: !deleted && post.authorUserId === viewer.userId,
        delete: !deleted && this.mayModerate(viewer),
      },
    };
  }

  private authorDto(
    viewer: ForumMemberRecord,
    authors: Map<number, ForumAuthorRecord>,
    userId: number | null,
    snapshotName: string,
  ): ForumAuthorDto {
    const author = userId === null ? undefined : authors.get(userId);
    if (!author) {
      return {
        userId: null,
        name: FORUM_DELETED_AUTHOR_NAME,
        factionName: null,
        roleTitle: null,
      };
    }
    return {
      userId: author.userId,
      name: author.name || snapshotName,
      factionName: author.factionName,
      roleTitle:
        author.allianceId === viewer.allianceId
          ? this.roleTitle(viewer, author.role)
          : null,
    };
  }

  private roleTitle(
    viewer: ForumMemberRecord,
    role: AllianceRole | null,
  ): string | null {
    switch (role) {
      case AllianceRole.PRESIDENT:
        return viewer.titles.president;
      case AllianceRole.VICE:
        return viewer.titles.vice;
      case AllianceRole.DIPLOMAT:
        return viewer.titles.diplomat;
      default:
        return null;
    }
  }

  private async authorsOf(userIds: number[]) {
    const authors = await this.store.findAuthors([...new Set(userIds)]);
    return new Map(authors.map((a) => [a.userId, a]));
  }

  private pageNumber(page?: number): number {
    return Number.isInteger(page) && (page as number) >= 1
      ? (page as number)
      : 1;
  }

  private pagination(page: number, total: number): ForumPaginationDto {
    return {
      page,
      pageSize: FORUM_PAGE_SIZE,
      totalItems: total,
      totalPages: Math.max(1, Math.ceil(total / FORUM_PAGE_SIZE)),
    };
  }

  /** Trims and counts Unicode code points (as the database CHECKs do). */
  private validated(
    raw: unknown,
    min: number,
    max: number,
    message: string,
  ): string {
    const value = typeof raw === 'string' ? raw.trim() : '';
    const length = Array.from(value).length;
    if (length < min || length > max) throw new BadRequestException(message);
    return value;
  }
}
