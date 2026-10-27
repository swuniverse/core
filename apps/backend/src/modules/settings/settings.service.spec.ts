import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { SettingsService } from './settings.service';

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
  return {
    service: new SettingsService(
      userRepo as any,
      settingRepo as any,
      emailBlocklist,
    ),
    emailBlocklist,
    settingRepo,
    userRepo,
  };
};

describe('SettingsService settings validation', () => {
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
