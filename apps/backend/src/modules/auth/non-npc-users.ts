import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { User } from './user.entity';

export const NON_NPC_USER_WHERE: Pick<User, 'isNpc'> = { isNpc: false };

export function nonNpcUsers<T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
  alias = 'user',
): SelectQueryBuilder<T> {
  return query.andWhere(`${alias}.isNpc = false`);
}

/** NPC accounts take part in discoveries but earn neither prestige nor awards (STU). */
export async function isNpcUser(
  manager: { findOneBy(entity: typeof User, where: { id: number }): Promise<User | null> },
  userId: number,
): Promise<boolean> {
  return (await manager.findOneBy(User, { id: userId }))?.isNpc === true;
}
