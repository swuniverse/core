import { TickFailureMailService } from './tick-failure-mail.service';
import { GameTickState, GameTickStatus, GameTickType } from './entities/game-tick-state.entity';

describe('tick failure mail', () => {
  const run = (type: GameTickType, status = GameTickStatus.FAILED) => ({
    tickType: type, status, tickNumber: 42, completedAt: new Date('2026-11-17T12:00:00Z'), error: 'Error: broken\n  at worker',
  }) as GameTickState;

  it.each(Object.values(GameTickType))('mails the configured admin with type, time and stack for %s', async type => {
    const sendMail = jest.fn(async (_input: { to: string; subject: string; text: string }) => true);
    const service = new TickFailureMailService({ get: () => 'admin@example.test' } as never, { sendMail } as never);
    await service.notify(run(type));
    expect(sendMail).toHaveBeenCalledWith({ to: 'admin@example.test', subject: expect.stringContaining(type), text: expect.stringContaining('2026-11-17T12:00:00.000Z') });
    expect(sendMail.mock.calls[0][0].text).toContain('Error: broken\n  at worker');
  });

  it('ignores successful runs or absent admin configuration', async () => {
    const sendMail = jest.fn();
    const service = new TickFailureMailService({ get: () => undefined } as never, { sendMail } as never);
    await service.notify(run(GameTickType.MAIN));
    const configured = new TickFailureMailService({ get: () => 'admin@example.test' } as never, { sendMail } as never);
    await configured.notify(run(GameTickType.MAIN, GameTickStatus.COMPLETED));
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('never replaces a tick failure with an SMTP failure', async () => {
    const service = new TickFailureMailService({ get: () => 'admin@example.test' } as never, { sendMail: jest.fn(async () => { throw new Error('SMTP down'); }) } as never);
    await expect(service.notify(run(GameTickType.MAIN))).resolves.toBeUndefined();
  });
});
