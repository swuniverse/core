import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ColonyService } from '../colony/colony.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Colony } from '../colony/entities/colony.entity';
import { ColonyField } from '../colony/entities/colony-field.entity';

@Injectable()
export class TickService {
  private readonly logger = new Logger(TickService.name);
  private tickCount = 0;

  constructor(
    @InjectRepository(Colony)
    private readonly colonyRepo: Repository<Colony>,
    @InjectRepository(ColonyField)
    private readonly fieldRepo: Repository<ColonyField>,
    private readonly colonyService: ColonyService,
  ) {}

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
