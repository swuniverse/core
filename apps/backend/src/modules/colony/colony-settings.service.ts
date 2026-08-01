import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameDataService } from '../game-data/game-data.service';
import { ColonyEventService } from './colony-event.service';
import { ColonyOwnershipService } from './colony-ownership.service';
import { ColonyStorage } from './entities/colony-storage.entity';
import { ColonyStats } from './entities/colony-stats.entity';
import { Colony } from './entities/colony.entity';
import {
  ColonyEventSeverity,
  ColonyEventType,
} from './entities/colony-event.entity';

@Injectable()
export class ColonySettingsService {
  private readonly warehouseFunctionId = 23;

  constructor(
    @InjectRepository(Colony)
    private readonly colonyRepo: Repository<Colony>,
    @InjectRepository(ColonyStats)
    _statsRepo: Repository<ColonyStats>,
    @InjectRepository(ColonyStorage)
    private readonly storageRepo: Repository<ColonyStorage>,
    private readonly ownership: ColonyOwnershipService,
    private readonly gameData: GameDataService,
    private readonly colonyEventService: ColonyEventService,
  ) {}

  async rename(
    colonyId: number,
    userId: number,
    name: string,
  ): Promise<Colony> {
    const normalizedName = this.normalizeColonyName(name);
    const colony = await this.ownership.findOwnedColony(colonyId, userId);
    colony.name = normalizedName;
    return this.colonyRepo.save(colony);
  }

  async setPopulationLimit(
    colonyId: number,
    userId: number,
    limit: number,
  ): Promise<{ populationLimit: number }> {
    if (!Number.isInteger(limit) || limit < 0) {
      throw new BadRequestException('Population limit must be zero or higher');
    }
    const colony = await this.ownership.findOwnedColonyWithChangeable(
      colonyId,
      userId,
    );
    colony.changeable.populationLimit = limit;
    await this.colonyRepo.manager.save(colony.changeable);
    return { populationLimit: colony.changeable.populationLimit };
  }

  async setImmigration(
    colonyId: number,
    userId: number,
    enabled: boolean,
  ): Promise<{ immigrationEnabled: boolean }> {
    if (typeof enabled !== 'boolean') {
      throw new BadRequestException('Immigration flag must be boolean');
    }
    const colony = await this.ownership.findOwnedColonyWithChangeable(
      colonyId,
      userId,
    );
    colony.changeable.immigrationEnabled = enabled;
    await this.colonyRepo.manager.save(colony.changeable);
    return { immigrationEnabled: colony.changeable.immigrationEnabled };
  }

  async setColonyMessage(
    colonyId: number,
    userId: number,
    message: string | null,
  ): Promise<{ colonyMessage: string | null }> {
    if (message != null && typeof message !== 'string') {
      throw new BadRequestException('Colony message must be text');
    }
    const normalizedMessage = message?.trim() ? message.trim() : null;
    if (normalizedMessage && normalizedMessage.length > 2000) {
      throw new BadRequestException('Colony message is too long');
    }
    const colony = await this.ownership.findOwnedColonyWithChangeable(
      colonyId,
      userId,
    );
    colony.changeable.colonyMessage = normalizedMessage;
    await this.colonyRepo.manager.save(colony.changeable);
    return { colonyMessage: colony.changeable.colonyMessage };
  }

  async discardStorage(
    colonyId: number,
    userId: number,
    items: Array<{ commodityId: number; amount: number }>,
  ): Promise<{
    discarded: Array<{ commodityId: number; amount: number; name: string }>;
  }> {
    const colony = await this.ownership.findOwnedColony(colonyId, userId);
    if (!this.hasCompletedBuildingFunction(colony, this.warehouseFunctionId)) {
      throw new BadRequestException('Warehouse required');
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('No commodities selected');
    }

    const requested = new Map<number, number>();
    for (const item of items) {
      const commodityId = Number(item?.commodityId);
      const amount = Math.floor(Number(item?.amount));
      if (!Number.isInteger(commodityId) || commodityId <= 0) continue;
      if (!Number.isFinite(amount) || amount < 1) continue;
      requested.set(commodityId, (requested.get(commodityId) ?? 0) + amount);
    }
    if (requested.size === 0) {
      throw new BadRequestException('No valid commodity amounts selected');
    }

    const discarded: Array<{
      commodityId: number;
      amount: number;
      name: string;
    }> = [];
    for (const [commodityId, requestedAmount] of requested.entries()) {
      const storage = await this.storageRepo.findOne({
        where: { colonyId: colony.id, commodityId },
      });
      if (!storage || storage.amount <= 0) continue;
      const amount = Math.min(requestedAmount, storage.amount);
      if (amount <= 0) continue;
      storage.amount -= amount;
      await this.storageRepo.save(storage);
      const commodity = this.gameData.getCommodity(commodityId);
      discarded.push({
        commodityId,
        amount,
        name: commodity?.name ?? `Ware #${commodityId}`,
      });
    }

    if (discarded.length === 0) {
      throw new BadRequestException('No matching storage available');
    }

    await this.colonyEventService.createActionEvent({
      colonyId: colony.id,
      userId,
      type: ColonyEventType.WASTE_DISCARDED,
      severity: ColonyEventSeverity.INFO,
      title: 'Waren entsorgt',
      message: `Es wurden ${discarded
        .map((item) => `${item.amount} ${item.name}`)
        .join(', ')} entsorgt.`,
      payload: { discarded },
    });

    return { discarded };
  }

  private normalizeColonyName(name: string): string {
    if (typeof name !== 'string') {
      throw new BadRequestException('Colony name must be text');
    }
    const normalizedName = name.trim();
    if (normalizedName.length < 3) {
      throw new BadRequestException('Colony name is too short');
    }
    if (normalizedName.length > 255) {
      throw new BadRequestException('Colony name is too long');
    }
    return normalizedName;
  }

  private hasCompletedBuildingFunction(
    colony: Colony,
    functionId: number,
  ): boolean {
    return (colony.fields ?? []).some((field) => {
      if (!field.buildingId || field.isBuilding) return false;
      return this.gameData
        .getBuildingFunctions(field.buildingId)
        .includes(functionId);
    });
  }
}
