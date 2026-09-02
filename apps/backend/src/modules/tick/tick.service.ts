import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { ColonyTickEvent } from '@swuniverse/shared';
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

  getTickStatus(now = new Date()): {
    serverTime: string;
    previousTickAt: string;
    nextTickAt: string;
    currentTickIndex: number;
    totalTicks: number;
  } {
    const scheduleHours = this.expandMainTickScheduleHours();
    const serverTime = new Date(now);
    const previousTick = this.getPreviousMainTickAt(serverTime);
    const nextTick = new Date(previousTick);
    const currentTickIndex = scheduleHours.indexOf(previousTick.getHours());
    const nextTickIndex = (currentTickIndex + 1) % scheduleHours.length;

    if (nextTickIndex === 0) {
      nextTick.setDate(nextTick.getDate() + 1);
    }
    nextTick.setHours(scheduleHours[nextTickIndex], 0, 0, 0);

    return {
      serverTime: serverTime.toISOString(),
      previousTickAt: previousTick.toISOString(),
      nextTickAt: nextTick.toISOString(),
      currentTickIndex,
      totalTicks: scheduleHours.length,
    };
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

    let processedColonyCount = 0;
    let processedShipCount = 0;
    let processedUserCount = 0;

    try {
      this.logger.log(`Tick #${tickNumber} started`);

      const researchByUser = new Map<number, number>();
      const commodityProductionByUser = new Map<number, Map<number, number>>();
      const colonies = await this.colonyRepo.find({
        relations: ['fields', 'stats', 'changeable'],
      });
      processedColonyCount = colonies.length;
      for (const colony of colonies) {
        if (colony.userId == null || colony.isAbandoned) continue;
        const colonyUserId = colony.userId;
        const tickResult = await this.colonyService.processTick(colony);
        researchByUser.set(
          colonyUserId,
          (researchByUser.get(colonyUserId) || 0) + tickResult.researchPoints,
        );
        if (!commodityProductionByUser.has(colonyUserId)) {
          commodityProductionByUser.set(colonyUserId, new Map());
        }
        const userProd = commodityProductionByUser.get(colonyUserId)!;
        for (const [commodityId, amount] of tickResult.productionDelta) {
          if (amount > 0) {
            userProd.set(
              commodityId,
              (userProd.get(commodityId) || 0) + amount,
            );
          }
        }
        this.gateway.emitToUser(colonyUserId, WsEventType.COLONY_UPDATED, {
          colonyId: colony.id,
        });
        if (tickResult.events.length > 0) {
          await this.colonyEventService.createTickEvents(
            colony.id,
            colonyUserId,
            tickResult.events,
            tickNumber,
          );
          this.gateway.emitToUser(
            colonyUserId,
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
      processedShipCount = ships.length;
      for (const ship of ships) {
        await this.spacecraftService.processTick(ship);
        this.gateway.emitToUser(ship.userId, WsEventType.SHIP_MOVED, {
          shipId: ship.id,
        });
      }

      const users = await this.userRepo.find({ select: ['id'] });
      processedUserCount = users.length;
      for (const user of users) {
        await this.researchService.processTick(
          user.id,
          researchByUser.get(user.id) || 0,
          commodityProductionByUser.get(user.id) || new Map(),
        );
      }

      await this.finishTick(tickState, GameTickStatus.COMPLETED);
    } catch (error) {
      await this.finishTick(
        tickState,
        GameTickStatus.FAILED,
        error instanceof Error ? error.message : 'Unknown tick error',
      );
      throw error;
    }

    try {
      this.gateway.emitToAll(WsEventType.TICK, { tick: tickNumber });
    } catch (error) {
      this.logger.error(
        `Failed to broadcast completed tick #${tickNumber}`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    this.logger.log(
      `Tick #${tickNumber} completed — ${processedColonyCount} colonies, ${processedShipCount} ships, ${processedUserCount} users processed`,
    );
    return { tickNumber, status: GameTickStatus.COMPLETED };
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
        relations: ['fields', 'stats', 'changeable'],
      });

      for (const colony of colonies) {
        if (colony.userId == null || colony.isAbandoned) continue;
        const events: ColonyTickEvent[] = [];
        await this.colonyService.checkBuildingCompletions(colony, events);
        if (events.length === 0) continue;

        await this.colonyEventService.createTickEvents(
          colony.id,
          colony.userId,
          events,
          tickNumber,
        );
        this.gateway.emitToUser(colony.userId, WsEventType.COLONY_UPDATED, {
          colonyId: colony.id,
        });
        this.gateway.emitToUser(colony.userId, WsEventType.COLONY_TICK_REPORT, {
          colonyId: colony.id,
          tick: tickNumber,
          events,
        });
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

  async completeAllBuilds(): Promise<{ completed: string }> {
    const past = new Date(Date.now() - 60_000).toISOString();
    const mgr = this.fieldRepo.manager;

    await mgr.query(
      `UPDATE colony_fields SET "buildFinishesAt" = $1 WHERE "isBuilding" = true`,
      [past],
    );
    await mgr.query(
      `UPDATE colony_fields SET "terraformingFinishesAt" = $1 WHERE "terraformingId" IS NOT NULL`,
      [past],
    );
    await mgr.query(
      `UPDATE colony_fabrication_queue SET "finishesAt" = $1 WHERE status = 'QUEUED'`,
      [past],
    );
    await mgr.query(
      `UPDATE colony_ship_build_queue SET "finishesAt" = $1 WHERE status = 'QUEUED'`,
      [past],
    );
    await mgr.query(
      `UPDATE colony_crew_training_queue SET "finishesAt" = $1 WHERE "finishesAt" IS NOT NULL AND "finishesAt" > NOW()`,
      [past],
    );

    await this.checkBuildingCompletions();
    const tickResult = await this.triggerManualTick();

    this.logger.log('Admin: all builds force-completed');
    return { completed: `tick #${tickResult.tickNumber}` };
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
    const previousTick = this.getPreviousMainTickAt(now);
    return previousTick.getTime();
  }

  private isMainTickHourActive(now: Date): boolean {
    const schedule = this.getMainTickScheduleHours();
    return schedule === '*' || schedule.includes(now.getHours());
  }

  private getMainTickScheduleDescription(): string {
    const schedule = this.getMainTickScheduleHours();
    return schedule === '*' ? '*' : schedule.join(',');
  }

  private getPreviousMainTickAt(now: Date): Date {
    const scheduleHours = this.expandMainTickScheduleHours();
    const previousTick = new Date(now);
    previousTick.setMinutes(0, 0, 0);

    const currentHour = previousTick.getHours();
    const previousTickHour = [...scheduleHours]
      .reverse()
      .find((hour) => hour <= currentHour);

    if (previousTickHour == null) {
      previousTick.setDate(previousTick.getDate() - 1);
      previousTick.setHours(scheduleHours[scheduleHours.length - 1], 0, 0, 0);
      return previousTick;
    }

    previousTick.setHours(previousTickHour, 0, 0, 0);
    return previousTick;
  }

  private expandMainTickScheduleHours(): number[] {
    const schedule = this.getMainTickScheduleHours();
    return schedule === '*'
      ? Array.from({ length: 24 }, (_, hour) => hour)
      : schedule;
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
