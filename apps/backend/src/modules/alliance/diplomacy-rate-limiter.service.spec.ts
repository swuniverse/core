import { BadRequestException } from '@nestjs/common';
import { DiplomacyRateLimiterService } from './diplomacy-rate-limiter.service';

describe('DiplomacyRateLimiterService', () => {
  it('limits request bursts without creating a diplomatic cooldown', async () => {
    let now = 0;
    const limiter = new DiplomacyRateLimiterService(
      undefined,
      () => now,
      1_000,
      2,
    );

    await limiter.check(1, 'war');
    await limiter.check(1, 'war');
    await expect(limiter.check(1, 'war')).rejects.toThrow(BadRequestException);

    now = 1_001;
    await expect(limiter.check(1, 'war')).resolves.toBeUndefined();
  });

  it('tracks command types separately for the same actor', async () => {
    const limiter = new DiplomacyRateLimiterService(
      undefined,
      () => 0,
      1_000,
      1,
    );

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
    const first = new DiplomacyRateLimiterService(
      undefined,
      () => 0,
      1_000,
      1,
      reserve,
    );
    const second = new DiplomacyRateLimiterService(
      undefined,
      () => 0,
      1_000,
      1,
      reserve,
    );

    await first.check(1, 'war');

    await expect(second.check(1, 'war')).rejects.toThrow(BadRequestException);
  });

  it('uses one PostgreSQL upsert reservation per mutation', async () => {
    const query = jest.fn().mockResolvedValue([{ attempts: 1 }]);
    const limiter = new DiplomacyRateLimiterService(
      { query } as never,
      () => 10_000,
      1_000,
      1,
    );

    await limiter.check(42, 'proposal');

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT ("actorId", "command") DO UPDATE'),
      [42, 'proposal', new Date(9_000), new Date(11_000)],
    );
  });
});
