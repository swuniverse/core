import { NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AccountTokenPurpose } from './account-token.entity';
import { AuthService } from './auth.service';

const MESSAGE = {
  message: 'Falls ein Konto existiert, wurde eine E-Mail verschickt',
};

function setup(options: { enabled?: boolean; mail?: boolean } = {}) {
  const user = {
    id: 4,
    username: 'Leia',
    email: 'leia@example.test',
    passwordHash: 'old',
    refreshToken: 'active',
  };
  const userRepo = {
    findOne: jest.fn(async ({ where }) =>
      JSON.stringify(where).toLowerCase().includes('missing') ? null : user,
    ),
    update: jest.fn(async (_id, values) => Object.assign(user, values)),
  };
  const tokenService = {
    hasRecentToken: jest.fn(async () => false),
    create: jest.fn(async () => ({
      token: 'plain-secret-token',
      expiresAt: new Date(),
    })),
    consume: jest.fn<
      Promise<{ userId: number; purpose: AccountTokenPurpose } | null>,
      []
    >(async () => ({
      userId: user.id,
      purpose: AccountTokenPurpose.PasswordReset,
    })),
  };
  const mail = {
    isEnabled: jest.fn(() => options.mail ?? true),
    sendPasswordResetMail: jest.fn(async () => true),
  };
  const config = {
    get: jest.fn((key: string) =>
      key === 'PASSWORD_RESET_ENABLED'
        ? String(options.enabled ?? true)
        : 'https://game.test',
    ),
  };
  const dataSource = {
    transaction: jest.fn(async (work) =>
      work({ getRepository: jest.fn(() => userRepo) }),
    ),
  };
  const service = new AuthService(
    userRepo as never,
    {} as never,
    {} as never,
    dataSource as never,
    {} as never,
    mail as never,
    {} as never,
    tokenService as never,
    config as never,
    { getSettings: jest.fn(async () => ({ default_view: 'maindesk' })) } as never,
  );
  return { service, user, userRepo, tokenService, mail };
}

describe('password reset behavior', () => {
  it('returns the same response for an existing or unknown case-insensitive login', async () => {
    const { service, userRepo, mail } = setup();
    await expect(
      service.lostPassword({ login: 'LEIA@EXAMPLE.TEST' }),
    ).resolves.toEqual(MESSAGE);
    userRepo.findOne.mockResolvedValueOnce(null);
    await expect(service.lostPassword({ login: 'missing' })).resolves.toEqual(
      MESSAGE,
    );
    expect(mail.sendPasswordResetMail).toHaveBeenCalledTimes(1);
  });

  it('silently rate-limits requests for the same account for five minutes', async () => {
    const { service, tokenService, mail } = setup();
    tokenService.hasRecentToken.mockResolvedValueOnce(true);
    await service.lostPassword({ login: 'Leia' });
    expect(tokenService.create).not.toHaveBeenCalled();
    expect(mail.sendPasswordResetMail).not.toHaveBeenCalled();
  });

  it('returns 404 when the feature flag or SMTP is unavailable', async () => {
    await expect(
      setup({ enabled: false }).service.lostPassword({ login: 'Leia' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      setup({ mail: false }).service.lostPassword({ login: 'Leia' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(setup().service.features()).toEqual({
      passwordReset: true,
      emailVerification: false,
    });
  });

  it('sets a registered-strength password, clears sessions, and consumes the token', async () => {
    const { service, user, tokenService } = setup();
    await service.resetPassword({
      token: 'plain-secret-token',
      password: 'new-password',
    });
    expect(await bcrypt.compare('new-password', user.passwordHash)).toBe(true);
    expect(user.refreshToken).toBeNull();
    expect(tokenService.consume).toHaveBeenCalledWith(
      'plain-secret-token',
      AccountTokenPurpose.PasswordReset,
      expect.anything(),
    );
  });

  it('rejects invalid, expired, or already-used tokens with the canonical error', async () => {
    const { service, tokenService } = setup();
    tokenService.consume.mockResolvedValueOnce(null);
    await expect(
      service.resetPassword({ token: 'invalid', password: 'new-password' }),
    ).rejects.toMatchObject({
      message: 'Der Link ist ungültig oder abgelaufen',
    });
  });
});
