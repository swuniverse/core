import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { SettingsService } from './settings.service';
import { AccountDeletionMark } from '@swuniverse/shared';
import { AccountTokenPurpose } from '../auth/account-token.entity';

const createService = (
  user?: Record<string, unknown>,
  emailBlocklist = { isBlocked: jest.fn(async () => false) },
) => {
  const userRepo = {
    findOne: jest.fn<Promise<Record<string, unknown> | null>, []>(async () => null),
    findOneBy: jest.fn(async () => user ?? null),
    save: jest.fn(async (value) => value),
  };
  const settingRepo = {
    find: jest.fn(async () => []),
    upsert: jest.fn(async () => undefined),
  };
  const tokenService = {
    create: jest.fn(async () => ({ token: 'deletion-token', expiresAt: new Date() })),
  };
  const mail = {
    sendAccountDeletionMail: jest.fn(async () => true),
  };
  const config = {
    get: jest.fn<string, [string]>((key: string) =>
      key === 'ACCOUNT_DELETION_ENABLED' ? 'true' : 'https://game.test',
    ),
  };
  return {
    service: new SettingsService(
      userRepo as any,
      settingRepo as any,
      emailBlocklist,
      tokenService as any,
      mail as any,
      config as any,
    ),
    tokenService,
    mail,
    config,
    emailBlocklist,
    settingRepo,
    userRepo,
  };
};

describe('SettingsService settings validation', () => {
  it('returns profile visit opt-out disabled by default and accepts enabling it', async () => {
    const { service, settingRepo } = createService();

    await expect(service.getSettings(7)).resolves.toMatchObject({
      profile_visit_optout: '0',
    });
    await service.updateSettings(7, { profile_visit_optout: '1' });

    expect(settingRepo.upsert).toHaveBeenCalledWith(
      { userId: 7, key: 'profile_visit_optout', value: '1' },
      ['userId', 'key'],
    );
  });

  it.each([
    ['email_notification', 'yes'],
    ['storage_notification', '2'],
    ['show_pm_read_receipt', 'true'],
    ['default_view', 'admin'],
  ])('rejects invalid %s values', async (key, value) => {
    const { service, settingRepo } = createService();

    await expect(service.updateSettings(7, { [key]: value })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(settingRepo.upsert).not.toHaveBeenCalled();
  });

  it('accepts every supported default view', async () => {
    const { service, settingRepo } = createService();
    const views = [
      'maindesk',
      'colonies',
      'spacecraft',
      'starmap',
      'messages',
      'research',
      'holonet',
    ];

    for (const defaultView of views) {
      await service.updateSettings(7, { default_view: defaultView });
    }

    expect(settingRepo.upsert).toHaveBeenCalledTimes(views.length);
  });
});

describe('SettingsService email changes', () => {
  const user = {
    id: 7,
    email: 'old@example.test',
    passwordHash: 'hash',
  };

  beforeEach(() => {
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
  });

  afterEach(() => jest.restoreAllMocks());

  it.each(['not-an-email', `${'a'.repeat(244)}@example.test`])(
    'rejects invalid email %s',
    async (email) => {
      const { service, userRepo } = createService({ ...user });

      await expect(service.changeEmail(user.id, 'secret', email)).rejects.toThrow(
        'Die E-Mail-Adresse ist ungültig',
      );
      expect(userRepo.save).not.toHaveBeenCalled();
    },
  );

  it('normalizes the email before checking and saving', async () => {
    const changedUser = { ...user };
    const { service, userRepo, emailBlocklist } = createService(changedUser);

    await service.changeEmail(user.id, 'secret', '  Leia@Example.Test  ');

    expect(userRepo.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: expect.any(Object) }));
    expect(emailBlocklist.isBlocked).toHaveBeenCalledWith('leia@example.test');
    expect(changedUser.email).toBe('leia@example.test');
    expect(userRepo.save).toHaveBeenCalledWith(changedUser);
  });

  it('rejects a duplicate email regardless of case', async () => {
    const { service, userRepo } = createService({ ...user });
    userRepo.findOne.mockResolvedValueOnce({ id: 8, email: 'LEIA@example.test' });

    await expect(
      service.changeEmail(user.id, 'secret', 'leia@EXAMPLE.test'),
    ).rejects.toThrow('Die E-Mail-Adresse wird bereits verwendet');
  });

  it('rejects an email blocked by the injected port', async () => {
    const blocklist = { isBlocked: jest.fn(async () => true) };
    const { service } = createService({ ...user }, blocklist);

    await expect(
      service.changeEmail(user.id, 'secret', 'blocked@example.test'),
    ).rejects.toThrow('Die E-Mail-Adresse ist blockiert');
  });
});

