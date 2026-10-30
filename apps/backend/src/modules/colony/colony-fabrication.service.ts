import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import {
  FabricationItemDef,
  GameDataService,
} from '../game-data/game-data.service';
import { UnlockResolverService } from '../research/unlock-resolver.service';
import {
  ColonyStatsService,
  deductColonyEnergy,
  getColonyChangeable,
  setColonyEnergy,
} from './colony-stats.service';
import { ColonyStorageService } from './colony-storage.service';
import { ColonyOwnershipService } from './colony-ownership.service';
import { Colony } from './entities/colony.entity';
import {
  ColonyFabricationQueue,
  ColonyFabricationQueueStatus,
  ColonyFabricationQueueType,
} from './entities/colony-fabrication-queue.entity';

export interface FabricationQueueResult {
  /** Null when nothing was queued or the item was produced immediately (torpedoes). */
  queue: ColonyFabricationQueue | null;
  requested: number;
  accepted: number;
  message: string;
}

@Injectable()
export class ColonyFabricationService {
  constructor(
    @InjectRepository(ColonyFabricationQueue)
    private readonly fabricationQueueRepo: Repository<ColonyFabricationQueue>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly gameData: GameDataService,
    private readonly colonyStatsService: ColonyStatsService,
    private readonly colonyStorageService: ColonyStorageService,
    private readonly ownership: ColonyOwnershipService,
    private readonly unlockResolver: UnlockResolverService,
    @InjectRepository(Colony)
    private readonly colonyRepo: Repository<Colony>,
  ) {}

  async queueFabrication(
    colonyId: number,
    userId: number,
    queueType: ColonyFabricationQueueType,
    itemKey: string,
    amount: number,
    buildingFunctionId: number,
  ): Promise<FabricationQueueResult> {
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
    if (item.faction != null) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (user?.faction !== item.faction) {
        throw new BadRequestException('Fabrication item is faction-locked');
      }
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

    const accepted = this.clampToAvailable(colony, item, amount);
    const message = this.formatResultMessage(item, queueType, accepted, amount);
    if (accepted <= 0) {
      return { queue: null, requested: amount, accepted: 0, message };
    }

    for (const cost of item.costs) {
      await this.colonyStorageService.lowerStorage(
        colony,
        cost.commodityId,
        cost.amount * accepted,
      );
    }
    const energyCost = (item.energyCost ?? 0) * accepted;
    if (energyCost > 0) {
      deductColonyEnergy(colony, energyCost);
    }
    await this.colonyRepo.save(colony);

    if (queueType === ColonyFabricationQueueType.TORPEDO) {
      const maxStorage =
        this.colonyStatsService.calculateSummary(colony).effectiveStorageMax;
      await this.colonyStorageService.upperStorage(
        colony,
        item.outputCommodityId,
        item.outputAmount * accepted,
        maxStorage,
      );
      return { queue: null, requested: amount, accepted, message };
    }

    const existing = await this.fabricationQueueRepo.findOne({
      where: {
        colonyId: colony.id,
        buildingFunctionId,
        itemKey: normalizedItemKey,
        status: ColonyFabricationQueueStatus.QUEUED,
      },
    });
    if (existing) {
      existing.amount += accepted;
      const queue = await this.fabricationQueueRepo.save(existing);
      return { queue, requested: amount, accepted, message };
    }
    const queue = await this.fabricationQueueRepo.save(
      this.fabricationQueueRepo.create({
        colonyId: colony.id,
        userId,
        queueType,
        itemKey: normalizedItemKey,
        amount: accepted,
        legacyAmount: 0,
        buildingFunctionId,
        finishesAt: new Date(),
        status: ColonyFabricationQueueStatus.QUEUED,
      }),
    );
    return { queue, requested: amount, accepted, message };
  }

  /**
   * STU semantics: a partial cancel (default: everything) refunds 100 % of the
   * materials and of the EPS that was actually paid. Legacy amounts migrated
   * from the timed queue were charged no EPS, so they refund none.
   */
  async cancelFabricationQueue(
    colonyId: number,
    userId: number,
    queueId: number,
    amount?: number,
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
    if (
      amount != null &&
      (!Number.isInteger(amount) || amount <= 0)
    ) {
      throw new BadRequestException('Amount must be positive');
    }
    const count = Math.min(amount ?? queue.amount, queue.amount);

    const item = this.gameData.getFabricationItem(queue.itemKey);
    if (item) {
      const summary = this.colonyStatsService.calculateSummary(colony);
      for (const cost of item.costs) {
        await this.colonyStorageService.upperStorage(
          colony,
          cost.commodityId,
          cost.amount * count,
          summary.effectiveStorageMax,
        );
      }
      const legacyCancelled = Math.max(
        0,
        count - (queue.amount - (queue.legacyAmount ?? 0)),
      );
      const paidCancelled = count - legacyCancelled;
      const energyRefund = (item.energyCost ?? 0) * paidCancelled;
      if (energyRefund > 0) {
        const changeable = getColonyChangeable(colony);
        setColonyEnergy(
          colony,
          Math.min(changeable.energy + energyRefund, changeable.maxEnergy),
        );
        await this.colonyRepo.save(colony);
      }
      queue.legacyAmount = Math.max(
        0,
        (queue.legacyAmount ?? 0) - legacyCancelled,
      );
    }

    queue.amount -= count;
    if (queue.amount <= 0) {
      queue.amount = 0;
      queue.status = ColonyFabricationQueueStatus.CANCELLED;
    }
    return this.fabricationQueueRepo.save(queue);
  }

  /** Completes all queued jobs whose building function is active (next colony tick). */
  async processFabricationQueue(colony: Colony): Promise<void> {
    const jobs = await this.fabricationQueueRepo.find({
      where: {
        colonyId: colony.id,
        status: ColonyFabricationQueueStatus.QUEUED,
      },
    });
    for (const job of jobs) {
      if (!this.hasActiveBuildingFunction(colony, job.buildingFunctionId)) {
        continue;
      }
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

  private clampToAvailable(
    colony: Colony,
    item: FabricationItemDef,
    requested: number,
  ): number {
    let count = requested;
    const energyCost = item.energyCost ?? 0;
    if (energyCost > 0) {
      count = Math.min(
        count,
        Math.floor(getColonyChangeable(colony).energy / energyCost),
      );
    }
    for (const cost of item.costs) {
      if (cost.amount <= 0) continue;
      const stored =
        colony.storage?.find((row) => row.commodityId === cost.commodityId)
          ?.amount ?? 0;
      count = Math.min(count, Math.floor(stored / cost.amount));
    }
    return Math.max(0, count);
  }

  private formatResultMessage(
    item: FabricationItemDef,
    queueType: ColonyFabricationQueueType,
    accepted: number,
    requested: number,
  ): string {
    const noun = queueType === ColonyFabricationQueueType.MODULE
      ? 'Modulen in Auftrag gegeben'
      : 'Torpedos hergestellt';
    if (accepted <= 0) {
      return `Es wurden keine ${queueType === ColonyFabricationQueueType.MODULE ? 'Module in Auftrag gegeben' : 'Torpedos hergestellt'}: ${item.displayName}`;
    }
    return accepted === requested
      ? `Es wurden ${accepted} ${noun}: ${item.displayName}`
      : `Es wurden ${accepted} von ${requested} ${noun}: ${item.displayName}`;
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
