import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BuildingDef, GameDataService } from '../game-data/game-data.service';
import { UnlockResolverService } from '../research/unlock-resolver.service';
import { BuildingLifecycleService } from './building-lifecycle.service';
import { ColonyBuildingEffectsService } from './colony-building-effects.service';
import { ColonyBuildingManagementService } from './colony-building-management.service';
import { BuildingMassActionMode } from './colony-building-management.types';
import { ColonyEventService } from './colony-event.service';
import { ColonyOwnershipService } from './colony-ownership.service';
import {
  ColonyStatsService,
  ColonyInternalSummary,
  getColonyChangeable,
  syncLegacyColonySnapshot,
} from './colony-stats.service';
import { ColonyStorageService } from './colony-storage.service';
import { ColonyTimingService } from './colony-timing.service';
import { ColonyEventSeverity, ColonyEventType } from './entities/colony-event.entity';
import { ColonyField } from './entities/colony-field.entity';
import { ColonyStorage } from './entities/colony-storage.entity';
import { Colony } from './entities/colony.entity';

@Injectable()
export class ColonyConstructionService {
  private readonly headquartersBuildingIds = new Set([1, 82010100, 82010300]);

  constructor(
    @InjectRepository(Colony)
    private readonly colonyRepo: Repository<Colony>,
    @InjectRepository(ColonyField)
    private readonly fieldRepo: Repository<ColonyField>,
    @InjectRepository(ColonyStorage)
    private readonly storageRepo: Repository<ColonyStorage>,
    private readonly gameData: GameDataService,
    private readonly unlockResolver: UnlockResolverService,
    private readonly colonyStatsService: ColonyStatsService,
    private readonly colonyStorageService: ColonyStorageService,
    private readonly buildingLifecycleService: BuildingLifecycleService,
    private readonly buildingManagementService: ColonyBuildingManagementService,
    private readonly colonyEventService: ColonyEventService,
    private readonly ownership: ColonyOwnershipService,
    private readonly timing: ColonyTimingService,
    private readonly buildingEffectsService?: ColonyBuildingEffectsService,
  ) {}

  private async findOne(colonyId: number, userId: number): Promise<Colony> {
    return this.ownership.findOwnedColony(colonyId, userId);
  }

  async getAvailableBuildings(userId: number, fieldType?: number) {
    const buildings = fieldType
      ? this.gameData.getBuildingsForFieldTypes(
          this.getFieldTypeCandidatesFromType(fieldType),
        )
      : this.gameData
          .getAllBuildings()
          .filter(
            (building) =>
              building.visible !== false &&
              building.allowedFieldTypes.length > 0,
          );
    const result = [];
    for (const building of buildings) {
      if (await this.unlockResolver.isBuildingUnlocked(userId, building.id)) {
        result.push(building);
      }
    }
    return result;
  }

  async activateBuildings(
    colonyId: number,
    userId: number,
    mode: BuildingMassActionMode,
    options: { fieldIndexes?: number[]; commodityId?: number } = {},
  ) {
    const colony = await this.findOne(colonyId, userId);
    return this.buildingManagementService.activateBuildings(
      colony,
      mode,
      options,
    );
  }

  async deactivateBuildings(
    colonyId: number,
    userId: number,
    mode: BuildingMassActionMode,
    options: { fieldIndexes?: number[]; commodityId?: number } = {},
  ) {
    const colony = await this.findOne(colonyId, userId);
    return this.buildingManagementService.deactivateBuildings(
      colony,
      mode,
      options,
    );
  }

