import { BadRequestException, Injectable } from '@nestjs/common';

/**
 * Short request-burst protection for diplomacy commands. It deliberately does
 * not model any diplomatic cooldown, expiry, or minimum relationship period.
 */
@Injectable()
export class DiplomacyRateLimiterService {
  private readonly attempts = new Map<string, number[]>();

  constructor(
    private readonly now: () => number = () => Date.now(),
    private readonly windowMs = 10_000,
    private readonly maximumAttempts = 10,
  ) {}

  check(actorId: number, command: 'war' | 'proposal' | 'change'): void {
    const key = `${actorId}:${command}`;
    const threshold = this.now() - this.windowMs;
    const recent = (this.attempts.get(key) ?? []).filter(
      (attempt) => attempt > threshold,
    );
    if (recent.length >= this.maximumAttempts) {
      throw new BadRequestException(
        'Zu viele diplomatische Aktionen. Bitte versuche es gleich erneut',
      );
    }
    recent.push(this.now());
    this.attempts.set(key, recent);
  }
}
