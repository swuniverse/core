import { PrivateMessageNotificationService } from './private-message-notification.service';
import { MessagingService } from './messaging.service';

describe('Private message email', () => {
  const mail = {
    isEnabled: jest.fn(),
    sendPrivateMessageNotification: jest.fn(),
  };
  const settings = { getBoolean: jest.fn() };
  const users = { findOneBy: jest.fn() };
  let service: PrivateMessageNotificationService;
  beforeEach(() => {
    jest.resetAllMocks();
    mail.isEnabled.mockReturnValue(true);
    settings.getBoolean.mockResolvedValue(true);
    users.findOneBy.mockImplementation(async ({ id }) => ({
      id,
      username: 'Leia',
      email: 'han@example.test',
      isNpc: false,
    }));
    service = new PrivateMessageNotificationService(
      mail as never,
      settings as never,
      users as never,
    );
  });
  it('still passes mail to the local log fallback without SMTP', async () => {
    mail.isEnabled.mockReturnValue(false);
    await service.notify(1, 2);
    expect(mail.sendPrivateMessageNotification).toHaveBeenCalledTimes(1);
  });
  it('mails only the opted-in account', async () => {
    await service.notify(1, 2);
    expect(mail.sendPrivateMessageNotification).toHaveBeenCalledWith(
      'han@example.test',
      'Leia',
    );
    settings.getBoolean.mockResolvedValue(false);
    await service.notify(1, 2);
    expect(mail.sendPrivateMessageNotification).toHaveBeenCalledTimes(1);
  });
  it('excludes NPC senders', async () => {
    users.findOneBy.mockResolvedValue({ isNpc: true });
    await service.notify(1, 2);
    expect(mail.sendPrivateMessageNotification).not.toHaveBeenCalled();
  });
  it('keeps delivery independent of pending or rejected SMTP', async () => {
    let rejectMail!: (reason: Error) => void;
    mail.sendPrivateMessageNotification.mockReturnValue(
      new Promise((_, reject) => {
        rejectMail = reject;
      }),
    );
    const repo = {
      create: (v: unknown) => v,
      save: jest.fn(async (v) => ({ id: 42, ...v })),
    };
    const messaging = new MessagingService(
      repo as never,
      users as never,
      { countEvent: jest.fn() } as never,
      { emitToUser: jest.fn() } as never,
      settings as never,
      service,
    );
    await expect(
      messaging.send(1, 2, 'secret subject', 'secret body'),
    ).resolves.toMatchObject({ id: 42 });
    await Promise.resolve();
    rejectMail(new Error('SMTP failed'));
    await Promise.resolve();
    expect(repo.save).toHaveBeenCalledTimes(1);
  });
  it('does not notify for system or NPC trade delivery', async () => {
    const notification = { notify: jest.fn() };
    const repo = { create: (v: unknown) => v, save: jest.fn(async (v) => v) };
    const messaging = new MessagingService(
      repo as never,
      users as never,
      {} as never,
      { emitToUser: jest.fn() } as never,
      settings as never,
      notification as never,
    );
    await messaging.sendSystem(2, 'System', 'Text');
    users.findOneBy.mockImplementation(async ({ id }) => ({
      id,
      isNpc: id === 1,
    }));
    await messaging.sendNpcTrade(1, 2, 'Handel', 'Text');
    expect(notification.notify).not.toHaveBeenCalled();
  });
});