  async build(
    colonyId: number,
    userId: number,
    fieldIndex: number,
    buildingId: number,
  ): Promise<ColonyField> {
    const colony = await this.findOne(colonyId, userId);
    const field = colony.fields.find((f) => f.fieldIndex === fieldIndex);
    if (!field) throw new NotFoundException('Field not found');
    if (field.buildingId && !field.isBuilding) {
      throw new BadRequestException('Field already has a building');
    }

    const buildingDef = this.gameData.getBuilding(buildingId);
    if (!buildingDef) {
      throw new BadRequestException('Unknown building type');
    }

    if (!this.isBuildingAllowedOnField(buildingDef, field)) {
      throw new BadRequestException(
        'Building cannot be placed on this terrain',
      );
    }
    this.assertOrbitAllowed(colony, field, 'build in orbit');

    if (buildingDef.researchId != null) {
      const unlocked = await this.unlockResolver.isBuildingUnlocked(
        userId,
        buildingId,
      );
      if (!unlocked) {
        throw new BadRequestException(
          `Research required: ${buildingDef.researchRequired || buildingDef.researchId}`,
        );
      }
    }

    const fieldBuildRule = this.gameData.getFieldBuildRuleForFieldTypes(
      buildingId,
      this.getFieldTypeCandidates(field),
    );
    if (fieldBuildRule?.researchId != null) {
      const hasFieldResearch = await this.unlockResolver.hasTech(
        userId,
        fieldBuildRule.researchId,
      );
      if (!hasFieldResearch) {
        throw new BadRequestException(
          `Research required for this terrain: ${fieldBuildRule.researchId}`,
        );
      }
    }

    const actualBuildingId = this.resolveFieldAlternative(buildingDef, field);
    const actualDef =
      actualBuildingId !== buildingId
        ? (this.gameData.getBuilding(actualBuildingId) ?? buildingDef)
        : buildingDef;

    await this.checkBuildingLimits(colony, userId, actualDef);

    // ponytail: deposit check removed — balanceAndProduce() deactivates if deposits insufficient
    this.deductBuildEnergy(colony, buildingDef);
    await this.deductBuildCosts(colony, buildingDef.resourceCosts ?? []);
    await this.colonyRepo.save(colony);

    this.buildingLifecycleService.prepareBuildJob(
      field,
      actualBuildingId,
      buildingDef.costs.buildTime,
    );

    return this.fieldRepo.save(field);
  }

  private async checkBuildingLimits(
    colony: Colony,
    userId: number,
    buildingDef: BuildingDef,
  ): Promise<void> {
    const colonyLimit = buildingDef.colonyLimit ?? buildingDef.bclimit ?? 0;
    const globalLimit = buildingDef.globalLimit ?? buildingDef.blimit ?? 0;

    if (colonyLimit > 0) {
      const colonyCount = (colony.fields ?? []).filter(
        (field) => field.buildingId === buildingDef.id,
      ).length;
      if (colonyCount >= colonyLimit) {
        throw new BadRequestException(
          `This building is limited to ${colonyLimit} per colony`,
        );
      }
    }

    if (globalLimit > 0) {
      const userColonies = await this.colonyRepo.find({
        where: { userId },
        relations: ['fields'],
      });
      const userCount = userColonies.reduce(
        (count, userColony) =>
          count +
          (userColony.fields ?? []).filter(
            (field) => field.buildingId === buildingDef.id,
          ).length,
        0,
      );
      if (userCount >= globalLimit) {
        throw new BadRequestException(
          `This building is limited to ${globalLimit} per user`,
        );
      }
    }
  }

  private deductBuildEnergy(colony: Colony, buildingDef: BuildingDef): void {
    const epsCost = buildingDef.epsCost || 0;
    if (epsCost <= 0) return;
    const changeable = getColonyChangeable(colony);
    if (changeable.energy < epsCost) {
      throw new BadRequestException(
        `Not enough energy: need ${epsCost}, have ${changeable.energy}`,
      );
    }
    changeable.energy -= epsCost;
    syncLegacyColonySnapshot(colony);
  }

  private async deductBuildCosts(
    colony: Colony,
    resourceCosts: Array<{ commodityId: number; amount: number }>,
  ): Promise<void> {
    const costMap: [number, number][] = resourceCosts.map((cost) => [
      cost.commodityId,
      cost.amount,
    ]);

    for (const [commodityId, required] of costMap) {
      if (required <= 0) continue;
      const storage = await this.storageRepo.findOne({
        where: { colonyId: colony.id, commodityId },
      });
      const available = storage?.amount || 0;
      if (available < required) {
        const commodity = this.gameData.getCommodity(commodityId);
        throw new BadRequestException(
          `Not enough ${commodity?.name || `resource #${commodityId}`}: need ${required}, have ${available}`,
        );
      }
    }

    for (const [commodityId, required] of costMap) {
      if (required <= 0) continue;
      await this.colonyStorageService.lowerStorage(
        colony,
        commodityId,
        required,
      );
    }
  }

