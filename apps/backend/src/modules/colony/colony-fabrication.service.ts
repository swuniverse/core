import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameDataService } from '../game-data/game-data.service';
import { UnlockResolverService } from '../research/unlock-resolver.service';
import { ColonyStatsService } from './colony-stats.service';
import { ColonyStorageService } from './colony-storage.service';
import { ColonyTimingService } from './colony-timing.service';
import { ColonyOwnershipService } from './colony-ownership.service';
import { Colony } from './entities/colony.entity';
import {
  ColonyFabricationQueue,
  ColonyFabricationQueueStatus,
  ColonyFabricationQueueType,
} from './entities/colony-fabrication-queue.entity';

@Injectable()
export class ColonyFabricationService {
  constructor(
    @InjectRepository(ColonyFabricationQueue)
    private readonly fabricationQueueRepo: Repository<ColonyFabricationQueue>,
    private readonly gameData: GameDataService,
    private readonly colonyStatsService: ColonyStatsService,
    private readonly colonyStorageService: ColonyStorageService,
    private readonly timing: ColonyTimingService,
    private readonly ownership: ColonyOwnershipService,
    private readonly unlockResolver: UnlockResolverService,
  ) {}

  async queueFabrication(
    colonyId: number,
    userId: number,
    queueType: ColonyFabricationQueueType,
    itemKey: string,
    amount: number,
    buildingFunctionId: number,
  ): Promise<ColonyFabricationQueue> {
    const normalizedItemKey = itemKey?.trim();
    const item = this.gameData.getFabricationItem(normalizedItemKey);
    if (!item) {
      throw new BadRequestException('Unknown fabrication item');
    }
    if (item.queueType !== queueType) {
      throw new BadRequestException('Fabrication item queue type mismatch');
    }
    if (!item.buildingFunctionIds.includes(buildingFunctionId)) {
      throw new BadRequestException(
        'Fabrication item cannot be produced by this building function',
      );
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }
    if (item.researchId != null) {
      const hasResearch = await this.unlockResolver.hasTech(
        userId,
        item.researchId,
      );
      if (!hasResearch) {
        throw new BadRequestException(
          `Research required: ${item.researchRequired || item.researchId}`,
        );
      }
    }

    const colony = await this.ownership.findOwnedColony(colonyId, userId);
    if (!this.hasActiveBuildingFunction(colony, buildingFunctionId)) {
      throw new BadRequestException(
        'Required fabrication building is not active',
      );
    }

    const activeForFunction = await this.fabricationQueueRepo.find({
      where: {
        colonyId: colony.id,
        buildingFunctionId,
        status: ColonyFabricationQueueStatus.QUEUED,
      },
    });
    if (activeForFunction.length > 0) {
      throw new BadRequestException(
        'A fabrication queue is already active for this building function',
      );
    }

    for (const cost of item.costs) {
      await this.colonyStorageService.lowerStorage(
        colony,
        cost.commodityId,
        cost.amount * amount,
      );
    }

    const queue = this.fabricationQueueRepo.create({
      colonyId: colony.id,
      userId,
      queueType,
      itemKey: normalizedItemKey,
      amount,
      buildingFunctionId,
      finishesAt: this.timing.dateAfterScaledSeconds(
        item.durationSeconds * amount,
      ),
      status: ColonyFabricationQueueStatus.QUEUED,
    });
    return this.fabricationQueueRepo.save(queue);
  }

  async cancelFabricationQueue(
    colonyId: number,
    userId: number,
    queueId: number,
  ): Promise<ColonyFabricationQueue> {
    const colony = await this.ownership.findOwnedColony(colonyId, userId);
    const queue = await this.fabricationQueueRepo.findOne({
      where: {
        id: queueId,
        colonyId: colony.id,
        userId,
      },
    });
    if (!queue) {
      throw new NotFoundException('Fabrication queue not found');
    }
    if (queue.status !== ColonyFabricationQueueStatus.QUEUED) {
      throw new BadRequestException(
        'Only queued fabrication jobs can be cancelled',
      );
    }

    const item = this.gameData.getFabricationItem(queue.itemKey);
    if (item) {
      const maxStorage =
        this.colonyStatsService.calculateSummary(colony).effectiveStorageMax;
      for (const cost of item.costs) {
        const refund = Math.floor((cost.amount * queue.amount) / 2);
        await this.colonyStorageService.upperStorage(
          colony,
          cost.commodityId,
          refund,
          maxStorage,
        );
      }
    }

    queue.status = ColonyFabricationQueueStatus.CANCELLED;
    return this.fabricationQueueRepo.save(queue);
  }

  async processFabricationQueue(colony: Colony): Promise<void> {
    const finishedJobs = await this.fabricationQueueRepo.find({
      where: {
        colonyId: colony.id,
        status: ColonyFabricationQueueStatus.QUEUED,
      },
    });
    const now = new Date();
    for (const job of finishedJobs.filter(
      (candidate) => candidate.finishesAt <= now,
    )) {
      const item = this.gameData.getFabricationItem(job.itemKey);
      if (!item) continue;
      const maxStorage =
        this.colonyStatsService.calculateSummary(colony).effectiveStorageMax;
      await this.colonyStorageService.upperStorage(
        colony,
        item.outputCommodityId,
        item.outputAmount * job.amount,
        maxStorage,
      );
      job.status = ColonyFabricationQueueStatus.COMPLETED;
      await this.fabricationQueueRepo.save(job);
    }
  }

  private hasActiveBuildingFunction(
    colony: Colony,
    functionId: number,
  ): boolean {
    return (colony.fields ?? []).some((field) => {
      if (!field.buildingId || field.isBuilding || !field.isActive)
        return false;
      return this.gameData
        .getBuildingFunctions(field.buildingId)
        .includes(functionId);
    });
  }
}
