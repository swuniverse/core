import { MailService } from './mail.service';

describe('MailService password reset mail', () => {
  it('dispatches a reset link without logging or transforming its token', async () => {
    const service = Object.create(MailService.prototype) as MailService;
    const sendMail = jest.spyOn(service, 'sendMail').mockResolvedValue(true);
    const resetUrl = 'https://game.test/reset-password?token=secret-token';

    await service.sendPasswordResetMail('leia@example.test', 'Leia <Organa>', resetUrl);

    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'leia@example.test',
      subject: expect.stringContaining('Passwort'),
      text: expect.stringContaining(resetUrl),
      html: expect.stringContaining(resetUrl),
    }));
    expect(sendMail.mock.calls[0][0].html).toContain('Leia &lt;Organa&gt;');
  });
});
