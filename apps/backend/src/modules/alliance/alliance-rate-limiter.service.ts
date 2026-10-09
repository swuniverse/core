import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export type AllianceRateLimitPolicy = {
  windowMs: number;
  maximumAttempts: number;
  message: string;
};

const DIPLOMACY_POLICY: AllianceRateLimitPolicy = {
  windowMs: 10_000,
  maximumAttempts: 10,
  message: 'Zu viele diplomatische Aktionen. Bitte versuche es gleich erneut',
};

/**
 * Limits per command group. Command names are persisted in a varchar(16)
 * column, so keep them at 16 characters or fewer. New alliance commands are
 * added here with their own window, limit and German message.
 */
export const ALLIANCE_RATE_LIMIT_COMMANDS = {
  war: DIPLOMACY_POLICY,
  proposal: DIPLOMACY_POLICY,
  change: DIPLOMACY_POLICY,
} satisfies Record<string, AllianceRateLimitPolicy>;

export type AllianceRateLimitCommand = keyof typeof ALLIANCE_RATE_LIMIT_COMMANDS;

export type AllianceRateLimiterOptions = {
  now?: () => number;
  /** Overrides the window of every command (tests). */
  windowMs?: number;
  /** Overrides the limit of every command (tests). */
  maximumAttempts?: number;
  /** Replaces the command policies (tests). */
  commands?: Record<string, AllianceRateLimitPolicy>;
  reserveAttempt?: (
    key: string,
    now: number,
    windowMs: number,
  ) => Promise<number>;
};

/**
 * Short request-burst protection for alliance commands. Production reservations
 * are atomically persisted in PostgreSQL, so every application instance shares
 * the same budget. It deliberately does not model diplomatic cooldowns, expiry,
 * or minimum relationship periods.
 */
@Injectable()
export class AllianceRateLimiterService {
  private readonly fallbackAttempts = new Map<string, number[]>();

  constructor(@Optional() @InjectDataSource() private readonly dataSource?: DataSource) {}

  static readonly defaultCommands: Record<string, AllianceRateLimitPolicy> =
    ALLIANCE_RATE_LIMIT_COMMANDS;

  static forTesting(
    options: AllianceRateLimiterOptions,
    dataSource?: DataSource,
  ): AllianceRateLimiterService {
    const limiter = new AllianceRateLimiterService(dataSource);
    limiter.now = options.now ?? limiter.now;
    limiter.windowMs = options.windowMs;
    limiter.maximumAttempts = options.maximumAttempts;
    limiter.commands = options.commands ?? limiter.commands;
    limiter.reserveAttempt = options.reserveAttempt ?? limiter.reserveAttempt;
    return limiter;
  }

  private now = () => Date.now();
  private windowMs?: number;
  private maximumAttempts?: number;
  private commands: Record<string, AllianceRateLimitPolicy> =
    ALLIANCE_RATE_LIMIT_COMMANDS;
  private reserveAttempt = (key: string, now: number, windowMs: number) =>
    this.reserveFallback(key, now, windowMs);

  async check(
    actorId: number,
    command: AllianceRateLimitCommand | (string & {}),
  ): Promise<void> {
    const policy = this.commands[command];
    if (!policy) {
      throw new Error(`Unknown alliance rate limit command: ${command}`);
    }
    const windowMs = this.windowMs ?? policy.windowMs;
    const maximumAttempts = this.maximumAttempts ?? policy.maximumAttempts;
    const now = this.now();
    const attempts = this.dataSource
      ? await this.reserveDurably(actorId, command, now, windowMs)
      : await this.reserveAttempt(`${actorId}:${command}`, now, windowMs);
    if (attempts > maximumAttempts) {
      throw new BadRequestException(policy.message);
    }
  }

  private async reserveDurably(
    actorId: number,
    command: string,
    now: number,
    windowMs: number,
  ): Promise<number> {
    const windowStartedAt = new Date(now - windowMs);
    const windowExpiresAt = new Date(now + windowMs);
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
