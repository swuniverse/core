import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull } from 'typeorm';
import { AllianceRole } from '@swuniverse/shared';
import { User } from '../auth/user.entity';
import { Alliance } from './entities/alliance.entity';
import { AllianceMembership } from './entities/alliance-membership.entity';
import { ForumBoard } from './entities/forum-board.entity';
import { ForumTopic } from './entities/forum-topic.entity';
import { ForumPost } from './entities/forum-post.entity';
import type {
  ForumAuthorRecord,
  ForumBoardRecord,
  ForumBoardSummaryRecord,
  ForumMemberRecord,
  ForumPostRecord,
  ForumStore,
  ForumTopicRecord,
  ForumTopicSummaryRecord,
} from './forum.store';

function toBoard(board: ForumBoard): ForumBoardRecord {
  return {
    id: board.id,
    allianceId: board.allianceId,
    name: board.name,
    createdAt: board.createdAt,
    lastActivityAt: board.lastActivityAt,
    deletedAt: board.deletedAt,
    deletedByUserId: board.deletedByUserId,
    deletedByName: board.deletedByName,
  };
}

function toTopic(topic: ForumTopic): ForumTopicRecord {
  return {
    id: topic.id,
    boardId: topic.boardId,
    allianceId: topic.allianceId,
    title: topic.title,
    authorUserId: topic.authorUserId,
    authorName: topic.authorName,
    important: topic.important,
    createdAt: topic.createdAt,
    lastActivityAt: topic.lastActivityAt,
    deletedAt: topic.deletedAt,
    deletedByUserId: topic.deletedByUserId,
    deletedByName: topic.deletedByName,
  };
}

function toPost(post: ForumPost): ForumPostRecord {
  return {
    id: post.id,
    topicId: post.topicId,
    authorUserId: post.authorUserId,
    authorName: post.authorName,
    text: post.text,
    createdAt: post.createdAt,
    editedAt: post.editedAt,
    deletedAt: post.deletedAt,
    deletedByUserId: post.deletedByUserId,
    deletedByName: post.deletedByName,
  };
}

const displayName = (user: User) => user.displayName || user.username;

class TypeOrmForumStoreSession implements ForumStore {
  constructor(
    protected readonly manager: EntityManager,
    private readonly inTransaction: boolean,
  ) {}

  async transaction<T>(work: (store: ForumStore) => Promise<T>): Promise<T> {
    if (this.inTransaction) return work(this);
    return this.manager.transaction((manager) =>
      work(new TypeOrmForumStoreSession(manager, true)),
    );
  }

