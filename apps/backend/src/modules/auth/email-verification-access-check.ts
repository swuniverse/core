import { ForbiddenException, Injectable } from '@nestjs/common';
import { AccountAccessCheck } from './account-access-check';
import { User } from './user.entity';

export const EMAIL_NOT_VERIFIED_ERROR_CODE = 'EMAIL_NOT_VERIFIED';

@Injectable()
export class EmailVerificationAccessCheck implements AccountAccessCheck {
  assertAccountAccess(user: User): void {
    if (
      user.isAdmin ||
      user.emailVerifiedAt
    ) {
      return;
    }
    throw new ForbiddenException({
      code: EMAIL_NOT_VERIFIED_ERROR_CODE,
      message: 'Bitte bestätige zuerst deine E-Mail-Adresse',
    });
  }
}
