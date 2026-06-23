import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BuildingDef } from '../game-data/game-data.service';
import { Colony } from './entities/colony.entity';
import { ColonyField } from './entities/colony-field.entity';
import { ColonyStats } from './entities/colony-stats.entity';

@Injectable()
export class BuildingLifecycleService {
  constructor(
    @InjectRepository(ColonyField)
    private readonly fieldRepo: Repository<ColonyField>,
    @InjectRepository(ColonyStats)
    private readonly statsRepo: Repository<ColonyStats>,
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

    if (activateAfterBuild && definition.isActivateable !== false) {
      const workerAmount = definition.bevUse || 0;
      const hasWorkers = !colony.stats || colony.stats.workless >= workerAmount;
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
    if (!colony.stats) return;
    const workerAmount = definition.bevUse || 0;
    const housingAmount = definition.bevPro || 0;
    colony.stats.workless = Math.max(0, colony.stats.workless - workerAmount);
    colony.stats.workers += workerAmount;
    colony.stats.maxPopulation =
      (colony.stats.maxPopulation ?? colony.populationMax ?? 0) + housingAmount;
    await this.statsRepo.save(colony.stats);
  }

  async deactivateBuildingStats(
    colony: Colony,
    definition: BuildingDef,
  ): Promise<void> {
    if (!colony.stats) return;
    const workerAmount = definition.bevUse || 0;
    const housingAmount = definition.bevPro || 0;
    colony.stats.workers = Math.max(0, colony.stats.workers - workerAmount);
    colony.stats.workless += workerAmount;
    colony.stats.maxPopulation = Math.max(
      0,
      (colony.stats.maxPopulation ?? colony.populationMax ?? 0) - housingAmount,
    );
    await this.statsRepo.save(colony.stats);
  }

  prepareBuildJob(
    field: ColonyField,
    buildingId: number,
    buildTimeSeconds: number,
  ): ColonyField {
    field.buildingId = buildingId;
    field.isBuilding = true;
    field.isActive = false;
    field.buildProgress = 0;
    field.integrity = 0;
    field.maxIntegrity = 0;
    field.activateAfterBuild = true;
    field.buildFinishesAt = new Date(Date.now() + buildTimeSeconds * 1000);
    return field;
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
