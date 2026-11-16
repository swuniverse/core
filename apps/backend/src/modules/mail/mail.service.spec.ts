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
  it('contains only the sender hint and messages link', async () => {
    const config = { get: jest.fn(() => 'https://game.test/') };
    const service = Object.assign(Object.create(MailService.prototype), {
      config,
    }) as MailService;
    const send = jest.spyOn(service, 'sendMail').mockResolvedValue(true);
    await service.sendPrivateMessageNotification('han@example.test', 'Leia');
    expect(send).toHaveBeenCalledWith({
      to: 'han@example.test',
      subject: 'Neue Nachricht von Leia',
      text: 'Du hast eine neue persönliche Nachricht von Leia.\n\nhttps://game.test/messages',
    });
  });
});
