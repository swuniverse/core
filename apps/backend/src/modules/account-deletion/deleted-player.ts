import { FORUM_DELETED_AUTHOR_NAME } from '@swuniverse/shared';
import type { User } from '../auth/user.entity';

/**
 * Stand-in for the user relation of content that outlives its author's
 * account (sh-AP-05b): messages, HoloNet posts and comments keep showing up
 * as written by "Gelöschter Siedler", like STU hangs them on its fallback user.
 */
export function deletedPlayer(): User {
  return { id: null, username: FORUM_DELETED_AUTHOR_NAME } as unknown as User;
}

/** Fills the missing author relation of surviving content in place. */
export function withDeletedAuthor<T extends object, K extends keyof T>(
  items: T[],
  relation: K,
  idColumn: keyof T,
): T[] {
  for (const item of items) {
    if (item[idColumn] === null && item[relation] == null) {
      item[relation] = deletedPlayer() as T[K];
    }
  }
  return items;
}