  private getFieldTypeCandidates(field: ColonyField): number[] {
    return this.getFieldTypeCandidatesFromType(
      field.fieldType,
      field.terrainTileId ?? undefined,
    );
  }

  private getFieldTypeCandidatesFromType(
    fieldType: number,
    terrainTileId?: number,
  ): number[] {
    const normalizedFieldType = this.normalizeFieldTypeCandidate(fieldType);
    return [terrainTileId, fieldType, normalizedFieldType].filter(
      (candidate, index, values): candidate is number =>
        candidate != null && values.indexOf(candidate) === index,
    );
  }

  private normalizeFieldTypeCandidate(fieldType: number): number {
    return fieldType >= 10000 ? Math.floor(fieldType / 100) : fieldType;
  }

  private isBuildingAllowedOnField(
    buildingDef: BuildingDef,
    field: ColonyField,
  ): boolean {
    return this.getFieldTypeCandidates(field).some((fieldType) =>
      buildingDef.allowedFieldTypes.includes(fieldType),
    );
  }

  private resolveFieldAlternative(
    buildingDef: BuildingDef,
    field: ColonyField,
  ): number {
    if (!buildingDef.fieldAlternatives?.length) return buildingDef.id;
    for (const fieldType of this.getFieldTypeCandidates(field)) {
      const alt = buildingDef.fieldAlternatives.find(
        (alternative) => alternative.fieldtype === fieldType,
      );
      if (alt) return alt.alternateBuildingId;
    }
    return buildingDef.id;
  }

  private getDemolitionRefunds(
    definition: BuildingDef,
  ): Array<{ commodityId: number; amount: number }> {
    return (definition.resourceCosts ?? [])
      .map((cost) => ({
        commodityId: cost.commodityId,
        amount: Math.floor(cost.amount / 2),
      }))
      .filter((cost) => cost.amount > 0);
  }

  private getUnavailableEffectCommodity(
    summary: ColonyInternalSummary,
    definition: BuildingDef,
  ): { commodityId: number; available: number } | null {
    for (const production of definition.production ?? []) {
      if (production.amount >= 0) continue;
      const commodity = this.gameData.getCommodity(production.commodityId);
      if (!commodity || commodity.isSaveable || commodity.isDeposit) continue;

      const available =
        summary.productionDelta.get(production.commodityId) ?? 0;
      if (available + production.amount < 0) {
        return { commodityId: production.commodityId, available };
      }
    }

    return null;
  }

  private assertCanActivateBuilding(
    colony: Colony,
    field: ColonyField,
    _definition: BuildingDef,
  ): void {
    const result = this.buildingEffectsService?.canActivateField(colony, field);
    if (result && !result.ok) {
      throw new BadRequestException(result.reason ?? 'Aktivierung fehlgeschlagen');
    }
    if (result?.ok) return;

    const summaryWithoutField = this.colonyStatsService.calculateSummary(
      colony,
      new Set([field.id]),
    );
    const availableWorkers =
      summaryWithoutField.effectiveState.population.available;
    if ((_definition.bevUse || 0) > availableWorkers) {
      throw new BadRequestException('Nicht genug freie Arbeiter');
    }

    const energyAfter =
      summaryWithoutField.energyDelta + (_definition.epsProc || 0);
    if (energyAfter < 0 && colony.energy + energyAfter < 0) {
      throw new BadRequestException('Nicht genug Energie');
    }

    const missingEffectCommodity = this.getUnavailableEffectCommodity(
      summaryWithoutField,
      _definition,
    );
    if (missingEffectCommodity) {
      const commodity = this.gameData.getCommodity(
        missingEffectCommodity.commodityId,
      );
      throw new BadRequestException(
        `Nicht genug ${commodity?.name ?? 'Effekt-Ressource'} verfügbar (${missingEffectCommodity.available} vorhanden)`,
      );
    }
  }

