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
    private readonly colonyService: ColonyService,
    private readonly spacecraftService: SpacecraftService,
    private readonly researchService: ResearchService,
    private readonly gateway: GameGateway,
  ) {}

  @Cron('0 0 0,5,10,14,19 * * *')
  async handleTick() {
    this.tickCount++;
    this.logger.log(`Tick #${this.tickCount} started`);

    const colonies = await this.colonyRepo.find({ relations: ['fields'] });
    for (const colony of colonies) {
      await this.colonyService.processTick(colony);
      this.gateway.emitToUser(colony.userId, WsEventType.COLONY_UPDATED, { colonyId: colony.id });
    }

    // Process spacecraft
    const ships = await this.shipRepo.find();
    for (const ship of ships) {
      await this.spacecraftService.processTick(ship);
      this.gateway.emitToUser(ship.userId, WsEventType.SHIP_MOVED, { shipId: ship.id });
    }

    // Process research
    const users = await this.userRepo.find({ select: ['id'] });
    for (const user of users) {
      await this.researchService.processTick(user.id);
    }

    this.gateway.emitToAll(WsEventType.TICK, { tick: this.tickCount });
    this.logger.log(`Tick #${this.tickCount} completed — ${colonies.length} colonies, ${ships.length} ships, ${users.length} users processed`);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async checkBuildingCompletions() {
    const activeBuilds = await this.fieldRepo.find({
      where: { isBuilding: true },
      relations: ['colony'],
    });

    if (activeBuilds.length === 0) return;

    const colonyIds = [...new Set(activeBuilds.map((f) => f.colonyId))];
    const colonies = await this.colonyRepo.find({
      where: colonyIds.map((id) => ({ id })),
      relations: ['fields'],
    });

    for (const colony of colonies) {
      await this.colonyService.checkBuildingCompletions(colony);
    }
  }
}
