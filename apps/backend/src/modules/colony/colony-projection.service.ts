import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CargoItem } from '../spacecraft/entities/cargo-item.entity';
import { ShipClassDef } from '../spacecraft/entities/ship-class-def.entity';
import { SpacecraftModule } from '../spacecraft/entities/spacecraft-module.entity';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import { GameDataService, HangarShipDef } from '../game-data/game-data.service';
import { UnlockResolverService } from '../research/unlock-resolver.service';
import { ColonyCrewService } from './colony-crew.service';
import { ColonyDefenseService } from './colony-defense.service';
import { ColonyEconomyService } from './colony-economy.service';
import { ColonyEventService } from './colony-event.service';
import { ColonyOrbitService } from './colony-orbit.service';
import { ColonySocialService } from './colony-social.service';
import {
  ColonyInternalSummary,
  getEffectiveCurrentPopulation,
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
  private readonly shipyardFunctionIds = new Set([5, 6, 7, 8, 21, 22]);
  private readonly repairShipyardFunctionId = 22;
  private readonly warehouseFunctionId = 23;

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
    });
  }

  async toColonyDetail(colony: Colony, userId: number): Promise<Colony> {
    const fields = colony.fields ?? [];
    const storage = colony.storage ?? [];
    const summary = this.colonyEconomyService.calculateSummary(colony);
    const effectiveState = summary.effectiveState;
    const activeFunctionIds = effectiveState.functions.activeIds;
    const effectiveCurrentPopulation = effectiveState.population.current;
    if (colony.stats && colony.population !== effectiveCurrentPopulation) {
      colony.population = effectiveCurrentPopulation;
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

    const availableShipModules = storage
      .map((storageItem) => {
        const item = this.gameData.getFabricationItemByOutputCommodity(
          storageItem.commodityId,
        );
        if (!item?.moduleType) return null;
        const commodity = this.gameData.getCommodity(storageItem.commodityId);
        return {
          commodityId: storageItem.commodityId,
          commodityName: commodity?.name ?? `Ware #${storageItem.commodityId}`,
          amount: storageItem.amount,
          moduleType: item.moduleType,
          moduleCategory: item.moduleCategory ?? 'UNKNOWN',
          moduleLevel: item.moduleLevel ?? 1,
          displayName: item.displayName,
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
        options: {
          name: colony.name,
          colonyMessage: colony.stats?.colonyMessage ?? null,
          populationLimit: colony.stats?.populationLimit ?? 0,
          immigrationEnabled: colony.stats?.immigrationEnabled ?? true,
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
          populationLimit: colony.stats?.populationLimit ?? 0,
          immigrationEnabled: colony.stats?.immigrationEnabled ?? true,
        },
        inventory: storage.map((item) => {
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
                fieldIndex: field.fieldIndex,
                buildingId: field.buildingId,
                buildingName: building?.name ?? `Gebäude #${field.buildingId}`,
                isActive: field.isActive,
                isBuilding: field.isBuilding,
                integrity: field.integrity,
                maxIntegrity: field.maxIntegrity,
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
          const damagedModules = modules.filter(
            (module) => module.integrity < 100,
          );
          const canRepair =
            canManage &&
            this.hasActiveBuildingFunction(
              colony,
              this.repairShipyardFunctionId,
            ) &&
            this.isShipRepairNeeded(ship, modules);
          const canRetrofit =
            canManage &&
            !!shipClass &&
            (() => {
              try {
                this.assertShipyardCompatibility(
                  shipClass,
                  this.getActiveShipyardFunctionIds(colony),
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
            canDisassemble: canManage && colony.energy >= 20,
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
            damageSummary: {
              hullDamage: Math.max(0, ship.hullMax - ship.hull),
              damagedModules: damagedModules.length,
            },
            modules: modules.map((module) => ({
              id: module.id,
              moduleType: module.moduleType,
              category: module.category,
              level: module.level,
              integrity: module.integrity,
              isActive: module.isActive,
              commodityId: this.resolveModuleCommodityId(module),
            })),
            cargoUsed: ship.cargoUsed,
            cargoMax: ship.cargoMax,
            status: ship.status,
          };
        }),
        research: {
          pointsPerTick: summary.researchPoints,
        },
        planetaryDefense,
        defense: colony.stats
          ? {
              shields: {
                current: colony.stats.shields ?? 0,
                max: this.getMaxShields(colony),
                frequency: colony.stats.shieldFrequency,
              },
              activeFunctionIds,
              energyPhalanx:
                this.colonyDefenseService.hasEnergyPhalanx(activeFunctionIds),
              particlePhalanx:
                this.colonyDefenseService.hasParticlePhalanx(activeFunctionIds),
              antiParticle:
                this.colonyDefenseService.hasAntiParticle(activeFunctionIds),
              torpedoTypeId: colony.stats.torpedoTypeId,
              selectedTorpedoType: colony.stats.torpedoTypeId
                ? this.gameData.getTorpedoType(colony.stats.torpedoTypeId)
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
            }
          : null,
        shields: colony.stats
          ? {
              current: colony.stats.shields ?? 0,
              max: this.getMaxShields(colony),
              frequency: colony.stats.shieldFrequency,
            }
          : null,
        shipBuildQueue: shipBuildQueue.map((job) => {
          const mode = job.mode ?? ColonyShipBuildQueueMode.BUILD;
          const canReactivate =
            mode === ColonyShipBuildQueueMode.REPAIR &&
            job.status === ColonyShipBuildQueueStatus.PAUSED &&
            !colony.stats?.isBlockaded &&
            this.getActiveRepairSlotCount(colony) > 0;
          const reactivationBlockedReason =
            mode !== ColonyShipBuildQueueMode.REPAIR
              ? 'Nur Reparaturjobs können reaktiviert werden.'
              : job.status !== ColonyShipBuildQueueStatus.PAUSED
                ? 'Nur pausierte Reparaturjobs können reaktiviert werden.'
                : colony.stats?.isBlockaded
                  ? 'Reparaturen sind während einer Blockade gesperrt.'
                  : this.getActiveRepairSlotCount(colony) <= 0
                    ? 'Aktive Reparaturwerft erforderlich.'
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
            moduleTypes: job.moduleTypes,
            moduleCommodityIds: job.moduleCommodityIds,
            crewAssigned: job.crewAssigned,
            crewIds: job.crewIds,
            repairSnapshot: job.repairSnapshot,
            retrofitSnapshot: job.retrofitSnapshot,
            moduleNames: (job.moduleCommodityIds ?? []).map((commodityId) => {
              const item =
                this.gameData.getFabricationItemByOutputCommodity(commodityId);
              return item?.displayName ?? `Modul #${commodityId}`;
            }),
            finishesAt: job.finishesAt,
            stoppedAt: job.stoppedAt,
            status: job.status,
          };
        }),
        shipyardQueue: shipBuildQueue.map((job) => {
          const mode = job.mode ?? ColonyShipBuildQueueMode.BUILD;
          const canReactivate =
            mode === ColonyShipBuildQueueMode.REPAIR &&
            job.status === ColonyShipBuildQueueStatus.PAUSED &&
            !colony.stats?.isBlockaded &&
            this.getActiveRepairSlotCount(colony) > 0;
          const reactivationBlockedReason =
            mode !== ColonyShipBuildQueueMode.REPAIR
              ? 'Nur Reparaturjobs können reaktiviert werden.'
              : job.status !== ColonyShipBuildQueueStatus.PAUSED
                ? 'Nur pausierte Reparaturjobs können reaktiviert werden.'
                : colony.stats?.isBlockaded
                  ? 'Reparaturen sind während einer Blockade gesperrt.'
                  : this.getActiveRepairSlotCount(colony) <= 0
                    ? 'Aktive Reparaturwerft erforderlich.'
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
            moduleCommodityIds: job.moduleCommodityIds,
            moduleTypes: job.moduleTypes,
            repairSnapshot: job.repairSnapshot,
            retrofitSnapshot: job.retrofitSnapshot,
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
            buildCosts: hangarDef.buildCosts,
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
        },
      },
    });
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
    if (colony.stats?.immigrationEnabled === false) {
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

    const populationLimit = colony.stats?.populationLimit ?? 0;
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

  private hasActiveBuildingFunction(
    colony: Colony,
    functionId: number,
  ): boolean {
    return this.colonyEconomyService.hasActiveFunction(colony, functionId);
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