  private async deactivateDependentBuildings(
    colony: Colony,
    fieldToRemove: ColonyField,
  ): Promise<ColonyField[]> {
    const deactivated: ColonyField[] = [];

    for (let round = 0; round < 100; round++) {
      const summary = this.colonyStatsService.calculateSummary(
        colony,
        new Set([fieldToRemove.id, ...deactivated.map((field) => field.id)]),
      );
      let victim: ColonyField | null = null;

      for (const field of summary.activeFields) {
        if (field.id === fieldToRemove.id || this.isHeadquartersField(field)) {
          continue;
        }
        const definition = this.gameData.getBuilding(field.buildingId!);
        if (!definition) continue;
        const missingEffectCommodity = this.getUnavailableEffectCommodity(
          summary,
          definition,
        );
        if (missingEffectCommodity) {
          victim = field;
          break;
        }
      }

      if (!victim) break;
      const victimDefinition = this.gameData.getBuilding(victim.buildingId!);
      if (!victimDefinition) break;
      await this.buildingLifecycleService.deactivateBuilding(
        colony,
        victim,
        victimDefinition,
      );
      deactivated.push(victim);
    }

    return deactivated;
  }

  async demolish(
    colonyId: number,
    userId: number,
    fieldIndex: number,
  ): Promise<ColonyField> {
    const colony = await this.findOne(colonyId, userId);
    const field = colony.fields.find((f) => f.fieldIndex === fieldIndex);
    if (!field) throw new NotFoundException('Field not found');
    if (!field.buildingId) {
      throw new BadRequestException('No building on this field');
    }
    if (this.isHeadquartersField(field)) {
      throw new BadRequestException('Cannot demolish headquarters');
    }
    if (field.isBuilding) {
      throw new BadRequestException(
        'Cannot demolish a building under construction',
      );
    }

    const definition = this.gameData.getBuilding(field.buildingId);
    if (!definition) {
      throw new BadRequestException('Unknown building');
    }

    const deactivatedFields: ColonyField[] = [];
    if (field.isActive) {
      await this.buildingLifecycleService.deactivateBuilding(
        colony,
        field,
        definition,
      );
      deactivatedFields.push(field);
    }
    deactivatedFields.push(
      ...(await this.deactivateDependentBuildings(colony, field)),
    );

    this.buildingLifecycleService.clearBuilding(field);
    const saved = await this.fieldRepo.save(field);

    const storageMax =
      this.colonyStatsService.calculateSummary(colony).effectiveStorageMax;
    const recycled: Array<{ commodityId: number; amount: number }> = [];
    let currentStored = await this.colonyStorageService.getStorageUsed(
      colony.id,
    );
    for (const refund of this.getDemolitionRefunds(definition)) {
      const stored = await this.colonyStorageService.upperStorage(
        colony,
        refund.commodityId,
        refund.amount,
        storageMax,
      );
      if (stored > 0) {
        recycled.push({ commodityId: refund.commodityId, amount: stored });
        currentStored += stored;
      }
    }
    colony.storageUsed = currentStored;
    await this.colonyRepo.save(colony);
    await this.colonyEventService.createActionEvent({
      colonyId: colony.id,
      userId,
      type: ColonyEventType.BUILDING_DESTROYED,
      severity: ColonyEventSeverity.INFO,
      title: 'Gebäude abgerissen',
      message: `${definition.name} auf Feld ${field.fieldIndex} wurde abgerissen.`,
      payload: {
        fieldIndex: field.fieldIndex,
        buildingId: definition.id,
        recycled,
        deactivatedFieldIndexes: deactivatedFields
          .filter((entry) => entry.id !== field.id)
          .map((entry) => entry.fieldIndex),
      },
    });

    return saved;
  }

