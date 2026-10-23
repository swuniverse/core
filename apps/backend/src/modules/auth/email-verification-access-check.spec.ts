import { ForbiddenException } from '@nestjs/common';
import { EmailVerificationAccessCheck } from './email-verification-access-check';

function user(values = {}) {
  return { isAdmin: false, emailVerifiedAt: null, ...values } as never;
}

describe('EmailVerificationAccessCheck', () => {
  it('rejects unverified players with the stable error code', () => {
    const check = new EmailVerificationAccessCheck({ get: () => 'true' } as never);
    expect(() => check.assertAccountAccess(user())).toThrow(ForbiddenException);
    try { check.assertAccountAccess(user()); } catch (error) {
      expect((error as ForbiddenException).getResponse()).toMatchObject({ code: 'EMAIL_NOT_VERIFIED' });
    }
  });

  it('allows verified users, admins, and all users while disabled', () => {
    const enabled = new EmailVerificationAccessCheck({ get: () => 'true' } as never);
    expect(() => enabled.assertAccountAccess(user({ emailVerifiedAt: new Date() }))).not.toThrow();
    expect(() => enabled.assertAccountAccess(user({ isAdmin: true }))).not.toThrow();
    const disabled = new EmailVerificationAccessCheck({ get: () => 'false' } as never);
    expect(() => disabled.assertAccountAccess(user())).not.toThrow();
  });
});
