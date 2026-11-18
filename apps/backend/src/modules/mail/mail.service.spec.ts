import { Logger } from '@nestjs/common';
import { MailService } from './mail.service';

describe('MailService password reset mail', () => {
  it('dispatches a reset link without logging or transforming its token', async () => {
    const service = Object.create(MailService.prototype) as MailService;
    const sendMail = jest.spyOn(service, 'sendMail').mockResolvedValue(true);
    const resetUrl = 'https://game.test/reset-password?token=secret-token';

    await service.sendPasswordResetMail(
      'leia@example.test',
      'Leia <Organa>',
      resetUrl,
    );

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'leia@example.test',
        subject: expect.stringContaining('Passwort'),
        text: expect.stringContaining(resetUrl),
        html: expect.stringContaining(resetUrl),
      }),
    );
    expect(sendMail.mock.calls[0][0].html).toContain('Leia &lt;Organa&gt;');
  });
});

describe('Private message mail content', () => {
  it('contains the canonical sender subject and the entire plain PM text', async () => {
    const service = Object.create(MailService.prototype) as MailService;
    const send = jest.spyOn(service, 'sendMail').mockResolvedValue(true);
    await service.sendPrivateMessageNotification('han@example.test', 'Leia', 'Hallo Han!\nEine Nachricht.');
    expect(send).toHaveBeenCalledWith({
      to: 'han@example.test', subject: 'Neue Privatnachricht von Spieler Leia', text: 'Hallo Han!\nEine Nachricht.',
    });
  });
});


describe('MailService without SMTP', () => {
  afterEach(() => jest.restoreAllMocks());

  it('starts locally and logs complete mail content including action links', async () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const service = new MailService({ get: () => undefined } as never);
    expect(service.isEnabled()).toBe(false);
    await service.sendPasswordResetMail('leia@example.test', 'Leia', 'http://localhost:5173/reset-password?token=local-token');
    expect(log).toHaveBeenCalledWith(expect.stringContaining('http://localhost:5173/reset-password?token=local-token'));
    expect(log).toHaveBeenCalledWith(expect.stringContaining('leia@example.test'));
  });

  it('reports missing SMTP at production startup and never logs action tokens', async () => {
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const service = new MailService({ get: (key: string) => key === 'NODE_ENV' ? 'production' : undefined } as never);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('SMTP not configured'));
    await service.sendVerificationMail('leia@example.test', 'Leia', 'secret-token');
    expect(log).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalledWith(expect.stringContaining('secret-token'));
  });
});
