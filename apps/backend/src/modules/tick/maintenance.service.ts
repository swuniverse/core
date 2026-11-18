import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { TickFailureMailService } from './tick-failure-mail.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  GameTickState,
  GameTickStatus,
  GameTickType,
} from './entities/game-tick-state.entity';

export const MAINTENANCE_HANDLERS = Symbol('MAINTENANCE_HANDLERS');
export const DEFAULT_GAME_TIMEZONE = 'Europe/Berlin';

export interface MaintenanceHandler {
  name: string;
  run(now: Date): Promise<string | void>;
}

export function validateGameTimezone(timezone?: string): string {
  const value = timezone?.trim() || DEFAULT_GAME_TIMEZONE;

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return value;
  } catch {
    throw new Error(`Invalid GAME_TIMEZONE "${value}"`);
  }
}

export function getHourInTimezone(now: Date, timezone?: string): number {
  return Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone?.trim() || DEFAULT_GAME_TIMEZONE,
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(now),
  );
}

export function getCalendarDateNumber(now: Date, timezone?: string): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone?.trim() || DEFAULT_GAME_TIMEZONE,
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
  private readonly timezone: string;

  constructor(
    @InjectRepository(GameTickState)
    private readonly tickStateRepo: Repository<GameTickState>,
    config: ConfigService,
    @Inject(MAINTENANCE_HANDLERS)
    private readonly handlers: MaintenanceHandler[],
    @Optional() private readonly failureMail?: TickFailureMailService,
  ) {
    this.timezone = validateGameTimezone(config.get<string>('GAME_TIMEZONE'));
  }

  @Cron('0 3 * * *', {
    timeZone: process.env.GAME_TIMEZONE?.trim() || DEFAULT_GAME_TIMEZONE,
  })
  async handleScheduledMaintenance(): Promise<GameTickState> {
    return this.run();
  }

  async run(now = new Date()): Promise<GameTickState> {
    const tickNumber = getCalendarDateNumber(now, this.timezone);
    try {
      const result = await this.runMaintenance(now, tickNumber);
      if (result.status === GameTickStatus.FAILED) await this.failureMail?.notify(result);
      return result;
    } catch (error) {
      await this.failureMail?.notify({
        tickType: GameTickType.MAINTENANCE, tickNumber, status: GameTickStatus.FAILED,
        completedAt: new Date(), error: error instanceof Error ? (error.stack ?? error.message) : String(error),
      });
      throw error;
    }
  }

  private async runMaintenance(now: Date, tickNumber: number): Promise<GameTickState> {
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
        const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
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
