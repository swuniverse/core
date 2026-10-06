import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export type DiplomacyRateLimitCommand = 'war' | 'proposal' | 'change';

type ReserveAttempt = (
  key: string,
  now: number,
  windowMs: number,
) => Promise<number>;

/**
 * Short request-burst protection for diplomacy commands. Production reservations
 * are atomically persisted in PostgreSQL, so every application instance shares
 * the same budget. It deliberately does not model diplomatic cooldowns, expiry,
 * or minimum relationship periods.
 */
@Injectable()
export class DiplomacyRateLimiterService {
  private readonly fallbackAttempts = new Map<string, number[]>();

  constructor(
    @Optional() @InjectDataSource() private readonly dataSource?: DataSource,
    private readonly now: () => number = () => Date.now(),
    private readonly windowMs = 10_000,
    private readonly maximumAttempts = 10,
    private readonly reserveAttempt: ReserveAttempt = (key, now, windowMs) =>
      this.reserveFallback(key, now, windowMs),
  ) {}

  async check(
    actorId: number,
    command: DiplomacyRateLimitCommand,
  ): Promise<void> {
    const now = this.now();
    const attempts = this.dataSource
      ? await this.reserveDurably(actorId, command, now)
      : await this.reserveAttempt(`${actorId}:${command}`, now, this.windowMs);
    if (attempts > this.maximumAttempts) {
      throw new BadRequestException(
        'Zu viele diplomatische Aktionen. Bitte versuche es gleich erneut',
      );
    }
  }

  private async reserveDurably(
    actorId: number,
    command: DiplomacyRateLimitCommand,
    now: number,
  ): Promise<number> {
    const windowStartedAt = new Date(now - this.windowMs);
    const windowExpiresAt = new Date(now + this.windowMs);
    const rows = await this.dataSource!.query(
      `
        INSERT INTO "diplomacy_rate_limits" (
          "actorId", "command", "windowStartedAt", "windowExpiresAt", "attempts"
        )
        VALUES ($1, $2, $3, $4, 1)
        ON CONFLICT ("actorId", "command") DO UPDATE
        SET
          "windowStartedAt" = CASE
            WHEN "diplomacy_rate_limits"."windowExpiresAt" <= EXCLUDED."windowStartedAt"
              THEN EXCLUDED."windowStartedAt"
            ELSE "diplomacy_rate_limits"."windowStartedAt"
          END,
          "windowExpiresAt" = CASE
            WHEN "diplomacy_rate_limits"."windowExpiresAt" <= EXCLUDED."windowStartedAt"
              THEN EXCLUDED."windowExpiresAt"
            ELSE "diplomacy_rate_limits"."windowExpiresAt"
          END,
          "attempts" = CASE
            WHEN "diplomacy_rate_limits"."windowExpiresAt" <= EXCLUDED."windowStartedAt"
              THEN 1
            ELSE "diplomacy_rate_limits"."attempts" + 1
          END
        RETURNING "attempts"
      `,
      [actorId, command, windowStartedAt, windowExpiresAt],
    );
    return Number(rows[0]?.attempts);
  }

  private async reserveFallback(
    key: string,
    now: number,
    windowMs: number,
  ): Promise<number> {
    const recent = (this.fallbackAttempts.get(key) ?? []).filter(
      (attempt) => attempt > now - windowMs,
    );
    recent.push(now);
    this.fallbackAttempts.set(key, recent);
    return recent.length;
  }
}
