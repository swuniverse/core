import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { User } from './user.entity';

export const NON_NPC_USER_WHERE: Pick<User, 'isNpc'> = { isNpc: false };

export function nonNpcUsers<T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
  alias = 'user',
): SelectQueryBuilder<T> {
  return query.andWhere(`${alias}.isNpc = false`);
}
