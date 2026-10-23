import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccountAccessCheck } from './account-access-check';
import { User } from './user.entity';

export const EMAIL_NOT_VERIFIED_ERROR_CODE = 'EMAIL_NOT_VERIFIED';

@Injectable()
export class EmailVerificationAccessCheck implements AccountAccessCheck {
  constructor(private readonly config: ConfigService) {}

  assertAccountAccess(user: User): void {
    if (
      this.config.get<string>('EMAIL_VERIFICATION_ENABLED') !== 'true' ||
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
