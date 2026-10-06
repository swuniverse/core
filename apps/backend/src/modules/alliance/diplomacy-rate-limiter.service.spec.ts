import { BadRequestException } from '@nestjs/common';
import { DiplomacyRateLimiterService } from './diplomacy-rate-limiter.service';

describe('DiplomacyRateLimiterService', () => {
  it('limits request bursts without creating a diplomatic cooldown', () => {
    let now = 0;
    const limiter = new DiplomacyRateLimiterService(() => now, 1_000, 2);

    limiter.check(1, 'war');
    limiter.check(1, 'war');
    expect(() => limiter.check(1, 'war')).toThrow(BadRequestException);

    now = 1_001;
    expect(() => limiter.check(1, 'war')).not.toThrow();
  });

  it('tracks command types separately for the same actor', () => {
    const limiter = new DiplomacyRateLimiterService(() => 0, 1_000, 1);

    limiter.check(1, 'war');
    expect(() => limiter.check(1, 'proposal')).not.toThrow();
  });
});
