import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CargoItem } from '../spacecraft/entities/cargo-item.entity';
import { ShipClassDef } from '../spacecraft/entities/ship-class-def.entity';
import { SpacecraftModule } from '../spacecraft/entities/spacecraft-module.entity';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import {
  GameDataService,
  HangarShipDef,
  ModuleDef,
} from '../game-data/game-data.service';
import { User } from '../auth/user.entity';
import { UnlockResolverService } from '../research/unlock-resolver.service';
import { ColonyCrewService } from './colony-crew.service';
import { ColonyDefenseService } from './colony-defense.service';
import { ColonyEconomyService } from './colony-economy.service';
import { ColonyEventService } from './colony-event.service';
import { ColonyOrbitService } from './colony-orbit.service';
import { ColonySocialService } from './colony-social.service';
import {
  ColonyInternalSummary,
  getColonyChangeable,
  getEffectiveCurrentPopulation,
  syncLegacyColonySnapshot,
} from './colony-stats.service';
import {
  ColonyCrewTrainingQueue,
  ColonyCrewTrainingQueueStatus,
} from './entities/colony-crew-training-queue.entity';
import { ColonyDepositMining } from './entities/colony-deposit-mining.entity';
import {
  ColonyFabricationQueue,
  ColonyFabricationQueueStatus,
  ColonyFabricationQueueType,
} from './entities/colony-fabrication-queue.entity';
import { ColonyField } from './entities/colony-field.entity';
import {
  ColonyOrbitAssignment,
  ColonyOrbitAssignmentMode,
} from './entities/colony-orbit-assignment.entity';
import { ColonyShipBuildplan } from './entities/colony-ship-buildplan.entity';
import { ShipModuleSelection } from './entities/colony-ship-buildplan.entity';
import {
  ColonyShipBuildQueue,
  ColonyShipBuildQueueMode,
  ColonyShipBuildQueueStatus,
} from './entities/colony-ship-build-queue.entity';
import { ColonyStorage } from './entities/colony-storage.entity';
import { Colony } from './entities/colony.entity';

@Injectable()
export class ColonyProjectionService {
  private readonly legacyShipyardBuildingIds = new Set([
    11, 85010100, 85010300,
  ]);
  private readonly shipyardFunctionIds = new Set([5, 6, 7, 8, 21]);
  private readonly repairStationFunctionId = 22;
  private readonly warehouseFunctionId = 23;

