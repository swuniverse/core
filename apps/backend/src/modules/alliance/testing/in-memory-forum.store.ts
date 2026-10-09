import type { InMemoryAllianceStore } from './in-memory-alliance.store';
import type {
  ForumAuthorRecord,
  ForumBoardRecord,
  ForumBoardSummaryRecord,
  ForumMemberRecord,
  ForumModerationStamp,
  ForumPostRecord,
  ForumStore,
  ForumTopicRecord,
  ForumTopicSummaryRecord,
} from '../forum.store';

interface State {
  boards: ForumBoardRecord[];
  topics: ForumTopicRecord[];
  posts: ForumPostRecord[];
  nextId: number;
}

const noDeletion = {
  deletedAt: null,
  deletedByUserId: null,
  deletedByName: null,
} as const;

/**
 * In-memory {@link ForumStore} for unit tests. Reads players, memberships and
 * alliances live from the given {@link InMemoryAllianceStore}, so leaving or
 * kicking through the alliance store takes effect immediately.
 */
export class InMemoryForumStore implements ForumStore {
  private state: State = { boards: [], topics: [], posts: [], nextId: 1 };
  private readonly deletedAccounts = new Set<number>();

  constructor(private readonly alliances: InMemoryAllianceStore) {}

  /** Test helper: the account is gone; author references become null. */
  deleteAccount(userId: number) {
    this.deletedAccounts.add(userId);
    for (const row of [...this.state.topics, ...this.state.posts]) {
      if (row.authorUserId === userId) row.authorUserId = null;
      if (row.deletedByUserId === userId) row.deletedByUserId = null;
    }
    for (const board of this.state.boards) {
      if (board.deletedByUserId === userId) board.deletedByUserId = null;
    }
  }

  snapshot() {
    return structuredClone(this.state);
  }

  async transaction<T>(work: (store: ForumStore) => Promise<T>): Promise<T> {
    const before = structuredClone(this.state);
    try {
      return await work(this);
    } catch (error) {
      this.state = before;
      throw error;
    }
  }

  async findMember(userId: number): Promise<ForumMemberRecord | null> {
    if (this.deletedAccounts.has(userId)) return null;
    const data = this.alliances.snapshot();
    const membership = data.memberships.find((m) => m.userId === userId);
    const player = data.players.find((p) => p.id === userId);
    if (!membership || !player) return null;
    const alliance = data.alliances.find((a) => a.id === membership.allianceId);
    if (!alliance) return null;
    return {
      userId,
      name: player.name,
      allianceId: alliance.id,
      role: membership.role,
      titles: {
        president: alliance.presidentTitle,
        vice: alliance.viceTitle,
        diplomat: alliance.diplomatTitle,
      },
    };
  }

  async findAuthors(userIds: number[]): Promise<ForumAuthorRecord[]> {
    const data = this.alliances.snapshot();
    return [...new Set(userIds)].flatMap((userId) => {
      const player = data.players.find((p) => p.id === userId);
      if (!player || this.deletedAccounts.has(userId)) return [];
      const membership = data.memberships.find((m) => m.userId === userId);
      return [
        {
          userId,
          name: player.name,
          factionName:
            data.factions.find((f) => f.id === player.factionId)?.name ?? null,
          allianceId: membership?.allianceId ?? null,
          role: membership?.role ?? null,
        },
      ];
    });
  }

  async lockAlliance(): Promise<void> {
    // Single-threaded: nothing to serialise.
  }

  async countBoards(allianceId: number) {
    return this.state.boards.filter(
      (b) => b.allianceId === allianceId && !b.deletedAt,
    ).length;
  }

  async insertBoard(data: { allianceId: number; name: string; now: Date }) {
    const board: ForumBoardRecord = {
      id: this.state.nextId++,
      allianceId: data.allianceId,
      name: data.name,
      createdAt: data.now,
      lastActivityAt: data.now,
      ...noDeletion,
    };
    this.state.boards.push(board);
    return { ...board };
  }

  async findBoard(id: number) {
    const board = this.state.boards.find((b) => b.id === id);
    return board ? { ...board } : null;
  }

  async lockBoard(id: number) {
    return this.findBoard(id);
  }

  async listBoardSummaries(
    allianceId: number,
  ): Promise<ForumBoardSummaryRecord[]> {
    return this.state.boards
      .filter((b) => b.allianceId === allianceId && !b.deletedAt)
      .sort((a, b) => a.id - b.id)
      .map((board) => {
        const topics = this.state.topics.filter(
          (t) => t.boardId === board.id && !t.deletedAt,
        );
        const posts = this.state.posts
          .filter(
            (p) => !p.deletedAt && topics.some((t) => t.id === p.topicId),
          )
          .sort(
            (a, b) =>
              b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id,
          );
        const last = posts[0];
        return {
          board: { ...board },
          topicCount: topics.length,
          postCount: posts.length,
          lastPost: last
            ? {
                topicId: last.topicId,
                topicTitle: topics.find((t) => t.id === last.topicId)!.title,
                authorUserId: last.authorUserId,
                authorName: last.authorName,
                createdAt: last.createdAt,
              }
            : null,
        };
      });
  }

