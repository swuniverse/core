import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ColonyService } from '../colony/colony.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Colony } from '../colony/entities/colony.entity';

@Injectable()
export class TickService {
  private readonly logger = new Logger(TickService.name);
  private tickCount = 0;

  constructor(
    @InjectRepository(Colony)
    private readonly colonyRepo: Repository<Colony>,
    private readonly colonyService: ColonyService,
  ) {}

  // 5 ticks per day = every 4h 48m = "0 0,5,10,14,19 * * *" approx
  // Using fixed times: 00:00, 04:48, 09:36, 14:24, 19:12
  @Cron('0 0 0,5,10,14,19 * * *')
  async handleTick() {
    this.tickCount++;
    this.logger.log(`Tick #${this.tickCount} started`);

    const colonies = await this.colonyRepo.find({ relations: ['fields'] });
    for (const colony of colonies) {
      await this.colonyService.processTick(colony);
    }

    this.logger.log(`Tick #${this.tickCount} completed — ${colonies.length} colonies processed`);
  }

  // Building completion check runs every minute (realtime)
  @Cron(CronExpression.EVERY_MINUTE)
  async checkBuildingCompletions() {
    const colonies = await this.colonyRepo.find({ relations: ['fields'] });
    for (const colony of colonies) {
      await this.colonyService.processTick(colony);
    }
  }
}