  private normalizeInstalledModuleSelections(
    shipClass: ShipClassDef | undefined,
    modules: SpacecraftModule[],
  ): ShipModuleSelection[] {
    if (!shipClass) return [];
    const layout =
      this.gameData.getShipClassSlotRuleForShipClass?.(shipClass) ??
      this.gameData.getShipClassSlotRule(shipClass.category);
    if (!layout) return [];

    const slotsById = new Map(layout.slots.map((slot) => [slot.slotId, slot]));
    const freeSlotIdsByCategory = new Map<string, string[]>();
    for (const slot of layout.slots) {
      if (!freeSlotIdsByCategory.has(slot.moduleCategory)) {
        freeSlotIdsByCategory.set(slot.moduleCategory, []);
      }
      freeSlotIdsByCategory.get(slot.moduleCategory)!.push(slot.slotId);
    }

    const selections: ShipModuleSelection[] = [];
    for (const module of [...modules].sort((a, b) => a.id - b.id)) {
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

  private moduleSelectionNames(
    moduleSelections: ShipModuleSelection[],
  ): string[] {
    return moduleSelections.map((selection) => {
      const item = this.gameData.getFabricationItemByOutputCommodity(
        selection.commodityId,
      );
      return item?.displayName ?? `Modul #${selection.commodityId}`;
    });
  }

  private defaultModuleSummaries(hangarDef: HangarShipDef): Array<{
    commodityId: number;
    name: string;
  }> {
    return (hangarDef.defaultModuleCommodityIds ?? []).map((commodityId) => {
      const item =
        this.gameData.getFabricationItemByOutputCommodity(commodityId);
      return {
        commodityId,
        name: item?.displayName ?? `Modul #${commodityId}`,
      };
    });
  }

  private getHangarBuildCosts(
    hangarDef: HangarShipDef,
    amount: number,
  ): Array<{ commodityId: number; amount: number }> {
    const totals = new Map<number, number>();
    for (const cost of hangarDef.buildCosts ?? []) {
      totals.set(
        cost.commodityId,
        (totals.get(cost.commodityId) ?? 0) + cost.amount * amount,
      );
    }
    for (const commodityId of hangarDef.defaultModuleCommodityIds ?? []) {
      totals.set(commodityId, (totals.get(commodityId) ?? 0) + amount);
    }
    return Array.from(totals, ([commodityId, required]) => ({
      commodityId,
      amount: required,
    }));
  }

  private maxBuildableHangarAmount(
    colony: Colony,
    hangarDef: HangarShipDef,
  ): number {
    const limits = [50];
    if (hangarDef.buildEnergyCost > 0) {
      limits.push(Math.floor((getColonyChangeable(colony).energy ?? 0) / hangarDef.buildEnergyCost));
    }
    const storage = new Map(
      (colony.storage ?? []).map((row) => [row.commodityId, row.amount]),
    );
    for (const cost of this.getHangarBuildCosts(hangarDef, 1)) {
      if (cost.amount <= 0) continue;
      limits.push(
        Math.floor((storage.get(cost.commodityId) ?? 0) / cost.amount),
      );
    }
    return Math.max(0, Math.min(...limits));
  }

  constructor(
    @InjectRepository(Colony)
    private readonly colonyRepo: Repository<Colony>,
    @InjectRepository(ColonyDepositMining)
    private readonly depositMiningRepo: Repository<ColonyDepositMining>,
    @InjectRepository(ColonyStorage)
    private readonly storageRepo: Repository<ColonyStorage>,
    @InjectRepository(Spacecraft)
    private readonly shipRepo: Repository<Spacecraft>,
    @InjectRepository(CargoItem)
    private readonly cargoRepo: Repository<CargoItem>,
    @InjectRepository(ColonyShipBuildQueue)
    private readonly shipBuildQueueRepo: Repository<ColonyShipBuildQueue>,
    @InjectRepository(ColonyShipBuildplan)
    private readonly shipBuildplanRepo: Repository<ColonyShipBuildplan>,
    @InjectRepository(ColonyOrbitAssignment)
    private readonly orbitAssignmentRepo: Repository<ColonyOrbitAssignment>,
    @InjectRepository(SpacecraftModule)
    private readonly spacecraftModuleRepo: Repository<SpacecraftModule>,
    @InjectRepository(ColonyFabricationQueue)
    private readonly fabricationQueueRepo: Repository<ColonyFabricationQueue>,
    @InjectRepository(ColonyCrewTrainingQueue)
    private readonly crewTrainingQueueRepo: Repository<ColonyCrewTrainingQueue>,
    @InjectRepository(ShipClassDef)
    private readonly shipClassRepo: Repository<ShipClassDef>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly gameData: GameDataService,
    private readonly unlockResolver: UnlockResolverService,
    private readonly colonyEconomyService: ColonyEconomyService,
    private readonly colonyCrewService: ColonyCrewService,
    private readonly colonyDefenseService: ColonyDefenseService,
    private readonly colonyEventService: ColonyEventService,
    private readonly colonySocialService: ColonySocialService,
    private readonly colonyOrbitService: ColonyOrbitService,
  ) {}

  toColonySummary(colony: Colony): Colony {
    return Object.assign(colony, {
      locationLabel:
        colony.celestialObject?.name || colony.starSystem?.name || 'Unknown',
      fields: (colony.fields ?? []).map((field) => ({
        id: field.id,
        fieldIndex: field.fieldIndex,
        fieldType: field.fieldType,
        terrainTileId: field.terrainTileId ?? null,
        layer: field.layer,
        buildingId: field.buildingId,
        isBuilding: field.isBuilding,
        isActive: field.isActive,
        integrity: field.integrity,
        maxIntegrity: field.maxIntegrity,
        buildProgress: field.buildProgress,
        buildFinishesAt: field.buildFinishesAt?.toISOString() ?? null,
        terraformingId: field.terraformingId,
        terraformingFinishesAt: field.terraformingFinishesAt?.toISOString() ?? null,
      })),
    });
  }

  async toColonyDetail(colony: Colony, userId: number): Promise<Colony> {
    const fields = colony.fields ?? [];
    const storage = colony.storage ?? [];
    const summary = this.colonyEconomyService.calculateSummary(colony);
    const effectiveState = summary.effectiveState;
    const changeable = getColonyChangeable(colony);
    const activeFunctionIds = effectiveState.functions.activeIds;
    const effectiveCurrentPopulation = effectiveState.population.current;
    if (colony.population !== effectiveCurrentPopulation) {
      syncLegacyColonySnapshot(colony);
      await this.colonyRepo.save(colony);
    }
    const workers = effectiveState.population.workers;
    const available = effectiveState.population.available;
    const productionDelta = new Map([
      ...summary.productionDelta,
      ...summary.depositDelta,
    ]);

    await this.colonyOrbitService.cleanupInvalidOrbitAssignments(colony);
    const orbitAssignments = await this.orbitAssignmentRepo.find({
      where: { colonyId: colony.id },
      order: { id: 'ASC' },
    });
    const orbitAssignmentByFleetId = new Map(
      orbitAssignments.map((assignment) => [assignment.fleetId, assignment]),
    );
    const defendingFleetIds = orbitAssignments
      .filter(
        (assignment) => assignment.mode === ColonyOrbitAssignmentMode.DEFEND,
      )
      .map((assignment) => assignment.fleetId);
    const blockadingFleetIds = orbitAssignments
      .filter(
        (assignment) => assignment.mode === ColonyOrbitAssignmentMode.BLOCKADE,
      )
      .map((assignment) => assignment.fleetId);
    const hasDefendingFleet = defendingFleetIds.length > 0;
    const hasBlockadingFleet = blockadingFleetIds.length > 0;
    const orbitShips = colony.starSystemId
      ? await this.shipRepo.find({
          where: {
            userId,
            starSystemId: colony.starSystemId,
            ...(colony.celestialObjectId
              ? { celestialObjectId: colony.celestialObjectId }
              : {}),
          },
          relations: ['fleet'],
          order: { id: 'ASC' },
        })
      : [];
    const orbitShipModules = orbitShips.length
      ? await this.spacecraftModuleRepo.find({
          where: { spacecraftId: In(orbitShips.map((ship) => ship.id)) },
          order: { id: 'ASC' },
        })
      : [];
    const orbitShipCargo = orbitShips.length
      ? await this.cargoRepo.find({
          where: { spacecraftId: In(orbitShips.map((ship) => ship.id)) },
          order: { id: 'ASC' },
        })
      : [];
    const modulesByShipId = new Map<number, SpacecraftModule[]>();
    for (const module of orbitShipModules) {
      const modules = modulesByShipId.get(module.spacecraftId) ?? [];
      modules.push(module);
      modulesByShipId.set(module.spacecraftId, modules);
    }
    const cargoByShipId = new Map<number, CargoItem[]>();
    for (const cargoItem of orbitShipCargo) {
      const cargo = cargoByShipId.get(cargoItem.spacecraftId) ?? [];
      cargo.push(cargoItem);
      cargoByShipId.set(cargoItem.spacecraftId, cargo);
    }
    const orbitShipClassIds = [
      ...new Set(orbitShips.map((ship) => ship.shipClassId)),
    ];
    const orbitShipClasses = orbitShipClassIds.length
      ? await this.shipClassRepo.findBy({ id: In(orbitShipClassIds) })
      : [];
    const orbitShipClassMap = new Map(
      orbitShipClasses.map((shipClass) => [shipClass.id, shipClass]),
    );
    const shipyardShipClasses = await this.shipClassRepo.find({
      where: { isNpc: false },
      order: { id: 'ASC' },
    });
    const shipyardShipClassMap = new Map(
      shipyardShipClasses.map((shipClass) => [shipClass.id, shipClass]),
    );
    const activeShipyardFunctionIds = this.getActiveShipyardFunctionIds(colony);
    const shipyardBuilding = this.getPrimaryShipyardBuilding();
    const shipyardUnlocked = shipyardBuilding
      ? await this.unlockResolver.isBuildingUnlocked(
          userId,
          shipyardBuilding.id,
        )
      : false;
    const depositMining = await this.depositMiningRepo.find({
      where: { colonyId: colony.id, userId },
      order: { commodityId: 'ASC' },
    });
    const shipBuildQueue = await this.shipBuildQueueRepo.find({
      where: {
        colonyId: colony.id,
        status: In([
          ColonyShipBuildQueueStatus.QUEUED,
          ColonyShipBuildQueueStatus.PAUSED,
        ]),
      },
      order: { finishesAt: 'ASC' },
    });
    const buildplans = await this.shipBuildplanRepo.find({
      where: { colonyId: colony.id, userId },
      order: { id: 'ASC' },
    });
    const fabricationQueue = await this.fabricationQueueRepo.find({
      where: {
        colonyId: colony.id,
        status: ColonyFabricationQueueStatus.QUEUED,
      },
      order: { finishesAt: 'ASC' },
    });
    const crewTrainingQueue = await this.crewTrainingQueueRepo.find({
      where: {
        colonyId: colony.id,
        status: ColonyCrewTrainingQueueStatus.QUEUED,
      },
      order: { id: 'ASC' },
    });
    const [
      assignedToColony,
      localCrewLimit,
      globalCrewLimit,
      remainingGlobal,
      trainableGlobal,
      inTraining,
      assignedTotal,
    ] = await Promise.all([
      this.colonyCrewService.getAssignedToColonyCount(colony.id),
      Promise.resolve(this.colonyCrewService.getLocalCrewLimit(colony)),
      this.colonyCrewService.getGlobalCrewLimit(userId),
      this.colonyCrewService.getRemainingCount(userId),
      this.colonyCrewService.getTrainableCount(userId),
      this.colonyCrewService.getInTrainingCount(userId),
      this.colonyCrewService.getAssignedCount(userId),
    ]);
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const userFaction = user?.faction ?? null;
    const featureAccess = this.colonyEconomyService.buildFeatureAccess(colony);
    const presentFabricationFunctionIds =
      featureAccess.functions.groups.fabrication.presentFunctionIds;
    const activeFabricationFunctionIds =
      featureAccess.functions.groups.fabrication.activeFunctionIds;
    const presentFabricationFunctionIdSet = new Set(
      presentFabricationFunctionIds,
    );
    const activeFabricationFunctionIdSet = new Set(
      activeFabricationFunctionIds,
    );
    const [eventUnreadCount, latestEvents] = await Promise.all([
      this.colonyEventService.getUnreadCountForColony(colony.id, userId),
      this.colonyEventService.getLatestForColony(colony.id, userId, 3),
    ]);
    const hangarInventory = await this.getHangarInventory(colony);
    const startableHangarShips = await this.getStartableHangarShips(
      userId,
      colony,
    );
    const hasAirfield =
      featureAccess.functions.groups.airfield.activeFunctionIds.length > 0;
    const completedTechIds = new Set(
      (await this.unlockResolver.getCompletedTechIds(userId)).values(),
    );
    const availableUpgradesByFieldIndex = new Map<number, Array<{
      id: number;
      fromBuildingId: number;
      toBuildingId: number;
      researchId: number | null;
      description: string;
      energyCost: number;
      costs: Array<{ commodityId: number; amount: number }>;
    }>>();
    for (const field of fields) {
      if (!field.buildingId || field.isBuilding) {
        availableUpgradesByFieldIndex.set(field.fieldIndex, []);
        continue;
      }
      const upgrades = this.gameData
        .getBuildingUpgradesForBuilding(field.buildingId)
        .filter(
          (upgrade) =>
            upgrade.fromBuildingId === field.buildingId &&
            (upgrade.researchId == null ||
              completedTechIds.has(upgrade.researchId)),
        )
        .flatMap((upgrade) => {
          const targetBuilding = this.gameData.getBuilding(upgrade.toBuildingId);
          if (!targetBuilding) return [];
          return [
            {
              id: upgrade.id,
              fromBuildingId: upgrade.fromBuildingId,
              toBuildingId: upgrade.toBuildingId,
              researchId: upgrade.researchId,
              description: upgrade.description,
              energyCost: upgrade.energyCost,
              costs: upgrade.costs,
            },
          ];
        });
      availableUpgradesByFieldIndex.set(field.fieldIndex, upgrades);
    }

    const planetaryDefense = fields
      .filter(
        (field) => field.buildingId && !field.isBuilding && field.isActive,
      )
      .flatMap((field) => {
        const functions = this.gameData
          .getBuildingFunctions(field.buildingId!)
          .filter((functionId) => [26, 27, 28].includes(functionId));
        const building = this.gameData.getBuilding(field.buildingId!);
        return functions.map((functionId) => ({
          fieldIndex: field.fieldIndex,
          buildingId: field.buildingId,
          buildingName: building?.name ?? `Gebäude #${field.buildingId}`,
          functionId,
          functionName:
            effectiveState.functions.active.find((fn) => fn.id === functionId)
              ?.name ?? String(functionId),
        }));
      });

    const storageAmountByCommodity = new Map(
      storage.map((storageItem) => [
        storageItem.commodityId,
        storageItem.amount,
      ]),
    );
    const availableShipModules = this.gameData
      .getAllFabricationItems()
      .filter(
        (item) =>
          item.queueType === ColonyFabricationQueueType.MODULE &&
          !!item.moduleType &&
          !!item.shipyardType &&
          (item.researchId == null || completedTechIds.has(item.researchId)),
      )
      .map((item) => {
        const compatibleShipClassIds = shipyardShipClasses
          .filter((shipClass) =>
            this.gameData.isShipyardModuleAllowedForShipClass(item, shipClass),
          )
          .map((shipClass) => shipClass.id);
        if (compatibleShipClassIds.length === 0) return null;
        const commodity = this.gameData.getCommodity(item.outputCommodityId);
        const stats = item.shipyardModuleStats;
        return {
          commodityId: item.outputCommodityId,
          commodityName: commodity?.name ?? `Ware #${item.outputCommodityId}`,
          amount: storageAmountByCommodity.get(item.outputCommodityId) ?? 0,
          moduleType: item.moduleType!,
          moduleCategory: item.moduleCategory ?? 'UNKNOWN',
          shipyardGroup: item.shipyardGroup ?? 'CORE_SYSTEMS',
          shipyardType: item.shipyardType ?? 'SPECIAL',
          moduleLevel: item.moduleLevel ?? 1,
          moduleClass: item.moduleClass ?? 1,
          researchRequired: item.researchRequired ?? null,
          faction: item.faction ?? null,
          displayName: item.displayName,
          crewRequired: stats?.crew ?? 0,
          effects: this.describeShipyardModuleEffects(item, undefined),
          shipyardModuleStats: stats ?? null,
          compatibleShipClassIds,
        };
      })
      .filter(Boolean);

    const hasCompletedShipyard =
      featureAccess.tabs.shipyard?.visible ??
      fields.some((field) => this.isShipyardField(field, false));
    const hasShipyardInProgress = fields.some((field) =>
      this.isShipyardField(field, true),
    );

    return Object.assign(this.toColonySummary(colony), {
      fieldCount: fields.length,
      storageItemCount: storage.length,
      detailV2: {
        featureAccess,
        eventSummary: {
          unreadCount: eventUnreadCount,
          latest: latestEvents.map((event) => ({
            id: event.id,
            type: event.type,
            severity: event.severity,
            title: event.title,
            message: event.message,
            createdAt: event.createdAt,
            readAt: event.readAt,
          })),
        },
        activeFunctions: effectiveState.functions.active,
        effectiveState,
        surface: this.buildSurfaceInfo(colony, fields),
        options: {
          name: colony.name,
          colonyMessage: changeable.colonyMessage ?? null,
          populationLimit: changeable.populationLimit ?? 0,
          immigrationEnabled: changeable.immigrationEnabled ?? true,
        },
        energy: {
          current: effectiveState.energy.current,
          max: effectiveState.energy.max,
          delta: effectiveState.energy.delta,
        },
        storage: {
          current: effectiveState.storage.current,
          max: effectiveState.storage.max,
          delta: effectiveState.storage.delta,
        },
        waste: {
          canDiscard: this.hasCompletedBuildingFunction(
            colony,
            this.warehouseFunctionId,
          ),
          requiredFunctionId: this.warehouseFunctionId,
        },
        population: {
          current: effectiveCurrentPopulation,
          max: summary.effectivePopulationMax,
          growth: this.calculatePopulationGrowth(colony, summary),
          workers,
          available,
          housing: summary.freeHousing,
          housingFree: summary.freeHousing,
          housingMax: summary.maxHousing,
          housingBonus: summary.housingBonus,
          populationLimit: changeable.populationLimit ?? 0,
          immigrationEnabled: changeable.immigrationEnabled ?? true,
        },
        inventory: storage
          .filter((item) => item.amount > 0)
          .map((item) => {
            const commodity = this.gameData.getCommodity(item.commodityId);
            return {
              id: item.id,
              commodityId: item.commodityId,
              name: commodity?.name ?? `Ware #${item.commodityId}`,
              nameShort: commodity?.nameShort ?? String(item.commodityId),
              amount: item.amount,
              delta: productionDelta.get(item.commodityId) ?? 0,
            };
          }),
        deposits: depositMining.map((deposit) => {
          const commodity = this.gameData.getCommodity(deposit.commodityId);
          const delta = summary.depositDelta.get(deposit.commodityId) ?? 0;
          return {
            commodityId: deposit.commodityId,
            name: commodity?.name ?? `Ware #${deposit.commodityId}`,
            nameShort: commodity?.nameShort ?? String(deposit.commodityId),
            amountLeft: deposit.amountLeft,
            delta,
            depleted: deposit.amountLeft <= 0,
          };
        }),
        productionDeltas: Array.from(productionDelta.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([commodityId, amount]) => {
            const commodity = this.gameData.getCommodity(commodityId);
            return {
              commodityId,
              name: commodity?.name ?? `Ware #${commodityId}`,
              nameShort: commodity?.nameShort ?? String(commodityId),
              amount,
            };
          }),
        buildingManagement: {
          counts: {
            active: fields.filter(
              (field) =>
                field.buildingId && !field.isBuilding && field.isActive,
            ).length,
            inactive: fields.filter(
              (field) =>
                field.buildingId && !field.isBuilding && !field.isActive,
            ).length,
            damaged: fields.filter(
              (field) =>
                field.buildingId &&
                !field.isBuilding &&
                field.maxIntegrity > 0 &&
                field.integrity < field.maxIntegrity,
            ).length,
            building: fields.filter(
              (field) => field.buildingId && field.isBuilding,
            ).length,
          },
          fields: fields
            .filter((field) => field.buildingId)
            .map((field) => {
              const building = field.buildingId
                ? this.gameData.getBuilding(field.buildingId)
                : undefined;
              return {
                ...(colony.fields ?? []).find(
                  (colonyField) => colonyField.fieldIndex === field.fieldIndex,
                ),
                fieldIndex: field.fieldIndex,
                fieldType: field.fieldType,
                terrainTileId: field.terrainTileId ?? null,
                layer: field.layer,
                buildingId: field.buildingId,
                buildingName: building?.name ?? `Gebäude #${field.buildingId}`,
                isActive: field.isActive,
                isBuilding: field.isBuilding,
                integrity: field.integrity,
                maxIntegrity: field.maxIntegrity,
                buildProgress: field.buildProgress,
                buildFinishesAt: field.buildFinishesAt?.toISOString() ?? null,
                terraformingId: field.terraformingId,
                terraformingFinishesAt:
                  field.terraformingFinishesAt?.toISOString() ?? null,
                availableUpgrades:
                  availableUpgradesByFieldIndex.get(field.fieldIndex) ?? [],
                epsProc: building?.epsProc ?? 0,
                bevUse: building?.bevUse ?? 0,
                bevPro: building?.bevPro ?? 0,
                production: building?.production ?? [],
                functions: (building?.functions ?? [])
                  .map(
                    (functionId) =>
                      effectiveState.functions.active.find(
                        (fn) => fn.id === functionId,
                      ) ?? this.gameData.getBuildingFunction(functionId),
                  )
                  .filter(Boolean),
              };
            }),
          usableCommodities: this.gameData
            .getAllCommodities()
            .filter((commodity) =>
              fields.some((field) => {
                const building = field.buildingId
                  ? this.gameData.getBuilding(field.buildingId)
                  : undefined;
                return building?.production?.some(
                  (entry) => entry.commodityId === commodity.id,
                );
              }),
            )
            .map((commodity) => ({ id: commodity.id, name: commodity.name })),
        },
        activeBuildJobs: fields
          .filter((field) => field.isBuilding && field.buildingId)
          .map((field) => {
            const building = this.gameData.getBuilding(field.buildingId!);
            return {
              fieldIndex: field.fieldIndex,
              buildingId: field.buildingId,
              buildingName: building?.name ?? `Gebaeude #${field.buildingId}`,
              finishesAt: field.buildFinishesAt,
              progress: field.buildProgress,
            };
          }),
        effects: this.buildEffectSummary(summary),
        orbitShips: orbitShips.map((ship) => {
          const shipClass = orbitShipClassMap.get(ship.shipClassId);
          const crewRequired = shipClass?.crewMin ?? 0;
          const canManage = this.colonyOrbitService.canManageOrbitShip(
            colony,
            ship,
          );
          const modules = modulesByShipId.get(ship.id) ?? [];
          const cargo = cargoByShipId.get(ship.id) ?? [];
          const normalizedModuleSelections =
            this.normalizeInstalledModuleSelections(shipClass, modules);
          const hasMatchingRepairShipyard =
            !!shipClass &&
            (() => {
              try {
                this.assertShipyardCompatibility(
                  shipClass,
                  activeShipyardFunctionIds,
                );
                return true;
              } catch {
                return false;
              }
            })();
          const canRepair =
            canManage &&
            hasMatchingRepairShipyard &&
            this.isShipRepairNeeded(ship, modules);
          const canRetrofit =
            canManage &&
            !!shipClass &&
            (() => {
              try {
                this.assertShipyardCompatibility(
                  shipClass,
                  activeShipyardFunctionIds,
                );
                return true;
              } catch {
                return false;
              }
            })();
          const shuttleCapacity =
            shipClass && 'shuttleSlots' in shipClass
              ? Number(
                  (shipClass as ShipClassDef & { shuttleSlots?: number })
                    .shuttleSlots ?? 0,
                )
              : 0;
          const shuttleModelAvailable = shuttleCapacity > 0;
          const orbitAssignment = ship.fleetId
            ? orbitAssignmentByFleetId.get(ship.fleetId)
            : undefined;
          const isFleetLeader = ship.fleet?.leaderId === ship.id;
          const canDefend =
            isFleetLeader &&
            ship.fleetId != null &&
            !orbitAssignment &&
            !hasBlockadingFleet;
          const canBlock =
            isFleetLeader &&
            ship.fleetId != null &&
            !orbitAssignment &&
            !hasDefendingFleet &&
            !planetaryDefense.length;
          const shuttleStored = cargo
            .filter(
              (item: CargoItem) =>
                this.gameData.getCommodity(item.commodityId)?.isShuttle,
            )
            .reduce((sum: number, item: CargoItem) => sum + item.amount, 0);
          return {
            id: ship.id,
            name: ship.name,
            shipClassId: ship.shipClassId,
            shipClassKey: shipClass?.key ?? null,
            shipClassName:
              shipClass?.name ?? `Schiffsklasse #${ship.shipClassId}`,
            shipCategory: shipClass?.category ?? null,
            shipRole: shipClass?.role ?? null,
            hull: ship.hull,
            hullMax: ship.hullMax,
            shields: ship.shields,
            shieldsMax: ship.shieldsMax,
            energy: ship.energy,
            energyMax: ship.energyMax,
            crew: ship.crew,
            crewRequired,
            crewMax: ship.crewMax,
            hasEnoughCrew: crewRequired <= 0 || ship.crew >= crewRequired,
            canLand:
              canManage &&
              hasAirfield &&
              !!shipClass &&
              !!this.getHangarDefForShipClass(shipClass),
            canDisassemble:
              canManage && getColonyChangeable(colony).energy >= 20 && hasMatchingRepairShipyard,
            canRepair,
            canRetrofit,
            canManage,
            canDefend,
            canBlock,
            orbitAssignment: orbitAssignment
              ? {
                  id: orbitAssignment.id,
                  mode: orbitAssignment.mode,
                  fleetId: orbitAssignment.fleetId,
                }
              : null,
            canManageShuttle: shuttleModelAvailable,
            shuttleCapacity,
            shuttleStored,
            orbitGroup: ship.fleetId != null ? 'FLEET' : 'SINGLE',
            orbitGroupLabel:
              ship.fleetId != null ? `Flotte #${ship.fleetId}` : 'Einzelschiff',
            fleetId: ship.fleetId,
            actionBlockers: {
              defend: canDefend
                ? null
                : orbitAssignment?.mode === ColonyOrbitAssignmentMode.DEFEND
                  ? 'Diese Flotte verteidigt die Kolonie bereits.'
                  : hasBlockadingFleet
                    ? 'Die Kolonie wird bereits blockiert.'
                    : !isFleetLeader
                      ? 'Nur Flottenführer können Kolonieverteidigung übernehmen.'
                      : null,
              block: canBlock
                ? null
                : orbitAssignment?.mode === ColonyOrbitAssignmentMode.BLOCKADE
                  ? 'Diese Flotte blockiert die Kolonie bereits.'
                  : hasDefendingFleet
                    ? 'Die Kolonie wird bereits verteidigt.'
                    : planetaryDefense.length
                      ? 'Kolonie verfügt über aktive Orbitalverteidigung.'
                      : !isFleetLeader
                        ? 'Nur Flottenführer können Kolonien blockieren.'
                        : null,
              shuttleManagement: shuttleModelAvailable
                ? null
                : 'Dieses Schiff hat keine Shuttle-Kapazität.',
              station:
                'No station entity is linked to colony orbit in SWU yet.',
            },
            station: null,
            modules: modules.map((module) => {
              const fallbackSelection = normalizedModuleSelections.find(
                (selection) =>
                  selection.commodityId ===
                  this.resolveModuleCommodityId(module),
              );
              return {
                id: module.id,
                moduleType: module.moduleType,
                category: module.category,
                level: module.level,
                integrity: module.integrity,
                isActive: module.isActive,
                commodityId: this.resolveModuleCommodityId(module),
                slotId: module.slotId ?? fallbackSelection?.slotId ?? null,
              };
            }),
            cargoUsed: ship.cargoUsed,
            cargoMax: ship.cargoMax,
            status: ship.status,
          };
        }),
        research: {
          pointsPerTick: summary.researchPoints,
        },
        planetaryDefense,
        defense: {
          shields: {
            current: changeable.shields ?? 0,
            max: this.getMaxShields(colony),
            frequency: changeable.shieldFrequency,
          },
          activeFunctionIds,
          energyPhalanx:
            this.colonyDefenseService.hasEnergyPhalanx(activeFunctionIds),
          particlePhalanx:
            this.colonyDefenseService.hasParticlePhalanx(activeFunctionIds),
          antiParticle:
            this.colonyDefenseService.hasAntiParticle(activeFunctionIds),
          torpedoTypeId: changeable.torpedoTypeId,
          selectedTorpedoType: changeable.torpedoTypeId
            ? this.gameData.getTorpedoType(changeable.torpedoTypeId)
            : null,
          availableTorpedoTypes: this.gameData
            .getAllTorpedoTypes()
            .map((torpedo) => {
              const inventoryItem = storage.find(
                (item) => item.commodityId === torpedo.commodityId,
              );
              return { ...torpedo, amount: inventoryItem?.amount ?? 0 };
            })
            .filter((torpedo) => torpedo.amount > 0),
        },
        shields: {
          current: changeable.shields ?? 0,
          max: this.getMaxShields(colony),
          frequency: changeable.shieldFrequency,
        },
        shipBuildQueue: shipBuildQueue.map((job) => {
          const mode = job.mode ?? ColonyShipBuildQueueMode.BUILD;
          const shipClass = shipyardShipClassMap.get(job.shipClassId);
          const hasMatchingRepairShipyard =
            mode !== ColonyShipBuildQueueMode.REPAIR ||
            (!!shipClass &&
              (() => {
                try {
                  this.assertShipyardCompatibility(
                    shipClass,
                    activeShipyardFunctionIds,
                  );
                  return true;
                } catch {
                  return false;
                }
              })());
          const canReactivate =
            mode === ColonyShipBuildQueueMode.REPAIR &&
            job.status === ColonyShipBuildQueueStatus.PAUSED &&
            !changeable.isBlockaded &&
            hasMatchingRepairShipyard &&
            this.getActiveRepairSlotCount(colony) > 0;
          const reactivationBlockedReason =
            mode !== ColonyShipBuildQueueMode.REPAIR
              ? 'Nur Reparaturjobs können reaktiviert werden.'
              : job.status !== ColonyShipBuildQueueStatus.PAUSED
                ? 'Nur pausierte Reparaturjobs können reaktiviert werden.'
                : changeable.isBlockaded
                  ? 'Reparaturen sind während einer Blockade gesperrt.'
                  : !hasMatchingRepairShipyard
                    ? 'Aktive passende Werft erforderlich.'
                    : this.getActiveRepairSlotCount(colony) <= 0
                      ? 'Aktive passende Werft erforderlich.'
                      : null;
          return {
            id: job.id,
            shipClassId: job.shipClassId,
            spacecraftId: job.spacecraftId,
            mode,
            name: job.name,
            canReactivate,
            reactivationBlockedReason,
            buildPlanName: job.buildPlanName,
            buildPlanId: job.buildPlanId,
            buildPlanSignature: job.buildPlanSignature,
            moduleSelections: job.moduleSelections,
            moduleTypes: job.moduleTypes,
            moduleCommodityIds: job.moduleCommodityIds,
            crewAssigned: job.crewAssigned,
            crewIds: job.crewIds,
            repairSnapshot: job.repairSnapshot,
            retrofitSnapshot: job.retrofitSnapshot,
            moduleNames: this.moduleSelectionNames(job.moduleSelections ?? []),
            finishesAt: job.finishesAt,
            stoppedAt: job.stoppedAt,
            status: job.status,
          };
        }),
        shipyardQueue: shipBuildQueue.map((job) => {
          const mode = job.mode ?? ColonyShipBuildQueueMode.BUILD;
          const shipClass = shipyardShipClassMap.get(job.shipClassId);
          const hasMatchingRepairShipyard =
            mode !== ColonyShipBuildQueueMode.REPAIR ||
            (!!shipClass &&
              (() => {
                try {
                  this.assertShipyardCompatibility(
                    shipClass,
                    activeShipyardFunctionIds,
                  );
                  return true;
                } catch {
                  return false;
                }
              })());
          const canReactivate =
            mode === ColonyShipBuildQueueMode.REPAIR &&
            job.status === ColonyShipBuildQueueStatus.PAUSED &&
            !changeable.isBlockaded &&
            hasMatchingRepairShipyard &&
            this.getActiveRepairSlotCount(colony) > 0;
          const reactivationBlockedReason =
            mode !== ColonyShipBuildQueueMode.REPAIR
              ? 'Nur Reparaturjobs können reaktiviert werden.'
              : job.status !== ColonyShipBuildQueueStatus.PAUSED
                ? 'Nur pausierte Reparaturjobs können reaktiviert werden.'
                : changeable.isBlockaded
                  ? 'Reparaturen sind während einer Blockade gesperrt.'
                  : !hasMatchingRepairShipyard
                    ? 'Aktive passende Werft erforderlich.'
                    : this.getActiveRepairSlotCount(colony) <= 0
                      ? 'Aktive passende Werft erforderlich.'
                      : null;
          return {
            id: job.id,
            shipClassId: job.shipClassId,
            spacecraftId: job.spacecraftId,
            mode,
            name: job.name,
            canReactivate,
            reactivationBlockedReason,
            buildPlanName: job.buildPlanName,
            buildPlanId: job.buildPlanId,
            buildPlanSignature: job.buildPlanSignature,
            moduleSelections: job.moduleSelections,
            moduleCommodityIds: job.moduleCommodityIds,
            moduleTypes: job.moduleTypes,
            repairSnapshot: job.repairSnapshot,
            retrofitSnapshot: job.retrofitSnapshot,
            moduleNames: this.moduleSelectionNames(job.moduleSelections ?? []),
            finishesAt: job.finishesAt,
            stoppedAt: job.stoppedAt,
            status: job.status,
          };
        }),
        availableShipModules,
        buildplans: buildplans.map((buildplan) => ({
          id: buildplan.id,
          shipClassId: buildplan.shipClassId,
          name: buildplan.name,
          signature: buildplan.signature,
          moduleSelections: buildplan.moduleSelections,
          moduleCommodityIds: buildplan.moduleCommodityIds,
          moduleTypes: buildplan.moduleTypes,
        })),
        fabricationQueue: fabricationQueue.map((job) => {
          const item = this.gameData.getFabricationItem(job.itemKey);
          return {
            id: job.id,
            queueType: job.queueType,
            itemKey: job.itemKey,
            displayName: item?.displayName ?? job.itemKey,
            amount: job.amount,
            outputCommodityId: item?.outputCommodityId ?? null,
            outputAmount: item ? item.outputAmount * job.amount : 0,
            buildingFunctionId: job.buildingFunctionId,
            functionName:
              this.gameData.getBuildingFunction(job.buildingFunctionId)?.name ??
              String(job.buildingFunctionId),
            finishesAt: job.finishesAt,
            status: job.status,
          };
        }),
        fabricationCatalog: this.gameData
          .getAllFabricationItems()
          .filter(
            (item) =>
              (item.faction == null || item.faction === userFaction) &&
              (item.researchId == null ||
                completedTechIds.has(item.researchId)) &&
              item.buildingFunctionIds.some((functionId) =>
                presentFabricationFunctionIdSet.has(functionId),
              ),
          )
          .map((item) => ({
            ...item,
            available: item.buildingFunctionIds.some((functionId) =>
              activeFabricationFunctionIdSet.has(functionId),
            ),
          })),
        activeFabricationFunctionIds,
        social: this.colonySocialService.buildSocialSummary(colony, summary, {
          globalCrewLimit,
          crewOnShips: Math.max(0, assignedTotal - assignedToColony),
          availableCrewOnColony: assignedToColony,
          inTraining,
          trainableRemaining: remainingGlobal,
        }),
        crew: {
          available: assignedToColony,
          assignedToColony,
          inTraining,
          localLimit: localCrewLimit,
          globalLimit: globalCrewLimit,
          remainingGlobal,
          trainableNow: this.getColonyTrainableCrewNow(
            colony,
            trainableGlobal,
            inTraining,
          ),
          trainingFacility: (() => {
            const facility =
              this.colonyEconomyService.getCrewTrainingFacility(colony);
            return {
              ...facility,
              maxConcurrent: Number.isFinite(facility.maxConcurrent)
                ? facility.maxConcurrent
                : null,
            };
          })(),
          trainingQueue: crewTrainingQueue.map((job) => ({
            id: job.id,
            amount: job.amount,
            finishesAt: job.finishesAt,
            status: job.status,
          })),
        },
        hangar: {
          hasAirfield,
          inventory: hangarInventory,
          buildable: startableHangarShips.map(({ shipClass, hangarDef }) => ({
            shipClassId: shipClass.id,
            shipClassKey: shipClass.key,
            shipClassName: shipClass.name,
            hangarCommodityId: hangarDef.hangarCommodityId,
            displayName: hangarDef.displayName,
            buildEnergyCost: hangarDef.buildEnergyCost,
            startEnergyCost: hangarDef.startEnergyCost,
            buildCosts: this.getHangarBuildCosts(hangarDef, 1),
            defaultModules: this.defaultModuleSummaries(hangarDef),
            maxBuildable: this.maxBuildableHangarAmount(colony, hangarDef),
            crewRequired: shipClass.crewMin,
          })),
          startable: startableHangarShips.map(
            ({ shipClass, hangarDef, amount }) => ({
              shipClassId: shipClass.id,
              shipClassKey: shipClass.key,
              shipClassName: shipClass.name,
              hangarCommodityId: hangarDef.hangarCommodityId,
              displayName: hangarDef.displayName,
              amount,
              startEnergyCost: hangarDef.startEnergyCost,
              defaultModules: this.defaultModuleSummaries(hangarDef),
              crewRequired: shipClass.crewMin,
            }),
          ),
          landableOrbitShips: orbitShips
            .filter((ship) => {
              const shipClass = orbitShipClassMap.get(ship.shipClassId);
              return (
                this.colonyOrbitService.canManageOrbitShip(colony, ship) &&
                hasAirfield &&
                !!shipClass &&
                !!this.getHangarDefForShipClass(shipClass)
              );
            })
            .map((ship) => ({
              id: ship.id,
              name: ship.name,
              shipClassId: ship.shipClassId,
            })),
        },
        orbitBlockers: {
          shuttleManagement: null,
          station:
            'Blocked: SWU has no station entity attached to colony orbit; only general station influence types exist.',
          defense: null,
        },
        orbitAssignments: orbitAssignments.map((assignment) => ({
          id: assignment.id,
          mode: assignment.mode,
          fleetId: assignment.fleetId,
          spacecraftId: assignment.spacecraftId,
          createdAt: assignment.createdAt,
        })),
        shipyard: {
          unlocked: shipyardUnlocked,
          completed: hasCompletedShipyard,
          inProgress: hasShipyardInProgress,
          buildingId: shipyardBuilding?.id ?? 85010100,
          buildingName: shipyardBuilding?.name ?? 'Werfthub',
          hasAirfield:
            featureAccess.functions.groups.airfield.presentFunctionIds.length >
            0,
          airfieldPresentFunctionIds:
            featureAccess.functions.groups.airfield.presentFunctionIds,
          airfieldActiveFunctionIds:
            featureAccess.functions.groups.airfield.activeFunctionIds,
          airfield: {
            present:
              featureAccess.functions.groups.airfield.presentFunctionIds
                .length > 0,
            active:
              featureAccess.functions.groups.airfield.activeFunctionIds.length >
              0,
            buildableCount: startableHangarShips.length,
            startableCount: startableHangarShips.filter(
              ({ amount }) => amount > 0,
            ).length,
            landableCount: orbitShips.filter((ship) => {
              const shipClass = orbitShipClassMap.get(ship.shipClassId);
              return (
                this.colonyOrbitService.canManageOrbitShip(colony, ship) &&
                hasAirfield &&
                !!shipClass &&
                !!this.getHangarDefForShipClass(shipClass)
              );
            }).length,
          },
          orbitalMaintenance: effectiveState.orbitalMaintenance,
          fighterPresentFunctionIds:
            featureAccess.functions.groups.fighterShipyards.presentFunctionIds,
          fighterActiveFunctionIds:
            featureAccess.functions.groups.fighterShipyards.activeFunctionIds,
          presentFunctionIds:
            featureAccess.functions.groups.shipyards.presentFunctionIds,
          activeFunctionIds:
            featureAccess.functions.groups.shipyards.activeFunctionIds,
          repairPresentFunctionIds:
            featureAccess.functions.groups.repairShipyards.presentFunctionIds,
          repairActiveFunctionIds:
            featureAccess.functions.groups.repairShipyards.activeFunctionIds,
          slotRules: this.gameData.getAllShipClassSlotRules(),
          shipClassLayouts: shipyardShipClasses
            .map((shipClass) => {
              const hangarDef = this.getHangarDefForShipClass(shipClass);
              const layout =
                this.gameData.getShipClassSlotRuleForShipClass?.(shipClass) ??
                this.gameData.getShipClassSlotRule(shipClass.category);
              return layout
                ? {
                    shipClassId: shipClass.id,
                    imageKey: layout.imageKey,
                    layoutKey: layout.layoutKey,
                    slots: layout.slots,
                    fixedModuleCommodityIds:
                      hangarDef?.defaultModuleCommodityIds ?? null,
                    fixedBuildCosts: hangarDef
                      ? this.getHangarBuildCosts(hangarDef, 1)
                      : null,
                    stuRumpId:
                      this.gameData.getShipClassDefByKey(shipClass.key)
                        ?.stuRumpId ?? null,
                    baseStats:
                      this.gameData.getShipyardRumpStats(
                        this.gameData.getShipClassDefByKey(shipClass.key)
                          ?.stuRumpId,
                      ) ?? null,
                  }
                : null;
            })
            .filter((layout): layout is NonNullable<typeof layout> => !!layout),
        },
      },
    });
  }

  private buildSurfaceInfo(colony: Colony, fields: ColonyField[]) {
    const layers = Array.from(
      new Set(
        fields
          .map((field) => field.layer)
          .filter((layer): layer is 'ORBIT' | 'SURFACE' | 'UNDERGROUND' =>
            Boolean(layer),
          ),
      ),
    );
    return {
      width: colony.surfaceWidth ?? 10,
      rotationFactor: colony.rotationFactor ?? null,
      layers,
      hasUnderground: layers.includes('UNDERGROUND'),
    };
  }
  private getColonyTrainableCrewNow(
    colony: Colony,
    trainableGlobal: number,
    inTraining: number,
  ): number {
    const trainingFacility =
      this.colonyEconomyService.getCrewTrainingFacility(colony);
    const globalTrainableNow = Math.max(0, trainableGlobal - inTraining);
    if (trainingFacility.mode !== 'CENTRAL') {
      return trainingFacility.active ? globalTrainableNow : 0;
    }
    if (!trainingFacility.active) return 0;
    return Math.min(globalTrainableNow, Math.max(0, 2 - inTraining));
  }

  private calculatePopulationGrowth(
    colony: Colony,
    summary: ColonyInternalSummary,
  ): number {
    if (getColonyChangeable(colony).immigrationEnabled === false) {
      return 0;
    }

    const currentPopulation = getEffectiveCurrentPopulation(colony);
    const freeHousing = summary.maxHousing - currentPopulation;
    if (freeHousing <= 0) {
      return 0;
    }

    const lifeStandardProduction = summary.productionDelta.get(1300) ?? 0;
    if (lifeStandardProduction === 0) {
      return 0;
    }

    const lifeStandardPercentage =
      lifeStandardProduction > currentPopulation || currentPopulation <= 0
        ? 100
        : Math.floor((lifeStandardProduction * 100) / currentPopulation);
    const bevGrowthRate =
      this.gameData.getColonyClass(colony.colonyClassId)?.bevGrowthRate ?? 100;

    let immigration = Math.ceil(
      (freeHousing / 3 / 100) * bevGrowthRate * (lifeStandardPercentage / 50),
    );

    if (currentPopulation + immigration > summary.maxHousing) {
      immigration = summary.maxHousing - currentPopulation;
    }

    const populationLimit = getColonyChangeable(colony).populationLimit ?? 0;
    if (
      populationLimit > 0 &&
      currentPopulation + immigration > populationLimit
    ) {
      immigration = populationLimit - currentPopulation;
    }

    return Math.max(0, immigration);
  }

  private buildEffectSummary(summary: ColonyInternalSummary) {
    const effects: Array<{ label: string; value: number; source: string }> = [];
    for (const field of summary.activeFields) {
      const definition = this.gameData.getBuilding(field.buildingId!);
      if (!definition) continue;
      if (definition.epsProc) {
        effects.push({
          label: 'Energie',
          value: definition.epsProc,
          source: definition.name,
        });
      }
      if (definition.bonuses.population !== 0) {
        effects.push({
          label: 'Bevoelkerung',
          value: definition.bonuses.population,
          source: definition.name,
        });
      }
      for (const output of definition.production) {
        const commodity = this.gameData.getCommodity(output.commodityId);
        if (commodity?.isTradeOnly) {
          effects.push({
            label: commodity.name,
            value: output.amount,
            source: definition.name,
          });
        }
      }
      if (definition.researchPoints) {
        effects.push({
          label: 'Forschungspunkte',
          value: definition.researchPoints,
          source: definition.name,
        });
      }
    }
    effects.unshift({
      label: 'Basis-Forschung',
      value: summary.researchPoints > 0 ? 1 : 0,
      source: 'Kolonie',
    });
    return effects;
  }

  private getActiveBuildingFunctionIds(colony: Colony): number[] {
    return this.colonyEconomyService.getActiveFunctionIds(colony);
  }

  private getMaxShields(colony: Colony): number {
    return this.colonyDefenseService.calculateMaxShieldsByFunctions(
      this.getActiveBuildingFunctionIds(colony),
    );
  }

  private hasCompletedBuildingFunction(
    colony: Colony,
    functionId: number,
  ): boolean {
    return (colony.fields ?? []).some(
      (field) =>
        field.buildingId &&
        !field.isBuilding &&
        this.gameData
          .getBuildingFunctions(field.buildingId)
          .includes(functionId),
    );
  }

  private getHangarDefForShipClass(
    shipClass: ShipClassDef,
  ): HangarShipDef | undefined {
    return this.gameData.getHangarShipDef(shipClass.key);
  }

  private async getHangarInventory(colony: Colony): Promise<
    Array<{
      shipClassKey: string;
      hangarCommodityId: number;
      displayName: string;
      amount: number;
    }>
  > {
    const inventory = [];
    for (const def of this.gameData.getAllHangarShipDefs()) {
      const storage = await this.storageRepo.findOne({
        where: { colonyId: colony.id, commodityId: def.hangarCommodityId },
      });
      inventory.push({
        shipClassKey: def.shipClassKey,
        hangarCommodityId: def.hangarCommodityId,
        displayName: def.displayName,
        amount: storage?.amount ?? 0,
      });
    }
    return inventory;
  }

  private async getStartableHangarShips(
    userId: number,
    colony: Colony,
  ): Promise<
    Array<{
      shipClass: ShipClassDef;
      hangarDef: HangarShipDef;
      amount: number;
    }>
  > {
    const result = [];
    for (const def of this.gameData.getAllHangarShipDefs()) {
      const shipClass = await this.shipClassRepo.findOne({
        where: { key: def.shipClassKey },
      });
      if (!shipClass || shipClass.isNpc) continue;
      const unlocked = await this.unlockResolver.isShipClassUnlocked(
        userId,
        shipClass.id,
      );
      if (!unlocked) continue;
      const storage = await this.storageRepo.findOne({
        where: { colonyId: colony.id, commodityId: def.hangarCommodityId },
      });
      result.push({ shipClass, hangarDef: def, amount: storage?.amount ?? 0 });
    }
    return result;
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

  private describeShipyardModuleEffects(
    item: {
      moduleType?: string;
      moduleLevel?: number;
      shipyardType?: string;
      shipyardModuleStats?: {
        crew?: number;
        level?: number;
        defaultFactor: number;
        energyCost: number;
      };
    },
    baseStats?: { baseEvadeChance: number } | null,
  ): string[] {
    const stats = item.shipyardModuleStats;
    if (!stats) return [];

    const effects: string[] = [];
    const definition = this.findModuleDefinition(item.moduleType);
    const level = item.moduleLevel ?? stats.level ?? 1;

    if (definition) {
      const runtimeEffect = this.describeRuntimeModuleEffect(
        item.shipyardType,
        definition,
        level,
      );
      if (runtimeEffect) effects.push(runtimeEffect);
      if (definition.name === 'Ionenkanone') effects.push('Ioneneffekt');
    }

    if (effects.length === 0) {
      const modifier = this.formatSignedPercent(stats.defaultFactor);
      switch (item.shipyardType) {
        case 'SUBLIGHT_DRIVE': {
          const baseEvadeChance = baseStats?.baseEvadeChance ?? 0;
          const value =
            (1 - baseEvadeChance / 100) / (1 + stats.defaultFactor / 100);
          const evadeChance = Math.round((1 - value) * 100);
          effects.push(`Ausweichchance: ${evadeChance}%`);
          break;
        }
        case 'HULL':
          effects.push(`Hüllenstärke: ${modifier}`);
          break;
        case 'SHIELDS':
          effects.push(`Schildkapazität: ${modifier}`);
          break;
        case 'SENSORS':
          effects.push(
            `Sensorreichweite: ${stats.defaultFactor >= 0 ? '+' : ''}${stats.defaultFactor}`,
          );
          break;
        case 'HYPERDRIVE':
          effects.push(`Warp/Hyperdrive: ${modifier}`);
          break;
        case 'REACTOR':
          effects.push(`Reaktorleistung: ${modifier}`);
          break;
        case 'EPS':
          effects.push(`EPS-Leistung: ${modifier}`);
          break;
        case 'ENERGY_WEAPON':
          effects.push(`Energiewaffenschaden: ${modifier}`);
          break;
        case 'TORPEDO_BANK':
          effects.push(`Torpedoleistung: ${modifier}`);
          break;
      }
    }

    if ((stats.crew ?? 0) > 0) effects.push(`Crew: +${stats.crew}`);
    if (stats.energyCost > 0)
      effects.push(`Energiekosten: ${stats.energyCost}`);
    return effects;
  }

  private describeRuntimeModuleEffect(
    shipyardType: string | undefined,
    definition: ModuleDef,
    level: number,
  ): string | null {
    switch (shipyardType) {
      case 'SHIELDS':
        return this.describeScaledRuntimeValue(
          'Schildkapazität',
          definition,
          'secret',
          'baseShieldStrength',
          level,
          'Standard-Deflektorschild',
          'Standard',
        );
      case 'ENERGY_WEAPON':
        return this.describeWeaponRuntimeEffect(definition, level);
      case 'SENSORS':
        return this.describeScaledRuntimeValue(
          'Sensorreichweite',
          definition,
          'public',
          'baseSensorRange',
          level,
          'Standard-Scanner',
          'Standard',
        );
      case 'SUBLIGHT_DRIVE':
        return this.describeScaledRuntimeValue(
          'Ausweichchance',
          definition,
          'public',
          'baseEvadeChance',
          level,
          'Ion-Triebwerk',
          'Basis',
        );
      case 'HYPERDRIVE':
        return this.describeScaledRuntimeValue(
          'Warpdrive',
          definition,
          'public',
          'baseWarpdriveCapacity',
          level,
          'Standard-Hyperantrieb',
          'Standard',
        );
      case 'REACTOR':
        return this.describeScaledRuntimeValue(
          'Reaktorleistung',
          definition,
          'public',
          'baseReactorOutput',
          level,
          'Hypermaterie-Reaktor',
          'Standard',
        );
      case 'EPS':
        return this.describeEpsRuntimeEffect(definition, level);
      case 'HULL':
        return this.describeHullRuntimeEffect(definition, level);
      default:
        return null;
    }
  }

  private describeWeaponRuntimeEffect(
    definition: ModuleDef,
    level: number,
  ): string | null {
    const effects: string[] = [];
    const damageEffect = this.describeScaledRuntimeValue(
      'Waffenschaden',
      definition,
      'secret',
      'baseDamage',
      level,
      'Leichter Turbolaser',
      'Leicht',
    );
    if (damageEffect) effects.push(damageEffect);

    const multiplier = definition.secret.projectileDamageMultiplier;
    if (typeof multiplier === 'number' && Number.isFinite(multiplier)) {
      const percent = Math.round((multiplier - 1) * 100);
      effects.push(`Torpedoleistung: ${this.formatSignedPercent(percent)}`);
    }

    return effects.length > 0 ? effects.join('; ') : null;
  }

  private describeEpsRuntimeEffect(
    definition: ModuleDef,
    level: number,
  ): string | null {
    const effects: string[] = [];
    const epsCapacity = this.describeScaledRuntimeValue(
      'EPS-Speicher',
      definition,
      'public',
      'baseEpsCapacity',
      level,
      'Energieverteiler',
      'Standard',
    );
    if (epsCapacity) effects.push(epsCapacity);

    const batteryCapacity = this.scaledModuleStat(
      definition.public.baseBatteryCapacity,
      level,
    );
    if (batteryCapacity != null) {
      effects.push(`Ersatzbatterie: +${batteryCapacity}`);
    }

    return effects.length > 0 ? effects.join('; ') : null;
  }

  private describeHullRuntimeEffect(
    definition: ModuleDef,
    level: number,
  ): string | null {
    const effects: string[] = [];
    const hullEffect = this.describeScaledRuntimeValue(
      'Hüllenstärke',
      definition,
      'public',
      'baseHullPoints',
      level,
      'Durastahl-Panzerung',
      'Durastahl',
    );
    if (hullEffect) effects.push(hullEffect);

    const projectileResistances = definition.secret.projectileResistances;
    if (projectileResistances && typeof projectileResistances === 'object') {
      const labels: Record<string, string> = {
        PROTON: 'Proton',
        QUANTUM: 'Quantum',
        HEAVY_QUANTUM: 'Schweres Quantum',
        PLASMA: 'Plasma',
        HEAVY_PLASMA: 'Schweres Plasma',
      };
      const parts = Object.entries(labels).flatMap(([type, label]) => {
        const value = (projectileResistances as Record<string, unknown>)[type];
        return typeof value === 'number' &&
          Number.isFinite(value) &&
          value > 0 &&
          value <= 100
          ? [`${label} -${value}%`]
          : [];
      });
      if (parts.length > 0) {
        effects.push(`Torpedoschutz: ${parts.join(', ')}`);
      }
    }

    return effects.length > 0 ? effects.join('; ') : null;
  }

  private describeScaledRuntimeValue(
    label: string,
    definition: ModuleDef,
    statVisibility: 'public' | 'secret',
    statKey: string,
    level: number,
    baselineModuleName: string,
    baselineLabel: string,
  ): string | null {
    const value = this.scaledModuleStat(
      definition[statVisibility][statKey],
      level,
    );
    if (value == null) return null;

    const baseline = this.findModuleDefinition(baselineModuleName);
    const baselineValue = baseline
      ? this.scaledModuleStat(baseline[statVisibility][statKey], level)
      : null;
    if (!baselineValue) return `${label}: ${value}`;

    const deltaPercent = Math.round((value / baselineValue - 1) * 100);
    return `${label}: ${value} (${this.formatSignedPercent(deltaPercent)} ggü. ${baselineLabel})`;
  }

  private scaledModuleStat(value: unknown, level: number): number | null {
    if (typeof value !== 'number') return null;
    const levelScale = 1 + (Math.max(1, level) - 1) * 0.2;
    return Math.round(value * levelScale);
  }

  private formatSignedPercent(value: number): string {
    return value >= 0 ? `+${value}%` : `${value}%`;
  }

  private findModuleDefinition(
    moduleType: string | undefined,
  ): ModuleDef | undefined {
    if (!moduleType) return undefined;
    return this.gameData
      .getAllModules()
      .find((definition) => definition.name === moduleType);
  }

  private getActiveRepairStationCount(colony: Colony): number {
    return (colony.fields ?? []).filter(
      (field) =>
        field.buildingId &&
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

  private getActiveShipyardFunctionIds(colony: Colony): number[] {
    return [
      ...new Set(
        (colony.fields ?? [])
          .filter((field) => this.isShipyardField(field, false) && field.isActive)
          .flatMap((field) =>
            this.gameData.getBuildingFunctions(field.buildingId!),
          )
          .filter((functionId) => this.shipyardFunctionIds.has(functionId)),
      ),
    ];
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
    const hasCompatibleShipyard = allowedIds.some(
      (functionId) => activeShipyardFunctionIds.includes(functionId),
    );
    if (!hasCompatibleShipyard) {
      throw new BadRequestException(
        `${shipClass.category} cannot be built by the active shipyard`,
      );
    }
  }

  private getPrimaryShipyardBuilding() {
    return (
      this.gameData.getBuilding(85010100) ??
      this.gameData.getBuilding(85010300) ??
      this.gameData.getBuilding(11) ??
      null
    );
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
}
