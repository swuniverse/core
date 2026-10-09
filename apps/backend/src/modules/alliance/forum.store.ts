import type { AllianceRole } from '@swuniverse/shared';

export const FORUM_STORE = Symbol('FORUM_STORE');

/** Moderation trail shared by boards, topics and posts. */
export interface ForumDeletionFields {
  deletedAt: Date | null;
  deletedByUserId: number | null;
  deletedByName: string | null;
}

export interface ForumBoardRecord extends ForumDeletionFields {
  id: number;
  allianceId: number;
  name: string;
  createdAt: Date;
  lastActivityAt: Date;
}

export interface ForumTopicRecord extends ForumDeletionFields {
  id: number;
  boardId: number;
  /** Denormalised from the board; used for authorization. */
  allianceId: number;
  title: string;
  authorUserId: number | null;
  authorName: string;
  important: boolean;
  createdAt: Date;
  lastActivityAt: Date;
}

export interface ForumPostRecord extends ForumDeletionFields {
  id: number;
  topicId: number;
  authorUserId: number | null;
  authorName: string;
  /** Empty once the post was moderated. */
  text: string;
  createdAt: Date;
  editedAt: Date | null;
}

/** Who moderated and when; written to the deletion fields. */
export interface ForumModerationStamp {
  userId: number;
  name: string;
  at: Date;
}

/** The requesting player with their current alliance membership. */
export interface ForumMemberRecord {
  userId: number;
  name: string;
  allianceId: number;
  role: AllianceRole;
  titles: { president: string; vice: string; diplomat: string };
}

/** Display data of a post or topic author whose account still exists. */
export interface ForumAuthorRecord {
  userId: number;
  name: string;
  factionName: string | null;
  /** Current membership; the office title is only shown within that alliance. */
  allianceId: number | null;
  role: AllianceRole | null;
}

export interface ForumBoardSummaryRecord {
  board: ForumBoardRecord;
  /** Counts cover non-deleted topics and non-deleted posts only. */
  topicCount: number;
  postCount: number;
  lastPost: {
    topicId: number;
    topicTitle: string;
    authorUserId: number | null;
    authorName: string;
    createdAt: Date;
  } | null;
}

export interface ForumRecentTopicRecord {
  topic: ForumTopicRecord;
  boardName: string;
}

export interface ForumTopicSummaryRecord {
  topic: ForumTopicRecord;
  /** Non-deleted posts only. */
  postCount: number;
}

/**
 * Persistence port for the alliance forum. Lock order for write paths that
 * touch several levels: alliance, then board, then topic.
 *
 * Reads exclude soft-deleted boards and topics unless stated otherwise;
 * `find*` return soft-deleted rows so the service can decide (and treat them
 * as not found). Deleting an alliance cascades to the whole forum.
 */
export interface ForumStore {
  transaction<T>(work: (store: ForumStore) => Promise<T>): Promise<T>;

  /** Current membership of the player, null if they are in no alliance. */
  findMember(userId: number): Promise<ForumMemberRecord | null>;
  /** Display data for the given players; deleted accounts are absent. */
  findAuthors(userIds: number[]): Promise<ForumAuthorRecord[]>;
  /** Inside a transaction: serialise forum writes of one alliance. */
  lockAlliance(allianceId: number): Promise<void>;

  countBoards(allianceId: number): Promise<number>;
  insertBoard(data: {
    allianceId: number;
    name: string;
    now: Date;
  }): Promise<ForumBoardRecord>;
  findBoard(id: number): Promise<ForumBoardRecord | null>;
  /** Locks the row until commit; null if it does not exist. */
  lockBoard(id: number): Promise<ForumBoardRecord | null>;
  /** Non-deleted boards, oldest first. */
  listBoardSummaries(allianceId: number): Promise<ForumBoardSummaryRecord[]>;
  setBoardActivity(boardId: number, at: Date): Promise<void>;

  /** Non-deleted topics: important first, then latest activity, then newest. */
  listTopics(
    boardId: number,
    offset: number,
    limit: number,
  ): Promise<{ topics: ForumTopicSummaryRecord[]; total: number }>;
  findTopic(id: number): Promise<ForumTopicRecord | null>;
  /** Locks the row until commit; null if it does not exist. */
  lockTopic(id: number): Promise<ForumTopicRecord | null>;
  insertTopic(data: {
    boardId: number;
    allianceId: number;
    title: string;
    authorUserId: number;
    authorName: string;
    now: Date;
  }): Promise<ForumTopicRecord>;
  setTopicActivity(topicId: number, at: Date): Promise<void>;

  insertPost(data: {
    topicId: number;
    authorUserId: number;
    authorName: string;
    text: string;
    now: Date;
  }): Promise<ForumPostRecord>;
  /** All posts including moderated ones, oldest first (createdAt, id). */
  listPosts(
    topicId: number,
    offset: number,
    limit: number,
  ): Promise<ForumPostRecord[]>;
  countPosts(topicId: number): Promise<number>;
  /** Includes moderated posts; null if it does not exist. */
  findPost(id: number): Promise<ForumPostRecord | null>;
  /** Replaces the text and sets the edit time; touches no activity. */
  updatePostText(id: number, text: string, editedAt: Date): Promise<void>;

  // --- Moderation ---

  renameBoard(boardId: number, name: string): Promise<void>;
  renameTopic(topicId: number, title: string): Promise<void>;
  setTopicImportant(topicId: number, important: boolean): Promise<void>;
  /** Soft-deletes one post: blanks its text and records the moderator. */
  deletePost(postId: number, moderator: ForumModerationStamp): Promise<void>;
  /** Soft-deletes the topic and blanks every not yet moderated post in it. */
  deleteTopic(topicId: number, moderator: ForumModerationStamp): Promise<void>;
  /** Soft-deletes the board, its topics and blanks all their posts. */
  deleteBoard(boardId: number, moderator: ForumModerationStamp): Promise<void>;

  /**
   * Non-deleted topics in non-deleted boards of the alliance, latest activity
   * first, then newest.
   */
  listRecentTopics(
    allianceId: number,
    limit: number,
  ): Promise<ForumRecentTopicRecord[]>;
}
