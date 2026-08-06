import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BuildingDef } from '../game-data/game-data.service';
import { Colony } from './entities/colony.entity';
import { ColonyField } from './entities/colony-field.entity';
import { ColonyChangeable } from './entities/colony-changeable.entity';
import {
  getColonyChangeable,
  syncLegacyColonySnapshot,
} from './colony-stats.service';

@Injectable()
export class BuildingLifecycleService {
  constructor(
    @InjectRepository(ColonyField)
    private readonly fieldRepo: Repository<ColonyField>,
    @InjectRepository(ColonyChangeable)
    private readonly changeableRepo: Repository<ColonyChangeable>,
    private readonly config: ConfigService,
  ) {}

  async finishBuilding(
    colony: Colony,
    field: ColonyField,
    definition: BuildingDef,
    activateAfterBuild = true,
  ): Promise<ColonyField> {
    field.isBuilding = false;
    field.buildProgress = 100;
    field.buildFinishesAt = null;
    field.maxIntegrity = definition.integrity || field.maxIntegrity || 0;
    field.integrity = field.maxIntegrity;
    field.isActive = false;

    if (activateAfterBuild) {
      const workerAmount = definition.bevUse || 0;
      const hasWorkers = getColonyChangeable(colony).workless >= workerAmount;
      if (hasWorkers) {
        await this.activateBuildingStats(colony, definition);
        field.isActive = true;
      }
    }

    return this.fieldRepo.save(field);
  }

  async activateBuilding(
    colony: Colony,
    field: ColonyField,
    definition: BuildingDef,
  ): Promise<ColonyField> {
    if (this.hasHighDamage(field)) {
      throw new BadRequestException('Building is too damaged to activate');
    }
    await this.activateBuildingStats(colony, definition);
    field.isActive = true;
    return this.fieldRepo.save(field);
  }

  async deactivateBuilding(
    colony: Colony,
    field: ColonyField,
    definition: BuildingDef,
  ): Promise<ColonyField> {
    await this.deactivateBuildingStats(colony, definition);
    field.isActive = false;
    return this.fieldRepo.save(field);
  }

  hasHighDamage(field: ColonyField): boolean {
    if (field.maxIntegrity <= 0) return false;
    return Math.round((100 / field.maxIntegrity) * field.integrity) < 50;
  }

  async activateBuildingStats(
    colony: Colony,
    definition: BuildingDef,
  ): Promise<void> {
    const changeable = getColonyChangeable(colony);
    const workerAmount = definition.bevUse || 0;
    const housingAmount = definition.bevPro || 0;
    changeable.workless = Math.max(0, changeable.workless - workerAmount);
    changeable.workers += workerAmount;
    changeable.maxPopulation =
      (changeable.maxPopulation ?? colony.populationMax ?? 0) + housingAmount;
    syncLegacyColonySnapshot(colony);
    await this.changeableRepo.save(changeable);
  }

  async deactivateBuildingStats(
    colony: Colony,
    definition: BuildingDef,
  ): Promise<void> {
    const changeable = getColonyChangeable(colony);
    const workerAmount = Math.min(changeable.workers, definition.bevUse || 0);
    const housingAmount = definition.bevPro || 0;
    changeable.workers -= workerAmount;
    changeable.workless += workerAmount;
    changeable.maxPopulation = Math.max(
      0,
      (changeable.maxPopulation ?? colony.populationMax ?? 0) - housingAmount,
    );
    syncLegacyColonySnapshot(colony);
    await this.changeableRepo.save(changeable);
  }

  prepareBuildJob(
    field: ColonyField,
    buildingId: number,
    buildTimeSeconds: number,
    activateAfterBuild = true,
  ): ColonyField {
    field.buildingId = buildingId;
    field.isBuilding = true;
    field.isActive = false;
    field.buildProgress = 0;
    field.integrity = 0;
    field.maxIntegrity = 0;
    field.activateAfterBuild = activateAfterBuild;
    field.buildFinishesAt = new Date(
      Date.now() + this.scaleBuildTimeSeconds(buildTimeSeconds) * 1000,
    );
    return field;
  }

  private scaleBuildTimeSeconds(seconds: number): number {
    const multiplier = this.getBuildTimeMultiplier();
    return Math.max(1, Math.round(seconds * multiplier));
  }

  private getBuildTimeMultiplier(): number {
    const configured = Number(this.config.get('GAME_BUILD_TIME_MULTIPLIER'));
    return Number.isFinite(configured) && configured > 0 ? configured : 1;
  }

  repairBuilding(field: ColonyField): ColonyField {
    field.integrity = field.maxIntegrity;
    return field;
  }

  clearBuilding(field: ColonyField): ColonyField {
    field.buildingId = null;
    field.isActive = true;
    field.isBuilding = false;
    field.buildProgress = 0;
    field.buildFinishesAt = null;
    field.integrity = 0;
    field.maxIntegrity = 0;
    field.activateAfterBuild = true;
    field.reactivateAfterUpgrade = null;
    return field;
  }
}
