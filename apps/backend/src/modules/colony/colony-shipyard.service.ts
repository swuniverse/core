import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ShipbuildingCoreService,
  type ShipbuildingSourceAdapter,
  type ShipbuildingCompletionHandler,
} from '../spacecraft/shipbuilding-core.service';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { GameDataService } from '../game-data/game-data.service';
import { UnlockResolverService } from '../research/unlock-resolver.service';
import { ShipClassDef } from '../spacecraft/entities/ship-class-def.entity';
import { SpacecraftModule } from '../spacecraft/entities/spacecraft-module.entity';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import { SpacecraftStatsService } from '../spacecraft/spacecraft-stats.service';
import {
  getRuntimeSystemsForModule,
  initializeSpacecraftRuntimeSystems,
} from '../spacecraft/spacecraft-runtime-state.service';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { SystemField } from '../starmap/entities/system-field.entity';
import { ColonyEventService } from '../messaging/colony-event.service';
import { MessageFolder } from '../messaging/message-folder';
import { MessagingService } from '../messaging/messaging.service';
import { ColonyOrbitService } from './colony-orbit.service';
import { ColonyOwnershipService } from './colony-ownership.service';
import {
  ColonyStatsService,
  getColonyChangeable,
  setColonyEnergy,
} from './colony-stats.service';
import { ColonyChangeable } from './entities/colony-changeable.entity';
import { ColonyStorageService } from './colony-storage.service';
import { ColonyTimingService } from './colony-timing.service';
import {
  COLONY_BUILDING_ID_SETS,
  COLONY_FUNCTION_ID_SETS,
  COLONY_FUNCTION_IDS,
} from './colony.constants';
import {
  ColonyEventSeverity,
  ColonyEventType,
} from '../messaging/colony-event.types';
import { ColonyFabricationQueueType } from './entities/colony-fabrication-queue.entity';
import { ColonyField } from './entities/colony-field.entity';
import type { ShipModuleSelection } from '@swuniverse/shared';
import { ColonyShipBuildplan } from './entities/colony-ship-buildplan.entity';
import {
  ColonyShipBuildQueue,
  ColonyShipBuildQueueMode,
  ColonyShipBuildQueueStatus,
  ShipBuildSource,
} from './entities/colony-ship-build-queue.entity';
import { ColonyStorage } from './entities/colony-storage.entity';
import { Colony } from './entities/colony.entity';
import { resolveColonyLocation } from './colony-location';

