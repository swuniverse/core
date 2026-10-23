import { BadRequestException } from '@nestjs/common';
import { SettingsService } from './settings.service';

const createService = (user?: Record<string, unknown>) => {
  const userRepo = {
    findOneBy: jest.fn(async () => user ?? null),
    save: jest.fn(async (value) => value),
  };
  const settingRepo = {
    find: jest.fn(async () => []),
    upsert: jest.fn(async () => undefined),
  };
  return {
    service: new SettingsService(userRepo as any, settingRepo as any),
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
