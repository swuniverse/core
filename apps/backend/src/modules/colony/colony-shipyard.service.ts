import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { Repository } from 'typeorm';
import {
  GameDataService,
  HangarShipDef,
  ShipyardType,
} from '../game-data/game-data.service';
import { UnlockResolverService } from '../research/unlock-resolver.service';
import { ShipClassDef } from '../spacecraft/entities/ship-class-def.entity';
import { SpacecraftModule } from '../spacecraft/entities/spacecraft-module.entity';
import {
  AlertState,
  Spacecraft,
  SpacecraftStatus,
} from '../spacecraft/entities/spacecraft.entity';
import { SpacecraftStatsService } from '../spacecraft/spacecraft-stats.service';
import { ColonyCrewService } from './colony-crew.service';
import { ColonyEventService } from './colony-event.service';
import { ColonyOrbitService } from './colony-orbit.service';
import { ColonyOwnershipService } from './colony-ownership.service';
import {
  ColonyStatsService,
  getColonyChangeable,
} from './colony-stats.service';
import { ColonyStorageService } from './colony-storage.service';
import { ColonyTimingService } from './colony-timing.service';
import {
  ColonyEventSeverity,
  ColonyEventType,
} from './entities/colony-event.entity';
import { ColonyFabricationQueueType } from './entities/colony-fabrication-queue.entity';
import { ColonyField } from './entities/colony-field.entity';
import {
  ColonyShipBuildplan,
  ShipModuleSelection,
} from './entities/colony-ship-buildplan.entity';
import {
  ColonyShipBuildQueue,
  ColonyShipBuildQueueMode,
  ColonyShipBuildQueueStatus,
} from './entities/colony-ship-build-queue.entity';
import { ColonyStorage } from './entities/colony-storage.entity';
import { Colony } from './entities/colony.entity';

@Injectable()
export class ColonyShipyardService {
  private readonly legacyShipyardBuildingIds = new Set([
    11, 85010100, 85010300,
  ]);
  private readonly shipyardFunctionIds = new Set([5, 6, 7, 8, 21]);
  private readonly repairStationFunctionId = 22;
  private readonly repairSparePartCommodityId = 10001;
  private readonly repairSystemComponentCommodityId = 10002;

  constructor(
    @InjectRepository(ColonyStorage)
    private readonly storageRepo: Repository<ColonyStorage>,
    @InjectRepository(Spacecraft)
    private readonly shipRepo: Repository<Spacecraft>,
    @InjectRepository(ColonyShipBuildQueue)
    private readonly shipBuildQueueRepo: Repository<ColonyShipBuildQueue>,
    @InjectRepository(ColonyShipBuildplan)
    private readonly shipBuildplanRepo: Repository<ColonyShipBuildplan>,
    @InjectRepository(SpacecraftModule)
    private readonly spacecraftModuleRepo: Repository<SpacecraftModule>,
    @InjectRepository(ShipClassDef)
    private readonly shipClassRepo: Repository<ShipClassDef>,
    private readonly gameData: GameDataService,
    private readonly colonyOwnershipService: ColonyOwnershipService,
    private readonly colonyCrewService: ColonyCrewService,
    private readonly colonyStorageService: ColonyStorageService,
    private readonly colonyStatsService: ColonyStatsService,
    private readonly colonyOrbitService: ColonyOrbitService,
    private readonly colonyEventService: ColonyEventService,
    private readonly spacecraftStatsService: SpacecraftStatsService,
    private readonly unlockResolver: UnlockResolverService,
    private readonly timing: ColonyTimingService,
  ) {}

  async findOne(colonyId: number, userId: number): Promise<Colony> {
    const colony = await this.colonyOwnershipService.findOwnedColony(
      colonyId,
      userId,
    );
    if (!colony) throw new NotFoundException('Colony not found');
    return colony;
  }

  private hasActiveBuildingFunction(
    colony: Colony,
    functionId: number,
  ): boolean {
    return (colony.fields ?? []).some(
      (field) =>
        field.buildingId != null &&
        !field.isBuilding &&
        field.isActive &&
        this.gameData
          .getBuildingFunctions(field.buildingId)
          .includes(functionId),
    );
  }

  private calculateShipRepairPlan(
    colony: Colony,
    ship: Spacecraft,
    modules: SpacecraftModule[],
  ): {
    costs: Array<{ commodityId: number; amount: number }>;
    durationMinutes: number;
    hasRepairStationBonus: boolean;
  } {
    const hasRepairStationBonus = this.hasActiveBuildingFunction(
      colony,
      this.repairStationFunctionId,
    );
    const hullDamage = Math.max(0, ship.hullMax - ship.hull);
    const hullChunks = Math.ceil(hullDamage / 100);
    const damagedModules = modules.filter((module) => module.integrity < 100);
    const sparePartsAmount = Math.max(1, hullChunks + damagedModules.length);
    const systemComponentsAmount = Math.max(
      0,
      Math.ceil(damagedModules.length / 2),
    );
    const applyBonus = (amount: number) =>
      hasRepairStationBonus ? Math.ceil(amount / 2) : amount;
    const costs = [
      {
        commodityId: this.repairSparePartCommodityId,
        amount: applyBonus(sparePartsAmount),
      },
      {
        commodityId: this.repairSystemComponentCommodityId,
        amount: applyBonus(systemComponentsAmount),
      },
    ].filter((cost) => cost.amount > 0);
    const durationUnits = hullChunks + damagedModules.length;
    const durationMinutes = Math.max(1, applyBonus(Math.max(1, durationUnits)));

    return { costs, durationMinutes, hasRepairStationBonus };
  }

  private async hasActiveShipyardQueueForShip(
    colonyId: number,
    userId: number,
    spacecraftId: number,
  ): Promise<boolean> {
    const active = await this.shipBuildQueueRepo.findOne({
      where: {
        colonyId,
        userId,
        spacecraftId,
        status: ColonyShipBuildQueueStatus.QUEUED,
      },
    });
    return !!active;
  }