@Injectable()
export class ColonyShipyardService {
  private readonly legacyShipyardBuildingIds =
    COLONY_BUILDING_ID_SETS.LEGACY_SHIPYARD;
  private readonly shipyardFunctionIds = COLONY_FUNCTION_ID_SETS.SHIPYARD;
  private readonly queuedBuildShipyardFunctionIds = new Set(
    [...COLONY_FUNCTION_ID_SETS.SHIPYARD].filter(
      (functionId) => functionId !== COLONY_FUNCTION_IDS.FIGHTER_SHIPYARD,
    ),
  );
  private readonly repairStationFunctionId = COLONY_FUNCTION_IDS.REPAIR_STATION;
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
    private readonly colonyStorageService: ColonyStorageService,
    private readonly colonyStatsService: ColonyStatsService,
    private readonly colonyOrbitService: ColonyOrbitService,
    private readonly colonyEventService: ColonyEventService,
    private readonly messagingService: MessagingService,
    private readonly spacecraftStatsService: SpacecraftStatsService,
    private readonly unlockResolver: UnlockResolverService,
    private readonly timing: ColonyTimingService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly core: ShipbuildingCoreService,
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
    manager?: EntityManager,
  ): Promise<void> {
    const storageRepository =
      manager?.getRepository(ColonyStorage) ?? this.storageRepo;
    const costMap: [number, number][] = costs.map((cost) => [
      cost.commodityId,
      cost.amount,
    ]);
    for (const [commodityId, required] of costMap) {
      if (required <= 0) continue;
      const storage = await storageRepository.findOne({
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
    // Sequential: the writes share one transaction connection.
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

  /** EPS the colony pays for building or retrofitting a hull (STU `eps_cost`). */
  private getRumpEpsCost(shipClass: ShipClassDef): number {
    const stuRumpId = this.gameData.getShipClassDefByKey(
      shipClass.key,
    )?.stuRumpId;
    return this.gameData.getShipyardRumpStats(stuRumpId)?.epsCost ?? 0;
  }

  /**
   * The player-selected shipyard function must be an active one that can
   * build the hull; the server never picks another function on its own.
   */
  private assertSelectedShipyardFunction(
    shipClass: ShipClassDef,
    buildingFunctionId: number | undefined,
    activeShipyardFunctionIds: number[],
  ): number {
    if (buildingFunctionId == null || !Number.isInteger(buildingFunctionId)) {
      throw new BadRequestException('Shipyard function required');
    }
    if (!activeShipyardFunctionIds.includes(buildingFunctionId)) {
      throw new BadRequestException('Selected shipyard function is not active');
    }
    this.assertShipyardCompatibility(shipClass, [buildingFunctionId]);
    return buildingFunctionId;
  }

  /**
   * Runs the shared part of BUILD and RETROFIT enqueueing atomically: the
   * colony's changeable row is locked, so concurrent shipyard actions on the
   * colony serialize; then EPS, the function slot (STU: one BUILD/RETROFIT per
   * function; REPAIR and unbound legacy jobs do not count) and the caller's
   * resource reservation are checked and applied or rolled back together.
   */
  private async reserveShipyardSlot<T>(
    colony: Colony,
    buildingFunctionId: number,
    epsCost: number,
    epsMessage: string,
    reserve: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    const userId = colony.userId;
    if (userId == null) throw new NotFoundException('Colony not found');
    return this.dataSource.transaction(async (manager) => {
      // Match completion/cancellation before acquiring the changeable row.
      // Otherwise inserting the queue's colony FK can invert the lock order.
      const user = await manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      const source = await manager.findOne(Colony, {
        where: { id: colony.id, userId: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user || !source || source.isAbandoned)
        throw new NotFoundException('Colony not found');
      const energy = await this.reserveShipyardSlotWithManager(
        manager,
        colony,
        buildingFunctionId,
        epsCost,
        epsMessage,
      );
      const result = await reserve(manager);
      await this.chargeShipyardEnergy(manager, colony, energy, epsCost);
      return result;
    });
  }

  private async reserveShipyardSlotWithManager(
    manager: EntityManager,
    colony: Colony,
    buildingFunctionId: number,
    epsCost: number,
    epsMessage: string,
  ): Promise<number> {
    const locked = await manager.findOne(ColonyChangeable, {
      where: { colonyId: colony.id },
      lock: { mode: 'pessimistic_write' },
    });
    const occupied = await manager.count(ColonyShipBuildQueue, {
      where: {
        colonyId: colony.id,
        buildingFunctionId,
        mode: In([
          ColonyShipBuildQueueMode.BUILD,
          ColonyShipBuildQueueMode.RETROFIT,
        ]),
        status: In([
          ColonyShipBuildQueueStatus.QUEUED,
          ColonyShipBuildQueueStatus.PAUSED,
        ]),
      },
    });
    if (occupied > 0)
      throw new BadRequestException(
        'This shipyard is already building or retrofitting a ship',
      );
    const energy = locked?.energy ?? getColonyChangeable(colony).energy ?? 0;
    if (energy < epsCost)
      throw new BadRequestException(
        `${epsMessage}: need ${epsCost} energy, have ${energy}`,
      );
    return energy;
  }

  private async chargeShipyardEnergy(
    manager: EntityManager,
    colony: Colony,
    energy: number,
    epsCost: number,
  ): Promise<void> {
    if (epsCost > 0)
      await manager.update(
        ColonyChangeable,
        { colonyId: colony.id },
        { energy: energy - epsCost },
      );
    setColonyEnergy(colony, energy - epsCost);
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

  private async getUserFaction(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    return user?.faction ?? null;
  }

  private calculateCrewRequired(
    shipClass: ShipClassDef,
    moduleSelections: ShipModuleSelection[],
  ): number {
    const modules = moduleSelections.flatMap((selection) => {
      const item = this.gameData.getFabricationItemByOutputCommodity(
        selection.commodityId,
      );
      return item?.moduleType
        ? [
            {
              moduleType: item.moduleType,
              level: item.moduleLevel ?? 1,
            } as SpacecraftModule,
          ]
        : [];
    });
    return Math.max(
      0,
      shipClass.crewMin +
        modules.reduce((sum, module) => {
          const item = this.gameData
            .getAllFabricationItems()
            .find(
              (candidate) =>
                candidate.moduleType === module.moduleType &&
                candidate.moduleLevel === module.level,
            );
          return sum + (item?.shipyardModuleStats?.crew ?? 0);
        }, 0),
    );
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
    return this.core.signature(shipClassId, moduleSelections);
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
    const ship = await this.shipRepo.findOne({
      where: { id: shipId, userId },
      relations: ['location', 'location.systemField'],
    });
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

    const savedQueue = await this.shipBuildQueueRepo.save(queue);
    await this.messagingService.sendSystem(
      ship.userId,
      'Schiffsreparatur gestartet',
      `Die Reparatur von ${ship.name} wurde auf ${colony.name} gestartet.`,
      `colony-ship-repair-started:${savedQueue.id}`,
      MessageFolder.SHIP,
    );
    return savedQueue;
  }

  async queueShipRetrofit(
    colonyId: number,
    userId: number,
    shipId: number,
    moduleSelections: ShipModuleSelection[] = [],
    buildPlanName?: string,
    buildingFunctionId?: number,
  ): Promise<ColonyShipBuildQueue> {
    const colony = await this.findOne(colonyId, userId);
    if (getColonyChangeable(colony).isBlockaded) {
      throw new BadRequestException(
        'Ship retrofit is not possible while the colony is blockaded',
      );
    }
    const ship = await this.shipRepo.findOne({
      where: { id: shipId, userId },
      relations: ['location', 'location.systemField'],
    });
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
    const selectedFunctionId = this.assertSelectedShipyardFunction(
      shipClass,
      buildingFunctionId,
      activeShipyardFunctionIds,
    );

    const userFaction = await this.getUserFaction(userId);
    const prepared = await this.core.prepare(
      userId,
      shipClass,
      moduleSelections,
      userFaction,
    );
    const selectedModuleSelections = prepared.moduleSelections;
    const selectedModuleCommodityIds = prepared.moduleCommodityIds;
    const selectedModuleTypes = prepared.moduleTypes;
    const epsCost = this.getRumpEpsCost(shipClass);

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
    const buildPlan = await this.core.createBuildplan(
      {
        userId,
        shipClassId: ship.shipClassId,
        name: buildPlanName?.trim() || `${shipClass.name} Retrofit`,
        moduleSelections: selectedModuleSelections,
      },
      true,
    );

    const buildSeconds = Math.max(1, shipClass.buildTimeTicks || 1);
    const queue = this.shipBuildQueueRepo.create({
      colonyId: colony.id,
      userId,
      shipClassId: ship.shipClassId,
      mode: ColonyShipBuildQueueMode.RETROFIT,
      buildingFunctionId: selectedFunctionId,
      spacecraftId: ship.id,
      name: `Umrüstung: ${ship.name}`,
      buildPlanName: buildPlan.name,
      buildPlanId: buildPlan.id,
      buildPlanSignature,
      moduleSelections: selectedModuleSelections,
      moduleTypes: selectedModuleTypes,
      moduleCommodityIds: selectedModuleCommodityIds,
      repairSnapshot: null,
      retrofitSnapshot: {
        oldModuleSelections,
        newModuleSelections: selectedModuleSelections,
        newModuleTypes: selectedModuleTypes,
        returnedModuleCommodityIds: [],
        consumedModuleCommodityIds,
      },
      finishesAt: this.timing.dateAfterScaledSeconds(buildSeconds),
      status: ColonyShipBuildQueueStatus.QUEUED,
    });

    return this.reserveShipyardSlot(
      colony,
      selectedFunctionId,
      epsCost,
      'Not enough energy for retrofit',
      async (manager) => {
        for (const commodityId of consumedModuleCommodityIds) {
          await this.colonyStorageService.lowerStorage(
            colony,
            commodityId,
            1,
            manager,
          );
        }
        return manager.save(ColonyShipBuildQueue, queue);
      },
    );
  }

  async cancelShipBuildQueue(
    colonyId: number,
    userId: number,
    queueId: number,
  ): Promise<ColonyShipBuildQueue> {
    const colony = await this.findOne(colonyId, userId);
    const cancelled = await this.withLockedShipyardJob(
      colony,
      queueId,
      async (manager, source, queue) => {
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
        if (queue.mode === ColonyShipBuildQueueMode.RETROFIT) {
          const maxStorage =
            this.colonyStatsService.calculateSummary(
              source,
            ).effectiveStorageMax;
          for (const commodityId of queue.retrofitSnapshot
            ?.consumedModuleCommodityIds ?? []) {
            await this.colonyStorageService.upperStorage(
              source,
              commodityId,
              1,
              maxStorage,
              manager,
            );
          }
        }
        queue.status = ColonyShipBuildQueueStatus.CANCELLED;
        return manager.save(ColonyShipBuildQueue, queue);
      },
    );
    if (!cancelled) throw new NotFoundException('Ship build queue not found');
    return cancelled;
  }

  /** Same lock order as BUILD completion; queue status and refunds share a transaction. */
  private async withLockedShipyardJob<T>(
    colony: Colony,
    queueId: number,
    work: (
      manager: EntityManager,
      source: Colony,
      job: ColonyShipBuildQueue,
    ) => Promise<T>,
  ): Promise<T | null> {
    const userId = colony.userId;
    if (userId == null) return null;
    return this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) return null;
      const source = await manager.findOne(Colony, {
        where: { id: colony.id, userId: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!source || source.isAbandoned) return null;
      await manager.findOne(ColonyChangeable, {
        where: { colonyId: source.id },
        lock: { mode: 'pessimistic_write' },
      });
      const job = await manager.findOne(ColonyShipBuildQueue, {
        where: { id: queueId, colonyId: source.id, userId: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!job) return null;
      const loaded = await manager.findOne(Colony, {
        where: { id: source.id },
        relations: [
          'fields',
          'stats',
          'changeable',
          'celestialObject',
          'storage',
        ],
      });
      return loaded ? work(manager, loaded, job) : null;
    });
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

  async buildShip(
    colonyId: number,
    userId: number,
    shipClassId: number,
    name: string,
    moduleSelections: ShipModuleSelection[] = [],
    buildPlanName?: string,
    sourceBuildplan?: ColonyShipBuildplan,
    buildingFunctionId?: number,
  ): Promise<ColonyShipBuildQueue> {
    const colony = await this.findOne(colonyId, userId);
    if (getColonyChangeable(colony).isBlockaded) {
      throw new BadRequestException(
        'Ship construction is not possible while the colony is blockaded',
      );
    }

    const activeShipyardFunctionIds = this.getActiveShipyardFunctionIds(
      colony,
      this.queuedBuildShipyardFunctionIds,
    );
    if (activeShipyardFunctionIds.length === 0) {
      throw new BadRequestException('Colony needs a completed Shipyard');
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
    this.assertShipyardCompatibility(shipClass, activeShipyardFunctionIds);
    const selectedFunctionId = this.assertSelectedShipyardFunction(
      shipClass,
      buildingFunctionId,
      activeShipyardFunctionIds,
    );

    // Inventory helpers update their loaded snapshot. Publish it only after
    // the core transaction has committed, never after a late queue failure.
    const reservedColony = Object.assign(new Colony(), colony, {
      changeable: { ...getColonyChangeable(colony) },
      storage: colony.storage?.map((item) => ({ ...item })),
    });
    const queue = await this.core.startBuild(
      {
        userId,
        shipClassId,
        name,
        moduleSelections,
        buildPlanName,
        buildPlanId: sourceBuildplan?.id,
      },
      this.buildSourceAdapter(reservedColony, selectedFunctionId),
    );
    setColonyEnergy(colony, getColonyChangeable(reservedColony).energy);
    colony.storageUsed = reservedColony.storageUsed;
    for (const item of colony.storage ?? []) {
      const reserved = reservedColony.storage?.find(
        (row) => row.commodityId === item.commodityId,
      );
      if (reserved) item.amount = reserved.amount;
    }
    return queue;
  }

  private buildSourceAdapter(
    colony: Colony,
    buildingFunctionId: number | null,
  ): ShipbuildingSourceAdapter {
    let reservedEnergy = 0;
    let epsCost = 0;
    return {
      source: ShipBuildSource.COLONY,
      sourceId: colony.id,
      reserve: async (manager, hull) => {
        epsCost = this.getRumpEpsCost(hull);
        reservedEnergy = await this.reserveShipyardSlotWithManager(
          manager,
          colony,
          buildingFunctionId!,
          epsCost,
          'Not enough energy for construction',
        );
        return { buildingFunctionId };
      },
      inventory: (manager) =>
        manager.find(ColonyStorage, {
          where: { colonyId: colony.id },
          order: { commodityId: 'ASC' },
          lock: { mode: 'pessimistic_write' },
        }),
      consume: async (manager, costs) => {
        for (const cost of costs)
          await this.colonyStorageService.lowerStorage(
            colony,
            cost.commodityId,
            cost.amount,
            manager,
          );
        await this.chargeShipyardEnergy(
          manager,
          colony,
          reservedEnergy,
          epsCost,
        );
      },
      placement: async (manager) => {
        const source = await manager.findOne(Colony, {
          where: { id: colony.id, userId: colony.userId! },
          lock: { mode: 'pessimistic_write' },
        });
        if (!source) return null;
        const colonyLocation = resolveColonyLocation(colony);
        const starSystemId = colonyLocation?.systemId ?? colony.starSystemId;
        if (starSystemId == null)
          throw new NotFoundException('Colony star system not found');
        const field = colony.systemFieldId
          ? await manager.findOneOrFail(SystemField, {
              where: { id: colony.systemFieldId },
            })
          : await manager.findOneOrFail(SystemField, {
              where: {
                starSystemId,
                sx: colonyLocation?.x ?? colony.posX,
                sy: colonyLocation?.y ?? colony.posY,
              },
            });
        const location = await manager.findOneOrFail(SpaceLocation, {
          where: { systemFieldId: field.id },
        });
        return { locationId: location.id, dockedAtId: null };
      },
    };
  }

  private getActiveShipyardFunctionIds(
    colony: Colony,
    allowedFunctionIds = this.shipyardFunctionIds,
  ): number[] {
    return [
      ...new Set(
        (colony.fields ?? [])
          .filter(
            (field) => this.isShipyardField(field, false) && field.isActive,
          )
          .flatMap((field) =>
            this.gameData.getBuildingFunctions(field.buildingId!),
          )
          .filter((functionId) => allowedFunctionIds.has(functionId)),
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
    return this.core.validateBuildplanName(name);
  }

  private async assertBuildplanNameAvailable(
    userId: number,
    name: string,
    exceptId?: number,
  ): Promise<void> {
    const existing = await this.shipBuildplanRepo.findOne({
      where: { userId, name },
    });
    if (existing && existing.id !== exceptId) {
      throw new BadRequestException('Ein Bauplan mit diesem Namen existiert bereits.');
    }
  }

  private toBuildplanDto(buildplan: ColonyShipBuildplan, canDelete = true) {
    return {
      id: buildplan.id,
      shipClassId: buildplan.shipClassId,
      name: buildplan.name,
      signature: buildplan.signature,
      moduleSelections: buildplan.moduleSelections,
      moduleCommodityIds: buildplan.moduleCommodityIds,
      moduleTypes: buildplan.moduleTypes,
      canDelete,
    };
  }

  async listUserBuildplans(userId: number) {
    const buildplans = await this.shipBuildplanRepo.find({
      where: { userId },
      order: { name: 'ASC' },
    });
    return Promise.all(
      buildplans.map(async (plan) => {
        const [activeQueueCount, spacecraftCount] = await Promise.all([
          this.shipBuildQueueRepo.count({
            where: {
              buildPlanId: plan.id,
              status: In([
                ColonyShipBuildQueueStatus.QUEUED,
                ColonyShipBuildQueueStatus.PAUSED,
              ]),
            },
          }),
          this.shipRepo.count({ where: { buildPlanId: plan.id } }),
        ]);
        return this.toBuildplanDto(
          plan,
          activeQueueCount === 0 && spacecraftCount === 0,
        );
      }),
    );
  }

  async createAdminBuildplan(
    userId: number,
    shipClassId: number,
    name: string,
    moduleSelections: ShipModuleSelection[] = [],
  ) {
    return this.createValidatedBuildplan(
      userId,
      shipClassId,
      name,
      moduleSelections,
    );
  }

  async createShipBuildplan(
    colonyId: number,
    userId: number,
    shipClassId: number,
    name: string,
    moduleSelections: ShipModuleSelection[] = [],
  ) {
    await this.findOne(colonyId, userId);
    return this.createValidatedBuildplan(
      userId,
      shipClassId,
      name,
      moduleSelections,
    );
  }

  private async createValidatedBuildplan(
    userId: number,
    shipClassId: number,
    name: string,
    moduleSelections: ShipModuleSelection[],
  ) {
    return this.toBuildplanDto(
      await this.core.createBuildplan({
        userId,
        shipClassId,
        name,
        moduleSelections,
      }),
    );
  }

  async renameShipBuildplan(
    colonyId: number,
    userId: number,
    planId: number,
    name: string,
  ) {
    await this.findOne(colonyId, userId);
    const buildplan = await this.shipBuildplanRepo.findOne({
      where: { id: planId, userId },
    });
    if (!buildplan) throw new NotFoundException('Buildplan not found');

    const trimmedName = this.validateBuildplanName(name);
    await this.assertBuildplanNameAvailable(userId, trimmedName, buildplan.id);
    buildplan.name = trimmedName;
    return this.toBuildplanDto(await this.shipBuildplanRepo.save(buildplan));
  }

  async deleteShipBuildplan(colonyId: number, userId: number, planId: number) {
    await this.findOne(colonyId, userId);
    const buildplan = await this.shipBuildplanRepo.findOne({
      where: { id: planId, userId },
    });
    if (!buildplan) throw new NotFoundException('Buildplan not found');
    const [activeQueueCount, spacecraftCount] = await Promise.all([
      this.shipBuildQueueRepo.count({
        where: {
          buildPlanId: buildplan.id,
          status: In([
            ColonyShipBuildQueueStatus.QUEUED,
            ColonyShipBuildQueueStatus.PAUSED,
          ]),
        },
      }),
      this.shipRepo.count({ where: { buildPlanId: buildplan.id } }),
    ]);
    if (activeQueueCount > 0 || spacecraftCount > 0) {
      throw new BadRequestException('Der Bauplan wird von einem Auftrag oder Schiff verwendet.');
    }
    await this.shipBuildplanRepo.delete({ id: buildplan.id });
    return { deleted: true, id: buildplan.id };
  }

  async buildShipFromBuildplan(
    colonyId: number,
    userId: number,
    planId: number,
    name: string,
    buildingFunctionId?: number,
  ): Promise<ColonyShipBuildQueue> {
    const colony = await this.findOne(colonyId, userId);
    const buildplan = await this.shipBuildplanRepo.findOne({
      where: { id: planId, userId },
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
      buildingFunctionId,
    );
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

  async processShipBuildQueue(colony: Colony, repairsOnly = false): Promise<void> {
    const queuedJobs = await this.shipBuildQueueRepo.find({
      where: {
        colonyId: colony.id,
        ...(repairsOnly ? { mode: ColonyShipBuildQueueMode.REPAIR } : {}),
        status: ColonyShipBuildQueueStatus.QUEUED,
      },
      relations: ['shipClass', 'colony'],
      order: { finishesAt: 'ASC', id: 'ASC' },
    });
    const now = new Date();
    const activeRepairSlots = this.getActiveRepairSlotCount(colony);
    const activeShipyardFunctionIds = this.getActiveShipyardFunctionIds(colony);
    const canProgressRepair =
      !getColonyChangeable(colony).isBlockaded && activeRepairSlots > 0;
    let remainingRepairSlots = activeRepairSlots;

    const queueTasks: Promise<unknown>[] = [];
    for (const job of queuedJobs) {
      if (repairsOnly && job.mode !== ColonyShipBuildQueueMode.REPAIR) continue;
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

    if (
      canProgressRepair &&
      remainingRepairSlots > 0 &&
      !queuedJobs.some(
        (job) =>
          job.mode === ColonyShipBuildQueueMode.REPAIR &&
          job.status === ColonyShipBuildQueueStatus.PAUSED,
      )
    ) {
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

  async completeJob(
    job: ColonyShipBuildQueue,
    onCompleted?: ShipbuildingCompletionHandler,
  ): Promise<Spacecraft | null> {
    if (job.source !== ShipBuildSource.COLONY || job.colonyId == null)
      return null;
    const colony = await this.colonyOwnershipService.findOwnedColony(
      job.colonyId,
      job.userId,
    );
    if (!colony || colony.isAbandoned) return null;
    if (job.mode === ColonyShipBuildQueueMode.BUILD) {
      return this.core.completeBuild(
        job.id,
        this.buildSourceAdapter(colony, job.buildingFunctionId),
        onCompleted,
      );
    }
    if (job.mode === ColonyShipBuildQueueMode.RETROFIT) {
      return this.finishShipRetrofitQueue(colony, job, onCompleted);
    }
    return null;
  }

  private async finishShipBuildQueue(
    colony: Colony,
    job: ColonyShipBuildQueue,
  ): Promise<void> {
    await this.core.completeBuild(
      job.id,
      this.buildSourceAdapter(colony, job.buildingFunctionId),
    );
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
    if (!shipClass || !job.colony) return;

    const hasRepairStationBonus = this.hasActiveBuildingFunction(
      job.colony,
      this.repairStationFunctionId,
    );
    const hullRepairAmount = hasRepairStationBonus ? 200 : 100;
    const modulesPerStep = hasRepairStationBonus ? 4 : 2;
    const damagedModules = modules.filter(
      (module) =>
        module.integrity < 100 || !module.isActive || module.cooldown !== 0,
    );
    const modulesToRepair = damagedModules.slice(0, modulesPerStep);
    const costs = [
      {
        commodityId: this.repairSparePartCommodityId,
        amount: ship.hull < ship.hullMax || modulesToRepair.length > 0 ? 1 : 0,
      },
      {
        commodityId: this.repairSystemComponentCommodityId,
        amount: modulesToRepair.length > 0 ? 1 : 0,
      },
    ].filter((cost) => cost.amount > 0);
    try {
      await this.deductBuildCosts(job.colony, costs);
    } catch (error) {
      if (!(error instanceof BadRequestException)) throw error;
      job.status = ColonyShipBuildQueueStatus.PAUSED;
      job.stoppedAt = new Date();
      await this.shipBuildQueueRepo.save(job);
      return;
    }

    ship.hull = Math.min(ship.hullMax, ship.hull + hullRepairAmount);
    for (const module of modulesToRepair) {
      module.integrity = 100;
      module.isActive = true;
      module.cooldown = 0;
    }
    if (modulesToRepair.length > 0) {
      await this.spacecraftModuleRepo.save(modulesToRepair);
    }
    this.spacecraftStatsService.applyStats(ship, shipClass, modules);
    ship.shields = Math.min(ship.shieldsMax, Math.max(ship.shields, 0));
    ship.energy = Math.min(ship.energyMax, Math.max(ship.energy, 0));
    await this.shipRepo.save(ship);
    const repairComplete = !this.isShipRepairNeeded(ship, modules);
    job.status = repairComplete
      ? ColonyShipBuildQueueStatus.COMPLETED
      : ColonyShipBuildQueueStatus.QUEUED;
    if (!repairComplete) {
      job.finishesAt = this.timing.dateAfterScaledMinutes(1);
    }
    await this.shipBuildQueueRepo.save(job);
    if (repairComplete) {
      await this.messagingService.sendSystem(
        ship.userId,
        'Schiffsreparatur abgeschlossen',
        `Die Reparatur von ${ship.name} wurde abgeschlossen.`,
        `colony-ship-repair-completed:${job.id}`,
        MessageFolder.SHIP,
      );
    }
  }

  private async finishShipRetrofitQueue(
    colony: Colony,
    job: ColonyShipBuildQueue,
    onCompleted?: ShipbuildingCompletionHandler,
  ): Promise<Spacecraft | null> {
    return this.withLockedShipyardJob(
      colony,
      job.id,
      async (manager, source, locked) => {
        if (
          locked.mode !== ColonyShipBuildQueueMode.RETROFIT ||
          locked.status !== ColonyShipBuildQueueStatus.QUEUED ||
          locked.finishesAt > new Date()
        )
          return null;
        const ship = await this.applyShipRetrofit(manager, source, locked);
        if (ship) await onCompleted?.(manager, ship);
        return ship;
      },
    );
  }

  private async applyShipRetrofit(
    manager: EntityManager,
    colony: Colony,
    job: ColonyShipBuildQueue,
  ): Promise<Spacecraft | null> {
    if (!job.spacecraftId) {
      job.status = ColonyShipBuildQueueStatus.CANCELLED;
      await manager.save(ColonyShipBuildQueue, job);
      return null;
    }
    const ship = await manager.findOne(Spacecraft, {
      where: { id: job.spacecraftId, userId: job.userId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!ship) {
      job.status = ColonyShipBuildQueueStatus.CANCELLED;
      await manager.save(ColonyShipBuildQueue, job);
      return null;
    }

    const [shipClass, installedModules] = await Promise.all([
      manager.findOne(ShipClassDef, { where: { id: ship.shipClassId } }),
      manager.find(SpacecraftModule, {
        where: { spacecraftId: ship.id },
        order: { id: 'ASC' },
        lock: { mode: 'pessimistic_write' },
      }),
    ]);
    if (!shipClass) return null;

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
          manager,
        );
        if (stored > 0) returnedModuleCommodityIds.push(commodityId);
      }
    }
    if (modulesToRemove.length > 0) {
      await manager.remove(
        SpacecraftModule,
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
      const savedModule = await manager.save(
        SpacecraftModule,
        manager.create(SpacecraftModule, {
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
    ship.crewRequired = this.calculateCrewRequired(
      shipClass,
      desiredSelections,
    );
    ship.crewMax = Math.max(ship.crewMax, ship.crewRequired);
    ship.modules = finalModules;
    // A replacement in the same system category must not inherit the old
    // module's running switch, damage or cooldown. Untouched systems retain it.
    for (const module of createdModules) {
      for (const key of getRuntimeSystemsForModule(module)) {
        delete ship.runtimeSystems?.[key];
      }
    }
    initializeSpacecraftRuntimeSystems(ship);
    await manager.save(Spacecraft, ship);
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
    await manager.save(ColonyShipBuildQueue, job);
    return ship;
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
