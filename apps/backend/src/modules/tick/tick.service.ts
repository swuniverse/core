import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ColonyService } from '../colony/colony.service';
import { ColonyEventService } from '../colony/colony-event.service';
import { SpacecraftService } from '../spacecraft/spacecraft.service';
import { ResearchService } from '../research/research.service';
import { GameGateway } from '../websocket/game.gateway';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Colony } from '../colony/entities/colony.entity';
import { ColonyField } from '../colony/entities/colony-field.entity';
import {
  Spacecraft,
  SpacecraftStatus,
} from '../spacecraft/entities/spacecraft.entity';
import { User } from '../auth/user.entity';
import { WsEventType } from '@swuniverse/shared';
import {
  GameTickState,
  GameTickStatus,
  GameTickType,
} from './entities/game-tick-state.entity';

type StartedTick = { tickState: GameTickState; shouldRun: boolean };
type MainTickSchedule = '*' | number[];

const DEFAULT_MAIN_TICK_SCHEDULE_HOURS = '0,12,15,18,21';
const DEFAULT_MAIN_TICK_HOURS = [0, 12, 15, 18, 21];

@Injectable()
export class TickService {
  private readonly logger = new Logger(TickService.name);

  constructor(
    @InjectRepository(Colony)
    private readonly colonyRepo: Repository<Colony>,
    @InjectRepository(ColonyField)
    private readonly fieldRepo: Repository<ColonyField>,
    @InjectRepository(Spacecraft)
    private readonly shipRepo: Repository<Spacecraft>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(GameTickState)
    private readonly tickStateRepo: Repository<GameTickState>,
    private readonly colonyService: ColonyService,
    private readonly colonyEventService: ColonyEventService,
    private readonly spacecraftService: SpacecraftService,
    private readonly researchService: ResearchService,
    private readonly gateway: GameGateway,
    private readonly config: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleScheduledMainTick(): Promise<
    { tickNumber: number; status: string } | undefined
  > {
    const now = new Date();
    if (!this.isMainTickHourActive(now)) {
      this.logger.debug(
        `Main tick skipped at hour ${now.getHours()}; inactive schedule ${this.getMainTickScheduleDescription()}`,
      );
      return undefined;
    }

    return this.handleTick();
  }

  async handleTick(
    manualTickNumber?: number,
  ): Promise<{ tickNumber: number; status: string }> {
    const tickNumber = manualTickNumber ?? this.getMainTickNumber(new Date());
    const { tickState, shouldRun } = await this.startTick(
      GameTickType.MAIN,
      tickNumber,
    );

    if (!shouldRun) {
      this.logger.warn(
        `Tick #${tickNumber} skipped; existing status is ${tickState.status}`,
      );
      return { tickNumber, status: tickState.status };
    }

    try {
      this.logger.log(`Tick #${tickNumber} started`);

      const researchByUser = new Map<number, number>();
      const commodityProductionByUser = new Map<number, Map<number, number>>();
      const colonies = await this.colonyRepo.find({
        relations: ['fields', 'stats'],
      });
      for (const colony of colonies) {
        const tickResult = await this.colonyService.processTick(colony);
        researchByUser.set(
          colony.userId,
          (researchByUser.get(colony.userId) || 0) + tickResult.researchPoints,
        );
        if (!commodityProductionByUser.has(colony.userId)) {
          commodityProductionByUser.set(colony.userId, new Map());
        }
        const userProd = commodityProductionByUser.get(colony.userId)!;
        for (const [commodityId, amount] of tickResult.productionDelta) {
          if (amount > 0) {
            userProd.set(
              commodityId,
              (userProd.get(commodityId) || 0) + amount,
            );
          }
        }
        this.gateway.emitToUser(colony.userId, WsEventType.COLONY_UPDATED, {
          colonyId: colony.id,
        });
        if (tickResult.events.length > 0) {
          await this.colonyEventService.createTickEvents(
            colony.id,
            colony.userId,
            tickResult.events,
            tickNumber,
          );
          this.gateway.emitToUser(
            colony.userId,
            WsEventType.COLONY_TICK_REPORT,
            {
              colonyId: colony.id,
              tick: tickNumber,
              events: tickResult.events,
            },
          );
        }
      }

      const ships = await this.shipRepo.find();
      for (const ship of ships) {
        await this.spacecraftService.processTick(ship);
        this.gateway.emitToUser(ship.userId, WsEventType.SHIP_MOVED, {
          shipId: ship.id,
        });
      }

      const users = await this.userRepo.find({ select: ['id'] });
      for (const user of users) {
        await this.researchService.processTick(
          user.id,
          researchByUser.get(user.id) || 0,
          commodityProductionByUser.get(user.id) || new Map(),
        );
      }

      this.gateway.emitToAll(WsEventType.TICK, { tick: tickNumber });
      this.logger.log(
        `Tick #${tickNumber} completed — ${colonies.length} colonies, ${ships.length} ships, ${users.length} users processed`,
      );
      await this.finishTick(tickState, GameTickStatus.COMPLETED);
      return { tickNumber, status: GameTickStatus.COMPLETED };
    } catch (error) {
      await this.finishTick(
        tickState,
        GameTickStatus.FAILED,
        error instanceof Error ? error.message : 'Unknown tick error',
      );
      throw error;
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async checkBuildingCompletions() {
    const tickNumber = Date.now();
    const { tickState, shouldRun } = await this.startTick(
      GameTickType.BUILDING_COMPLETION,
      tickNumber,
    );
    if (!shouldRun) return;

    try {
      const activeBuilds = await this.fieldRepo.find({
        where: [{ isBuilding: true }, { terraformingId: Not(IsNull()) }],
        relations: ['colony'],
      });

      if (activeBuilds.length === 0) {
        await this.finishTick(tickState, GameTickStatus.COMPLETED);
        return;
      }

      const colonyIds = [...new Set(activeBuilds.map((f) => f.colonyId))];
      const colonies = await this.colonyRepo.find({
        where: colonyIds.map((id) => ({ id })),
        relations: ['fields', 'stats'],
      });

      for (const colony of colonies) {
        await this.colonyService.checkBuildingCompletions(colony);
      }

      await this.finishTick(tickState, GameTickStatus.COMPLETED);
    } catch (error) {
      await this.finishTick(
        tickState,
        GameTickStatus.FAILED,
        error instanceof Error
          ? error.message
          : 'Unknown building completion error',
      );
      throw error;
    }
  }

  triggerManualTick(): Promise<{ tickNumber: number; status: string }> {
    const manualTickNumber = Date.now();
    this.logger.log(`Manual tick triggered by admin (#${manualTickNumber})`);
    return this.handleTick(manualTickNumber);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async checkWarpArrivals() {
    const inFlightShips = await this.shipRepo.find({
      where: { status: SpacecraftStatus.IN_FLIGHT },
    });

    const now = new Date();
    const arrived = inFlightShips.filter(
      (s) => s.arrivalAt && new Date(s.arrivalAt) <= now,
    );

    if (arrived.length === 0) return;

    for (const ship of arrived) {
      await this.spacecraftService.processMovement(ship);
      this.gateway.emitToUser(ship.userId, WsEventType.SHIP_MOVED, {
        shipId: ship.id,
      });
    }

    this.logger.log(`Processed ${arrived.length} warp arrival(s)`);
  }

  private async startTick(
    tickType: GameTickType,
    tickNumber: number,
  ): Promise<StartedTick> {
    const existing = await this.tickStateRepo.findOne({
      where: { tickType, tickNumber },
    });
    if (existing) {
      return {
        tickState: existing,
        shouldRun: existing.status === GameTickStatus.FAILED,
      };
    }

    const tickState = await this.tickStateRepo.save(
      this.tickStateRepo.create({
        tickType,
        tickNumber,
        scheduledFor: new Date(tickNumber),
        startedAt: new Date(),
        status: GameTickStatus.STARTED,
        lockKey: `${tickType}:${tickNumber}`,
      }),
    );
    return { tickState, shouldRun: true };
  }

  private getMainTickNumber(now: Date): number {
    const schedule = this.getMainTickScheduleHours();
    const slot = new Date(now);
    slot.setMinutes(0, 0, 0);

    if (schedule === '*') {
      return slot.getTime();
    }

    const currentHour = slot.getHours();
    const hour = [...schedule]
      .reverse()
      .find((candidate) => candidate <= currentHour);

    if (hour == null) {
      slot.setDate(slot.getDate() - 1);
      slot.setHours(schedule[schedule.length - 1], 0, 0, 0);
    } else {
      slot.setHours(hour, 0, 0, 0);
    }

    return slot.getTime();
  }

  private isMainTickHourActive(now: Date): boolean {
    const schedule = this.getMainTickScheduleHours();
    return schedule === '*' || schedule.includes(now.getHours());
  }

  private getMainTickScheduleDescription(): string {
    const schedule = this.getMainTickScheduleHours();
    return schedule === '*' ? '*' : schedule.join(',');
  }

  private getMainTickScheduleHours(): MainTickSchedule {
    const rawSchedule = this.config
      .get<string>('GAME_MAIN_TICK_SCHEDULE_HOURS')
      ?.trim();
    if (rawSchedule === '*') return '*';

    const parsed = this.parseMainTickScheduleHours(
      rawSchedule || DEFAULT_MAIN_TICK_SCHEDULE_HOURS,
    );
    return parsed.length > 0 ? parsed : DEFAULT_MAIN_TICK_HOURS;
  }

  private parseMainTickScheduleHours(value: string): number[] {
    return [
      ...new Set(
        value
          .split(',')
          .map((entry) => Number(entry.trim()))
          .filter(
            (hour) =>
              Number.isInteger(hour) &&
              Number.isFinite(hour) &&
              hour >= 0 &&
              hour <= 23,
          ),
      ),
    ].sort((a, b) => a - b);
  }

  private async finishTick(
    tickState: GameTickState,
    status: GameTickStatus,
    error?: string,
  ): Promise<void> {
    tickState.status = status;
    tickState.completedAt = new Date();
    tickState.error = error ?? null;
    await this.tickStateRepo.save(tickState);
  }
}