  private async deductBuildCosts(
    colony: Colony,
    costs: Array<{ commodityId: number; amount: number }>,
  ): Promise<void> {
    const costMap: [number, number][] = costs.map((cost) => [
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
    await Promise.all(
      costMap
        .filter(([, required]) => required > 0)
        .map(([commodityId, required]) =>
          this.colonyStorageService.lowerStorage(colony, commodityId, required),
        ),
    );
  }

  private getActiveRepairQueueCount(colonyId: number): Promise<number> {
    return this.shipBuildQueueRepo.count({
      where: {
        colonyId,
        mode: ColonyShipBuildQueueMode.REPAIR,
        status: ColonyShipBuildQueueStatus.QUEUED,
      },
    });
  }

  private async getPausedRepairJobs(
    colonyId: number,
  ): Promise<ColonyShipBuildQueue[]> {
    return this.shipBuildQueueRepo.find({
      where: {
        colonyId,
        mode: ColonyShipBuildQueueMode.REPAIR,
        status: ColonyShipBuildQueueStatus.PAUSED,
      },
      relations: ['shipClass'],
      order: { stoppedAt: 'ASC', id: 'ASC' },
    });
  }

  private getActiveRepairStationCount(colony: Colony): number {
    return (colony.fields ?? []).filter(
      (field) =>
        field.buildingId != null &&
        !field.isBuilding &&
        field.isActive &&
        this.gameData
          .getBuildingFunctions(field.buildingId)
          .includes(this.repairStationFunctionId),
    ).length;
  }

  private getActiveRepairSlotCount(colony: Colony): number {
    const activeShipyardCount = (colony.fields ?? []).filter(
      (field) => this.isShipyardField(field, false) && field.isActive,
    ).length;
    if (activeShipyardCount <= 0) return 0;
    return activeShipyardCount + this.getActiveRepairStationCount(colony) * 2;
  }

  private getShipLayout(shipClass: ShipClassDef) {
    const layout =
      this.gameData.getShipClassSlotRuleForShipClass?.(shipClass) ??
      this.gameData.getShipClassSlotRule(shipClass.category);
    if (!layout) {
      throw new BadRequestException(
        `Missing ship layout for ${shipClass.category}`,
      );
    }
    return layout;
  }

  private validateModuleSelections(
    shipClass: ShipClassDef,
    moduleSelections: ShipModuleSelection[],
  ): ShipModuleSelection[] {
    if (!Array.isArray(moduleSelections) || moduleSelections.length === 0) {
      return [];
    }

    const layout = this.getShipLayout(shipClass);
    const slotsById = new Map(layout.slots.map((slot) => [slot.slotId, slot]));
    const seenTypes = new Set<string>();

    return moduleSelections.map((selection) => {
      if (!selection || typeof selection !== 'object') {
        throw new BadRequestException('Invalid module selection');
      }
      const slotId = String(selection.slotId ?? '').trim();
      const commodityId = Number(selection.commodityId);
      if (!slotId) {
        throw new BadRequestException('Module selection requires slotId');
      }
      if (!Number.isInteger(commodityId)) {
        throw new BadRequestException('Invalid module commodity id');
      }
      const slot = slotsById.get(slotId);
      if (!slot) {
        throw new BadRequestException(`Unknown ship slot: ${slotId}`);
      }
      if (
        slot.moduleCategory !== 'SPECIAL' &&
        seenTypes.has(slot.moduleCategory)
      ) {
        throw new BadRequestException(
          `Duplicate module selection for ${slot.moduleCategory}`,
        );
      }
      const item =
        this.gameData.getFabricationItemByOutputCommodity(commodityId);
      if (!item || item.queueType !== ColonyFabricationQueueType.MODULE) {
        throw new BadRequestException(
          `Commodity #${commodityId} is not a ship module`,
        );
      }
      const moduleName = item.displayName ?? `Module #${commodityId}`;
      if ((item.shipyardType ?? 'UNKNOWN') !== slot.moduleCategory) {
        throw new BadRequestException(
          `${moduleName} does not fit ${slot.label}`,
        );
      }
      if (!this.gameData.isShipyardModuleAllowedForShipClass(item, shipClass)) {
        throw new BadRequestException(
          `${moduleName} is not allowed for ${shipClass.name}`,
        );
      }
      seenTypes.add(slot.moduleCategory);
      return { slotId, commodityId };
    });
  }

  private normalizeFixedHangarModuleSelections(
    shipClass: ShipClassDef,
    moduleSelections: ShipModuleSelection[],
  ): ShipModuleSelection[] {
    const hangarDef = this.gameData.getHangarShipDef(shipClass.key);
    if (!hangarDef) return moduleSelections;

    const defaultSelections = this.createDefaultHangarModuleSelections(
      shipClass,
      hangarDef,
    );
    if (!Array.isArray(moduleSelections) || moduleSelections.length === 0) {
      return defaultSelections;
    }

    const requestedSignature = this.createBuildplanSignature(
      shipClass.id,
      this.validateModuleSelections(shipClass, moduleSelections),
    );
    const defaultSignature = this.createBuildplanSignature(
      shipClass.id,
      defaultSelections,
    );
    if (requestedSignature !== defaultSignature) {
      throw new BadRequestException(
        `${shipClass.name} uses a fixed module layout and cannot be customized`,
      );
    }
    return defaultSelections;
  }

  private createDefaultHangarModuleSelections(
    shipClass: ShipClassDef,
    hangarDef: HangarShipDef,
  ): ShipModuleSelection[] {
    const layout = this.getShipLayout(shipClass);
    const freeSlotsByType = new Map<ShipyardType, string[]>();
    for (const slot of layout.slots) {
      const slots = freeSlotsByType.get(slot.moduleCategory) ?? [];
      slots.push(slot.slotId);
      freeSlotsByType.set(slot.moduleCategory, slots);
    }

    return (hangarDef.defaultModuleCommodityIds ?? []).map((commodityId) => {
      const item = this.gameData.getFabricationItemByOutputCommodity(commodityId);
      if (!item?.shipyardType) {
        throw new BadRequestException(
          `Default module commodity #${commodityId} has no shipyard type`,
        );
      }
      const slots = freeSlotsByType.get(item.shipyardType) ?? [];
      const slotId = slots.shift();
      if (!slotId) {
        throw new BadRequestException(
          `${shipClass.name} has no free ${item.shipyardType} slot for ${item.displayName ?? `Module #${commodityId}`}`,
        );
      }
      return { slotId, commodityId };
    });
  }

  private moduleSelectionsToCommodityIds(
    moduleSelections: ShipModuleSelection[],
  ): number[] {
    return moduleSelections.map((selection) => selection.commodityId);
  }

  private moduleSelectionsToModuleTypes(
    moduleSelections: ShipModuleSelection[],
  ): string[] {
    return moduleSelections.map((selection) => {
      const item = this.gameData.getFabricationItemByOutputCommodity(
        selection.commodityId,
      );
      if (!item?.moduleType) {
        throw new BadRequestException(
          `Module commodity #${selection.commodityId} has no valid module type`,
        );
      }
      return item.moduleType;
    });
  }

  private calculateCrewRequired(
    shipClass: ShipClassDef,
    moduleSelections: ShipModuleSelection[],
  ): number {
    const moduleCrew = moduleSelections.reduce((sum, selection) => {
      const item = this.gameData.getFabricationItemByOutputCommodity(
        selection.commodityId,
      );
      return sum + (item?.shipyardModuleStats?.crew ?? 0);
    }, 0);
    return Math.max(0, (shipClass.crewMin || 0) + moduleCrew);
  }

  private normalizeInstalledModuleSelections(
    shipClass: ShipClassDef,
    modules: SpacecraftModule[],
  ): ShipModuleSelection[] {
    const layout = this.getShipLayout(shipClass);
    const slotsById = new Map(layout.slots.map((slot) => [slot.slotId, slot]));
    const freeSlotIdsByCategory = new Map<string, string[]>();
    for (const slot of layout.slots) {
      if (!freeSlotIdsByCategory.has(slot.moduleCategory)) {
        freeSlotIdsByCategory.set(slot.moduleCategory, []);
      }
      freeSlotIdsByCategory.get(slot.moduleCategory)!.push(slot.slotId);
    }

    const orderedModules = [...modules].sort((a, b) => a.id - b.id);
    const selections: ShipModuleSelection[] = [];
    for (const module of orderedModules) {
      const commodityId = this.resolveModuleCommodityId(module);
      if (commodityId == null) continue;

      let slotId = module.slotId ?? null;
      if (!slotId || !slotsById.has(slotId)) {
        const freeSlotIds = freeSlotIdsByCategory.get(module.category) ?? [];
        slotId = freeSlotIds.shift() ?? null;
      } else {
        const freeSlotIds = freeSlotIdsByCategory.get(module.category) ?? [];
        const index = freeSlotIds.indexOf(slotId);
        if (index >= 0) freeSlotIds.splice(index, 1);
      }
      if (!slotId) continue;
      selections.push({ slotId, commodityId });
    }

    return selections.sort((a, b) => {
      const orderA = slotsById.get(a.slotId)?.order ?? Number.MAX_SAFE_INTEGER;
      const orderB = slotsById.get(b.slotId)?.order ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });
  }

  private diffSelectedCommodities(
    desired: ShipModuleSelection[],
    existing: ShipModuleSelection[],
  ): number[] {
    const existingBySlot = new Map(
      existing.map((selection) => [selection.slotId, selection.commodityId]),
    );
    return desired
      .filter(
        (selection) =>
          existingBySlot.get(selection.slotId) !== selection.commodityId,
      )
      .map((selection) => selection.commodityId);
  }

  private createBuildplanSignature(
    shipClassId: number,
    moduleSelections: ShipModuleSelection[],
  ): string {
    const canonical = JSON.stringify({
      shipClassId,
      moduleSelections: [...moduleSelections].sort((a, b) =>
        a.slotId.localeCompare(b.slotId),
      ),
    });
    return createHash('sha256').update(canonical).digest('hex');
  }

  private resolveModuleCommodityId(module: SpacecraftModule): number | null {
    const item = this.gameData
      .getAllFabricationItems()
      .find(
        (candidate) =>
          candidate.queueType === ColonyFabricationQueueType.MODULE &&
          candidate.moduleType === module.moduleType &&
          (candidate.shipyardType ?? module.category) === module.category &&
          (candidate.moduleLevel ?? module.level) === module.level,
      );
    return item?.outputCommodityId ?? null;
  }

  async queueShipRepair(
    colonyId: number,
    userId: number,
    shipId: number,
  ): Promise<ColonyShipBuildQueue> {
    const colony = await this.findOne(colonyId, userId);
    const ship = await this.shipRepo.findOne({ where: { id: shipId, userId } });
    if (!ship) throw new NotFoundException('Spacecraft not found');
    if (!this.colonyOrbitService.canManageOrbitShip(colony, ship)) {
      throw new BadRequestException('Ship is not in colony orbit');
    }
    if (await this.hasActiveShipyardQueueForShip(colony.id, userId, ship.id)) {
      throw new BadRequestException('Ship already has an active shipyard job');
    }

    const shipClass = await this.shipClassRepo.findOneBy({
      id: ship.shipClassId,
    });
    if (!shipClass || shipClass.isNpc) {
      throw new BadRequestException('Unknown ship class');
    }
    const activeShipyardFunctionIds = this.getActiveShipyardFunctionIds(colony);
    this.assertShipyardCompatibility(shipClass, activeShipyardFunctionIds);

    const modules = await this.spacecraftModuleRepo.find({
      where: { spacecraftId: ship.id },
    });
    if (!this.isShipRepairNeeded(ship, modules)) {
      throw new BadRequestException('Ship is not damaged');
    }

    const repairPlan = this.calculateShipRepairPlan(colony, ship, modules);
    await this.deductBuildCosts(colony, repairPlan.costs);
    const activeRepairSlots = this.getActiveRepairSlotCount(colony);
    const activeRepairJobs = await this.getActiveRepairQueueCount(colony.id);
    const startsActive = activeRepairJobs < activeRepairSlots;

    const queue = this.shipBuildQueueRepo.create({
      colonyId: colony.id,
      userId,
      shipClassId: ship.shipClassId,
      mode: ColonyShipBuildQueueMode.REPAIR,
      spacecraftId: ship.id,
      name: `Reparatur: ${ship.name}`,
      buildPlanName: null,
      buildPlanId: null,
      buildPlanSignature: null,
      moduleSelections: [],
      moduleTypes: [],
      moduleCommodityIds: [],
      crewAssigned: 0,
      crewIds: [],
      repairSnapshot: {
        hullBefore: ship.hull,
        hullAfter: ship.hullMax,
        moduleIntegrityBefore: modules
          .filter((module) => module.integrity < 100)
          .map((module) => ({
            moduleId: module.id,
            integrity: module.integrity,
          })),
        costs: repairPlan.costs,
      },
      retrofitSnapshot: null,
      finishesAt: this.timing.dateAfterScaledMinutes(
        repairPlan.durationMinutes,
      ),
      stoppedAt: startsActive ? null : new Date(),
      status: startsActive
        ? ColonyShipBuildQueueStatus.QUEUED
        : ColonyShipBuildQueueStatus.PAUSED,
    });

    return this.shipBuildQueueRepo.save(queue);
  }

  async queueShipRetrofit(
    colonyId: number,
    userId: number,
    shipId: number,
    moduleSelections: ShipModuleSelection[] = [],
    buildPlanName?: string,
  ): Promise<ColonyShipBuildQueue> {
    const colony = await this.findOne(colonyId, userId);
    const ship = await this.shipRepo.findOne({ where: { id: shipId, userId } });
    if (!ship) throw new NotFoundException('Spacecraft not found');
    if (!this.colonyOrbitService.canManageOrbitShip(colony, ship)) {
      throw new BadRequestException('Ship is not in colony orbit');
    }
    if (await this.hasActiveShipyardQueueForShip(colony.id, userId, ship.id)) {
      throw new BadRequestException('Ship already has an active shipyard job');
    }

    const shipClass = await this.shipClassRepo.findOneBy({
      id: ship.shipClassId,
    });
    if (!shipClass || shipClass.isNpc) {
      throw new BadRequestException('Unknown ship class');
    }
    const activeShipyardFunctionIds = this.getActiveShipyardFunctionIds(colony);
    this.assertShipyardCompatibility(shipClass, activeShipyardFunctionIds);

    const selectedModuleSelections = this.validateModuleSelections(
      shipClass,
      this.normalizeFixedHangarModuleSelections(shipClass, moduleSelections),
    );
    const selectedModuleCommodityIds = this.moduleSelectionsToCommodityIds(
      selectedModuleSelections,
    );
    await this.assertModuleResearchUnlocked(userId, selectedModuleCommodityIds);
    const selectedModuleTypes = this.moduleSelectionsToModuleTypes(
      selectedModuleSelections,
    );

    const installedModules = await this.spacecraftModuleRepo.find({
      where: { spacecraftId: ship.id },
      order: { id: 'ASC' },
    });
    const oldModuleSelections = this.normalizeInstalledModuleSelections(
      shipClass,
      installedModules,
    );
    if (
      this.createBuildplanSignature(ship.shipClassId, oldModuleSelections) ===
      this.createBuildplanSignature(ship.shipClassId, selectedModuleSelections)
    ) {
      throw new BadRequestException('No retrofit changes selected');
    }

    const consumedModuleCommodityIds = this.diffSelectedCommodities(
      selectedModuleSelections,
      oldModuleSelections,
    );
    await this.assertModuleCommoditiesAvailable(
      colony,
      consumedModuleCommodityIds,
    );

    const buildPlanSignature = this.createBuildplanSignature(
      ship.shipClassId,
      selectedModuleSelections,
    );
    const buildPlan = await this.getOrCreateBuildplan(
      colony.id,
      userId,
      ship.shipClassId,
      buildPlanName?.trim() || `${shipClass.name} Retrofit`,
      buildPlanSignature,
      selectedModuleSelections,
      selectedModuleTypes,
      selectedModuleCommodityIds,
    );

    await Promise.all(
      consumedModuleCommodityIds.map((commodityId) =>
        this.colonyStorageService.lowerStorage(colony, commodityId, 1),
      ),
    );

    const buildMinutes = Math.max(1, shipClass.buildTimeTicks || 1);
    const queue = this.shipBuildQueueRepo.create({
      colonyId: colony.id,
      userId,
      shipClassId: ship.shipClassId,
      mode: ColonyShipBuildQueueMode.RETROFIT,
      spacecraftId: ship.id,
      name: `Umrüstung: ${ship.name}`,
      buildPlanName: buildPlan.name,
      buildPlanId: buildPlan.id,
      buildPlanSignature,
      moduleSelections: selectedModuleSelections,
      moduleTypes: selectedModuleTypes,
      moduleCommodityIds: selectedModuleCommodityIds,
      crewAssigned: 0,
      crewIds: [],
      repairSnapshot: null,
      retrofitSnapshot: {
        oldModuleSelections,
        newModuleSelections: selectedModuleSelections,
        newModuleTypes: selectedModuleTypes,
        returnedModuleCommodityIds: [],
        consumedModuleCommodityIds,
      },
      finishesAt: this.timing.dateAfterScaledMinutes(buildMinutes),
      status: ColonyShipBuildQueueStatus.QUEUED,
    });

    return this.shipBuildQueueRepo.save(queue);
  }

  async cancelShipBuildQueue(
    colonyId: number,
    userId: number,
    queueId: number,
  ): Promise<ColonyShipBuildQueue> {
    const colony = await this.findOne(colonyId, userId);
    const queue = await this.shipBuildQueueRepo.findOne({
      where: { id: queueId, colonyId: colony.id, userId },
    });
    if (!queue) {
      throw new NotFoundException('Ship build queue not found');
    }
    if (
      ![
        ColonyShipBuildQueueStatus.QUEUED,
        ColonyShipBuildQueueStatus.PAUSED,
      ].includes(queue.status)
    ) {
      throw new BadRequestException(
        'Only queued shipyard jobs can be cancelled',
      );
    }

    if (!queue.mode || queue.mode === ColonyShipBuildQueueMode.BUILD) {
      await this.colonyCrewService.returnCrewToColony(
        colony,
        queue.crewIds ?? [],
      );
    }

    if (queue.mode === ColonyShipBuildQueueMode.RETROFIT) {
      const maxStorage =
        this.colonyStatsService.calculateSummary(colony).effectiveStorageMax;
      await Promise.all(
        (queue.retrofitSnapshot?.consumedModuleCommodityIds ?? []).map(
          (commodityId) =>
            this.colonyStorageService.upperStorage(
              colony,
              commodityId,
              1,
              maxStorage,
            ),
        ),
      );
    }

    queue.status = ColonyShipBuildQueueStatus.CANCELLED;
    return this.shipBuildQueueRepo.save(queue);
  }

  async cancelShipyardQueue(
    colonyId: number,
    userId: number,
    queueId: number,
  ): Promise<ColonyShipBuildQueue> {
    return this.cancelShipBuildQueue(colonyId, userId, queueId);
  }

  async reactivateShipyardQueue(
    colonyId: number,
    userId: number,
    queueId: number,
  ): Promise<ColonyShipBuildQueue> {
    const colony = await this.findOne(colonyId, userId);
    const queue = await this.shipBuildQueueRepo.findOne({
      where: { id: queueId, colonyId: colony.id, userId },
    });
    if (!queue) throw new NotFoundException('Ship build queue not found');
    if (queue.mode !== ColonyShipBuildQueueMode.REPAIR) {
      throw new BadRequestException('Only repair jobs can be reactivated');
    }
    if (queue.status !== ColonyShipBuildQueueStatus.PAUSED) {
      throw new BadRequestException(
        'Only paused repair jobs can be reactivated',
      );
    }
    if (colony.stats?.isBlockaded) {
      throw new BadRequestException(
        'Ship repair is blocked while colony is blockaded',
      );
    }
    const ship = queue.spacecraftId
      ? await this.shipRepo.findOne({
          where: { id: queue.spacecraftId, userId },
        })
      : null;
    if (!ship) {
      throw new BadRequestException('Repair target no longer exists');
    }
    const shipClass = await this.shipClassRepo.findOneBy({
      id: ship.shipClassId,
    });
    if (!shipClass || shipClass.isNpc) {
      throw new BadRequestException('Unknown ship class');
    }
    this.assertShipyardCompatibility(
      shipClass,
      this.getActiveShipyardFunctionIds(colony),
    );
    const activeRepairSlots = this.getActiveRepairSlotCount(colony);
    if (activeRepairSlots <= 0) {
      throw new BadRequestException('Active matching shipyard required');
    }
    const activeRepairJobs = await this.getActiveRepairQueueCount(colony.id);
    if (activeRepairJobs >= activeRepairSlots) {
      throw new BadRequestException('No active repair slot available');
    }

    const modules = await this.spacecraftModuleRepo.find({
      where: { spacecraftId: ship.id },
    });
    if (!this.isShipRepairNeeded(ship, modules)) {
      throw new BadRequestException('Ship is no longer damaged');
    }

    const now = new Date();
    if (queue.stoppedAt) {
      const pauseMs = now.getTime() - queue.stoppedAt.getTime();
      queue.finishesAt = new Date(
        queue.finishesAt.getTime() + Math.max(0, pauseMs),
      );
    } else if (queue.finishesAt <= now) {
      queue.finishesAt = this.timing.dateAfterScaledMinutes(1);
    }
    queue.stoppedAt = null;
    queue.status = ColonyShipBuildQueueStatus.QUEUED;

    await this.colonyEventService.createActionEvent({
      colonyId: colony.id,
      userId,
      type: ColonyEventType.SHIP_REPAIR_REACTIVATED,
      severity: ColonyEventSeverity.INFO,
      title: 'Reparatur reaktiviert',
      message: `${queue.name} wurde reaktiviert.`,
      payload: { queueId: queue.id, spacecraftId: queue.spacecraftId },
    });

    return this.shipBuildQueueRepo.save(queue);
  }

  private async assertSingleColonizerAvailability(
    userId: number,
    shipClass: ShipClassDef,
  ): Promise<void> {
    if (!shipClass.isColonizer) return;

    const activeColonizer = await this.shipRepo
      .createQueryBuilder('ship')
      .innerJoin(ShipClassDef, 'shipClass', 'shipClass.id = ship.shipClassId')
      .where('ship.userId = :userId', { userId })
      .andWhere('ship.status != :destroyed', {
        destroyed: SpacecraftStatus.DESTROYED,
      })
      .andWhere('shipClass.isColonizer = true')
      .getOne();
    if (activeColonizer) {
      throw new BadRequestException(
        'Only one operational colonization ship is allowed',
      );
    }

    const activeQueue = await this.shipBuildQueueRepo
      .createQueryBuilder('queue')
      .innerJoin(ShipClassDef, 'shipClass', 'shipClass.id = queue.shipClassId')
      .where('queue.userId = :userId', { userId })
      .andWhere('queue.status = :status', {
        status: ColonyShipBuildQueueStatus.QUEUED,
      })
      .andWhere('queue.mode = :mode', { mode: ColonyShipBuildQueueMode.BUILD })
      .andWhere('shipClass.isColonizer = true')
      .getOne();
    if (activeQueue) {
      throw new BadRequestException(
        'A colonization ship is already under construction',
      );
    }
  }

  async buildShip(
    colonyId: number,
    userId: number,
    shipClassId: number,
    name: string,
    moduleSelections: ShipModuleSelection[] = [],
    buildPlanName?: string,
    sourceBuildplan?: ColonyShipBuildplan,
  ): Promise<ColonyShipBuildQueue> {
    const colony = await this.findOne(colonyId, userId);

    const activeShipyardFunctionIds = this.getActiveShipyardFunctionIds(colony);
    if (activeShipyardFunctionIds.length === 0) {
      throw new BadRequestException('Colony needs a completed Shipyard');
    }

    const hasShipyardOperations = await this.unlockResolver.hasTechByName(
      userId,
      'Werftbetrieb',
    );
    if (!hasShipyardOperations) {
      throw new BadRequestException('Research required: Werftbetrieb');
    }

    const shipClass = await this.shipClassRepo.findOneBy({ id: shipClassId });
    if (!shipClass || shipClass.isNpc) {
      throw new BadRequestException('Unknown ship class');
    }

    const unlocked = await this.unlockResolver.isShipClassUnlocked(
      userId,
      shipClassId,
    );
    if (!unlocked) {
      throw new BadRequestException('Ship class is not unlocked');
    }
    await this.assertSingleColonizerAvailability(userId, shipClass);
    this.assertShipyardCompatibility(shipClass, activeShipyardFunctionIds);

    const selectedModuleSelections = this.validateModuleSelections(
      shipClass,
      this.normalizeFixedHangarModuleSelections(shipClass, moduleSelections),
    );
    const selectedModuleCommodityIds = this.moduleSelectionsToCommodityIds(
      selectedModuleSelections,
    );
    await this.assertModuleResearchUnlocked(userId, selectedModuleCommodityIds);
    const selectedModuleTypes = this.moduleSelectionsToModuleTypes(
      selectedModuleSelections,
    );

    const crewRequired = this.calculateCrewRequired(
      shipClass,
      selectedModuleSelections,
    );
    const availableCrew = await this.colonyCrewService.getAvailableColonyCrew(
      colony.id,
    );
    if (availableCrew.length < crewRequired) {
      throw new BadRequestException(
        `Not enough trained crew: need ${crewRequired}, have ${availableCrew.length}`,
      );
    }

    await this.assertModuleCommoditiesAvailable(
      colony,
      selectedModuleCommodityIds,
    );

    const buildPlanSignature = this.createBuildplanSignature(
      shipClassId,
      selectedModuleSelections,
    );
    const buildPlan =
      sourceBuildplan ??
      (await this.getOrCreateBuildplan(
        colony.id,
        userId,
        shipClassId,
        buildPlanName?.trim() || `${shipClass.name} Buildplan`,
        buildPlanSignature,
        selectedModuleSelections,
        selectedModuleTypes,
        selectedModuleCommodityIds,
      ));

    const costs = this.calculateShipBuildCosts(shipClass);
    const selectedModuleCommodityIdSet = new Set(selectedModuleCommodityIds);
    const materialCosts = costs.filter(
      (cost) => !selectedModuleCommodityIdSet.has(cost.commodityId),
    );
    await this.deductBuildCosts(colony, materialCosts);
    await Promise.all(
      selectedModuleCommodityIds.map((commodityId) =>
        this.colonyStorageService.lowerStorage(colony, commodityId, 1),
      ),
    );
    const crewIds = await this.colonyCrewService.reserveCrewForShipBuild(
      colony,
      crewRequired,
    );
    if (crewIds.length < crewRequired) {
      throw new BadRequestException('Unable to reserve trained crew');
    }

    const buildMinutes = Math.max(1, shipClass.buildTimeTicks || 1);
    const queue = this.shipBuildQueueRepo.create({
      colonyId: colony.id,
      userId,
      shipClassId,
      name: name?.trim() || shipClass.name,
      buildPlanName: buildPlan.name,
      buildPlanId: buildPlan.id,
      buildPlanSignature,
      moduleSelections: selectedModuleSelections,
      moduleTypes: selectedModuleTypes,
      moduleCommodityIds: selectedModuleCommodityIds,
      crewAssigned: crewRequired,
      crewIds,
      finishesAt: this.timing.dateAfterScaledMinutes(buildMinutes),
      mode: ColonyShipBuildQueueMode.BUILD,
      spacecraftId: null,
      repairSnapshot: null,
      retrofitSnapshot: null,
      status: ColonyShipBuildQueueStatus.QUEUED,
    });

    return this.shipBuildQueueRepo.save(queue);
  }

  private getActiveShipyardFunctionIds(colony: Colony): number[] {
    return [
      ...new Set(
        (colony.fields ?? [])
          .filter(
            (field) => this.isShipyardField(field, false) && field.isActive,
          )
          .flatMap((field) =>
            this.gameData.getBuildingFunctions(field.buildingId!),
          )
          .filter((functionId) => this.shipyardFunctionIds.has(functionId)),
      ),
    ];
  }

  private isShipyardField(field: ColonyField, inProgress?: boolean): boolean {
    if (!field.buildingId) return false;
    const hasShipyardFunction = this.gameData
      .getBuildingFunctions(field.buildingId)
      .some((functionId) => this.shipyardFunctionIds.has(functionId));
    if (
      !hasShipyardFunction &&
      !this.legacyShipyardBuildingIds.has(field.buildingId)
    ) {
      return false;
    }
    return inProgress == null ? true : field.isBuilding === inProgress;
  }

  private assertShipyardCompatibility(
    shipClass: ShipClassDef,
    activeShipyardFunctionIds: number[],
  ): void {
    const classOverride = this.gameData.getShipClassDefByKey(shipClass.key);
    const rule = this.gameData.getShipClassSlotRule(shipClass.category);
    const allowedIds =
      classOverride?.allowedBuildingFunctionIds ??
      rule?.allowedBuildingFunctionIds;
    if (!allowedIds) return;
    const hasCompatibleShipyard = allowedIds.some((functionId) =>
      activeShipyardFunctionIds.includes(functionId),
    );
    if (!hasCompatibleShipyard) {
      throw new BadRequestException('Active matching shipyard required');
    }
  }

  private validateBuildplanName(name: string): string {
    const trimmed = name?.trim();
    if (!trimmed) {
      throw new BadRequestException('Buildplan name is required');
    }
    return trimmed;
  }

  private async assertBuildplanNameAvailable(
    colonyId: number,
    name: string,
    exceptId?: number,
  ): Promise<void> {
    const existing = await this.shipBuildplanRepo.findOne({
      where: { colonyId, name },
    });
    if (existing && existing.id !== exceptId) {
      throw new BadRequestException('Buildplan name already exists');
    }
  }

  private toBuildplanDto(buildplan: ColonyShipBuildplan) {
    return {
      id: buildplan.id,
      colonyId: buildplan.colonyId,
      shipClassId: buildplan.shipClassId,
      name: buildplan.name,
      signature: buildplan.signature,
      moduleSelections: buildplan.moduleSelections,
      moduleCommodityIds: buildplan.moduleCommodityIds,
      moduleTypes: buildplan.moduleTypes,
    };
  }

  async createShipBuildplan(
    colonyId: number,
    userId: number,
    shipClassId: number,
    name: string,
    moduleSelections: ShipModuleSelection[] = [],
  ) {
    const colony = await this.findOne(colonyId, userId);
    const trimmedName = this.validateBuildplanName(name);
    await this.assertBuildplanNameAvailable(colony.id, trimmedName);

    const shipClass = await this.shipClassRepo.findOneBy({ id: shipClassId });
    if (!shipClass || shipClass.isNpc) {
      throw new BadRequestException('Unknown ship class');
    }

    const selectedModuleSelections = this.validateModuleSelections(
      shipClass,
      this.normalizeFixedHangarModuleSelections(shipClass, moduleSelections),
    );
    const selectedModuleCommodityIds = this.moduleSelectionsToCommodityIds(
      selectedModuleSelections,
    );
    await this.assertModuleResearchUnlocked(userId, selectedModuleCommodityIds);
    const selectedModuleTypes = this.moduleSelectionsToModuleTypes(
      selectedModuleSelections,
    );

    const buildplan = this.shipBuildplanRepo.create({
      colonyId: colony.id,
      userId,
      shipClassId,
      name: trimmedName,
      signature: this.createBuildplanSignature(
        shipClassId,
        selectedModuleSelections,
      ),
      moduleSelections: selectedModuleSelections,
      moduleCommodityIds: selectedModuleCommodityIds,
      moduleTypes: selectedModuleTypes,
    });
    return this.toBuildplanDto(await this.shipBuildplanRepo.save(buildplan));
  }

  async renameShipBuildplan(
    colonyId: number,
    userId: number,
    planId: number,
    name: string,
  ) {
    const colony = await this.findOne(colonyId, userId);
    const buildplan = await this.shipBuildplanRepo.findOne({
      where: { id: planId, colonyId: colony.id, userId },
    });
    if (!buildplan) throw new NotFoundException('Buildplan not found');

    const trimmedName = this.validateBuildplanName(name);
    await this.assertBuildplanNameAvailable(
      colony.id,
      trimmedName,
      buildplan.id,
    );
    buildplan.name = trimmedName;
    return this.toBuildplanDto(await this.shipBuildplanRepo.save(buildplan));
  }

  async deleteShipBuildplan(colonyId: number, userId: number, planId: number) {
    const colony = await this.findOne(colonyId, userId);
    const buildplan = await this.shipBuildplanRepo.findOne({
      where: { id: planId, colonyId: colony.id, userId },
    });
    if (!buildplan) throw new NotFoundException('Buildplan not found');
    await this.shipBuildplanRepo.delete({ id: buildplan.id });
    return { deleted: true, id: buildplan.id };
  }

  async buildShipFromBuildplan(
    colonyId: number,
    userId: number,
    planId: number,
    name: string,
  ): Promise<ColonyShipBuildQueue> {
    const colony = await this.findOne(colonyId, userId);
    const buildplan = await this.shipBuildplanRepo.findOne({
      where: { id: planId, colonyId: colony.id, userId },
    });
    if (!buildplan) throw new NotFoundException('Buildplan not found');
    return this.buildShip(
      colony.id,
      userId,
      buildplan.shipClassId,
      name,
      buildplan.moduleSelections,
      buildplan.name,
      buildplan,
    );
  }

  private async getOrCreateBuildplan(
    colonyId: number,
    userId: number,
    shipClassId: number,
    name: string,
    signature: string,
    moduleSelections: ShipModuleSelection[],
    moduleTypes: string[],
    moduleCommodityIds: number[],
  ): Promise<ColonyShipBuildplan> {
    const existing = await this.shipBuildplanRepo.findOne({
      where: { colonyId, signature },
    });
    if (existing) return existing;

    const trimmedName = this.validateBuildplanName(name);
    await this.assertBuildplanNameAvailable(colonyId, trimmedName);
    const buildplan = this.shipBuildplanRepo.create({
      colonyId,
      userId,
      shipClassId,
      name: trimmedName,
      signature,
      moduleSelections,
      moduleCommodityIds,
      moduleTypes,
    });
    return this.shipBuildplanRepo.save(buildplan);
  }

  private async assertModuleCommoditiesAvailable(
    colony: Colony,
    moduleCommodityIds: number[],
  ): Promise<void> {
    const required = new Map<number, number>();
    for (const commodityId of moduleCommodityIds) {
      required.set(commodityId, (required.get(commodityId) ?? 0) + 1);
    }
    for (const [commodityId, amount] of required) {
      const storage = await this.storageRepo.findOne({
        where: { colonyId: colony.id, commodityId },
      });
      if ((storage?.amount ?? 0) < amount) {
        const commodity = this.gameData.getCommodity(commodityId);
        throw new BadRequestException(
          `Not enough ${commodity?.name ?? `module #${commodityId}`} in colony storage`,
        );
      }
    }
  }

  private async assertModuleResearchUnlocked(
    userId: number,
    moduleCommodityIds: number[],
  ): Promise<void> {
    for (const commodityId of moduleCommodityIds) {
      const item =
        this.gameData.getFabricationItemByOutputCommodity(commodityId);
      if (item?.researchId == null) continue;
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
  }

  async processShipBuildQueue(colony: Colony): Promise<void> {
    const queuedJobs = await this.shipBuildQueueRepo.find({
      where: {
        colonyId: colony.id,
        status: ColonyShipBuildQueueStatus.QUEUED,
      },
      relations: ['shipClass'],
      order: { finishesAt: 'ASC', id: 'ASC' },
    });
    const now = new Date();
    const activeRepairSlots = this.getActiveRepairSlotCount(colony);
    const activeShipyardFunctionIds = this.getActiveShipyardFunctionIds(colony);
    const canProgressRepair =
      !getColonyChangeable(colony).isBlockaded && activeRepairSlots > 0;
    let remainingRepairSlots = activeRepairSlots;

    const queueTasks: Array<Promise<void | ColonyShipBuildQueue>> = [];
    for (const job of queuedJobs) {
      if (job.mode === ColonyShipBuildQueueMode.REPAIR) {
        const shipClass =
          job.shipClass ??
          (await this.shipClassRepo.findOneBy({ id: job.shipClassId }));
        let hasMatchingShipyard = false;
        if (shipClass) {
          try {
            this.assertShipyardCompatibility(
              shipClass,
              activeShipyardFunctionIds,
            );
            hasMatchingShipyard = true;
          } catch {
            hasMatchingShipyard = false;
          }
        }
        if (
          !canProgressRepair ||
          !hasMatchingShipyard ||
          remainingRepairSlots <= 0
        ) {
          job.status = ColonyShipBuildQueueStatus.PAUSED;
          job.stoppedAt = now;
          queueTasks.push(this.shipBuildQueueRepo.save(job));
          continue;
        }
        remainingRepairSlots -= 1;
      }
      if (job.finishesAt > now) continue;
      if (job.mode === ColonyShipBuildQueueMode.REPAIR) {
        queueTasks.push(this.finishShipRepairQueue(job));
        continue;
      }
      if (job.mode === ColonyShipBuildQueueMode.RETROFIT) {
        queueTasks.push(this.finishShipRetrofitQueue(colony, job));
        continue;
      }
      queueTasks.push(this.finishShipBuildQueue(colony, job));
    }
    await Promise.all(queueTasks);

    if (canProgressRepair && remainingRepairSlots > 0) {
      const pausedJobs = await this.getPausedRepairJobs(colony.id);
      const reactivatedJobs: ColonyShipBuildQueue[] = [];
      for (const pausedJob of pausedJobs) {
        const shipClass =
          pausedJob.shipClass ??
          (await this.shipClassRepo.findOneBy({ id: pausedJob.shipClassId }));
        if (!shipClass) continue;
        try {
          this.assertShipyardCompatibility(
            shipClass,
            activeShipyardFunctionIds,
          );
        } catch {
          continue;
        }
        if (pausedJob.stoppedAt) {
          const pauseMs = now.getTime() - pausedJob.stoppedAt.getTime();
          pausedJob.finishesAt = new Date(
            pausedJob.finishesAt.getTime() + Math.max(0, pauseMs),
          );
        }
        pausedJob.stoppedAt = null;
        pausedJob.status = ColonyShipBuildQueueStatus.QUEUED;
        reactivatedJobs.push(pausedJob);
        if (reactivatedJobs.length >= remainingRepairSlots) break;
      }
      await Promise.all(
        reactivatedJobs.map((pausedJob) =>
          this.shipBuildQueueRepo.save(pausedJob),
        ),
      );
    }
  }

  private async finishShipBuildQueue(
    colony: Colony,
    job: ColonyShipBuildQueue,
  ): Promise<void> {
    const shipClass =
      job.shipClass ??
      (await this.shipClassRepo.findOneBy({ id: job.shipClassId }));
    if (!shipClass) return;
    const ship = this.createShipFromClass(
      colony,
      job.userId,
      shipClass,
      job.name,
    );
    const savedShip = await this.shipRepo.save(ship);
    const modules = await this.createModulesForBuiltShip(savedShip.id, job);
    if ((job.crewAssigned ?? 0) > 0) {
      savedShip.crew = job.crewAssigned;
      await this.colonyCrewService.assignCrewToShip(
        job.userId,
        savedShip.id,
        job.crewIds ?? [],
      );
    }
    this.spacecraftStatsService.applyStats(savedShip, shipClass, modules);
    await this.shipRepo.save(savedShip);
    job.status = ColonyShipBuildQueueStatus.COMPLETED;
    await this.shipBuildQueueRepo.save(job);
  }

  private async finishShipRepairQueue(
    job: ColonyShipBuildQueue,
  ): Promise<void> {
    if (!job.spacecraftId) {
      job.status = ColonyShipBuildQueueStatus.CANCELLED;
      await this.shipBuildQueueRepo.save(job);
      return;
    }
    const ship = await this.shipRepo.findOne({
      where: { id: job.spacecraftId, userId: job.userId },
    });
    if (!ship) {
      job.status = ColonyShipBuildQueueStatus.CANCELLED;
      await this.shipBuildQueueRepo.save(job);
      return;
    }
    const [shipClass, modules] = await Promise.all([
      this.shipClassRepo.findOneBy({ id: ship.shipClassId }),
      this.spacecraftModuleRepo.find({ where: { spacecraftId: ship.id } }),
    ]);
    if (!shipClass) return;

    ship.hull = ship.hullMax;
    for (const module of modules) {
      if (module.integrity < 100 || !module.isActive || module.cooldown !== 0) {
        module.integrity = 100;
        module.isActive = true;
        module.cooldown = 0;
      }
    }
    await this.spacecraftModuleRepo.save(modules);
    this.spacecraftStatsService.applyStats(ship, shipClass, modules);
    ship.hull = ship.hullMax;
    ship.shields = Math.min(ship.shieldsMax, Math.max(ship.shields, 0));
    ship.energy = Math.min(ship.energyMax, Math.max(ship.energy, 0));
    await this.shipRepo.save(ship);
    job.status = ColonyShipBuildQueueStatus.COMPLETED;
    await this.shipBuildQueueRepo.save(job);
  }

  private async finishShipRetrofitQueue(
    colony: Colony,
    job: ColonyShipBuildQueue,
  ): Promise<void> {
    if (!job.spacecraftId) {
      job.status = ColonyShipBuildQueueStatus.CANCELLED;
      await this.shipBuildQueueRepo.save(job);
      return;
    }
    const ship = await this.shipRepo.findOne({
      where: { id: job.spacecraftId, userId: job.userId },
    });
    if (!ship) {
      job.status = ColonyShipBuildQueueStatus.CANCELLED;
      await this.shipBuildQueueRepo.save(job);
      return;
    }

    const [shipClass, installedModules] = await Promise.all([
      this.shipClassRepo.findOneBy({ id: ship.shipClassId }),
      this.spacecraftModuleRepo.find({
        where: { spacecraftId: ship.id },
        order: { id: 'ASC' },
      }),
    ]);
    if (!shipClass) return;

    const desiredSelections =
      job.retrofitSnapshot?.newModuleSelections ?? job.moduleSelections ?? [];
    const desiredBySlot = new Map(
      desiredSelections.map((selection) => [selection.slotId, selection]),
    );
    const existingSelections = this.normalizeInstalledModuleSelections(
      shipClass,
      installedModules,
    );
    const existingBySlot = new Map(
      existingSelections.map((selection) => [selection.slotId, selection]),
    );
    const modulesToKeep: SpacecraftModule[] = [];
    const modulesToRemove: Array<{
      module: SpacecraftModule;
      commodityId: number | null;
    }> = [];

    for (const module of installedModules) {
      const commodityId = this.resolveModuleCommodityId(module);
      const slotId = module.slotId ?? null;
      if (slotId && desiredBySlot.get(slotId)?.commodityId === commodityId) {
        modulesToKeep.push(module);
      } else {
        modulesToRemove.push({ module, commodityId });
      }
    }

    const returnedModuleCommodityIds: number[] = [];
    const maxStorage =
      this.colonyStatsService.calculateSummary(colony).effectiveStorageMax;
    for (const { module, commodityId } of modulesToRemove) {
      if (
        commodityId != null &&
        module.category !== 'HULL' &&
        module.integrity >= 100
      ) {
        const stored = await this.colonyStorageService.upperStorage(
          colony,
          commodityId,
          1,
          maxStorage,
        );
        if (stored > 0) returnedModuleCommodityIds.push(commodityId);
      }
    }
    if (modulesToRemove.length > 0) {
      await this.spacecraftModuleRepo.remove(
        modulesToRemove.map(({ module }) => module),
      );
    }

    const createdModules: SpacecraftModule[] = [];
    for (const selection of desiredSelections) {
      if (
        existingBySlot.get(selection.slotId)?.commodityId ===
        selection.commodityId
      ) {
        continue;
      }
      const item = this.gameData.getFabricationItemByOutputCommodity(
        selection.commodityId,
      );
      if (!item?.moduleType) continue;
      const savedModule = await this.spacecraftModuleRepo.save(
        this.spacecraftModuleRepo.create({
          spacecraftId: ship.id,
          slotId: selection.slotId,
          moduleType: item.moduleType,
          category: item.shipyardType ?? 'UNKNOWN',
          level: item.moduleLevel ?? 1,
          integrity: 100,
          cooldown: 0,
          isActive: true,
        }),
      );
      createdModules.push(savedModule);
    }

    const finalModules = [...modulesToKeep, ...createdModules];
    this.spacecraftStatsService.applyStats(ship, shipClass, finalModules);
    await this.shipRepo.save(ship);
    job.retrofitSnapshot = {
      oldModuleSelections: job.retrofitSnapshot?.oldModuleSelections ?? [],
      newModuleSelections: desiredSelections,
      newModuleTypes:
        job.retrofitSnapshot?.newModuleTypes ?? job.moduleTypes ?? [],
      returnedModuleCommodityIds,
      consumedModuleCommodityIds:
        job.retrofitSnapshot?.consumedModuleCommodityIds ?? [],
    };
    job.status = ColonyShipBuildQueueStatus.COMPLETED;
    await this.shipBuildQueueRepo.save(job);
  }

  private async createModulesForBuiltShip(
    spacecraftId: number,
    job: ColonyShipBuildQueue,
  ): Promise<SpacecraftModule[]> {
    const createdModules: SpacecraftModule[] = [];
    for (const selection of job.moduleSelections ?? []) {
      const item = this.gameData.getFabricationItemByOutputCommodity(
        selection.commodityId,
      );
      if (!item?.moduleType) continue;
      const savedModule = await this.spacecraftModuleRepo.save(
        this.spacecraftModuleRepo.create({
          spacecraftId,
          slotId: selection.slotId,
          moduleType: item.moduleType,
          category: item.shipyardType ?? 'UNKNOWN',
          level: item.moduleLevel ?? 1,
          integrity: 100,
          cooldown: 0,
          isActive: true,
        }),
      );
      createdModules.push(savedModule);
    }
    return createdModules;
  }

  private createShipFromClass(
    colony: Colony,
    userId: number,
    shipClass: ShipClassDef,
    name: string,
  ): Spacecraft {
    return this.shipRepo.create({
      name: name?.trim() || shipClass.name,
      shipClassId: shipClass.id,
      userId,
      starSystemId: colony.starSystemId,
      currentLayerId: colony.starSystem?.layerId ?? null,
      celestialObjectId: colony.celestialObjectId,
      inSystem: true,
      currentSystemFieldX: colony.posX,
      currentSystemFieldY: colony.posY,
      posX: colony.posX,
      posY: colony.posY,
      status: SpacecraftStatus.DOCKED,
      alertState: AlertState.GREEN,
      hull: shipClass.hullBase,
      hullMax: shipClass.hullBase,
      shields: shipClass.shieldBase,
      shieldsMax: shipClass.shieldBase,
      energy: shipClass.epsBase,
      energyMax: shipClass.epsBase,
      warpSpeed: shipClass.warpBase,
      crew: shipClass.crewMin,
      crewMax: shipClass.crewMax,
      cargoUsed: 0,
      cargoMax: shipClass.cargoCapacity,
      battery: shipClass.batteryBase,
      batteryMax: shipClass.batteryBase,
      epsMax: shipClass.epsBase,
      reactorOutput: 0,
      warpdriveMax: shipClass.warpBase,
      evadeChance: 0,
    });
  }

  private calculateShipBuildCosts(
    shipClass: ShipClassDef,
  ): Array<{ commodityId: number; amount: number }> {
    const definition = this.gameData.getShipClassDefByKey(shipClass.key);
    return (definition?.buildCosts ?? []).filter((cost) => cost.amount > 0);
  }

  private isShipRepairNeeded(
    ship: Spacecraft,
    modules: SpacecraftModule[] = [],
  ): boolean {
    return (
      ship.hull < ship.hullMax ||
      modules.some(
        (module) =>
          module.integrity < 100 || !module.isActive || module.cooldown !== 0,
      )
    );
  }
}