describe('SettingsService account deletion', () => {
  beforeEach(() => {
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
  });

  afterEach(() => jest.restoreAllMocks());

  it('marks a request and sends a dedicated 48-hour confirmation link', async () => {
    const user = {
      id: 7,
      username: 'Leia',
      email: 'leia@example.test',
      passwordHash: 'hash',
      deletionMark: AccountDeletionMark.None,
    };
    const { service, tokenService, mail } = createService(user);

    await service.requestDeletion(user.id, 'secret');

    expect(user.deletionMark).toBe(AccountDeletionMark.Requested);
    expect(tokenService.create).toHaveBeenCalledWith(
      user.id,
      AccountTokenPurpose.AccountDeletion,
      48 * 60 * 60 * 1000,
    );
    expect(mail.sendAccountDeletionMail).toHaveBeenCalledWith(
      user.email,
      user.username,
      'https://game.test/confirm-deletion?token=deletion-token',
    );
  });

  it('keeps the existing request-only behavior while the feature is disabled', async () => {
    const user = {
      id: 7,
      passwordHash: 'hash',
      deletionMark: AccountDeletionMark.None,
    };
    const setup = createService(user);
    setup.config.get.mockImplementation((key: string) =>
      key === 'ACCOUNT_DELETION_ENABLED' ? 'false' : 'https://game.test',
    );

    await setup.service.requestDeletion(user.id, 'secret');

    expect(user.deletionMark).toBe(AccountDeletionMark.Requested);
    expect(setup.tokenService.create).not.toHaveBeenCalled();
    expect(setup.mail.sendAccountDeletionMail).not.toHaveBeenCalled();
  });

  it('revokes only a pending deletion request', async () => {
    const user = { deletionMark: AccountDeletionMark.Requested };
    const { service, userRepo } = createService(user);

    await service.revokeDeletion(7);

    expect(user.deletionMark).toBe(AccountDeletionMark.None);
    expect(userRepo.save).toHaveBeenCalledWith(user);
  });
});

describe('SettingsService vacation cooldown', () => {
  it('counts seven days from the last activation', async () => {
    const requestedAt = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
    const user = {
      vacationMode: false,
      vacationRequestedAt: requestedAt,
      vacationStartedAt: null,
      vacationEndedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      refreshToken: 'token',
    };
    const { service, userRepo } = createService(user);

    await expect(service.activateVacation(7)).rejects.toThrow('1 days remaining');
    expect(userRepo.save).not.toHaveBeenCalled();
  });

  it('does not restart the cooldown when vacation ends', async () => {
    const requestedAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const user = {
      vacationMode: false,
      vacationRequestedAt: requestedAt,
      vacationStartedAt: null,
      vacationEndedAt: new Date(),
      refreshToken: 'token',
    };
    const { service, userRepo } = createService(user);

    await service.activateVacation(7);

    expect(user.vacationMode).toBe(true);
    expect(user.vacationRequestedAt).not.toBe(requestedAt);
    expect(user.refreshToken).toBeNull();
    expect(userRepo.save).toHaveBeenCalledWith(user);
  });
});