  async setBoardActivity(boardId: number, at: Date) {
    const board = this.state.boards.find((b) => b.id === boardId);
    if (board) board.lastActivityAt = at;
  }

  async listTopics(boardId: number, offset: number, limit: number) {
    const all = this.state.topics
      .filter((t) => t.boardId === boardId && !t.deletedAt)
      .sort(
        (a, b) =>
          Number(b.important) - Number(a.important) ||
          b.lastActivityAt.getTime() - a.lastActivityAt.getTime() ||
          b.id - a.id,
      );
    const topics: ForumTopicSummaryRecord[] = all
      .slice(offset, offset + limit)
      .map((topic) => ({
        topic: { ...topic },
        postCount: this.state.posts.filter(
          (p) => p.topicId === topic.id && !p.deletedAt,
        ).length,
      }));
    return { topics, total: all.length };
  }

  async findTopic(id: number) {
    const topic = this.state.topics.find((t) => t.id === id);
    return topic ? { ...topic } : null;
  }

  async lockTopic(id: number) {
    return this.findTopic(id);
  }

  async insertTopic(data: {
    boardId: number;
    allianceId: number;
    title: string;
    authorUserId: number;
    authorName: string;
    now: Date;
  }) {
    const topic: ForumTopicRecord = {
      id: this.state.nextId++,
      boardId: data.boardId,
      allianceId: data.allianceId,
      title: data.title,
      authorUserId: data.authorUserId,
      authorName: data.authorName,
      important: false,
      createdAt: data.now,
      lastActivityAt: data.now,
      ...noDeletion,
    };
    this.state.topics.push(topic);
    return { ...topic };
  }

  async setTopicActivity(topicId: number, at: Date) {
    const topic = this.state.topics.find((t) => t.id === topicId);
    if (topic) topic.lastActivityAt = at;
  }

  async insertPost(data: {
    topicId: number;
    authorUserId: number;
    authorName: string;
    text: string;
    now: Date;
  }) {
    const post: ForumPostRecord = {
      id: this.state.nextId++,
      topicId: data.topicId,
      authorUserId: data.authorUserId,
      authorName: data.authorName,
      text: data.text,
      createdAt: data.now,
      editedAt: null,
      ...noDeletion,
    };
    this.state.posts.push(post);
    return { ...post };
  }

  async listPosts(topicId: number, offset: number, limit: number) {
    return this.state.posts
      .filter((p) => p.topicId === topicId)
      .sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id,
      )
      .slice(offset, offset + limit)
      .map((p) => ({ ...p }));
  }

  async countPosts(topicId: number) {
    return this.state.posts.filter((p) => p.topicId === topicId).length;
  }

  async renameBoard(boardId: number, name: string) {
    const board = this.state.boards.find((b) => b.id === boardId);
    if (board) board.name = name;
  }

  async renameTopic(topicId: number, title: string) {
    const topic = this.state.topics.find((t) => t.id === topicId);
    if (topic) topic.title = title;
  }

  async setTopicImportant(topicId: number, important: boolean) {
    const topic = this.state.topics.find((t) => t.id === topicId);
    if (topic) topic.important = important;
  }

  async findPost(id: number) {
    const post = this.state.posts.find((p) => p.id === id);
    return post ? { ...post } : null;
  }

  async deletePost(postId: number, moderator: ForumModerationStamp) {
    this.stampPosts(
      this.state.posts.filter((p) => p.id === postId),
      moderator,
    );
  }

  async deleteTopic(topicId: number, moderator: ForumModerationStamp) {
    const topic = this.state.topics.find((t) => t.id === topicId);
    if (!topic) return;
    this.stamp(topic, moderator);
    this.stampPosts(
      this.state.posts.filter((p) => p.topicId === topicId),
      moderator,
    );
  }

  async deleteBoard(boardId: number, moderator: ForumModerationStamp) {
    const board = this.state.boards.find((b) => b.id === boardId);
    if (!board) return;
    this.stamp(board, moderator);
    for (const topic of this.state.topics.filter((t) => t.boardId === boardId)) {
      await this.deleteTopic(topic.id, moderator);
    }
  }

  private stamp(
    row: { deletedAt: Date | null; deletedByUserId: number | null; deletedByName: string | null },
    moderator: ForumModerationStamp,
  ) {
    if (row.deletedAt) return;
    row.deletedAt = moderator.at;
    row.deletedByUserId = moderator.userId;
    row.deletedByName = moderator.name;
  }

  private stampPosts(posts: ForumPostRecord[], moderator: ForumModerationStamp) {
    for (const post of posts) {
      if (post.deletedAt) continue;
      this.stamp(post, moderator);
      post.text = '';
    }
  }
}
