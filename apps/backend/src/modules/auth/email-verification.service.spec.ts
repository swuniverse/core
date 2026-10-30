import { BadRequestException } from '@nestjs/common';
import { AccountTokenPurpose } from './account-token.entity';
import { AuthService } from './auth.service';

function setup(enabled = true) {
  const user = {
    id: 4, username: 'Leia', email: 'leia@example.test', passwordHash: 'hash',
    refreshToken: null, emailVerifiedAt: null as Date | null, isAdmin: false,
  };
  const userRepo = {
    findOne: jest.fn(async () => null),
    findOneBy: jest.fn(async ({ id }) => id === user.id ? user : null),
    update: jest.fn(async (_id, values) => Object.assign(user, values)),
    save: jest.fn(async (value) => value),
  };
  const tokenService = {
    hasRecentToken: jest.fn(async () => false),
    create: jest.fn(async () => ({ token: 'verification-token', expiresAt: new Date() })),
    consume: jest.fn<
      Promise<{ userId: number; purpose: AccountTokenPurpose } | null>,
      []
    >(async () => ({ userId: user.id, purpose: AccountTokenPurpose.EmailVerification })),
  };
  const mail = {
    isEnabled: jest.fn(() => true),
    sendEmailVerificationMail: jest.fn(async () => true),
    sendWelcomeMail: jest.fn(async () => true),
  };
  const config = { get: jest.fn((key: string) => key === 'EMAIL_VERIFICATION_ENABLED' ? String(enabled) : 'https://game.test') };
  const dataSource = { transaction: jest.fn(async (work) => work({ getRepository: jest.fn(() => userRepo) })) };
  const service = new AuthService(
    userRepo as never, {} as never, {} as never, dataSource as never, {} as never,
    mail as never, {} as never, tokenService as never, config as never,
    { getSettings: jest.fn() } as never,
  );
  return { service, user, userRepo, tokenService, mail };
}

describe('email verification behavior', () => {
  it('advertises the feature flag', () => {
    expect(setup(true).service.features()).toEqual({
      passwordReset: false,
      emailVerification: true,
      accountDeletion: false,
    });
    expect(setup(false).service.features()).toEqual({
      passwordReset: false,
      emailVerification: false,
      accountDeletion: false,
    });
  });

  it('consumes a verification token and welcomes the verified player', async () => {
    const { service, user, tokenService, mail } = setup();

    await expect(service.verifyEmail({ token: 'verification-token' })).resolves.toEqual({
      message: 'E-Mail-Adresse bestätigt',
    });
    expect(tokenService.consume).toHaveBeenCalledWith(
      'verification-token', AccountTokenPurpose.EmailVerification, expect.anything(),
    );
    expect(user.emailVerifiedAt).toBeInstanceOf(Date);
    expect(mail.sendWelcomeMail).toHaveBeenCalledWith(user.email, user.username);
  });

  it('normalizes a replacement email and checks duplicates case-insensitively', async () => {
    const { service, user, userRepo } = setup();

    await service.updateVerificationEmail(user.id, {
      email: '  Leia.New@Example.Test  ',
    });

    expect(userRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.any(Object) }),
    );
    expect(user.email).toBe('leia.new@example.test');
  });

  it('rejects an invalid or expired token', async () => {
    const { service, tokenService } = setup();
    tokenService.consume.mockResolvedValueOnce(null);
    await expect(service.verifyEmail({ token: 'bad' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rate-limits resend to one token every five minutes', async () => {
    const { service, tokenService, mail } = setup();
    tokenService.hasRecentToken.mockResolvedValueOnce(true);

    await service.resendEmailVerification(4);

    expect(tokenService.create).not.toHaveBeenCalled();
    expect(mail.sendEmailVerificationMail).not.toHaveBeenCalled();
  });
});
