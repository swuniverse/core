import { BadRequestException } from '@nestjs/common';
import { DiplomacyRateLimiterService } from './diplomacy-rate-limiter.service';

describe('DiplomacyRateLimiterService', () => {
  it('limits request bursts without creating a diplomatic cooldown', async () => {
    let now = 0;
    const limiter = DiplomacyRateLimiterService.forTesting({
      now: () => now,
      windowMs: 1_000,
      maximumAttempts: 2,
    });

    await limiter.check(1, 'war');
    await limiter.check(1, 'war');
    await expect(limiter.check(1, 'war')).rejects.toThrow(BadRequestException);

    now = 1_001;
    await expect(limiter.check(1, 'war')).resolves.toBeUndefined();
  });

  it('tracks command types separately for the same actor', async () => {
    const limiter = DiplomacyRateLimiterService.forTesting({
      now: () => 0,
      windowMs: 1_000,
      maximumAttempts: 1,
    });

    await limiter.check(1, 'war');
    await expect(limiter.check(1, 'proposal')).resolves.toBeUndefined();
  });

  it('shares a durable burst budget across independently constructed limiters', async () => {
    const attempts = new Map<string, number[]>();
    const reserve = async (key: string, now: number, windowMs: number) => {
      const recent = (attempts.get(key) ?? []).filter(
        (attempt) => attempt > now - windowMs,
      );
      recent.push(now);
      attempts.set(key, recent);
      return recent.length;
    };
    const first = DiplomacyRateLimiterService.forTesting({
      now: () => 0,
      windowMs: 1_000,
      maximumAttempts: 1,
      reserveAttempt: reserve,
    });
    const second = DiplomacyRateLimiterService.forTesting({
      now: () => 0,
      windowMs: 1_000,
      maximumAttempts: 1,
      reserveAttempt: reserve,
    });

    await first.check(1, 'war');

    await expect(second.check(1, 'war')).rejects.toThrow(BadRequestException);
  });

  it('uses one PostgreSQL upsert reservation per mutation', async () => {
    const query = jest.fn().mockResolvedValue([{ attempts: 1 }]);
    const limiter = DiplomacyRateLimiterService.forTesting(
      {
        now: () => 10_000,
        windowMs: 1_000,
        maximumAttempts: 1,
      },
      { query } as never,
    );

    await limiter.check(42, 'proposal');

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT ("actorId", "command") DO UPDATE'),
      [42, 'proposal', new Date(9_000), new Date(11_000)],
    );
  });
});
