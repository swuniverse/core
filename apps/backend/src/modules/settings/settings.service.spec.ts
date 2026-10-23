import { BadRequestException } from '@nestjs/common';
import { SettingsService } from './settings.service';

const createService = () => {
  const settingRepo = {
    find: jest.fn(async () => []),
    upsert: jest.fn(async () => undefined),
  };
  return {
    service: new SettingsService({} as any, settingRepo as any),
    settingRepo,
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
