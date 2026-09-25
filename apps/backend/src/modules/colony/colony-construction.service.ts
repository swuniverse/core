import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
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
  deductColonyEnergy,
  getColonyChangeable,
} from './colony-stats.service';
import { ColonyStorageService } from './colony-storage.service';
import { ColonyTimingService } from './colony-timing.service';
import { COLONY_BUILDING_ID_SETS } from './colony.constants';
import {
  ColonyEventSeverity,
  ColonyEventType,
} from './entities/colony-event.entity';
import { ColonyField } from './entities/colony-field.entity';
import { ColonyStorage } from './entities/colony-storage.entity';
import { Colony } from './entities/colony.entity';

@Injectable()
export class ColonyConstructionService {
  private readonly headquartersBuildingIds =
    COLONY_BUILDING_ID_SETS.HEADQUARTERS;

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
    @Optional()
    @InjectDataSource()
    private readonly dataSource?: DataSource,
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
    activateAfterBuild = true,
  ): Promise<ColonyField> {
    if (this.dataSource) {
      return this.dataSource.transaction((manager) =>
        this.buildWithManager(
          colonyId,
          userId,
          fieldIndex,
          buildingId,
          activateAfterBuild,
          manager,
        ),
      );
    }
    return this.buildWithManager(
      colonyId,
      userId,
      fieldIndex,
      buildingId,
      activateAfterBuild,
    );
  }

  private async buildWithManager(
    colonyId: number,
    userId: number,
    fieldIndex: number,
    buildingId: number,
    activateAfterBuild: boolean,
    manager?: EntityManager,
  ): Promise<ColonyField> {
    let colony: Colony | null;
    if (manager) {
      const repository = manager.getRepository(Colony);
      const lockedColony = await repository.findOne({
        where: { id: colonyId, userId, isAbandoned: false },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedColony) throw new NotFoundException('Colony not found');
      colony = await repository.findOne({
        where: { id: colonyId, userId, isAbandoned: false },
        relations: ['fields', 'storage', 'stats', 'changeable'],
      });
    } else {
      colony = await this.findOne(colonyId, userId);
    }
    if (!colony) throw new NotFoundException('Colony not found');
    const field = colony.fields.find((f) => f.fieldIndex === fieldIndex);
    if (!field) throw new NotFoundException('Field not found');
    if (field.terraformingId) {
      throw new BadRequestException(
        'Cannot build on a field being terraformed',
      );
    }
    if (field.buildingId && this.isHeadquartersField(field)) {
      throw new BadRequestException('Cannot replace headquarters');
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

    await this.checkBuildingLimits(colony, userId, actualDef, manager);

    const currentDefinition = field.buildingId
      ? (this.gameData.getBuilding(field.buildingId) ?? null)
      : null;
    if (field.buildingId && !currentDefinition) {
      throw new BadRequestException('Unknown existing building');
    }

    await this.assertReplacementCostsAvailable(
      colony,
      field,
      actualDef,
      currentDefinition,
      manager,
    );
    this.assertReplacementEnergyAvailable(
      colony,
      field,
      actualDef,
      currentDefinition,
    );

    if (currentDefinition) {
      await this.removeBuilding(
        colony,
        field,
        currentDefinition,
        userId,
        true,
        manager,
      );
    }

    // ponytail: deposit check removed — balanceAndProduce() deactivates if deposits insufficient
    this.deductBuildEnergy(colony, actualDef);
    await this.deductBuildCosts(colony, actualDef.resourceCosts ?? [], manager);
    await (manager?.getRepository(Colony) ?? this.colonyRepo).save(colony);

    this.buildingLifecycleService.prepareBuildJob(
      field,
      actualBuildingId,
      actualDef.costs.buildTime,
      activateAfterBuild,
    );

    return (manager?.getRepository(ColonyField) ?? this.fieldRepo).save(field);
  }

  private async checkBuildingLimits(
    colony: Colony,
    userId: number,
    buildingDef: BuildingDef,
    manager?: EntityManager,
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
      const userColonies = await (
        manager?.getRepository(Colony) ?? this.colonyRepo
      ).find({
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

  private async assertReplacementCostsAvailable(
    colony: Colony,
    field: ColonyField,
    buildingDef: BuildingDef,
    currentDefinition: BuildingDef | null,
    manager?: EntityManager,
  ): Promise<void> {
    const refunds = currentDefinition
      ? this.getDemolitionRefunds(currentDefinition)
      : [];
    const maxStorage = this.colonyStatsService.calculateSummary(
      colony,
      currentDefinition ? new Set([field.id]) : new Set(),
    ).effectiveStorageMax;
    let freeStorage = Math.max(
      0,
      maxStorage -
        (await this.colonyStorageService.getStorageUsed(colony.id, manager)),
    );
    const availableRefunds = new Map<number, number>();
    for (const refund of refunds) {
      const amount = Math.min(refund.amount, freeStorage);
      availableRefunds.set(refund.commodityId, amount);
      freeStorage -= amount;
    }

    for (const cost of buildingDef.resourceCosts ?? []) {
      if (cost.amount <= 0) continue;
      const storage = await (
        manager?.getRepository(ColonyStorage) ?? this.storageRepo
      ).findOne({
        where: { colonyId: colony.id, commodityId: cost.commodityId },
      });
      const available =
        (storage?.amount ?? 0) + (availableRefunds.get(cost.commodityId) ?? 0);
      if (available < cost.amount) {
        const commodity = this.gameData.getCommodity(cost.commodityId);
        throw new BadRequestException(
          `Not enough ${commodity?.name || `resource #${cost.commodityId}`}: need ${cost.amount}, have ${available}`,
        );
      }
    }
  }

  private assertReplacementEnergyAvailable(
    colony: Colony,
    field: ColonyField,
    buildingDef: BuildingDef,
    currentDefinition: BuildingDef | null,
  ): void {
    const energyCost = buildingDef.epsCost || 0;
    const changeable = getColonyChangeable(colony);
    if (changeable.energy < energyCost) {
      throw new BadRequestException(
        `Not enough energy: need ${energyCost}, have ${changeable.energy}`,
      );
    }
    if (!currentDefinition) return;

    const energyMaxAfterRemoval = this.colonyStatsService.calculateSummary(
      colony,
      new Set([field.id]),
    ).effectiveState.energy.max;
    if (
      changeable.energy > energyMaxAfterRemoval &&
      energyMaxAfterRemoval < energyCost
    ) {
      throw new BadRequestException(
        'Not enough energy remains after demolishing the existing building',
      );
    }
  }

  private deductBuildEnergy(colony: Colony, buildingDef: BuildingDef): void {
    const epsCost = buildingDef.epsCost || 0;
    if (epsCost <= 0) return;
    const changeable = getColonyChangeable(colony);
    deductColonyEnergy(
      colony,
      epsCost,
      `Not enough energy: need ${epsCost}, have ${changeable.energy}`,
    );
  }

  private async deductBuildCosts(
    colony: Colony,
    resourceCosts: Array<{ commodityId: number; amount: number }>,
    manager?: EntityManager,
  ): Promise<void> {
    const costMap: [number, number][] = resourceCosts.map((cost) => [
      cost.commodityId,
      cost.amount,
    ]);

    for (const [commodityId, required] of costMap) {
      if (required <= 0) continue;
      const storage = await (
        manager?.getRepository(ColonyStorage) ?? this.storageRepo
      ).findOne({
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
        manager,
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
        amount: Math.ceil(cost.amount / 2),
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
      throw new BadRequestException(
        result.reason ?? 'Aktivierung fehlgeschlagen',
      );
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
    if (
      energyAfter < 0 &&
      getColonyChangeable(colony).energy + energyAfter < 0
    ) {
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
    definition: BuildingDef,
    manager?: EntityManager,
  ): Promise<ColonyField[]> {
    const deactivated: ColonyField[] = [];
    const dependentCommodityIds = new Set(
      (definition.production ?? [])
        .filter(
          (production) =>
            production.amount > 0 &&
            (production.commodityId === 1801 || production.commodityId === 1802),
        )
        .map((production) => production.commodityId),
    );

    if (dependentCommodityIds.size === 0) return deactivated;

    for (const victim of colony.fields ?? []) {
      if (
        !victim.isActive ||
        victim.isBuilding ||
        this.isHeadquartersField(victim)
      ) {
        continue;
      }
      const victimDefinition = this.gameData.getBuilding(victim.buildingId!);
      if (
        !victimDefinition ||
        !victimDefinition.production.some(
          (production) =>
            production.amount < 0 &&
            dependentCommodityIds.has(production.commodityId),
        )
      ) {
        continue;
      }
      await this.buildingLifecycleService.deactivateBuilding(
        colony,
        victim,
        victimDefinition,
        manager,
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

    return this.removeBuilding(colony, field, definition, userId, false);
  }

  private async removeBuilding(
    colony: Colony,
    field: ColonyField,
    definition: BuildingDef,
    userId: number,
    allowUnderConstruction: boolean,
    manager?: EntityManager,
  ): Promise<ColonyField> {
    if (field.isBuilding && !allowUnderConstruction) {
      throw new BadRequestException(
        'Cannot demolish a building under construction',
      );
    }

    const deactivatedFields: ColonyField[] = [];
    if (!field.isBuilding && field.isActive) {
      await this.buildingLifecycleService.deactivateBuilding(
        colony,
        field,
        definition,
        manager,
      );
      deactivatedFields.push(field);
    }
    if (!field.isBuilding) {
      deactivatedFields.push(
        ...(await this.deactivateDependentBuildings(
          colony,
          definition,
          manager,
        )),
      );
    }

    this.buildingLifecycleService.clearBuilding(field);
    const saved = await (
      manager?.getRepository(ColonyField) ?? this.fieldRepo
    ).save(field);
    const storageMax =
      this.colonyStatsService.calculateSummary(colony).effectiveStorageMax;
    const recycled: Array<{ commodityId: number; amount: number }> = [];
    let currentStored = await this.colonyStorageService.getStorageUsed(
      colony.id,
      manager,
    );
    for (const refund of this.getDemolitionRefunds(definition)) {
      const stored = await this.colonyStorageService.upperStorage(
        colony,
        refund.commodityId,
        refund.amount,
        storageMax,
        manager,
      );
      if (stored > 0) {
        recycled.push({ commodityId: refund.commodityId, amount: stored });
        currentStored += stored;
      }
    }
    colony.storageUsed = currentStored;
    await (manager?.getRepository(Colony) ?? this.colonyRepo).save(colony);
    const event = {
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
    };
    if (manager) {
      await this.colonyEventService.createActionEvent(event, manager);
    } else {
      await this.colonyEventService.createActionEvent(event);
    }

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

    deductColonyEnergy(colony, repairPlan.energyCost);
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

    const selectedTerraforming = this.gameData.getTerraforming(terraformingId);
    if (
      !selectedTerraforming ||
      !this.getFieldTypeCandidates(field).includes(
        selectedTerraforming.fromFieldType,
      )
    ) {
      throw new BadRequestException('Invalid terraforming option');
    }
    const terraforming =
      this.gameData
        .getTerraformingForFieldType(field.terrainTileId ?? field.fieldType)
        .find(
          (option) =>
            this.normalizeFieldTypeCandidate(option.toFieldType) ===
            this.normalizeFieldTypeCandidate(selectedTerraforming.toFieldType),
        ) ?? selectedTerraforming;
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
    const changeable = getColonyChangeable(colony);
    if (terraforming.energyCost > changeable.energy) {
      throw new BadRequestException(
        `Not enough energy: need ${terraforming.energyCost}, have ${changeable.energy}`,
      );
    }

    await this.deductBuildCosts(colony, terraforming.costs);
    deductColonyEnergy(colony, terraforming.energyCost);
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
    const changeable = getColonyChangeable(colony);
    if (upgrade.energyCost > changeable.energy) {
      throw new BadRequestException(
        `Not enough energy: need ${upgrade.energyCost}, have ${changeable.energy}`,
      );
    }

    await this.deductBuildCosts(colony, upgrade.costs);
    deductColonyEnergy(colony, upgrade.energyCost);

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
      await this.deactivateDependentBuildings(colony, definition);
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
