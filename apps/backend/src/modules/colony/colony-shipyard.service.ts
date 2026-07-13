import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { In, Repository } from 'typeorm';
import { GameDataService } from '../game-data/game-data.service';
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
import { ColonyEconomyService } from './colony-economy.service';
import { ColonyEventService } from './colony-event.service';
import { ColonyOrbitService } from './colony-orbit.service';
import { ColonyOwnershipService } from './colony-ownership.service';
import { ColonyProjectionService } from './colony-projection.service';
import { ColonyStatsService } from './colony-stats.service';
import { ColonyStorageService } from './colony-storage.service';
import { ColonyTimingService } from './colony-timing.service';
import {
  ColonyEventSeverity,
  ColonyEventType,
} from './entities/colony-event.entity';
import { ColonyFabricationQueueType } from './entities/colony-fabrication-queue.entity';
import { ColonyField } from './entities/colony-field.entity';
import { ColonyShipBuildplan } from './entities/colony-ship-buildplan.entity';
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
  private readonly shipyardFunctionIds = new Set([5, 6, 7, 8, 21, 22]);
  private readonly repairShipyardFunctionId = 22;
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
    private readonly unlockResolver: UnlockResolverService,
    private readonly colonyStatsService: ColonyStatsService,
    private readonly colonyEconomyService: ColonyEconomyService,
    private readonly colonyStorageService: ColonyStorageService,
    private readonly spacecraftStatsService: SpacecraftStatsService,
    private readonly colonyCrewService: ColonyCrewService,
    private readonly colonyEventService: ColonyEventService,
    private readonly colonyOrbitService: ColonyOrbitService,
    private readonly ownership: ColonyOwnershipService,
    private readonly projection: ColonyProjectionService,
    private readonly timing: ColonyTimingService,
  ) {}

  private async findOne(colonyId: number, userId: number): Promise<Colony> {
    const colony = await this.ownership.findOwnedColony(colonyId, userId);
    return this.projection.toColonyDetail(colony, userId);
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

  private hasActiveBuildingFunction(
    colony: Colony,
    functionId: number,
  ): boolean {
    return this.colonyEconomyService.hasActiveFunction(colony, functionId);
  }

  private isShipRepairNeeded(
    ship: Spacecraft,
    modules: SpacecraftModule[] = [],
  ): boolean {
    return (
      ship.hull < ship.hullMax ||
      modules.some((module) => module.integrity < 100)
    );
  }

  private calculateShipRepairPlan(
    colony: Colony,
    ship: Spacecraft,
    modules: SpacecraftModule[] = [],
  ): {
    costs: Array<{ commodityId: number; amount: number }>;
    durationMinutes: number;
    hasRepairShipyardBonus: boolean;
  } {
    const hasRepairShipyardBonus = this.hasActiveBuildingFunction(
      colony,
      this.repairShipyardFunctionId,
    );
    const hullDamage = Math.max(0, ship.hullMax - ship.hull);
    const hullChunks = Math.ceil(hullDamage / 100);
    const damagedModules = modules.filter((module) => module.integrity < 100);
    const systemComponentChunks = damagedModules.reduce(
      (sum, module) => sum + Math.ceil((100 - module.integrity) / 100),
      0,
    );
    const applyBonus = (amount: number) =>
      hasRepairShipyardBonus ? Math.ceil(amount / 2) : amount;
    const costs = [
      {
        commodityId: this.repairSparePartCommodityId,
        amount: applyBonus(hullChunks),
      },
      {
        commodityId: this.repairSystemComponentCommodityId,
        amount: applyBonus(systemComponentChunks),
      },
    ].filter((cost) => cost.amount > 0);
    const durationUnits = hullChunks + damagedModules.length;
    const durationMinutes = Math.max(1, applyBonus(Math.max(1, durationUnits)));

    return { costs, durationMinutes, hasRepairShipyardBonus };
  }

  private async hasActiveShipyardQueueForShip(
    colonyId: number,
    userId: number,
    spacecraftId: number,
  ): Promise<boolean> {
    const queue = await this.shipBuildQueueRepo.findOne({
      where: {
        colonyId,
        userId,
        spacecraftId,
        status: In([
          ColonyShipBuildQueueStatus.QUEUED,
          ColonyShipBuildQueueStatus.PAUSED,
        ]),
      },
    });
    return !!queue;
  }

  private getActiveRepairSlotCount(colony: Colony): number {
    const activeRepairBuildings = (colony.fields ?? []).filter(
      (field) =>
        field.buildingId &&
        !field.isBuilding &&
        field.isActive &&
        this.gameData
          .getBuildingFunctions(field.buildingId)
          .includes(this.repairShipyardFunctionId),
    ).length;
    return activeRepairBuildings * 2;
  }

  private async getActiveRepairQueueCount(colonyId: number): Promise<number> {
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
      order: { stoppedAt: 'ASC', id: 'ASC' },
    });
  }

  async queueShipRepair(
    colonyId: number,
    userId: number,
    shipId: number,
  ): Promise<ColonyShipBuildQueue> {
    const colony = await this.findOne(colonyId, userId);
    if (
      !this.hasActiveBuildingFunction(colony, this.repairShipyardFunctionId)
    ) {
      throw new BadRequestException('Active repair shipyard required');
    }

    const ship = await this.shipRepo.findOne({ where: { id: shipId, userId } });
    if (!ship) throw new NotFoundException('Spacecraft not found');
    if (!this.colonyOrbitService.canManageOrbitShip(colony, ship)) {
      throw new BadRequestException('Ship is not in colony orbit');
    }
    if (await this.hasActiveShipyardQueueForShip(colony.id, userId, ship.id)) {
      throw new BadRequestException('Ship already has an active shipyard job');
    }

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
    moduleCommodityIds: number[] = [],
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

    const selectedModuleCommodityIds =
      this.validateShipBuildModuleCommodities(moduleCommodityIds);
    this.assertModuleSlotCompatibility(shipClass, selectedModuleCommodityIds);
    const selectedModuleTypes = selectedModuleCommodityIds.map(
      (commodityId) =>
        this.gameData.getFabricationItemByOutputCommodity(commodityId)!
          .moduleType!,
    );

    const installedModules = await this.spacecraftModuleRepo.find({
      where: { spacecraftId: ship.id },
    });
    const oldModuleCommodityIds =
      this.resolveModuleCommodityIds(installedModules);
    if (
      this.createBuildplanSignature(ship.shipClassId, oldModuleCommodityIds) ===
      this.createBuildplanSignature(
        ship.shipClassId,
        selectedModuleCommodityIds,
      )
    ) {
      throw new BadRequestException('No retrofit changes selected');
    }

    const consumedModuleCommodityIds = this.diffCommodityIds(
      selectedModuleCommodityIds,
      oldModuleCommodityIds,
    );
    await this.assertModuleCommoditiesAvailable(
      colony,
      consumedModuleCommodityIds,
    );

    const buildPlanSignature = this.createBuildplanSignature(
      ship.shipClassId,
      selectedModuleCommodityIds,
    );
    const buildPlan = await this.getOrCreateBuildplan(
      colony.id,
      userId,
      ship.shipClassId,
      buildPlanName?.trim() || `${shipClass.name} Retrofit`,
      buildPlanSignature,
      selectedModuleCommodityIds,
      selectedModuleTypes,
    );

    for (const commodityId of consumedModuleCommodityIds) {
      await this.colonyStorageService.lowerStorage(colony, commodityId, 1);
    }

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
      moduleTypes: selectedModuleTypes,
      moduleCommodityIds: selectedModuleCommodityIds,
      crewAssigned: 0,
      crewIds: [],
      repairSnapshot: null,
      retrofitSnapshot: {
        oldModuleCommodityIds,
        newModuleCommodityIds: selectedModuleCommodityIds,
        newModuleTypes: selectedModuleTypes,
        returnedModuleCommodityIds: [],
        consumedModuleCommodityIds,
      },
      finishesAt: this.timing.dateAfterScaledMinutes(buildMinutes),
      status: ColonyShipBuildQueueStatus.QUEUED,
    });

    return this.shipBuildQueueRepo.save(queue);
  }

  private resolveModuleCommodityIds(modules: SpacecraftModule[]): number[] {
    return modules
      .map((module) => this.resolveModuleCommodityId(module))
      .filter((commodityId): commodityId is number => commodityId != null);
  }

  private resolveModuleCommodityId(module: SpacecraftModule): number | null {
    const item = this.gameData
      .getAllFabricationItems()
      .find(
        (candidate) =>
          candidate.queueType === ColonyFabricationQueueType.MODULE &&
          candidate.moduleType === module.moduleType &&
          (candidate.moduleCategory ?? module.category) === module.category &&
          (candidate.moduleLevel ?? module.level) === module.level,
      );
    return item?.outputCommodityId ?? null;
  }

  private diffCommodityIds(desired: number[], existing: number[]): number[] {
    const remainingExisting = [...existing];
    const diff: number[] = [];
    for (const commodityId of desired) {
      const existingIndex = remainingExisting.indexOf(commodityId);
      if (existingIndex >= 0) {
        remainingExisting.splice(existingIndex, 1);
      } else {
        diff.push(commodityId);
      }
    }
    return diff;
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
      for (const commodityId of queue.retrofitSnapshot
        ?.consumedModuleCommodityIds ?? []) {
        await this.colonyStorageService.upperStorage(
          colony,
          commodityId,
          1,
          maxStorage,
        );
      }
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
    const activeRepairSlots = this.getActiveRepairSlotCount(colony);
    if (activeRepairSlots <= 0) {
      throw new BadRequestException('Active repair shipyard required');
    }
    const activeRepairJobs = await this.getActiveRepairQueueCount(colony.id);
    if (activeRepairJobs >= activeRepairSlots) {
      throw new BadRequestException('No active repair slot available');
    }

    const ship = queue.spacecraftId
      ? await this.shipRepo.findOne({
          where: { id: queue.spacecraftId, userId },
        })
      : null;
    if (!ship) {
      throw new BadRequestException('Repair target no longer exists');
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

  private createBuildplanSignature(
    shipClassId: number,
    moduleCommodityIds: number[],
  ): string {
    const canonical = JSON.stringify({
      shipClassId,
      moduleCommodityIds: [...moduleCommodityIds].sort((a, b) => a - b),
    });
    return createHash('sha256').update(canonical).digest('hex');
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
    moduleTypes: string[] = [],
    buildPlanName?: string,
    moduleCommodityIds: number[] = [],
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

    const selectedModuleCommodityIds =
      this.validateShipBuildModuleCommodities(moduleCommodityIds);
    const selectedModuleTypes =
      selectedModuleCommodityIds.length > 0
        ? selectedModuleCommodityIds.map(
            (commodityId) =>
              this.gameData.getFabricationItemByOutputCommodity(commodityId)!
                .moduleType!,
          )
        : this.validateShipBuildModules(moduleTypes);
    this.assertModuleSlotCompatibility(shipClass, selectedModuleCommodityIds);

    const crewRequired = Math.max(0, shipClass.crewMin || 0);
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
      selectedModuleCommodityIds,
    );
    const buildPlan =
      sourceBuildplan ??
      (await this.getOrCreateBuildplan(
        colony.id,
        userId,
        shipClassId,
        buildPlanName?.trim() || `${shipClass.name} Buildplan`,
        buildPlanSignature,
        selectedModuleCommodityIds,
        selectedModuleTypes,
      ));

    const costs = this.calculateShipBuildCosts(shipClass);
    await this.deductBuildCosts(colony, costs);
    for (const commodityId of selectedModuleCommodityIds) {
      await this.colonyStorageService.lowerStorage(colony, commodityId, 1);
    }
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
          .filter((field) => this.isShipyardField(field, false))
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
    const rule = this.gameData.getShipClassSlotRule(shipClass.category);
    if (!rule) return;
    const hasCompatibleShipyard = rule.allowedBuildingFunctionIds.some(
      (functionId) => activeShipyardFunctionIds.includes(functionId),
    );
    if (!hasCompatibleShipyard) {
      throw new BadRequestException(
        `${shipClass.category} cannot be built by the active shipyard`,
      );
    }
  }

  private assertModuleSlotCompatibility(
    shipClass: ShipClassDef,
    moduleCommodityIds: number[],
  ): void {
    if (moduleCommodityIds.length === 0) return;
    const rule = this.gameData.getShipClassSlotRule(shipClass.category);
    if (!rule) return;

    const counts = new Map<string, number>();
    for (const commodityId of moduleCommodityIds) {
      const item =
        this.gameData.getFabricationItemByOutputCommodity(commodityId);
      const category = item?.moduleCategory;
      if (!category || rule.moduleSlots[category] == null) {
        throw new BadRequestException(
          `${item?.displayName ?? `Module #${commodityId}`} is not allowed on ${shipClass.category}`,
        );
      }
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }

    for (const [category, count] of counts) {
      const max = rule.moduleSlots[category] ?? 0;
      if (count > max) {
        throw new BadRequestException(
          `Too many ${category} modules for ${shipClass.category}: ${count}/${max}`,
        );
      }
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
      moduleCommodityIds: buildplan.moduleCommodityIds,
      moduleTypes: buildplan.moduleTypes,
    };
  }

  async createShipBuildplan(
    colonyId: number,
    userId: number,
    shipClassId: number,
    name: string,
    moduleCommodityIds: number[] = [],
    moduleTypes: string[] = [],
  ) {
    const colony = await this.findOne(colonyId, userId);
    const trimmedName = this.validateBuildplanName(name);
    await this.assertBuildplanNameAvailable(colony.id, trimmedName);

    const shipClass = await this.shipClassRepo.findOneBy({ id: shipClassId });
    if (!shipClass || shipClass.isNpc) {
      throw new BadRequestException('Unknown ship class');
    }

    const selectedModuleCommodityIds =
      this.validateShipBuildModuleCommodities(moduleCommodityIds);
    const selectedModuleTypes =
      selectedModuleCommodityIds.length > 0
        ? selectedModuleCommodityIds.map(
            (commodityId) =>
              this.gameData.getFabricationItemByOutputCommodity(commodityId)!
                .moduleType!,
          )
        : this.validateShipBuildModules(moduleTypes);
    this.assertModuleSlotCompatibility(shipClass, selectedModuleCommodityIds);

    const buildplan = this.shipBuildplanRepo.create({
      colonyId: colony.id,
      userId,
      shipClassId,
      name: trimmedName,
      signature: this.createBuildplanSignature(
        shipClassId,
        selectedModuleCommodityIds,
      ),
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
      buildplan.moduleTypes,
      buildplan.name,
      buildplan.moduleCommodityIds,
      buildplan,
    );
  }

  private async getOrCreateBuildplan(
    colonyId: number,
    userId: number,
    shipClassId: number,
    name: string,
    signature: string,
    moduleCommodityIds: number[],
    moduleTypes: string[],
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

  private validateShipBuildModuleCommodities(
    moduleCommodityIds: number[],
  ): number[] {
    if (!Array.isArray(moduleCommodityIds) || moduleCommodityIds.length === 0)
      return [];

    const allModules = this.gameData.getAllModules();
    const validModuleNames = new Set(allModules.map((module) => module.name));
    const selected = moduleCommodityIds.map(Number);
    if (selected.some((commodityId) => !Number.isInteger(commodityId))) {
      throw new BadRequestException('Invalid module commodity id');
    }

    for (const commodityId of selected) {
      const item =
        this.gameData.getFabricationItemByOutputCommodity(commodityId);
      if (!item || item.queueType !== ColonyFabricationQueueType.MODULE) {
        throw new BadRequestException(
          `Commodity #${commodityId} is not a ship module`,
        );
      }
      if (!item.moduleType || !validModuleNames.has(item.moduleType)) {
        throw new BadRequestException(
          `Module commodity #${commodityId} has no valid module type`,
        );
      }
    }
    return selected;
  }

  private validateShipBuildModules(moduleTypes: string[]): string[] {
    if (!Array.isArray(moduleTypes) || moduleTypes.length === 0) return [];
    const allModules = this.gameData.getAllModules();
    const validNames = new Set(allModules.map((module) => module.name));
    const selected = [
      ...new Set(moduleTypes.map((module) => module.trim())),
    ].filter(Boolean);
    const unknown = selected.find((module) => !validNames.has(module));
    if (unknown) {
      throw new BadRequestException(`Unknown module type: ${unknown}`);
    }
    return selected;
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
    const canProgressRepair =
      !colony.stats?.isBlockaded && activeRepairSlots > 0;
    let remainingRepairSlots = activeRepairSlots;

    for (const job of queuedJobs) {
      if (job.mode === ColonyShipBuildQueueMode.REPAIR) {
        if (!canProgressRepair || remainingRepairSlots <= 0) {
          job.status = ColonyShipBuildQueueStatus.PAUSED;
          job.stoppedAt = now;
          await this.shipBuildQueueRepo.save(job);
          continue;
        }
        remainingRepairSlots -= 1;
      }
      if (job.finishesAt > now) continue;
      if (job.mode === ColonyShipBuildQueueMode.REPAIR) {
        await this.finishShipRepairQueue(job);
        continue;
      }
      if (job.mode === ColonyShipBuildQueueMode.RETROFIT) {
        await this.finishShipRetrofitQueue(colony, job);
        continue;
      }
      await this.finishShipBuildQueue(colony, job);
    }

    if (canProgressRepair && remainingRepairSlots > 0) {
      const pausedJobs = await this.getPausedRepairJobs(colony.id);
      for (const pausedJob of pausedJobs.slice(0, remainingRepairSlots)) {
        if (pausedJob.stoppedAt) {
          const pauseMs = now.getTime() - pausedJob.stoppedAt.getTime();
          pausedJob.finishesAt = new Date(
            pausedJob.finishesAt.getTime() + Math.max(0, pauseMs),
          );
        }
        pausedJob.stoppedAt = null;
        pausedJob.status = ColonyShipBuildQueueStatus.QUEUED;
        await this.shipBuildQueueRepo.save(pausedJob);
      }
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
      this.spacecraftModuleRepo.find({ where: { spacecraftId: ship.id } }),
    ]);
    if (!shipClass) return;

    const desiredCommodityIds =
      job.retrofitSnapshot?.newModuleCommodityIds ??
      job.moduleCommodityIds ??
      [];
    const desiredRemaining = [...desiredCommodityIds];
    const modulesToKeep: SpacecraftModule[] = [];
    const modulesToRemove: Array<{
      module: SpacecraftModule;
      commodityId: number | null;
    }> = [];

    for (const module of installedModules) {
      const commodityId = this.resolveModuleCommodityId(module);
      const desiredIndex =
        commodityId == null ? -1 : desiredRemaining.indexOf(commodityId);
      if (desiredIndex >= 0) {
        desiredRemaining.splice(desiredIndex, 1);
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
    for (const commodityId of desiredRemaining) {
      const item =
        this.gameData.getFabricationItemByOutputCommodity(commodityId);
      if (!item?.moduleType) continue;
      const savedModule = await this.spacecraftModuleRepo.save(
        this.spacecraftModuleRepo.create({
          spacecraftId: ship.id,
          moduleType: item.moduleType,
          category: item.moduleCategory ?? 'UNKNOWN',
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
      oldModuleCommodityIds: job.retrofitSnapshot?.oldModuleCommodityIds ?? [],
      newModuleCommodityIds: desiredCommodityIds,
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
    if (job.moduleCommodityIds?.length) {
      for (const commodityId of job.moduleCommodityIds) {
        const item =
          this.gameData.getFabricationItemByOutputCommodity(commodityId);
        if (!item?.moduleType) continue;
        const savedModule = await this.spacecraftModuleRepo.save(
          this.spacecraftModuleRepo.create({
            spacecraftId,
            moduleType: item.moduleType,
            category: item.moduleCategory ?? 'UNKNOWN',
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

    for (const moduleType of job.moduleTypes ?? []) {
      const moduleDef = this.gameData
        .getAllModules()
        .find((candidate) => candidate.name === moduleType);
      if (!moduleDef) continue;
      const savedModule = await this.spacecraftModuleRepo.save(
        this.spacecraftModuleRepo.create({
          spacecraftId,
          moduleType,
          category: moduleDef.category,
          level: 1,
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
    });
  }

  private calculateShipBuildCosts(
    shipClass: ShipClassDef,
  ): Array<{ commodityId: number; amount: number }> {
    return [
      {
        commodityId: 1,
        amount: Math.max(100, Math.round(shipClass.hullBase * 4)),
      },
      {
        commodityId: 2,
        amount: Math.max(50, Math.round(shipClass.hullBase * 1.5)),
      },
      {
        commodityId: 3,
        amount: Math.max(20, Math.round(shipClass.shieldBase * 0.5)),
      },
      {
        commodityId: 4,
        amount: Math.max(0, Math.round(shipClass.epsBase * 0.1)),
      },
      {
        commodityId: 6,
        amount: Math.max(20, Math.round(shipClass.cargoCapacity * 0.25)),
      },
      {
        commodityId: 7,
        amount: Math.max(20, Math.round(shipClass.epsBase * 0.4)),
      },
    ].filter((c) => c.amount > 0);
  }
}