  async repairBuilding(
    colonyId: number,
    userId: number,
    fieldIndex: number,
  ): Promise<ColonyField> {
    const colony = await this.findOne(colonyId, userId);
    const field = colony.fields.find((f) => f.fieldIndex === fieldIndex);
    if (!field) throw new NotFoundException('Field not found');
    if (!field.buildingId || field.isBuilding) {
      throw new BadRequestException('No completed building on this field');
    }
    if (field.maxIntegrity <= 0 || field.integrity >= field.maxIntegrity) {
      throw new BadRequestException('Building is not damaged');
    }
    this.assertOrbitAllowed(colony, field, 'repair orbital buildings');

    const repairPlan = this.buildingManagementService.calculateRepairPlan(
      colony,
      field,
      { checkStorageAvailability: false },
    );
    if (!repairPlan.repairable) {
      throw new BadRequestException(
        repairPlan.reason ?? 'Building is not repairable',
      );
    }
    await this.deductBuildCosts(colony, repairPlan.costs);

    colony.energy -= repairPlan.energyCost;
    await this.colonyRepo.save(colony);

    this.buildingLifecycleService.repairBuilding(field);
    const saved = await this.fieldRepo.save(field);
    await this.colonyEventService.createActionEvent({
      colonyId: colony.id,
      userId,
      type: ColonyEventType.BUILDING_REPAIRED,
      severity: ColonyEventSeverity.INFO,
      title: 'Gebäude repariert',
      message: `${repairPlan.buildingName} auf Feld ${field.fieldIndex} wurde repariert.`,
      payload: { fieldIndex: field.fieldIndex, buildingId: field.buildingId },
    });
    return saved;
  }

  async getBuildingRepairPreview(
    colonyId: number,
    userId: number,
    fieldIndexes?: number[],
  ) {
    const colony = await this.findOne(colonyId, userId);
    return this.buildingManagementService.getRepairPreview(
      colony,
      fieldIndexes,
    );
  }

  async repairDamagedBuildings(
    colonyId: number,
    userId: number,
    fieldIndexes?: number[],
  ) {
    const colony = await this.findOne(colonyId, userId);
    const result = await this.buildingManagementService.repairDamagedBuildings(
      colony,
      fieldIndexes,
    );
    await this.colonyRepo.save(colony);
    await this.colonyEventService.createActionEvent({
      colonyId: colony.id,
      userId,
      type: ColonyEventType.BUILDINGS_REPAIRED,
      severity:
        result.skipped.length > 0
          ? ColonyEventSeverity.WARNING
          : ColonyEventSeverity.INFO,
      title: 'Gebäudereparatur abgeschlossen',
      message: `${result.repaired.length} Gebäude repariert, ${result.skipped.length} übersprungen.`,
      payload: result as unknown as Record<string, unknown>,
    });
    return result;
  }

  async terraformField(
    colonyId: number,
    userId: number,
    fieldIndex: number,
    terraformingId: number,
  ): Promise<ColonyField> {
    const colony = await this.findOne(colonyId, userId);
    const field = colony.fields.find((f) => f.fieldIndex === fieldIndex);
    if (!field) throw new NotFoundException('Field not found');
    if (field.buildingId || field.isBuilding) {
      throw new BadRequestException('Cannot terraform a field with a building');
    }
    if (field.terraformingId) {
      throw new BadRequestException('Field is already being terraformed');
    }

    const terraforming = this.gameData.getTerraforming(terraformingId);
    if (!terraforming || terraforming.fromFieldType !== field.fieldType) {
      throw new BadRequestException('Invalid terraforming option');
    }
    if (terraforming.researchId != null) {
      const hasResearch = await this.unlockResolver.hasTech(
        userId,
        terraforming.researchId,
      );
      if (!hasResearch) {
        throw new BadRequestException(
          `Research required: ${terraforming.researchId}`,
        );
      }
    }
    if (terraforming.energyCost > colony.energy) {
      throw new BadRequestException(
        `Not enough energy: need ${terraforming.energyCost}, have ${colony.energy}`,
      );
    }

    await this.deductBuildCosts(colony, terraforming.costs);
    colony.energy -= terraforming.energyCost;
    field.terraformingId = terraforming.id;
    field.terraformingFinishesAt = this.timing.dateAfterScaledSeconds(
      terraforming.duration,
    );
    await this.colonyRepo.save(colony);
    return this.fieldRepo.save(field);
  }

