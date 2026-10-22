import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  GameTickState,
  GameTickStatus,
  GameTickType,
} from './entities/game-tick-state.entity';

export const MAINTENANCE_HANDLERS = Symbol('MAINTENANCE_HANDLERS');

export interface MaintenanceHandler {
  name: string;
  run(now: Date): Promise<string | void>;
}

export function validateGameTimezone(timezone?: string): string | undefined {
  const value = timezone?.trim();
  if (!value) return undefined;

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return value;
  } catch {
    throw new Error(`Invalid GAME_TIMEZONE "${value}"`);
  }
}

export function getHourInTimezone(now: Date, timezone?: string): number {
  if (!timezone) return now.getHours();
  return Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(now),
  );
}

export function getCalendarDateNumber(now: Date, timezone?: string): number {
  if (!timezone) {
    return (
      now.getFullYear() * 10_000 +
      (now.getMonth() + 1) * 100 +
      now.getDate()
    );
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return value('year') * 10_000 + value('month') * 100 + value('day');
}

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);
  private readonly timezone: string | undefined;

  constructor(
    @InjectRepository(GameTickState)
    private readonly tickStateRepo: Repository<GameTickState>,
    config: ConfigService,
    @Inject(MAINTENANCE_HANDLERS)
    private readonly handlers: MaintenanceHandler[],
  ) {
    this.timezone = validateGameTimezone(config.get<string>('GAME_TIMEZONE'));
  }

  @Cron('0 3 * * *', {
    timeZone: process.env.GAME_TIMEZONE?.trim() || undefined,
  })
  async handleScheduledMaintenance(): Promise<GameTickState> {
    return this.run();
  }

  async run(now = new Date()): Promise<GameTickState> {
    const tickNumber = getCalendarDateNumber(now, this.timezone);
    const existing = await this.tickStateRepo.findOne({
      where: { tickType: GameTickType.MAINTENANCE, tickNumber },
    });
    if (existing && existing.status !== GameTickStatus.FAILED) return existing;

    const tickState =
      existing ??
      (await this.tickStateRepo.save(
        this.tickStateRepo.create({
          tickType: GameTickType.MAINTENANCE,
          tickNumber,
          scheduledFor: now,
          startedAt: now,
          status: GameTickStatus.STARTED,
          lockKey: `${GameTickType.MAINTENANCE}:${tickNumber}`,
        }),
      ));
    const errors: string[] = [];

    for (const handler of this.handlers) {
      try {
        await handler.run(now);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${handler.name}: ${message}`);
        this.logger.error(`Maintenance handler ${handler.name} failed: ${message}`);
      }
    }

    tickState.status =
      errors.length === 0 ? GameTickStatus.COMPLETED : GameTickStatus.FAILED;
    tickState.completedAt = new Date();
    tickState.error = errors.length === 0 ? null : errors.join('\n');
    return this.tickStateRepo.save(tickState);
  }
}