  async findMember(userId: number): Promise<ForumMemberRecord | null> {
    const membership = await this.manager.findOneBy(AllianceMembership, {
      userId,
    });
    if (!membership) return null;
    const [user, alliance] = await Promise.all([
      this.manager.findOneBy(User, { id: userId }),
      this.manager.findOneBy(Alliance, { id: membership.allianceId }),
    ]);
    if (!user || !alliance) return null;
    return {
      userId,
      name: displayName(user),
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
    if (!userIds.length) return [];
    const [users, memberships] = await Promise.all([
      this.manager.find(User, {
        where: { id: In(userIds) },
        relations: { factionRef: true },
      }),
      this.manager.findBy(AllianceMembership, { userId: In(userIds) }),
    ]);
    const membershipOf = new Map(memberships.map((m) => [m.userId, m]));
    return users.map((user) => ({
      userId: user.id,
      name: displayName(user),
      factionName: user.factionRef?.name ?? null,
      allianceId: membershipOf.get(user.id)?.allianceId ?? null,
      role: (membershipOf.get(user.id)?.role as AllianceRole | undefined) ?? null,
    }));
  }

  async lockAlliance(allianceId: number): Promise<void> {
    await this.manager.findOne(Alliance, {
      where: { id: allianceId },
      lock: { mode: 'pessimistic_write' },
    });
  }

  async countBoards(allianceId: number) {
    return this.manager
      .createQueryBuilder(ForumBoard, 'board')
      .where('board.allianceId = :allianceId', { allianceId })
      .andWhere('board.deletedAt IS NULL')
      .getCount();
  }

  async insertBoard(data: { allianceId: number; name: string; now: Date }) {
    const board = await this.manager.save(
      this.manager.create(ForumBoard, {
        allianceId: data.allianceId,
        name: data.name,
        createdAt: data.now,
        lastActivityAt: data.now,
      }),
    );
    return toBoard(board);
  }

  async findBoard(id: number) {
    const board = await this.manager.findOneBy(ForumBoard, { id });
    return board ? toBoard(board) : null;
  }

  async lockBoard(id: number) {
    const board = await this.manager.findOne(ForumBoard, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    return board ? toBoard(board) : null;
  }

  async listBoardSummaries(
    allianceId: number,
  ): Promise<ForumBoardSummaryRecord[]> {
    const boards = await this.manager.find(ForumBoard, {
      where: { allianceId, deletedAt: IsNull() },
      order: { id: 'ASC' },
    });
    const live = boards;
    if (!live.length) return [];
    const boardIds = live.map((b) => b.id);
    const counts: Array<{ boardId: number; topics: string; posts: string }> =
      await this.manager.query(
        `
        SELECT t."boardId" AS "boardId",
               COUNT(DISTINCT t."id") AS topics,
               COUNT(p."id") FILTER (WHERE p."deletedAt" IS NULL) AS posts
        FROM "alliance_forum_topics" t
        LEFT JOIN "alliance_forum_posts" p ON p."topicId" = t."id"
        WHERE t."boardId" = ANY($1) AND t."deletedAt" IS NULL
        GROUP BY t."boardId"
        `,
        [boardIds],
      );
    const lastPosts: Array<{
      boardId: number;
      topicId: number;
      topicTitle: string;
      authorUserId: number | null;
      authorName: string;
      createdAt: Date;
    }> = await this.manager.query(
      `
      SELECT DISTINCT ON (t."boardId")
             t."boardId" AS "boardId", t."id" AS "topicId", t."title" AS "topicTitle",
             p."authorUserId" AS "authorUserId", p."authorName" AS "authorName",
             p."createdAt" AS "createdAt"
      FROM "alliance_forum_posts" p
      JOIN "alliance_forum_topics" t ON t."id" = p."topicId"
      WHERE t."boardId" = ANY($1) AND t."deletedAt" IS NULL AND p."deletedAt" IS NULL
      ORDER BY t."boardId", p."createdAt" DESC, p."id" DESC
      `,
      [boardIds],
    );
    return live.map((board) => {
      const count = counts.find((c) => c.boardId === board.id);
      const last = lastPosts.find((l) => l.boardId === board.id);
      return {
        board: toBoard(board),
        topicCount: Number(count?.topics ?? 0),
        postCount: Number(count?.posts ?? 0),
        lastPost: last
          ? {
              topicId: last.topicId,
              topicTitle: last.topicTitle,
              authorUserId: last.authorUserId,
              authorName: last.authorName,
              createdAt: last.createdAt,
            }
          : null,
      };
    });
  }

  async setBoardActivity(boardId: number, at: Date) {
    await this.manager.update(ForumBoard, { id: boardId }, { lastActivityAt: at });
  }

  async listTopics(boardId: number, offset: number, limit: number) {
    const [topics, total] = await this.manager
      .createQueryBuilder(ForumTopic, 'topic')
      .where('topic.boardId = :boardId', { boardId })
      .andWhere('topic.deletedAt IS NULL')
      .orderBy('topic.important', 'DESC')
      .addOrderBy('topic.lastActivityAt', 'DESC')
      .addOrderBy('topic.id', 'DESC')
      .offset(offset)
      .limit(limit)
      .getManyAndCount();
    const ids = topics.map((t) => t.id);
    const counts: Array<{ topicId: number; posts: string }> = ids.length
      ? await this.manager.query(
          `SELECT "topicId", COUNT(*) AS posts FROM "alliance_forum_posts"
           WHERE "topicId" = ANY($1) AND "deletedAt" IS NULL GROUP BY "topicId"`,
          [ids],
        )
      : [];
    const summaries: ForumTopicSummaryRecord[] = topics.map((topic) => ({
      topic: toTopic(topic),
      postCount: Number(counts.find((c) => c.topicId === topic.id)?.posts ?? 0),
    }));
    return { topics: summaries, total };
  }

  async findTopic(id: number) {
    const topic = await this.manager.findOneBy(ForumTopic, { id });
    return topic ? toTopic(topic) : null;
  }

  async lockTopic(id: number) {
    const topic = await this.manager.findOne(ForumTopic, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    return topic ? toTopic(topic) : null;
  }

  async insertTopic(data: {
    boardId: number;
    allianceId: number;
    title: string;
    authorUserId: number;
    authorName: string;
    now: Date;
  }) {
    const topic = await this.manager.save(
      this.manager.create(ForumTopic, {
        boardId: data.boardId,
        allianceId: data.allianceId,
        title: data.title,
        authorUserId: data.authorUserId,
        authorName: data.authorName,
        createdAt: data.now,
        lastActivityAt: data.now,
      }),
    );
    return toTopic(topic);
  }

  async setTopicActivity(topicId: number, at: Date) {
    await this.manager.update(ForumTopic, { id: topicId }, { lastActivityAt: at });
  }

  async insertPost(data: {
    topicId: number;
    authorUserId: number;
    authorName: string;
    text: string;
    now: Date;
  }) {
    const post = await this.manager.save(
      this.manager.create(ForumPost, {
        topicId: data.topicId,
        authorUserId: data.authorUserId,
        authorName: data.authorName,
        text: data.text,
        createdAt: data.now,
      }),
    );
    return toPost(post);
  }

  async listPosts(topicId: number, offset: number, limit: number) {
    const posts = await this.manager.find(ForumPost, {
      where: { topicId },
      order: { createdAt: 'ASC', id: 'ASC' },
      skip: offset,
      take: limit,
    });
    return posts.map(toPost);
  }

  async countPosts(topicId: number) {
    return this.manager.countBy(ForumPost, { topicId });
  }

  async findPost(id: number) {
    const post = await this.manager.findOneBy(ForumPost, { id });
    return post ? toPost(post) : null;
  }

  async updatePostText(id: number, text: string, editedAt: Date) {
    await this.manager.update(ForumPost, { id }, { text, editedAt });
  }
}

@Injectable()
export class TypeOrmForumStore extends TypeOrmForumStoreSession {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(dataSource.manager, false);
  }
}