  async upgradeBuilding(
    colonyId: number,
    userId: number,
    fieldIndex: number,
    upgradeId: number,
  ): Promise<ColonyField> {
    const colony = await this.findOne(colonyId, userId);
    const field = colony.fields.find((f) => f.fieldIndex === fieldIndex);
    if (!field) throw new NotFoundException('Field not found');
    if (!field.buildingId || field.isBuilding) {
      throw new BadRequestException('No completed building on this field');
    }

    this.assertOrbitAllowed(colony, field, 'upgrade orbital buildings');

    const upgrade = this.gameData.getBuildingUpgrade(upgradeId);
    if (!upgrade || upgrade.fromBuildingId !== field.buildingId) {
      throw new BadRequestException('Invalid building upgrade');
    }
    if (upgrade.researchId != null && upgrade.researchId > 0) {
      const hasResearch = await this.unlockResolver.hasTech(
        userId,
        upgrade.researchId,
      );
      if (!hasResearch) {
        throw new BadRequestException(
          `Research required: ${upgrade.researchId}`,
        );
      }
    }

    const currentDefinition = this.gameData.getBuilding(field.buildingId);
    const targetDefinition = this.gameData.getBuilding(upgrade.toBuildingId);
    if (!currentDefinition || !targetDefinition) {
      throw new BadRequestException('Unknown building upgrade target');
    }
    if (upgrade.energyCost > colony.energy) {
      throw new BadRequestException(
        `Not enough energy: need ${upgrade.energyCost}, have ${colony.energy}`,
      );
    }

    await this.deductBuildCosts(colony, upgrade.costs);
    colony.energy -= upgrade.energyCost;

    const wasActive = field.isActive;
    if (wasActive) {
      await this.buildingLifecycleService.deactivateBuilding(
        colony,
        field,
        currentDefinition,
      );
    }

    field.activateAfterBuild = wasActive;
    field.reactivateAfterUpgrade = wasActive ? field.id : null;
    this.buildingLifecycleService.prepareBuildJob(
      field,
      upgrade.toBuildingId,
      targetDefinition.costs.buildTime,
    );
    field.activateAfterBuild = wasActive;
    await this.colonyRepo.save(colony);
    return this.fieldRepo.save(field);
  }

  async toggleBuilding(
    colonyId: number,
    userId: number,
    fieldIndex: number,
  ): Promise<ColonyField> {
    const colony = await this.findOne(colonyId, userId);
    const field = colony.fields.find((f) => f.fieldIndex === fieldIndex);
    if (!field) throw new NotFoundException('Field not found');
    if (!field.buildingId || field.isBuilding) {
      throw new BadRequestException('No completed building on this field');
    }
    if (this.isHeadquartersField(field)) {
      throw new BadRequestException('Cannot deactivate headquarters');
    }

    const definition = this.gameData.getBuilding(field.buildingId);
    if (!definition) {
      throw new BadRequestException('Unknown building');
    }

    if (field.isActive) {
      await this.buildingLifecycleService.deactivateBuilding(
        colony,
        field,
        definition,
      );
      await this.deactivateDependentBuildings(colony, field);
      return field;
    } else {
      this.assertCanActivateBuilding(colony, field, definition);

      return this.buildingLifecycleService.activateBuilding(
        colony,
        field,
        definition,
      );
    }
  }

  private assertOrbitAllowed(
    colony: Colony,
    field: ColonyField,
    action: string,
  ): void {
    if (this.isOrbitField(field) && colony.stats?.isBlockaded) {
      throw new BadRequestException(
        `Cannot ${action} while colony is blockaded`,
      );
    }
  }

  private isOrbitField(field: ColonyField): boolean {
    return field.fieldType >= 900 && field.fieldType < 1000;
  }

  private isHeadquartersField(field: ColonyField): boolean {
    return (
      !!field.buildingId && this.headquartersBuildingIds.has(field.buildingId)
    );
  }
}
