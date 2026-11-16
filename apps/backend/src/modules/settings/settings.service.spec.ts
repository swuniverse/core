import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { SettingsService } from './settings.service';
import { AccountDeletionMark, RpgBehavior } from '@swuniverse/shared';
import { AccountTokenPurpose } from '../auth/account-token.entity';

const createService = (
  user?: Record<string, unknown>,
  emailBlocklist = { isBlocked: jest.fn(async () => false) },
) => {
  const userRepo = {
    findOne: jest.fn<Promise<Record<string, unknown> | null>, []>(
      async () => null,
    ),
    findOneBy: jest.fn(async () => user ?? null),
    save: jest.fn(async (value) => value),
  };
  const settingRepo = {
    find: jest.fn(async () => []),
    upsert: jest.fn(async () => undefined),
  };
  const tokenService = {
    create: jest.fn(async () => ({
      token: 'deletion-token',
      expiresAt: new Date(),
    })),
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
  it('defaults to no territorial color and saves normalized colors or an empty reset', async () => {
    const { service, settingRepo } = createService();

    await expect(service.getSettings(7)).resolves.toMatchObject({ rgb_code: '' });
    await service.updateSettings(7, { rgb_code: '#A1b2C3' });
    expect(settingRepo.upsert).toHaveBeenLastCalledWith(
      { userId: 7, key: 'rgb_code', value: '#a1b2c3' },
      ['userId', 'key'],
    );
    await service.updateSettings(7, { rgb_code: '' });
    expect(settingRepo.upsert).toHaveBeenLastCalledWith(
      { userId: 7, key: 'rgb_code', value: '' },
      ['userId', 'key'],
    );
  });

  it.each(['#123', '#1234567', '#xyz123', '123456', ' #123456', '#123456\n', null, 123456])(
    'rejects invalid territorial color %p without saving any settings',
    async (value) => {
      const { service, settingRepo } = createService();

      await expect(
        service.updateSettings(7, { default_view: 'colonies', rgb_code: value as string }),
      ).rejects.toThrow(new BadRequestException('Ungültiger Farbcode'));
      expect(settingRepo.upsert).not.toHaveBeenCalled();
    },
  );

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

  it('defaults RPG behavior to unset and accepts only the four shared values', async () => {
    const { service, settingRepo } = createService();

    await expect(service.getSettings(7)).resolves.toMatchObject({
      rpg_behavior: String(RpgBehavior.NOT_SET),
    });
    for (const behavior of [
      RpgBehavior.NOT_SET,
      RpgBehavior.ACTIVE,
      RpgBehavior.OPEN,
      RpgBehavior.NONE,
    ]) {
      await service.updateSettings(7, { rpg_behavior: String(behavior) });
    }
    expect(settingRepo.upsert).toHaveBeenCalledTimes(4);
    await expect(
      service.updateSettings(7, { rpg_behavior: '4' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.updateSettings(7, { rpg_behavior: '1.5' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(settingRepo.upsert).toHaveBeenCalledTimes(4);
  });

  it('returns messenger style disabled by default and validates its boolean values', async () => {
    const { service, settingRepo } = createService();

    await expect(service.getSettings(7)).resolves.toMatchObject({
      inbox_messenger_style: '0',
    });
    await service.updateSettings(7, { inbox_messenger_style: '1' });

    expect(settingRepo.upsert).toHaveBeenCalledWith(
      { userId: 7, key: 'inbox_messenger_style', value: '1' },
      ['userId', 'key'],
    );
    await expect(
      service.updateSettings(7, { inbox_messenger_style: 'enabled' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([
    ['email_notification', 'yes'],
    ['storage_notification', '2'],
    ['show_pm_read_receipt', 'true'],
    ['default_view', 'admin'],
  ])('rejects invalid %s values', async (key, value) => {
    const { service, settingRepo } = createService();

    await expect(
      service.updateSettings(7, { [key]: value }),
    ).rejects.toBeInstanceOf(BadRequestException);
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

      await expect(
        service.changeEmail(user.id, 'secret', email),
      ).rejects.toThrow('Die E-Mail-Adresse ist ungültig');
      expect(userRepo.save).not.toHaveBeenCalled();
    },
  );

  it('normalizes the email before checking and saving', async () => {
    const changedUser = { ...user };
    const { service, userRepo, emailBlocklist } = createService(changedUser);

    await service.changeEmail(user.id, 'secret', '  Leia@Example.Test  ');

    expect(userRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.any(Object) }),
    );
    expect(emailBlocklist.isBlocked).toHaveBeenCalledWith('leia@example.test');
    expect(changedUser.email).toBe('leia@example.test');
    expect(userRepo.save).toHaveBeenCalledWith(changedUser);
  });

  it('rejects a duplicate email regardless of case', async () => {
    const { service, userRepo } = createService({ ...user });
    userRepo.findOne.mockResolvedValueOnce({
      id: 8,
      email: 'LEIA@example.test',
    });

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

    await expect(service.activateVacation(7)).rejects.toThrow(
      '1 days remaining',
    );
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


it('defaults public online visibility to on and only accepts boolean strings', async () => {
  const { service, settingRepo } = createService();
  expect((await service.getSettings(1)).show_online_status).toBe('1');
  await service.updateSettings(1, { show_online_status: '0' });
  expect(settingRepo.upsert).toHaveBeenCalledWith({ userId: 1, key: 'show_online_status', value: '0' }, ['userId', 'key']);
  await expect(service.updateSettings(1, { show_online_status: 'false' })).rejects.toThrow(BadRequestException);
});


it('accepts only the interface palette allowlist with a default palette', async () => {
  const { service, settingRepo } = createService();
  expect((await service.getSettings(1)).css_color_sheet).toBe('default');
  for (const value of ['default', 'contrast', 'faction']) await service.updateSettings(1, { css_color_sheet: value });
  expect(settingRepo.upsert).toHaveBeenCalledTimes(3);
  for (const value of ['custom', '<style>', '', 'CONTRAST']) await expect(service.updateSettings(1, { css_color_sheet: value })).rejects.toThrow(BadRequestException);
});


it.each(['fleet_fixed_default', 'reactor_auto_carryover_default'])('validates creation default %s', async key => {
  const { service, settingRepo } = createService();
  expect((await service.getSettings(1))[key]).toBe('0');
  for (const value of ['0', '1']) await service.updateSettings(1, { [key]: value });
  expect(settingRepo.upsert).toHaveBeenCalledTimes(2);
  await expect(service.updateSettings(1, { [key]: 'true' })).rejects.toThrow(BadRequestException);
});


describe('Player-name grammar and uniqueness', () => {
  it('stores formatted markup separately from the visible name and counts visible characters', async () => {
    const { service, userRepo } = createService({ id: 7, username: 'login', description: null });
    const name = '[color=#ff0000][b][i]' + 'x'.repeat(60) + '[/i][/b][/color]';
    expect(await service.updateProfile(7, { displayName: name })).toMatchObject({ displayName: 'x'.repeat(60), displayNameMarkup: name });
    expect(userRepo.save).toHaveBeenCalledWith(expect.objectContaining({ displayName: 'x'.repeat(60) }));
  });
  it.each(['[url=https://evil.test]Leia[/url]', '[img]Leia[/img]', '[u]Leia[/u]', '[b]Le[/b]', '[b]Leia[/i]', '[b]Leia', '[color=expression(x)]Leia[/color]', '[b]' + 'x'.repeat(61) + '[/b]'])('rejects invalid names: %s', async displayName => {
    const { service, userRepo } = createService({ id: 7, username: 'login' });
    await expect(service.updateProfile(7, { displayName })).rejects.toThrow(BadRequestException);
    expect(userRepo.save).not.toHaveBeenCalled();
  });
  it('checks uniqueness by plain name and permits removing formatting', async () => {
    const { service, userRepo } = createService({ id: 7, username: 'login' });
    userRepo.findOne.mockResolvedValueOnce({ id: 8, displayName: 'Leia' });
    await expect(service.updateProfile(7, { displayName: '[b]Leia[/b]' })).rejects.toThrow('bereits vergeben');
    await expect(service.updateProfile(7, { displayName: '' })).resolves.toMatchObject({ displayName: null, displayNameMarkup: null });
  });
});
