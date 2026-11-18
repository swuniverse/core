import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BuildingDef, GameDataService } from '../game-data/game-data.service';
import { Colony } from './entities/colony.entity';
import { housingYieldFactor } from './colony-bonus-marker.util';
import { ColonyField } from './entities/colony-field.entity';
import { ColonyChangeable } from './entities/colony-changeable.entity';
import {
  adjustColonyPopulationParts,
  getColonyChangeable,
  setColonyMaxPopulation,
} from './colony-stats.service';
import type { BuildingFunctionHooksService } from './building-function-hooks.service';
import { ColonyBuildingEffectsService } from './colony-building-effects.service';

export interface BuildingCompletionResult {
  field: ColonyField;
  activationReason?: string;
  reactivatedCount: number;
}

@Injectable()
export class BuildingLifecycleService {
  constructor(
    @InjectRepository(ColonyField)
    private readonly fieldRepo: Repository<ColonyField>,
    @InjectRepository(ColonyChangeable)
    private readonly changeableRepo: Repository<ColonyChangeable>,
    private readonly config: ConfigService,
    @Optional() private readonly gameData?: GameDataService,
    @Optional() private readonly functionHooks?: BuildingFunctionHooksService,
    @Optional() private readonly buildingEffects?: ColonyBuildingEffectsService,
  ) {}

  async finishBuilding(
    colony: Colony,
    field: ColonyField,
    definition: BuildingDef,
    activateAfterBuild = true,
  ): Promise<ColonyField> {
    return (
      await this.finishBuildingWithReactivation(
        colony,
        field,
        definition,
        activateAfterBuild,
      )
    ).field;
  }

  async finishBuildingWithReactivation(
    colony: Colony,
    field: ColonyField,
    definition: BuildingDef,
    activateAfterBuild = true,
  ): Promise<BuildingCompletionResult> {
    field.isBuilding = false;
    field.buildProgress = 100;
    field.buildFinishesAt = null;
    field.maxIntegrity = definition.integrity || field.maxIntegrity || 0;
    field.integrity = field.maxIntegrity;
    field.isActive = false;
    field.reactivateAfterUpgrade = null;

    const activationReason = activateAfterBuild
      ? this.getActivationBlockReason(colony, field, definition)
      : 'Automatische Aktivierung deaktiviert';
    if (!activationReason) {
      await this.activateBuilding(colony, field, definition);
    }

    const saved = await this.fieldRepo.save(field);
    let reactivatedCount = 0;
    for (const dependent of (colony.fields ?? [])
      .filter(
        (candidate) =>
          field.id != null &&
          candidate.id !== field.id &&
          candidate.reactivateAfterUpgrade === field.id,
      )
      .sort((a, b) => a.fieldIndex - b.fieldIndex)) {
      const dependentDefinition = dependent.buildingId
        ? this.gameData?.getBuilding(dependent.buildingId)
        : undefined;
      if (
        field.isActive &&
        !dependent.isActive &&
        !dependent.isBuilding &&
        dependentDefinition &&
        !this.getActivationBlockReason(colony, dependent, dependentDefinition)
      ) {
        await this.activateBuilding(colony, dependent, dependentDefinition);
        reactivatedCount += 1;
      }
      dependent.reactivateAfterUpgrade = null;
      await this.fieldRepo.save(dependent);
    }
    return { field: saved, activationReason, reactivatedCount };
  }

  async clearUpgradeReactivationMarkers(
    colony: Colony,
    upgradedFieldId: number,
    manager?: EntityManager,
  ): Promise<void> {
    for (const field of colony.fields ?? []) {
      if (field.reactivateAfterUpgrade !== upgradedFieldId) continue;
      field.reactivateAfterUpgrade = null;
      await (manager?.getRepository(ColonyField) ?? this.fieldRepo).save(field);
    }
  }

  private getActivationBlockReason(
    colony: Colony,
    field: ColonyField,
    definition: BuildingDef,
  ): string | undefined {
    if (this.hasHighDamage(field)) return 'Gebäude zu beschädigt';
    const availability = this.buildingEffects?.canActivateField(colony, field);
    if (availability) {
      return availability.ok
        ? undefined
        : availability.reason ?? 'Aktivierung nicht möglich';
    }
    return getColonyChangeable(colony).workless < (definition.bevUse || 0)
      ? 'Nicht genug freie Arbeiter'
      : undefined;
  }

  async activateBuilding(
    colony: Colony,
    field: ColonyField,
    definition: BuildingDef,
  ): Promise<ColonyField> {
    if (this.hasHighDamage(field)) {
      throw new BadRequestException('Building is too damaged to activate');
    }
    await this.activateBuildingStats(colony, definition, field);
    field.isActive = true;
    const saved = await this.fieldRepo.save(field);
    await this.functionHooks?.activate(
      colony,
      field,
      this.getBuildingFunctionIds(definition),
    );
    return saved;
  }

  async deactivateBuilding(
    colony: Colony,
    field: ColonyField,
    definition: BuildingDef,
    manager?: EntityManager,
  ): Promise<ColonyField> {
    await this.deactivateBuildingStats(colony, definition, field, manager);
    await this.functionHooks?.deactivate(
      colony,
      field,
      this.getBuildingFunctionIds(definition),
    );
    field.isActive = false;
    return (manager?.getRepository(ColonyField) ?? this.fieldRepo).save(field);
  }

  hasHighDamage(field: ColonyField): boolean {
    if (field.maxIntegrity <= 0) return false;
    return Math.round((100 / field.maxIntegrity) * field.integrity) < 50;
  }

  async activateBuildingStats(
    colony: Colony,
    definition: BuildingDef,
    field?: ColonyField,
  ): Promise<void> {
    const changeable = getColonyChangeable(colony);
    const workerAmount = definition.bevUse || 0;
    const housingAmount = (definition.bevPro || 0) * housingYieldFactor(field, this.gameData);
    adjustColonyPopulationParts(colony, workerAmount, -workerAmount);
    setColonyMaxPopulation(
      colony,
      (changeable.maxPopulation ?? colony.populationMax ?? 0) + housingAmount,
    );
    await this.changeableRepo.save(changeable);
  }

  async deactivateBuildingStats(
    colony: Colony,
    definition: BuildingDef,
    field?: ColonyField,
    manager?: EntityManager,
  ): Promise<void> {
    const changeable = getColonyChangeable(colony);
    const workerAmount = Math.min(changeable.workers, definition.bevUse || 0);
    const housingAmount = (definition.bevPro || 0) * housingYieldFactor(field, this.gameData);
    adjustColonyPopulationParts(colony, -workerAmount, workerAmount);
    setColonyMaxPopulation(
      colony,
      (changeable.maxPopulation ?? colony.populationMax ?? 0) - housingAmount,
    );
    await (
      manager?.getRepository(ColonyChangeable) ?? this.changeableRepo
    ).save(changeable);
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

  async destructBuilding(
    colony: Colony,
    field: ColonyField,
    definition: BuildingDef,
  ): Promise<void> {
    await this.functionHooks?.destruct(
      colony,
      field,
      this.getBuildingFunctionIds(definition),
    );
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

  private getBuildingFunctionIds(definition: BuildingDef): number[] {
    return definition.functions ?? this.gameData?.getBuildingFunctions(definition.id) ?? [];
  }
}
