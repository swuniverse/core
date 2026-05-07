import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ColonyService } from '../colony/colony.service';
import { SpacecraftService } from '../spacecraft/spacecraft.service';
import { ResearchService } from '../research/research.service';
import { GameGateway } from '../websocket/game.gateway';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Colony } from '../colony/entities/colony.entity';
import { ColonyField } from '../colony/entities/colony-field.entity';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import { User } from '../auth/user.entity';
import { WsEventType } from '@swuniverse/shared';
import {
  GameTickState,
  GameTickStatus,
  GameTickType,
} from './entities/game-tick-state.entity';

@Injectable()
export class TickService {
  private readonly logger = new Logger(TickService.name);
  private tickCount = 0;

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
    private readonly spacecraftService: SpacecraftService,
    private readonly researchService: ResearchService,
    private readonly gateway: GameGateway,
  ) {}

  @Cron('0 0 0,5,10,14,19 * * *')
  async handleTick() {
    this.tickCount++;
    const tickState = await this.startTick(GameTickType.MAIN, this.tickCount);

    try {
      this.logger.log(`Tick #${this.tickCount} started`);

      const colonies = await this.colonyRepo.find({ relations: ['fields'] });
      for (const colony of colonies) {
        await this.colonyService.processTick(colony);
        this.gateway.emitToUser(colony.userId, WsEventType.COLONY_UPDATED, {
          colonyId: colony.id,
        });
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
        await this.researchService.processTick(user.id);
      }

      this.gateway.emitToAll(WsEventType.TICK, { tick: this.tickCount });
      this.logger.log(
        `Tick #${this.tickCount} completed — ${colonies.length} colonies, ${ships.length} ships, ${users.length} users processed`,
      );
      await this.finishTick(tickState, GameTickStatus.COMPLETED);
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
    const tickState = await this.startTick(
      GameTickType.BUILDING_COMPLETION,
      tickNumber,
    );

    try {
      const activeBuilds = await this.fieldRepo.find({
        where: { isBuilding: true },
        relations: ['colony'],
      });

      if (activeBuilds.length === 0) {
        await this.finishTick(tickState, GameTickStatus.COMPLETED);
        return;
      }

      const colonyIds = [...new Set(activeBuilds.map((f) => f.colonyId))];
      const colonies = await this.colonyRepo.find({
        where: colonyIds.map((id) => ({ id })),
        relations: ['fields'],
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

  private async startTick(
    tickType: GameTickType,
    tickNumber: number,
  ): Promise<GameTickState> {
    const existing = await this.tickStateRepo.findOne({
      where: { tickType, tickNumber },
    });
    if (existing) {
      return existing;
    }

    return this.tickStateRepo.save(
      this.tickStateRepo.create({
        tickType,
        tickNumber,
        scheduledFor: new Date(),
        startedAt: new Date(),
        status: GameTickStatus.STARTED,
        lockKey: `${tickType}:${tickNumber}`,
      }),
    );
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
