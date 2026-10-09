import { BadRequestException } from '@nestjs/common';
import { AllianceRateLimiterService } from './alliance-rate-limiter.service';

describe('AllianceRateLimiterService', () => {
  const commands = {
    alpha: { windowMs: 1_000, maximumAttempts: 1, message: 'Alpha gedrosselt' },
    beta: { windowMs: 5_000, maximumAttempts: 2, message: 'Beta gedrosselt' },
  };

  it('keeps separate budgets, windows and messages per command group', async () => {
    let now = 0;
    const limiter = AllianceRateLimiterService.forTesting({
      now: () => now,
      commands,
    });
    const check = (command: string) => limiter.check(1, command);

    await check('alpha');
    await expect(check('alpha')).rejects.toThrow('Alpha gedrosselt');
    await expect(check('beta')).resolves.toBeUndefined();
    await expect(check('beta')).resolves.toBeUndefined();
    await expect(check('beta')).rejects.toThrow('Beta gedrosselt');

    now = 1_001;
    await expect(check('alpha')).resolves.toBeUndefined();
    await expect(check('beta')).rejects.toThrow(BadRequestException);
  });

  it('keeps the diplomacy defaults and German message without internal values', async () => {
    const limiter = AllianceRateLimiterService.forTesting({ now: () => 0 });
    for (let i = 0; i < 10; i++) await limiter.check(1, 'war');

    const error = await limiter.check(1, 'war').catch((e: Error) => e);

    expect((error as Error).message).toBe(
      'Zu viele diplomatische Aktionen. Bitte versuche es gleich erneut',
    );
  });

  it('only uses command names that fit the persisted command column', () => {
    for (const name of Object.keys(
      AllianceRateLimiterService.defaultCommands,
    )) {
      expect(name.length).toBeLessThanOrEqual(16);
    }
  });
});
