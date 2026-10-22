import { User } from './user.entity';

export const ACCOUNT_ACCESS_CHECKS = 'ACCOUNT_ACCESS_CHECKS';

export interface AccountAccessCheck {
  assertAccountAccess(user: User): Promise<void> | void;
}
