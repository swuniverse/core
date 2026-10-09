import { Logger } from '@nestjs/common';
import {
  DiplomacyNotificationDispatcherService,
  type DiplomacyNotificationRetry,
} from './diplomacy-notification-dispatcher.service';

function dispatcherWith(
  retryDiplomacyNotifications: jest.MockedFunction<
    DiplomacyNotificationRetry['retryDiplomacyNotifications']
  >,
) {
  return new DiplomacyNotificationDispatcherService({
    retryDiplomacyNotifications,
  });
}

function loggerOf(dispatcher: DiplomacyNotificationDispatcherService) {
  return (dispatcher as unknown as { logger: Logger }).logger;
}

describe('DiplomacyNotificationDispatcherService', () => {
  it('coalesces overlapping scheduled runs', async () => {
    let release!: () => void;
    const retryDiplomacyNotifications = jest
      .fn()
      .mockImplementationOnce(
        () => new Promise<void>((resolve) => (release = resolve)),
      )
      .mockResolvedValueOnce(undefined);
    const dispatcher = dispatcherWith(retryDiplomacyNotifications);

    const first = dispatcher.dispatch();
    const second = dispatcher.dispatch();
    expect(retryDiplomacyNotifications).toHaveBeenCalledTimes(1);

    release();
    await Promise.all([first, second]);

    await dispatcher.dispatch();
    expect(retryDiplomacyNotifications).toHaveBeenCalledTimes(2);
  });

  it('logs a delivery failure and leaves a later interval free to retry', async () => {
    const retryDiplomacyNotifications = jest
      .fn()
      .mockRejectedValueOnce(new Error('messaging unavailable'))
      .mockResolvedValueOnce(undefined);
    const dispatcher = dispatcherWith(retryDiplomacyNotifications);
    const error = jest
      .spyOn(loggerOf(dispatcher), 'error')
      .mockImplementation();

    await expect(dispatcher.dispatch()).resolves.toBeUndefined();
    await expect(dispatcher.dispatch()).resolves.toBeUndefined();

    expect(retryDiplomacyNotifications).toHaveBeenCalledTimes(2);
    expect(error).toHaveBeenCalledWith(
      'Failed to retry pending alliance diplomacy notifications',
      expect.stringContaining('messaging unavailable'),
    );
  });
});
