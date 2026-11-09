import { stationBatteryReload } from './station-battery-reload';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { Crew, CrewType } from '../colony/entities/crew.entity';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import {
  AdminSpawnShipDto,
  type AdminShipSpawnPreset,
} from './admin-spawn-ship.dto';
import {
  AlertState,
  Spacecraft,
  SpacecraftKind,
  SpacecraftOperatingMode,
  SpacecraftLssMode,
  SpacecraftStatus,
} from './entities/spacecraft.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import { SpacecraftWreck } from './entities/spacecraft-wreck.entity';
import { SpacecraftTakeover } from './entities/spacecraft-takeover.entity';
import { Buoy } from './entities/buoy.entity';
import { CargoItem } from './entities/cargo-item.entity';
import { SpacecraftTakeoverService } from './spacecraft-takeover.service';
import { SpacecraftTrackerService } from './spacecraft-tracker.service';
import { Fleet } from './entities/fleet.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { StarSystem } from '../starmap/entities/star-system.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { LayerKnowledgeService } from '../starmap/layer-knowledge.service';
import { CelestialObject } from '../starmap/entities/celestial-object.entity';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { adminRegionName } from '../starmap/admin-region';
import { SystemField } from '../starmap/entities/system-field.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import {
  CLOAK_ACTIVATION_EPS,
  CLOAK_EXCLUSIVE_SYSTEMS,
  isHiddenFromViewer,
  mayUseCloak,
} from './spacecraft-cloak';
import { GameDataService } from '../game-data/game-data.service';
import { ShipClassService } from './ship-class.service';
import { ExplorationService } from '../starmap/exploration.service';
import { ExplorationLevel } from '../starmap/entities/exploration-state.entity';
import { PlanetGeneratorService } from '../starmap/generator/planet-generator.service';
import { supportsStuSurface } from '../starmap/generator/stu-planet-surface.generator';
import { UnlockResolverService } from '../research/unlock-resolver.service';
import { SpacecraftStatsService } from './spacecraft-stats.service';
import { SpacecraftCrewService } from './spacecraft-crew.service';
import { SpacecraftTorpedoService } from './spacecraft-torpedo.service';
import { SpacecraftResourceFlowService } from './spacecraft-resource-flow.service';
import {
  getRuntimeSystemsForModule,
  SpacecraftRuntimeStateService,
  SpacecraftRuntimeSystemKey,
} from './spacecraft-runtime-state.service';
import { GameGateway } from '../websocket/game.gateway';
import {
  type SpacecraftAlertMutationResultDto,
  type SpacecraftDetailDto,
  type SpacecraftEnergyFlowDto,
  type SpacecraftOperatingModeResultDto,
  type ShipCentredMapDto,
  type CartographyPlanDto,
  type SpacecraftLssMode as SpacecraftLssModeDto,
  WsEventType,
  FieldEffect,
  getStuCelestialClass,
  SWU_PLANET_CLASS_NAME,
  isVacationEffective,
} from '@swuniverse/shared';
import { Colony } from '../colony/entities/colony.entity';
import { CartographyPlanStatus } from './entities/cartography-plan.entity';
import { MessagingService } from '../messaging/messaging.service';
import { MessageFolder } from '../messaging/message-folder';
import { PrestigeService } from '../prestige/prestige.service';
import { assertSpacecraftNotInStandby } from './spacecraft-mode.util';
import { ShipColonyContextService } from './ship-colony-context.service';
import { findShieldedColonyObjectIds } from './shielded-colonies.util';
import { AdminShipBuildplan } from './entities/admin-ship-buildplan.entity';
import { SpacecraftDestructionService } from './spacecraft-destruction.service';
import { ShipClassDiscoveryService } from './ship-class-discovery.service';
import { StationClassDiscoveryService } from './station-class-discovery.service';
import {
  buildNearbyInteractionContext,
  decideNearbyInteraction,
  type NearbyInteraction,
} from './nearby-interaction';
import { HyperdriveDisruptionService } from './hyperdrive-disruption.service';
import { SpacecraftAlertService } from './spacecraft-alert.service';
import { CartographyPlanService } from './cartography-plan.service';
import {
  projectSpacecraftLocationToGalaxy,
  resolveContextualCelestialObject,
  resolveContextualCelestialObjectId,
  resolveSpacecraftField,
  resolveSpacecraftLocation,
  resolveSpaceLocation,
  sameSpacecraftLocation,
} from './spacecraft-field';
import { FLOWN_FIELDS_EVENT } from '../statistics/statistic-events';
import { StatisticsService } from '../statistics/statistics.service';
import { FlightSignatureService } from './flight-signature.service';
import { StationConstructionService } from './station-construction.service';
import { StationRepairService } from './station-repair.service';
import { StationShipyardService } from './station-shipyard.service';
import { SpacecraftRepairService } from './spacecraft-repair.service';
import type { FlightDirection } from './entities/flight-signature.entity';
import { COLONY_FUNCTION_IDS } from '../colony/colony.constants';
import { CrewEnhancementService } from './crew-enhancement.service';
import { FlightConsequencePipeline } from './flight-consequence-pipeline';
import { CrewEnhancementEvent } from './crew-expertise';
import { FieldEffectQuery } from '../starmap/field-effect-query';
import { EscapePodService } from './escape-pod.service';
import { DockingPrivilegeService } from './docking-privilege.service';
import { DOCK_EPS_COST } from './docking.constants';
import { FieldTransitionExecutor } from './field-transition-executor';
import { applyLssSensorEffects } from './lss-sensor-effects';

@Injectable()
export class SpacecraftService {
  constructor(
    @InjectRepository(Spacecraft)
    private readonly shipRepo: Repository<Spacecraft>,
    @InjectRepository(SpacecraftModule)
    private readonly moduleRepo: Repository<SpacecraftModule>,
    @InjectRepository(Fleet)
    private readonly fleetRepo: Repository<Fleet>,
    @InjectRepository(StarSystem)
    private readonly systemRepo: Repository<StarSystem>,
    @InjectRepository(Layer)
    private readonly layerRepo: Repository<Layer>,
    @InjectRepository(CelestialObject)
    private readonly objectRepo: Repository<CelestialObject>,
    @InjectRepository(GalaxyField)
    private readonly galaxyFieldRepo: Repository<GalaxyField>,
    @InjectRepository(SystemField)
    private readonly systemFieldRepo: Repository<SystemField>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly gameData: GameDataService,
    private readonly shipClassService: ShipClassService,
    private readonly explorationService: ExplorationService,
    private readonly planetGenerator: PlanetGeneratorService,
    private readonly unlockResolver: UnlockResolverService,
    private readonly spacecraftStatsService: SpacecraftStatsService,
    private readonly spacecraftCrewService: SpacecraftCrewService,
    private readonly spacecraftTorpedoService: SpacecraftTorpedoService,
    private readonly spacecraftResourceFlowService: SpacecraftResourceFlowService,
    private readonly spacecraftRuntimeStateService: SpacecraftRuntimeStateService,
    private readonly gameGateway: GameGateway,
    private readonly shipColonyContextService: ShipColonyContextService,
    private readonly destructionService: SpacecraftDestructionService,
    private readonly shipClassDiscoveryService: ShipClassDiscoveryService,
    private readonly hyperdriveDisruptionService: HyperdriveDisruptionService,
    private readonly spacecraftAlertService: SpacecraftAlertService,
    private readonly cartographyPlanService: CartographyPlanService,
    private readonly messagingService: MessagingService,
    private readonly prestigeService: PrestigeService,
    private readonly statisticsService: StatisticsService,
    private readonly crewEnhancementService: CrewEnhancementService = {
      enhanceSpacecraft: async () => undefined,
    } as unknown as CrewEnhancementService,
    private readonly repairService: SpacecraftRepairService = {
      cancelForFlight: async () => undefined,
      processTick: async () => undefined,
    } as unknown as SpacecraftRepairService,
    private readonly flightSignatureService: FlightSignatureService = {
      createMovement: async () => undefined,
    } as unknown as FlightSignatureService,
    private readonly stationConstructionService: StationConstructionService = {
      processTick: async () => ({
        paused: false,
        completed: false,
        station: null,
      }),
    } as unknown as StationConstructionService,
    private readonly flightConsequencePipeline: FlightConsequencePipeline = new FlightConsequencePipeline(),
    private readonly stationClassDiscoveryService: StationClassDiscoveryService = {} as StationClassDiscoveryService,
    private readonly fieldEffectQuery: FieldEffectQuery = new FieldEffectQuery(),
    private readonly escapePodService: EscapePodService = {
      evacuateLifeSupportFailure: async () => 0,
      listNearby: async () => [],
    } as unknown as EscapePodService,
    private readonly dockingPrivilegeService: DockingPrivilegeService = {
      allowedStationIds: async (
        ship: { userId: number },
        stations: Array<{ id: number; userId: number }>,
      ) =>
        new Set(
          stations.filter((s) => s.userId === ship.userId).map((s) => s.id),
        ),
    } as unknown as DockingPrivilegeService,
    private readonly stationRepairService: StationRepairService = {
      processTick: async () => undefined,
    } as unknown as StationRepairService,
    private readonly stationShipyardService: StationShipyardService = {
      processTick: async () => undefined,
    } as unknown as StationShipyardService,
    private readonly fieldTransitionExecutor: FieldTransitionExecutor = new FieldTransitionExecutor(),
    private readonly layerKnowledgeService: LayerKnowledgeService = {
      markKnown: async () => undefined,
    } as unknown as LayerKnowledgeService,
    private readonly takeoverService: SpacecraftTakeoverService = {
      cancelForShip: async () => false,
      processTick: async () => null,
    } as unknown as SpacecraftTakeoverService,
    @InjectRepository(Buoy)
    private readonly buoyRepo: Repository<Buoy> = {
      find: async () => [],
      countBy: async () => 0,
      create: (value: Partial<Buoy>) => value as Buoy,
      findOneBy: async () => null,
    } as unknown as Repository<Buoy>,
    @InjectRepository(CargoItem)
    private readonly cargoRepo: Repository<CargoItem> = {
      findOneBy: async () => null,
    } as unknown as Repository<CargoItem>,
    private readonly trackerService: SpacecraftTrackerService = {
      processTick: async () => undefined,
    } as unknown as SpacecraftTrackerService,
  ) {}

  async getTorpedoStorage(shipId: number, userId: number) {
    const ship = await this.findOne(shipId, userId);
    if (ship.status === SpacecraftStatus.DESTROYED) {
      throw new BadRequestException('Wreck torpedo inventory is inaccessible');
    }
    const [storages, compatible] = await Promise.all([
      this.spacecraftTorpedoService.getStorage(shipId),
      this.spacecraftTorpedoService.getCompatibleTorpedoTypes(ship),
    ]);
    const compatibleIds = new Set(compatible.map((type) => type.id));
    const toDto = (storage: (typeof storages)[number]) => ({
      ...storage,
      name:
        this.gameData.getTorpedoType(storage.torpedoTypeId)?.name ??
        `Torpedo Typ ${storage.torpedoTypeId}`,
    });
    return {
      capacity: await this.spacecraftTorpedoService.getCapacity(ship),
      fireable: storages
        .filter((storage) => compatibleIds.has(storage.torpedoTypeId))
        .map(toDto),
      transport: storages
        .filter((storage) => !compatibleIds.has(storage.torpedoTypeId))
        .map(toDto),
      compatible: compatible.map((type) => ({
        id: type.id,
        commodityId: type.commodityId,
        name: type.name,
      })),
    };
  }

  async loadTorpedoes(
    shipId: number,
    userId: number,
    colonyId: number,
    torpedoTypeId: number,
    amount: number,
  ) {
    const { ship, colony } = await this.getShipAndColonyForTransfer(
      shipId,
      userId,
      colonyId,
    );
    return this.spacecraftTorpedoService.loadFromColony(
      colony,
      ship,
      torpedoTypeId,
      amount,
    );
  }

  async unloadTorpedoes(
    shipId: number,
    userId: number,
    colonyId: number,
    amount?: number,
    torpedoTypeId?: number,
  ) {
    const { ship, colony } = await this.getShipAndColonyForTransfer(
      shipId,
      userId,
      colonyId,
    );
    return this.spacecraftTorpedoService.unloadToColony(
      colony,
      ship,
      torpedoTypeId,
      amount,
      colony.storageMax,
    );
  }

  async setActiveTorpedo(
    shipId: number,
    userId: number,
    torpedoTypeId: number,
  ) {
    const ship = await this.findOne(shipId, userId);
    await this.spacecraftTorpedoService.setActive(ship, torpedoTypeId);
    return this.getTorpedoStorage(shipId, userId);
  }

  private async getShipAndColonyForTransfer(
    shipId: number,
    userId: number,
    colonyId: number,
  ): Promise<{ ship: Spacecraft; colony: Colony }> {
    return this.shipColonyContextService.requireContext(
      shipId,
      userId,
      colonyId,
    );
  }

  async findAllByUser(userId: number) {
    const ships = await this.shipRepo.find({
      where: { userId },
      relations: [
        'modules',
        'dockedAt',
        'fleet',
        'fleet.members',
        'location',
        'location.galaxyField',
        'location.galaxyField.layer',
        'location.galaxyField.starSystem',
        'location.systemField',
        'location.systemField.celestialObject',
        'location.systemField.starSystem',
      ],
      order: { id: 'ASC' },
    });
    return Promise.all(ships.map((ship) => this.toShipListDto(ship)));
  }

  async findOne(shipId: number, userId: number): Promise<Spacecraft> {
    const ship = await this.shipRepo.findOne({
      where: { id: shipId, userId },
      relations: [
        'modules',
        'fleet',
        'fleet.members',
        'location',
        'location.galaxyField',
        'location.galaxyField.layer',
        'location.galaxyField.starSystem',
        'location.systemField',
        'location.systemField.celestialObject',
        'location.systemField.starSystem',
        'originLocation',
        'originLocation.galaxyField',
        'originLocation.systemField',
        'targetLocation',
        'targetLocation.galaxyField',
        'targetLocation.systemField',
      ],
    });
    if (!ship) throw new NotFoundException('Spacecraft not found');
    return this.toShipDetail(ship);
  }

  async getDetails(
    shipId: number,
    userId: number,
  ): Promise<SpacecraftDetailDto> {
    const ship = await this.findOne(shipId, userId);
    const [crewRoster, shipClass, sensorRange, crewRequired, dockedShips] =
      await Promise.all([
        this.spacecraftCrewService.getAssignedCrew(ship.id),
        this.shipClassService.findById(ship.shipClassId),
        this.getSensorRange(ship),
        this.spacecraftCrewService.getRequiredCrew(ship),
        ship.kind === 'STATION'
          ? this.shipRepo.find({
              where: { dockedAtId: ship.id },
              relations: ['shipClass'],
              order: { name: 'ASC' },
            })
          : Promise.resolve([]),
      ]);
    const effective = shipClass
      ? this.spacecraftStatsService.calculateStats(
          shipClass,
          ship.modules ?? [],
        )
      : null;
    const location = resolveSpacecraftLocation(ship);
    const galaxyField =
      location?.scope === 'GALAXY'
        ? await this.galaxyFieldRepo.findOne({
            where: {
              layerId: location.layerId,
              cx: location.x,
              cy: location.y,
            },
            relations: ['region'],
          })
        : null;
    const fieldExplored = galaxyField
      ? (
          await this.explorationService.getExploredFields(
            userId,
            galaxyField.layerId,
          )
        ).some(
          (field) => field.cx === galaxyField.cx && field.cy === galaxyField.cy,
        )
      : false;
    const normal =
      (ship.operatingMode ?? SpacecraftOperatingMode.NORMAL) !==
      SpacecraftOperatingMode.STANDBY;
    const dockedAt = ship.dockedAtId
      ? await this.shipRepo.findOneBy({ id: ship.dockedAtId })
      : null;
    const tractoringShip = await this.shipRepo.findOneBy({
      tractoredShipId: ship.id,
    });
    return {
      ...ship,
      dockedAtId: ship.dockedAtId ?? null,
      dockedAtName: dockedAt?.name ?? null,
      crew: crewRoster.length,
      crewMax: effective?.crewMax ?? ship.crewMax,
      operatingMode: ship.operatingMode ?? SpacecraftOperatingMode.NORMAL,
      alertState: ship.alertState,
      arrivalAt: ship.arrivalAt?.toISOString() ?? null,
      location: location!,
      region:
        fieldExplored && galaxyField?.region
          ? {
              id: galaxyField.region.id,
              name: galaxyField.region.name,
              description: galaxyField.region.description,
            }
          : null,
      adminRegion:
        fieldExplored && galaxyField?.adminRegionKey
          ? {
              key: galaxyField.adminRegionKey,
              name: adminRegionName(galaxyField.adminRegionKey),
            }
          : null,
      runtimeSystems: this.spacecraftRuntimeStateService.initialize(ship),
      tractor: {
        heldBy: tractoringShip
          ? { id: tractoringShip.id, name: tractoringShip.name }
          : null,
        canEscape:
          tractoringShip != null &&
          ship.energy >= 20 &&
          (this.spacecraftRuntimeStateService.initialize(ship).SHIELDS
            ?.integrity ?? 0) > 0,
      },
      crewRoster,
      crewRequired,
      dockedShips: dockedShips.map((docked) => ({
        id: docked.id,
        name: docked.name,
        shipClassId: docked.shipClassId,
        shipClassName: docked.shipClass?.name,
        hull: docked.hull,
        hullMax: docked.hullMax,
      })),
      effectiveStats: effective
        ? {
            hullMax: effective.hullMax,
            shieldsMax: effective.shieldsMax,
            energyMax: effective.energyMax,
            warpdriveMax: effective.warpdriveMax,
            batteryMax: effective.batteryMax,
            reactorOutput: effective.reactorOutput,
            sensorRange,
            cargoMax: effective.cargoMax,
            crewMin: shipClass?.crewMin ?? 0,
            crewMax: effective.crewMax,
            evadeChance: effective.evadeChance,
          }
        : undefined,
      actions: {
        navigate: {
          available: normal,
          reason: normal ? null : 'Standby muss vor dem Flug beendet werden',
        },
        scan: {
          available: normal,
          reason: normal ? null : 'Standby muss vor einem Scan beendet werden',
        },
        combat: {
          available: normal,
          reason: normal
            ? null
            : 'Standby muss vor einem Angriff beendet werden',
        },
      },
    };
  }

  async getEnergyFlow(
    shipId: number,
    userId: number,
  ): Promise<SpacecraftEnergyFlowDto> {
    const ship = await this.findOne(shipId, userId);
    const shipClass = await this.shipClassService.findById(ship.shipClassId);
    return this.spacecraftResourceFlowService.calculate(
      ship,
      shipClass?.flightEnergyCost ?? 1,
    );
  }

  async getLssMode(shipId: number, userId: number) {
    const ship = await this.findOne(shipId, userId);
    const systems = this.spacecraftRuntimeStateService.initialize(ship);
    return {
      mode: ship.lssMode ?? SpacecraftLssMode.DISABLED,
      available: systems.LONG_RANGE_SENSORS?.active === true,
      reason:
        systems.LONG_RANGE_SENSORS?.active === true
          ? null
          : 'Langstreckensensoren sind nicht aktiv',
    };
  }

  async setLssMode(shipId: number, userId: number, mode: SpacecraftLssModeDto) {
    const ship = await this.findOne(shipId, userId);
    const systems = this.spacecraftRuntimeStateService.initialize(ship);
    if (
      mode !== SpacecraftLssMode.DISABLED &&
      systems.LONG_RANGE_SENSORS?.active !== true
    ) {
      throw new BadRequestException('Langstreckensensoren sind nicht aktiv');
    }
    ship.lssMode = mode as SpacecraftLssMode;
    await this.shipRepo.save(ship);
    return { mode: ship.lssMode, available: true, reason: null };
  }

  async getShipCentredMap(
    shipId: number,
    userId: number,
    sectionX = 0,
    sectionY = 0,
  ): Promise<ShipCentredMapDto> {
    const ship = await this.findOne(shipId, userId);
    const location = projectSpacecraftLocationToGalaxy(ship);
    if (!location)
      throw new BadRequestException('Schiff ist keiner Karte zugeordnet');
    const layer = await this.layerRepo.findOneBy({ id: location.layerId });
    if (!layer) throw new NotFoundException('Layer not found');
    const origin = { x: location.x, y: location.y };
    const size = 20;
    const center = {
      x: Math.max(1, Math.min(layer.width, origin.x + sectionX * size)),
      y: Math.max(1, Math.min(layer.height, origin.y + sectionY * size)),
    };
    const half = size / 2;
    const fields = await this.galaxyFieldRepo
      .createQueryBuilder('field')
      .leftJoinAndSelect('field.fieldType', 'fieldType')
      .leftJoinAndSelect('field.starSystem', 'starSystem')
      .where('field.layerId = :layerId', { layerId: location.layerId })
      .andWhere('field.cx BETWEEN :minX AND :maxX', {
        minX: Math.max(1, center.x - half),
        maxX: Math.min(layer.width, center.x + half - 1),
      })
      .andWhere('field.cy BETWEEN :minY AND :maxY', {
        minY: Math.max(1, center.y - half),
        maxY: Math.min(layer.height, center.y + half - 1),
      })
      .getMany();
    return {
      layerId: location.layerId,
      origin,
      center,
      section: { x: sectionX, y: sectionY, size },
      navigation: {
        north: center.y - half > 1,
        east: center.x + half - 1 < layer.width,
        south: center.y + half - 1 < layer.height,
        west: center.x - half > 1,
        returnToShip: origin,
      },
      overlays: { territory: true, impassability: true, effects: true },
      fields: fields.map((field) => ({
        id: field.id,
        x: field.cx,
        y: field.cy,
        name: field.starSystem?.name ?? field.fieldType.name,
        fieldTypeKey: field.fieldType.key,
        fieldTypeId: field.fieldType.id,
        systemTypeId: field.systemTypeId,
        factionZone: field.factionZone,
        passable: field.passableOverride ?? field.isPassable,
        effects: [...(field.effectFlags ?? []), ...(field.effects ?? [])],
        systemName: field.starSystem?.name ?? null,
        tooltip: `[${field.cx},${field.cy}] ${field.starSystem?.name ?? field.fieldType.name}`,
      })),
    };
  }

  async getCartography(
    shipId: number,
    userId: number,
  ): Promise<CartographyPlanDto> {
    const ship = await this.findOne(shipId, userId);
    const location = resolveSpacecraftLocation(ship);
    if (location?.scope !== 'SYSTEM') return this.toCartographyStateDto('NONE');

    const [explored, plan] = await Promise.all([
      this.explorationService.isSystemExplored(userId, location.systemId),
      this.cartographyPlanService.getPlan(userId, location.systemId),
    ]);
    if (explored && !plan) {
      return this.toCartographyStateDto('DONE', location.systemId);
    }
    if (!plan) {
      return this.toCartographyStateDto(
        'PLANNABLE',
        location.systemId,
        await this.getCartographyPlanAction(ship),
      );
    }
    return this.toCartographyPlanDto(
      plan,
      await this.getCartographyPlanActions(ship, plan.status),
      await this.getRemainingCartographyCoordinates(plan.remainingFieldIds),
    );
  }

  async startCartographyFinalization(
    shipId: number,
    userId: number,
  ): Promise<CartographyPlanDto> {
    const ship = await this.findOne(shipId, userId);
    const location = resolveSpacecraftLocation(ship);
    if (location?.scope !== 'SYSTEM') {
      throw new BadRequestException(
        'Kartographie-Finalisierung erfordert ein Sternensystem',
      );
    }
    if (ship.operatingMode === SpacecraftOperatingMode.STANDBY) {
      throw new BadRequestException(
        'Kartographie-Finalisierung ist in Bereitschaft nicht möglich',
      );
    }
    if (ship.status !== SpacecraftStatus.IDLE) {
      throw new BadRequestException(
        'Kartographie-Finalisierung erfordert ein untätiges Schiff',
      );
    }
    const actions = await this.getCartographyPlanActions(
      ship,
      CartographyPlanStatus.MEASURED,
    );
    if (!actions.finalize.available)
      throw new BadRequestException(actions.finalize.reason!);
    if (ship.energy < 15) throw new BadRequestException('Nicht genug EPS');

    const plan = await this.cartographyPlanService.startFinalization(
      userId,
      location.systemId,
      ship.id,
    );
    ship.energy -= 15;
    await this.shipRepo.save(ship);
    await this.messagingService.sendSystem(
      userId,
      'Kartographie',
      'Die Finalisierung der Systemkartographie hat begonnen.',
      `cartography-finalization-started:${userId}:${location.systemId}`,
    );
    return this.toCartographyPlanDto(
      plan,
      actions,
      await this.getRemainingCartographyCoordinates(plan.remainingFieldIds),
    );
  }

  async createCartographyPlan(
    shipId: number,
    userId: number,
  ): Promise<CartographyPlanDto> {
    const ship = await this.findOne(shipId, userId);
    const location = resolveSpacecraftLocation(ship);
    if (location?.scope !== 'SYSTEM') {
      throw new BadRequestException(
        'Kartographieplanung erfordert ein Sternensystem',
      );
    }

    const existing = await this.cartographyPlanService.getPlan(
      userId,
      location.systemId,
    );
    if (existing) {
      return this.toCartographyPlanDto(
        existing,
        await this.getCartographyPlanActions(ship, existing.status),
        await this.getRemainingCartographyCoordinates(
          existing.remainingFieldIds,
        ),
      );
    }

    if (
      await this.explorationService.isSystemExplored(userId, location.systemId)
    ) {
      throw new BadRequestException(
        'Das Sternensystem wurde bereits persönlich entdeckt',
      );
    }

    const actions = await this.getCartographyPlanActions(
      ship,
      CartographyPlanStatus.PLANNED,
    );
    if (!actions.plan.available)
      throw new BadRequestException(actions.plan.reason!);

    const fields = await this.systemFieldRepo.find({
      where: { starSystemId: location.systemId },
      relations: ['celestialObject', 'fieldType'],
      order: { id: 'ASC' },
    });
    const colonies = await this.dataSource.getRepository(Colony).find({
      where: { starSystemId: location.systemId },
    });
    const remainingFieldIds = this.selectCartographyFields(
      fields,
      colonies,
      location.x,
      location.y,
    );
    const plan = await this.cartographyPlanService.createPlan(
      userId,
      location.systemId,
      remainingFieldIds,
    );
    ship.lssMode = SpacecraftLssMode.CARTOGRAPHY;
    await this.shipRepo.save(ship);
    return this.toCartographyPlanDto(
      plan,
      actions,
      await this.getRemainingCartographyCoordinates(plan.remainingFieldIds),
    );
  }

  private async getCartographyPlanAction(
    ship: Spacecraft,
  ): Promise<{ available: boolean; reason: string | null }> {
    const location = resolveSpacecraftLocation(ship);
    if (location?.scope !== 'SYSTEM') {
      return {
        available: false,
        reason: 'Kartographieplanung erfordert ein Sternensystem',
      };
    }
    if (ship.status === SpacecraftStatus.DESTROYED) {
      return { available: false, reason: 'Schiff ist zerstört' };
    }
    const systems = this.spacecraftRuntimeStateService.initialize(ship);
    for (const systemKey of [
      'ASTROMETRY_LAB',
      'SHORT_RANGE_SENSORS',
      'LONG_RANGE_SENSORS',
    ] as const) {
      const system = systems[systemKey];
      if (!system?.active || system.integrity <= 0) {
        return {
          available: false,
          reason:
            'Kartographie benötigt ein aktives intaktes Astrometrie-Labor sowie Kurz- und Langstreckensensoren',
        };
      }
    }
    const [required, assigned] = await Promise.all([
      this.spacecraftCrewService.getRequiredCrew(ship),
      this.spacecraftCrewService.getAssignedCrewCount(ship.id),
    ]);
    if (assigned < required) {
      return {
        available: false,
        reason: 'Nicht genug Crew für die Kartographie',
      };
    }
    return { available: true, reason: null };
  }

  private selectCartographyFields(
    fields: SystemField[],
    colonies: Colony[],
    startX: number,
    startY: number,
  ): number[] {
    const isStart = (field: SystemField) =>
      field.sx === startX && field.sy === startY;
    const available = fields.filter(
      (field) =>
        !isStart(field) &&
        !this.fieldEffectQuery.has(field, FieldEffect.NO_MEASUREPOINT),
    );
    const settledObjectIds = new Set(
      colonies
        .map((colony) => colony.celestialObjectId)
        .filter((id): id is number => id != null),
    );
    const settledFieldIds = new Set(
      colonies
        .map((colony) => colony.systemFieldId)
        .filter((id): id is number => id != null),
    );
    const settled = available.filter(
      (field) =>
        settledFieldIds.has(field.id) ||
        (field.celestialObjectId != null &&
          settledObjectIds.has(field.celestialObjectId)),
    );
    const colonizable = available.filter(
      (field) =>
        !settled.includes(field) &&
        field.celestialObject?.isColonizable === true,
    );
    const safe = available.filter(
      (field) =>
        !settled.includes(field) &&
        !colonizable.includes(field) &&
        field.isPassable &&
        field.damage <= 0,
    );
    const selected = settled.slice(0, 2);
    for (const field of colonizable) {
      if (selected.length >= 5) break;
      selected.push(field);
    }
    for (const field of this.shuffle(safe)) {
      if (selected.length >= 5) break;
      selected.push(field);
    }
    return selected.map((field) => field.id);
  }

  private shuffle<T>(values: T[]): T[] {
    const shuffled = [...values];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
    }
    return shuffled;
  }

  private async getCartographyPlanActions(
    ship: Spacecraft,
    status: CartographyPlanStatus,
  ): Promise<{
    plan: { available: boolean; reason: string | null };
    finalize: { available: boolean; reason: string | null };
  }> {
    const action = await this.getCartographyPlanAction(ship);
    return {
      plan:
        status === CartographyPlanStatus.PLANNED
          ? action
          : { available: false, reason: 'Kartographieplan besteht bereits' },
      finalize:
        status === CartographyPlanStatus.MEASURED
          ? action
          : {
              available: false,
              reason:
                status === CartographyPlanStatus.FINISHING
                  ? 'Die Kartographie wird bereits finalisiert'
                  : 'Die Kartographie kann noch nicht finalisiert werden',
            },
    };
  }

  private async getRemainingCartographyCoordinates(
    fieldIds: number[],
  ): Promise<Array<{ x: number; y: number }>> {
    if (fieldIds.length === 0) return [];
    const fields = await this.systemFieldRepo.findByIds(fieldIds);
    const coordinates = new Map(
      fields.map((field) => [field.id, { x: field.sx, y: field.sy }]),
    );
    return fieldIds.flatMap((fieldId) => {
      const coordinate = coordinates.get(fieldId);
      return coordinate ? [coordinate] : [];
    });
  }

  private toCartographyStateDto(
    status: 'NONE' | 'PLANNABLE' | 'DONE',
    starSystemId: number | null = null,
    planAction: { available: boolean; reason: string | null } = {
      available: false,
      reason: 'Die Kartographie kann nicht geplant werden',
    },
  ): CartographyPlanDto {
    return {
      id: null,
      starSystemId,
      status,
      remainingFieldIds: [],
      remainingCoordinates: [],
      finalizationStartedAt: null,
      finalizationTick: null,
      finalizingSpacecraftId: null,
      completedAt: null,
      completionOutcome: status === 'DONE' ? 'SUCCESS' : null,
      actions: {
        plan:
          status === 'PLANNABLE'
            ? planAction
            : { available: false, reason: null },
        finalize: {
          available: false,
          reason: 'Die Kartographie kann noch nicht finalisiert werden',
        },
      },
    };
  }

  private toCartographyPlanDto(
    plan: {
      id: number;
      starSystemId: number;
      status: CartographyPlanStatus;
      remainingFieldIds: number[];
      finalizationStartedAt: Date | null;
      finalizationTick: number | null;
      finalizingSpacecraftId: number | null;
      completedAt: Date | null;
      completionOutcome: 'SUCCESS' | 'INVALIDATED' | null;
    },
    actions: {
      plan: { available: boolean; reason: string | null };
      finalize: { available: boolean; reason: string | null };
    },
    remainingCoordinates: Array<{ x: number; y: number }>,
  ): CartographyPlanDto {
    return {
      id: plan.id,
      starSystemId: plan.starSystemId,
      status: plan.status,
      remainingFieldIds: plan.remainingFieldIds,
      remainingCoordinates,
      finalizationStartedAt: plan.finalizationStartedAt?.toISOString() ?? null,
      finalizationTick: plan.finalizationTick,
      finalizingSpacecraftId: plan.finalizingSpacecraftId,
      completedAt: plan.completedAt?.toISOString() ?? null,
      completionOutcome:
        plan.status === CartographyPlanStatus.DONE
          ? (plan.completionOutcome ?? 'SUCCESS')
          : null,
      actions,
    };
  }

  async setOperatingMode(
    shipId: number,
    userId: number,
    operatingMode: SpacecraftOperatingMode,
  ): Promise<SpacecraftOperatingModeResultDto> {
    const ship = await this.findOne(shipId, userId);
    const systems = this.spacecraftRuntimeStateService.initialize(ship);
    if (operatingMode === SpacecraftOperatingMode.STANDBY) {
      for (const [key, state] of Object.entries(systems)) {
        if (state && key !== 'LIFE_SUPPORT') state.active = false;
      }
      systems.LIFE_SUPPORT = {
        ...(systems.LIFE_SUPPORT ?? { cooldown: 0, integrity: 100 }),
        active: true,
      };
    }
    ship.operatingMode = operatingMode;
    ship.runtimeSystems = systems;
    if (operatingMode === SpacecraftOperatingMode.STANDBY) {
      await this.cartographyPlanService.resetFinishingForSpacecraft(ship.id);
    }
    await this.shipRepo.save(ship);
    return { operatingMode, systems };
  }

  async setAlertState(
    shipId: number,
    userId: number,
    alertState: AlertState,
  ): Promise<SpacecraftAlertMutationResultDto> {
    const ship = await this.findOne(shipId, userId);
    const result = this.spacecraftAlertService.apply(ship, alertState);
    await this.shipRepo.save(ship);
    this.gameGateway.emitToUser(ship.userId, WsEventType.SPACECRAFT_EVENT, {
      shipId: ship.id,
      type: 'ALERT_STATE_CHANGED',
      detail: result.messages.join('\n'),
    });
    return {
      applied: true,
      alertState,
      operatingMode: ship.operatingMode,
      systems: result.systems,
      rejections: result.rejections,
    };
  }

  async rename(
    shipId: number,
    userId: number,
    name: string,
  ): Promise<Spacecraft> {
    const ship = await this.findOne(shipId, userId);
    ship.name = name;
    return this.shipRepo.save(ship);
  }

  async toggleSystem(
    shipId: number,
    userId: number,
    systemKey: SpacecraftRuntimeSystemKey,
    active: boolean,
  ): Promise<{ systems: unknown }> {
    const ship = await this.findOne(shipId, userId);
    if (active && systemKey !== 'LIFE_SUPPORT') {
      ship.operatingMode = SpacecraftOperatingMode.NORMAL;
    }
    const systems = this.spacecraftRuntimeStateService.initialize(ship);
    const system = systems[systemKey];
    if (!system) throw new BadRequestException(`Unknown system: ${systemKey}`);
    const cloakState = systems.CLOAK;
    const labWasActive = systems.ASTROMETRY_LAB?.active === true;
    if (cloakState) {
      const owner = await this.userRepo.findOneBy({ id: ship.userId });
      if (!mayUseCloak(owner?.faction)) {
        // Foreign installations stay stored but can never run.
        if (cloakState.active) systems.CLOAK = { ...cloakState, active: false };
        if (active && systemKey === 'CLOAK') {
          throw new BadRequestException(
            'Der Tarnfeld-Generator ist dem Galaktischen Imperium vorbehalten',
          );
        }
      }
    }
    if (active && systemKey !== 'CLOAK' && systems.CLOAK?.active) {
      if (CLOAK_EXCLUSIVE_SYSTEMS.includes(systemKey as never)) {
        throw new BadRequestException(
          `${systemKey} kann nicht aktiviert werden, solange die Tarnung aktiviert ist`,
        );
      }
    }
    if (active && systemKey === 'CLOAK') {
      const cloakBlock = this.cloakActivationBlock(ship);
      if (cloakBlock) {
        throw new BadRequestException(
          `Die Tarnung kann nicht aktiviert werden, ${cloakBlock}`,
        );
      }
      if (!system.active && ship.energy < CLOAK_ACTIVATION_EPS) {
        throw new BadRequestException('Nicht genug EPS');
      }
    }
    if (active && systemKey === 'SUBSPACE_SCANNER' && !system.active) {
      if (ship.energy < 30) throw new BadRequestException('Nicht genug EPS');
    }
    if (active && systemKey === 'MATRIX_SCANNER') {
      throw new BadRequestException('Matrixsensoren sind ein passives System');
    }
    if (active && systemKey === 'ASTROMETRY_LAB') {
      const shortRangeSensors = systems.SHORT_RANGE_SENSORS;
      const longRangeSensors = systems.LONG_RANGE_SENSORS;
      if (
        !shortRangeSensors ||
        !shortRangeSensors.active ||
        shortRangeSensors.integrity <= 0 ||
        !longRangeSensors ||
        !longRangeSensors.active ||
        longRangeSensors.integrity <= 0
      ) {
        throw new BadRequestException(
          'Astrometrie-Labor benötigt aktive intakte Kurz- und Langstreckensensoren',
        );
      }
      if (ship.energy < 1) throw new BadRequestException('Nicht genug EPS');
    }
    if (
      active &&
      systemKey === 'WARPDRIVE' &&
      resolveSpacecraftLocation(ship)?.scope === 'SYSTEM'
    ) {
      throw new BadRequestException(
        'Der Hyperantrieb kann nur außerhalb eines Sternensystems aktiviert werden',
      );
    }
    if (active) {
      if (system.integrity <= 0)
        throw new BadRequestException('System zerstört');
      await this.assertCrewForActivation(ship, systemKey);
      if (systemKey === 'ASTROMETRY_LAB' && !system.active) {
        ship.energy--;
      }
      if (systemKey === 'SUBSPACE_SCANNER' && !system.active) {
        ship.energy -= 30;
      }
      if (systemKey === 'CLOAK' && !system.active) {
        ship.energy -= CLOAK_ACTIVATION_EPS;
        for (const key of CLOAK_EXCLUSIVE_SYSTEMS) {
          const other = systems[key];
          if (other?.active) systems[key] = { ...other, active: false };
        }
        ship.dockedAtId = null;
      }
      if (['SHORT_RANGE_SENSORS', 'LONG_RANGE_SENSORS'].includes(systemKey)) {
        if (systemKey === 'SHORT_RANGE_SENSORS') {
          const colonies = await this.dataSource
            .getRepository(Colony)
            .count({ where: { userId } });
          if (colonies === 0)
            throw new BadRequestException(
              'Zur Aktivierung der Nahbereichssensoren wird eine Kolonie benötigt',
            );
        }
        if (!system.active) {
          if (ship.energy < 1) throw new BadRequestException('Nicht genug EPS');
          ship.energy--;
        }
      }
    } else if (
      systemKey === 'SHORT_RANGE_SENSORS' &&
      ship.alertState === AlertState.RED
    ) {
      throw new BadRequestException(
        'Nahbereichssensoren können bei Alarmstufe Rot nicht deaktiviert werden',
      );
    }
    systems[systemKey] = { ...system, active };
    ship.runtimeSystems = systems;
    if (
      (active && systemKey === 'CLOAK' && labWasActive) ||
      (!active &&
        [
          'ASTROMETRY_LAB',
          'SHORT_RANGE_SENSORS',
          'LONG_RANGE_SENSORS',
        ].includes(systemKey))
    ) {
      await this.abortCartographyFinalization(
        ship,
        'Die Kartographie-Finalisierung wurde wegen der Deaktivierung eines erforderlichen Systems abgebrochen.',
      );
    }
    await this.shipRepo.save(ship);
    const systemName: Record<SpacecraftRuntimeSystemKey, string> = {
      SHIELDS: 'Schilde',
      REACTOR: 'Reaktor',
      EPS: 'Energiesystem',
      WARPDRIVE: 'Hyperantrieb',
      SUBLIGHT_DRIVE: 'Impulsantrieb',
      LONG_RANGE_SENSORS: 'Langstreckensensoren',
      SHORT_RANGE_SENSORS: 'Nahbereichssensoren',
      COMPUTER: 'Navigationscomputer',
      WEAPONS: 'Strahlenwaffen',
      TORPEDO_BANK: 'Projektilwaffe',
      SPECIAL: 'Spezialsysteme',
      ASTROMETRY_LAB: 'Astrometrie-Labor',
      CLOAK: 'Tarnung',
      TRACTOR_BEAM: 'Traktorstrahl',
      REACTOR_CHARGE_TRANSFER: 'Reaktorladungstransfer',
      HYPERDRIVE_BOOSTER: 'Hyperantriebs-Notladegerät',
      SUBSPACE_SCANNER: 'Hyperraumfeldscanner',
      MATRIX_SCANNER: 'Matrixsensoren',
      TRACKER: 'Peilsender',
      LIFE_SUPPORT: 'Lebenserhaltung',
    };
    this.gameGateway.emitToUser(ship.userId, WsEventType.SPACECRAFT_EVENT, {
      shipId: ship.id,
      type: 'SYSTEM_TOGGLED',
      detail: `${systemName[systemKey]} ${active ? 'aktiviert' : 'deaktiviert'}`,
    });
    return { systems };
  }

  /** STU `CloakShipSystem::checkActivationConditions`, reason as a clause. */
  private cloakActivationBlock(ship: Spacecraft): string | null {
    if (ship.alertState === AlertState.RED) return 'weil Alarmstufe Rot ist';
    if (
      [ship.location?.galaxyField, ship.location?.systemField].some((field) =>
        this.fieldEffectQuery.has(field, FieldEffect.CLOAK_UNUSEABLE),
      )
    ) {
      return 'weil das Feld den Einsatz der Tarnvorrichtung verhindert';
    }
    return null;
  }

  async setReactorDistribution(
    shipId: number,
    userId: number,
    warpSplit: number,
    autoCarryOver?: boolean,
  ): Promise<{ reactorWarpSplit: number; reactorAutoCarryOver: boolean }> {
    if (warpSplit < 0 || warpSplit > 100) {
      throw new BadRequestException('warpSplit must be 0-100');
    }
    const ship = await this.findOne(shipId, userId);
    ship.reactorWarpSplit = Math.round(warpSplit);
    if (autoCarryOver !== undefined) {
      ship.reactorAutoCarryOver = autoCarryOver;
    }
    await this.shipRepo.save(ship);
    this.gameGateway.emitToUser(ship.userId, WsEventType.SPACECRAFT_EVENT, {
      shipId: ship.id,
      type: 'REACTOR_ADJUSTED',
      detail: `Verteilung: EPS ${ship.reactorWarpSplit}% / Hyperantrieb ${100 - ship.reactorWarpSplit}% (Übertrag ${ship.reactorAutoCarryOver ? 'aktiviert' : 'deaktiviert'})`,
    });
    return {
      reactorWarpSplit: ship.reactorWarpSplit,
      reactorAutoCarryOver: ship.reactorAutoCarryOver,
    };
  }

  async manualRecharge(
    shipId: number,
    userId: number,
  ): Promise<{ energy: number; warpdrive: number; battery: number }> {
    const ship = await this.findOne(shipId, userId);
    if (ship.status === SpacecraftStatus.DESTROYED) {
      throw new BadRequestException('Ship is destroyed');
    }
    this.spacecraftResourceFlowService.recharge(ship);
    if (!(await this.destructionService.saveUnlessDestroyed(ship))) {
      throw new BadRequestException('Ship is destroyed');
    }
    this.gameGateway.emitToUser(ship.userId, WsEventType.SPACECRAFT_EVENT, {
      shipId: ship.id,
      type: 'RECHARGE',
      detail: `EPS ${ship.energy}, Hyperantrieb ${ship.warpdrive}, Batterie ${ship.battery}`,
    });
    return {
      energy: ship.energy,
      warpdrive: ship.warpdrive,
      battery: ship.battery,
    };
  }

  private async assertCrewForActivation(
    ship: Spacecraft,
    systemKey: SpacecraftRuntimeSystemKey,
  ): Promise<void> {
    const modules = ship.modules ?? [];
    if (
      !modules.some((module) =>
        getRuntimeSystemsForModule(module).includes(systemKey),
      )
    )
      return;
    const [crewNeeded, assigned] = await Promise.all([
      this.spacecraftCrewService.getRequiredCrew(ship),
      this.spacecraftCrewService.getAssignedCrewCount(ship.id),
    ]);
    if (crewNeeded > assigned) {
      throw new BadRequestException(
        `Not enough crew to activate ${systemKey}: need ${crewNeeded}, have ${assigned}`,
      );
    }
  }

  async getModules(shipId: number, userId: number) {
    await this.findOne(shipId, userId);
    const modules = await this.moduleRepo.find({
      where: { spacecraftId: shipId },
    });
    return modules.map((module) => ({
      ...module,
      commodityId:
        this.gameData
          .getAllFabricationItems()
          .find(
            (item) =>
              item.moduleType === module.moduleType &&
              (item.shipyardType ?? module.category) === module.category &&
              (item.moduleLevel ?? module.level) === module.level,
          )?.outputCommodityId ?? null,
    }));
  }

  async surfaceScan(
    shipId: number,
    userId: number,
    celestialObjectId: number,
  ): Promise<{ celestialObjectId: number; created: number }> {
    const ship = await this.shipRepo.findOne({
      where: { id: shipId, userId },
      relations: [
        'modules',
        'location',
        'location.galaxyField',
        'location.systemField',
      ],
    });
    if (!ship) throw new NotFoundException('Spacecraft not found');
    const location = resolveSpacecraftLocation(ship);
    if (location?.scope !== 'SYSTEM') {
      throw new BadRequestException(
        'Surface scan requires ship inside a system',
      );
    }
    if (!this.hasSurfaceScanner(ship.modules ?? [])) {
      throw new BadRequestException('Matrixsensoren module required');
    }

    const object = await this.objectRepo.findOneBy({ id: celestialObjectId });
    if (!object) throw new NotFoundException('Celestial object not found');
    if (object.systemId !== location.systemId) {
      throw new BadRequestException(
        'Celestial object is not in current system',
      );
    }
    if (!supportsStuSurface(object.classId)) {
      throw new BadRequestException(
        'Celestial object has no scannable surface',
      );
    }

    const range = await this.getSensorRange(ship);
    const distance = Math.max(
      Math.abs(object.posX - location.x),
      Math.abs(object.posY - location.y),
    );
    if (distance > range) {
      throw new BadRequestException('Celestial object is outside sensor range');
    }

    const created = await this.planetGenerator.generateAndPersist(object.id);
    return { celestialObjectId: object.id, created };
  }

  async getShipClasses(userId?: number): Promise<
    Array<
      ShipClassDef & {
        unlocked?: boolean;
        buildCosts?: Array<{
          commodityId: number;
          amount: number;
          name: string;
        }>;
        requirementLabel?: string | null;
      }
    >
  > {
    const classes = await this.shipClassService.findAll();
    if (!userId) {
      return classes;
    }

    return Promise.all(
      classes.map(async (shipClass) => {
        const unlocked = await this.unlockResolver.isShipClassUnlocked(
          userId,
          shipClass.id,
        );
        const yamlDef = this.gameData.getShipClassDefByKey(shipClass.key);
        const allowedBuildingFunctionIds =
          yamlDef &&
          'allowedBuildingFunctionIds' in yamlDef &&
          Array.isArray(yamlDef.allowedBuildingFunctionIds)
            ? yamlDef.allowedBuildingFunctionIds
            : null;
        return Object.assign(shipClass, {
          unlocked,
          buildCosts: this.getShipClassBuildCosts(shipClass),
          requirementLabel: shipClass.unlockTechId
            ? (this.gameData.getTech(shipClass.unlockTechId)?.name ??
              `Tech #${shipClass.unlockTechId}`)
            : null,
          allowedBuildingFunctionIds,
        });
      }),
    );
  }

  private getShipClassBuildCosts(
    shipClass: ShipClassDef,
  ): Array<{ commodityId: number; amount: number; name: string }> {
    const definition = this.gameData.getShipClassDefByKey(shipClass.key);
    return (definition?.buildCosts ?? this.calculateShipBuildCosts(shipClass))
      .filter((cost) => cost.amount > 0)
      .map((cost) => ({
        ...cost,
        name:
          this.gameData.getCommodity(cost.commodityId)?.name ??
          `Ware #${cost.commodityId}`,
      }));
  }

  private calculateShipBuildCosts(
    shipClass: ShipClassDef,
  ): Array<{ commodityId: number; amount: number }> {
    return [
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
    ];
  }

  calculateBuildCosts(shipClass: ShipClassDef): Record<string, number> {
    return {
      credits: Math.max(100, Math.round(shipClass.hullBase * 4)),
      durastahl: Math.max(50, Math.round(shipClass.hullBase * 1.5)),
      tibannaGas: Math.max(20, Math.round(shipClass.shieldBase * 0.5)),
      kyberKristalle: Math.max(0, Math.round(shipClass.epsBase * 0.1)),
      beskar: 0,
      kristallinesSilizium: Math.max(
        20,
        Math.round(shipClass.cargoCapacity * 0.25),
      ),
      energiemodule: Math.max(20, Math.round(shipClass.epsBase * 0.4)),
    };
  }

  private async toShipListDto(ship: Spacecraft) {
    const [summary, crew, crewRequired, finalization, shipClass] =
      await Promise.all([
        this.toShipSummary(ship),
        this.spacecraftCrewService.getAssignedCrewCount(ship.id),
        this.spacecraftCrewService.getRequiredCrew(ship),
        this.cartographyPlanService.getPlanForFinalizingSpacecraft(ship.id),
        this.shipClassService.findById(ship.shipClassId),
      ]);
    const flow = this.spacecraftResourceFlowService.calculate(
      ship,
      shipClass?.flightEnergyCost ?? 1,
    );
    const runtimeSystems = this.spacecraftRuntimeStateService.initialize(ship);
    const resolvedLocation = resolveSpacecraftLocation(ship);
    if (!resolvedLocation) throw new Error('Spacecraft location is missing');
    const galaxyField =
      ship.location.galaxyField ?? ship.location.systemField?.starSystem;
    const layerId = galaxyField?.layerId ?? 0;
    const location =
      resolvedLocation.scope === 'SYSTEM'
        ? {
            ...resolvedLocation,
            layerId,
            galaxyX: galaxyField?.cx ?? 0,
            galaxyY: galaxyField?.cy ?? 0,
          }
        : resolvedLocation;
    const layer = ship.location.galaxyField?.layer ?? {
      id: layerId,
      name: `Ebene ${layerId}`,
    };
    const system = (key: SpacecraftRuntimeSystemKey) => {
      const state = runtimeSystems[key];
      return {
        present: Boolean(state),
        active: state?.active === true,
        damaged: Boolean(state && state.integrity < 100),
      };
    };
    const shieldActive = runtimeSystems.SHIELDS?.active === true;

    return {
      ...summary,
      kind: ship.kind,
      stationRole: ship.stationRole,
      dockCapacity: ship.dockCapacity,
      dockedAtId: ship.dockedAtId ?? null,
      dockedAtName: ship.dockedAt?.name ?? null,
      dockedShips:
        ship.kind === 'STATION'
          ? await this.shipRepo.countBy({ dockedAtId: ship.id })
          : 0,
      location,
      layer: { id: layer.id, name: layer.name },
      crew,
      crewRequired,
      crewMax: ship.crewMax,
      shieldActive,
      shieldRegeneration:
        !shieldActive && ship.shields < ship.shieldsMax
          ? Math.max(1, Math.floor(ship.shieldsMax * 0.05))
          : 0,
      energyMax: flow.energy.max,
      energyGain: flow.effectiveEpsProduction,
      energyConsumption: flow.totalSystemConsumption,
      reactorUsage: flow.reactorUsage,
      warpdrive: flow.warpdrive.current,
      warpdriveMax: flow.warpdrive.max,
      warpdriveGain: flow.effectiveWarpProduction,
      reactorFuel: flow.reactorFuel.current,
      reactorFuelMax: flow.reactorFuel.max,
      battery: flow.battery.current,
      batteryMax: flow.battery.max,
      systems: {
        SHORT_RANGE_SENSORS: system('SHORT_RANGE_SENSORS'),
        LONG_RANGE_SENSORS: system('LONG_RANGE_SENSORS'),
        WEAPONS: system('WEAPONS'),
        TORPEDO_BANK: system('TORPEDO_BANK'),
        ...(runtimeSystems.CLOAK ? { CLOAK: system('CLOAK') } : {}),
      },
      specialStatus: finalization
        ? 'CARTOGRAPHY_FINALIZATION'
        : ship.operatingMode === SpacecraftOperatingMode.STANDBY
          ? 'STANDBY'
          : ship.status === SpacecraftStatus.IN_FLIGHT
            ? 'IN_FLIGHT'
            : null,
    };
  }

  private async toShipSummary(ship: Spacecraft): Promise<Spacecraft> {
    const shipClass = await this.shipClassService.findById(ship.shipClassId);
    const moduleCount = await this.moduleRepo.count({
      where: { spacecraftId: ship.id },
    });

    return Object.assign(ship, {
      shipClassName: shipClass?.name || `Class ${ship.shipClassId}`,
      shipClassKey: shipClass?.key || null,
      isColonizer: shipClass?.isColonizer ?? false,
      colonizerTier: shipClass?.colonizerTier ?? null,
      colonizationBuildingId: shipClass?.colonizationBuildingId ?? null,
      locationLabel:
        resolveContextualCelestialObject(ship)?.name ||
        ship.location?.systemField?.starSystem?.name ||
        ship.location?.galaxyField?.starSystem?.name ||
        'Deep Space',
      moduleCount,
      fleetName: ship.fleet?.name || null,
      fleetLeaderId: ship.fleet?.leaderId ?? null,
      fleetIsFixed: ship.fleet?.isFixed ?? false,
      fleetMembers:
        ship.fleet?.members?.map((member) => ({
          id: member.id,
          name: member.name,
        })) ?? [],
    });
  }

  private async toShipDetail(ship: Spacecraft): Promise<Spacecraft> {
    const withSummary = await this.toShipSummary(ship);
    const location = resolveSpacecraftLocation(ship);
    return Object.assign(withSummary, {
      moduleCategories: ship.modules?.map((module) => module.category) || [],
      navigationBounds: {
        minX: 1,
        maxX:
          location?.scope === 'SYSTEM'
            ? (ship.location.systemField?.starSystem?.maxX ?? 1)
            : (ship.location.galaxyField?.layer?.width ?? location?.x ?? 1),
        minY: 1,
        maxY:
          location?.scope === 'SYSTEM'
            ? (ship.location.systemField?.starSystem?.maxY ?? 1)
            : (ship.location.galaxyField?.layer?.height ?? location?.y ?? 1),
      },
    });
  }

  listAdminBuildplans() {
    return this.dataSource
      .getRepository(AdminShipBuildplan)
      .find({ order: { name: 'ASC' } });
  }

  async updateAdminBuildplan(
    id: number,
    shipClassId: number,
    name: string,
    moduleSelections: Array<{ slotId: string; commodityId: number }>,
  ) {
    const repository = this.dataSource.getRepository(AdminShipBuildplan);
    const buildplan = await repository.findOneBy({ id });
    if (!buildplan) throw new NotFoundException('Buildplan not found');
    buildplan.name = name.trim();
    buildplan.shipClassId = shipClassId;
    buildplan.moduleSelections = moduleSelections;
    return repository.save(buildplan);
  }

  async deleteAdminBuildplan(id: number) {
    const result = await this.dataSource
      .getRepository(AdminShipBuildplan)
      .delete(id);
    if (!result.affected) throw new NotFoundException('Buildplan not found');
    return { deleted: true, id };
  }

  async createAdminBuildplan(
    shipClassId: number,
    name: string,
    moduleSelections: Array<{ slotId: string; commodityId: number }>,
  ) {
    const shipClass = await this.shipClassService.findById(shipClassId);
    if (!shipClass) throw new NotFoundException('Ship class not found');
    const repository = this.dataSource.getRepository(AdminShipBuildplan);
    return repository.save(
      repository.create({
        name: name.trim(),
        shipClassId,
        moduleSelections,
      }),
    );
  }

  async adminListUsers(): Promise<
    Array<Pick<User, 'id' | 'username' | 'email'>>
  > {
    return this.userRepo.find({
      select: {
        id: true,
        username: true,
        email: true,
      },
      order: { username: 'ASC' },
    });
  }

  async getAdminSpawnOptions(shipClassId: number) {
    const shipClass = await this.shipClassService.findById(shipClassId);
    if (!shipClass) throw new NotFoundException('Ship class not found');
    const layout = this.getAdminShipLayout(shipClass);
    const modules = this.gameData
      .getAllFabricationItems()
      .filter(
        (item) =>
          item.queueType === 'MODULE' &&
          !!item.moduleType &&
          !!item.shipyardType &&
          this.gameData.isShipyardModuleAllowedForShipClass(item, shipClass),
      );
    return {
      torpedoes: {
        capacity: shipClass.torpedoStorageBase,
        compatible: this.gameData
          .getAllTorpedoTypes()
          .filter((type) =>
            type.compatibleShipCategories?.includes(shipClass.category),
          )
          .map((type) => ({
            id: type.id,
            commodityId: type.commodityId,
            name: type.name,
            level: type.level,
            damageType: type.damageType ?? null,
          })),
      },
      slots: layout.slots.map((slot) => ({
        slotId: slot.slotId,
        label: slot.label,
        category: slot.moduleCategory,
        options: modules
          .filter((item) => item.shipyardType === slot.moduleCategory)
          .map((item) => ({
            commodityId: item.outputCommodityId,
            name: item.displayName,
            level: item.moduleLevel ?? 1,
            faction: item.faction ?? null,
          })),
      })),
    };
  }

  async adminSpawnShip(dto: AdminSpawnShipDto): Promise<Spacecraft> {
    const { userId, name, layerId, posX, posY, preset } = dto;
    const buildplan = dto.buildplanId
      ? await this.dataSource.getRepository(AdminShipBuildplan).findOne({
          where: { id: dto.buildplanId },
        })
      : null;
    if (dto.buildplanId && !buildplan)
      throw new NotFoundException('Buildplan not found');
    const shipClassId = buildplan?.shipClassId ?? dto.shipClassId;
    const modules = buildplan?.moduleSelections ?? dto.modules;
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const shipClass = await this.shipClassService.findById(shipClassId);
    if (!shipClass) {
      throw new NotFoundException('Ship class not found');
    }

    const layer = await this.layerRepo.findOne({ where: { id: layerId } });
    if (!layer) {
      throw new NotFoundException('Layer not found');
    }

    if (posX < 1 || posX > layer.width || posY < 1 || posY > layer.height) {
      throw new BadRequestException(
        `Target out of bounds. Layer size: ${layer.width}x${layer.height}`,
      );
    }

    const galaxyField = await this.galaxyFieldRepo.findOne({
      where: { layerId, cx: posX, cy: posY },
      relations: ['starSystem'],
    });
    if (!galaxyField) {
      throw new BadRequestException('Target galaxy field does not exist');
    }
    if (!galaxyField.isPassable) {
      throw new BadRequestException('Target galaxy field is not passable');
    }
    const location = await this.findLocationByGalaxyField(galaxyField.id);
    if (!location) throw new NotFoundException('Space location not found');

    const selections = this.validateAdminModuleSelections(
      shipClass,
      modules,
      user.faction,
    );
    const ship = await this.dataSource.transaction(async (manager) => {
      const savedShip = await manager.getRepository(Spacecraft).save(
        manager.getRepository(Spacecraft).create({
          name: name.trim() || shipClass.name,
          shipClassId: shipClass.id,
          userId: user.id,
          locationId: location.id,
          location,
          status: SpacecraftStatus.IDLE,
          alertState: AlertState.GREEN,
          operatingMode: SpacecraftOperatingMode.NORMAL,
          hull: shipClass.hullBase,
          hullMax: shipClass.hullBase,
          shields: shipClass.shieldBase,
          shieldsMax: shipClass.shieldBase,
          energy: shipClass.epsBase,
          energyMax: shipClass.epsBase,
          warpSpeed: shipClass.warpdriveBase,
          crew: 0,
          crewMax: shipClass.crewMax,
          cargoUsed: 0,
          cargoMax: shipClass.cargoCapacity,
          battery: shipClass.batteryBase,
          batteryMax: shipClass.batteryBase,
          reactorFuel: shipClass.reactorBase * 10,
          reactorFuelMax: shipClass.reactorBase * 10,
        }),
      );
      const createdModules = await Promise.all(
        selections.map((selection) => {
          const item = this.gameData.getFabricationItemByOutputCommodity(
            selection.commodityId,
          )!;
          return manager.getRepository(SpacecraftModule).save(
            manager.getRepository(SpacecraftModule).create({
              spacecraftId: savedShip.id,
              slotId: selection.slotId,
              moduleType: item.moduleType!,
              category: item.shipyardType!,
              level: item.moduleLevel ?? 1,
              integrity: this.presetIntegrity(preset),
              cooldown: 0,
              isActive: preset !== 'offline',
            }),
          );
        }),
      );
      this.spacecraftStatsService.applyStats(
        savedShip,
        shipClass,
        createdModules,
      );
      this.spacecraftCrewService.applyRequiredCrew(
        savedShip,
        shipClass.crewMin,
        createdModules,
      );
      this.applyAdminSpawnPreset(savedShip, preset);
      this.spacecraftRuntimeStateService.initialize(savedShip);
      if (preset === 'operational') {
        const systems =
          this.spacecraftRuntimeStateService.initialize(savedShip);
        for (const state of Object.values(systems)) {
          if (state) {
            state.active = true;
            state.integrity = 100;
            state.cooldown = 0;
          }
        }
        savedShip.runtimeSystems = systems;
      }
      await manager.getRepository(Spacecraft).save(savedShip);
      const crewRequired = this.spacecraftCrewService.calculateRequiredCrew(
        shipClass.crewMin,
        createdModules,
      );
      const crewCount = Math.min(savedShip.crewMax, crewRequired);
      for (let index = 0; index < crewCount; index++) {
        const crew = await manager.getRepository(Crew).save(
          manager.getRepository(Crew).create({
            userId: user.id,
            name: `Admin Crew ${savedShip.id}-${index + 1}`,
            type: CrewType.CREWMAN,
          }),
        );
        await manager.getRepository(CrewAssignment).save(
          manager.getRepository(CrewAssignment).create({
            crewId: crew.id,
            userId: user.id,
            colonyId: null,
            spacecraftId: savedShip.id,
            slot: CrewType.CREWMAN,
          }),
        );
      }
      savedShip.crew = crewCount;
      await manager.getRepository(Spacecraft).save(savedShip);
      if (dto.fillTorpedoes) {
        if (!dto.torpedoTypeId) {
          throw new BadRequestException('Kompatiblen Torpedotyp wählen');
        }
        await this.spacecraftTorpedoService.loadFullForSpawn(
          manager,
          savedShip,
          dto.torpedoTypeId,
        );
      }
      return savedShip;
    });

    const hydratedShip = await this.shipRepo.findOneOrFail({
      where: { id: ship.id },
      relations: [
        'modules',
        'fleet',
        'fleet.members',
        'location',
        'location.galaxyField',
        'location.systemField',
      ],
    });
    await this.discoverGalaxyAroundShip(
      hydratedShip,
      layer.id,
      posX,
      posY,
      'SPAWN',
    );
    return hydratedShip;
  }

  private getAdminShipLayout(shipClass: ShipClassDef) {
    const layout =
      this.gameData.getShipClassSlotRuleForShipClass(shipClass) ??
      this.gameData.getShipClassSlotRule(shipClass.category);
    if (!layout)
      throw new BadRequestException(
        `Missing ship layout for ${shipClass.category}`,
      );
    return layout;
  }

  private validateAdminModuleSelections(
    shipClass: ShipClassDef,
    selections: AdminSpawnShipDto['modules'],
    faction: User['faction'],
  ) {
    const slots = new Map(
      this.getAdminShipLayout(shipClass).slots.map((slot) => [
        slot.slotId,
        slot,
      ]),
    );
    const seen = new Set<string>();
    return selections.map(({ slotId, commodityId }) => {
      if (seen.has(slotId))
        throw new BadRequestException(`Duplicate module slot: ${slotId}`);
      seen.add(slotId);
      const slot = slots.get(slotId);
      if (!slot) throw new BadRequestException(`Unknown ship slot: ${slotId}`);
      const item =
        this.gameData.getFabricationItemByOutputCommodity(commodityId);
      if (!item?.moduleType || item.queueType !== 'MODULE')
        throw new BadRequestException(
          `Commodity #${commodityId} is not a ship module`,
        );
      if (item.faction != null && item.faction !== faction)
        throw new BadRequestException('Ship module is faction-locked');
      if (
        item.shipyardType !== slot.moduleCategory ||
        !this.gameData.isShipyardModuleAllowedForShipClass(item, shipClass)
      ) {
        throw new BadRequestException(
          `${item.displayName} does not fit ${slot.label}`,
        );
      }
      return { slotId, commodityId };
    });
  }

  private presetIntegrity(preset: AdminShipSpawnPreset) {
    return preset === 'damaged' ? 60 : preset === 'critical' ? 20 : 100;
  }

  private applyAdminSpawnPreset(
    ship: Spacecraft,
    preset: AdminShipSpawnPreset,
  ) {
    const factor = preset === 'critical' ? 0.2 : preset === 'damaged' ? 0.6 : 1;
    ship.hull = Math.max(1, Math.floor(ship.hullMax * factor));
    ship.shields = Math.floor(ship.shieldsMax * factor);
    ship.energy = Math.floor(ship.energyMax * factor);
    ship.battery = Math.floor(ship.batteryMax * factor);
    ship.reactorFuel = Math.floor(ship.reactorFuelMax * factor);
    ship.warpdrive = Math.floor(ship.warpdriveMax * factor);
    if (preset === 'offline') {
      ship.operatingMode = SpacecraftOperatingMode.STANDBY;
    }
  }

  private async assertEnoughCrew(ship: Spacecraft): Promise<void> {
    if (!(await this.spacecraftCrewService.hasEnoughCrew(ship))) {
      throw new BadRequestException('Not enough crew');
    }
  }

  private async assertNotTractored(ship: Spacecraft): Promise<void> {
    const tractor = await this.shipRepo.findOneBy({ tractoredShipId: ship.id });
    if (tractor) {
      throw new BadRequestException(
        `Die ${ship.name ?? 'Schiff'} wird von einem Traktorstrahl gehalten`,
      );
    }
  }

  // In-system impulse navigation: ship-class EPS per entered field
  async navigate(
    shipId: number,
    userId: number,
    targetX: number,
    targetY: number,
  ): Promise<Spacecraft> {
    await this.cartographyPlanService.resetFinishingForSpacecraft(shipId);
    await this.takeoverService.cancelForShip(shipId);
    const ship = await this.findOne(shipId, userId);
    if (ship.kind === 'STATION')
      throw new BadRequestException('Stationen können nicht fliegen');
    await this.assertFleetLeader(ship, userId);
    const currentLocation = resolveSpacecraftField(ship);
    assertSpacecraftNotInStandby(ship, 'dem Flug');
    await this.assertNotTractored(ship);
    if (ship.status === SpacecraftStatus.IN_COMBAT)
      throw new BadRequestException('Cannot navigate during combat');
    if (ship.status === SpacecraftStatus.DESTROYED)
      throw new BadRequestException('Ship is destroyed');
    if (ship.status === SpacecraftStatus.IN_FLIGHT)
      throw new BadRequestException('Ship already in flight');
    if (currentLocation?.scope !== 'SYSTEM') {
      throw new BadRequestException(
        'Ship is not in a system. Use galaxy flight instead.',
      );
    }
    await this.assertEnoughCrew(ship);
    this.activateDriveForFlight(ship, 'SUBLIGHT_DRIVE');
    this.assertSystemsForFlight(ship, 'sublight');
    const system = await this.systemRepo.findOne({
      where: { id: currentLocation.systemId },
    });
    if (!system) throw new NotFoundException('Current star system not found');
    if (
      targetX < 1 ||
      targetX > system.maxX ||
      targetY < 1 ||
      targetY > system.maxY
    ) {
      throw new BadRequestException(
        `Target out of bounds. System size: ${system.maxX}x${system.maxY}`,
      );
    }
    const distance =
      Math.abs(targetX - currentLocation.x) +
      Math.abs(targetY - currentLocation.y);
    this.assertBlindFlightDistance(
      this.spacecraftRuntimeStateService.initialize(ship),
      distance,
    );
    const shipClass = await this.shipClassService.findById(ship.shipClassId);
    if (!shipClass) throw new NotFoundException('Ship class not found');
    this.undockForFlight(ship);
    const fleetMembers = await this.prepareFleetMembers(
      ship,
      userId,
      (member) => {
        this.activateDriveForFlight(member, 'SUBLIGHT_DRIVE');
        this.assertSystemsForFlight(member, 'sublight');
        this.undockForFlight(member);
      },
    );
    const tractoredShip = ship.tractoredShipId
      ? await this.findOne(ship.tractoredShipId, userId)
      : null;
    const tractoredShipClass = tractoredShip
      ? await this.shipClassService.findById(tractoredShip.shipClassId)
      : null;
    if (
      tractoredShip &&
      tractoredShipClass &&
      ship.energy <
        shipClass.flightEnergyCost + tractoredShipClass.flightEnergyCost
    ) {
      ship.tractoredShipId = null;
      ship.tractoredShip = null;
      const systems = this.spacecraftRuntimeStateService.initialize(ship);
      if (systems.TRACTOR_BEAM) systems.TRACTOR_BEAM.active = false;
      ship.runtimeSystems = systems;
    }
    const participants = [ship, ...fleetMembers];
    const direction = this.directionFromMove(
      currentLocation.x,
      currentLocation.y,
      targetX,
      targetY,
    );
    const result = await this.fieldTransitionExecutor.execute({
      start: { x: currentLocation.x, y: currentLocation.y },
      target: { x: targetX, y: targetY },
      resolveField: (x, y) =>
        this.systemFieldRepo.findOne({
          where: { starSystemId: currentLocation.systemId, sx: x, sy: y },
        }),
      isPassable: (field) => field.isPassable,
      participants: participants.map((member) => ({
        canPay: () =>
          member.energy >=
          shipClass.flightEnergyCost +
            (member === ship && ship.tractoredShipId && tractoredShipClass
              ? tractoredShipClass.flightEnergyCost
              : 0),
        pay: () => {
          member.energy -=
            shipClass.flightEnergyCost +
            (member === ship && ship.tractoredShipId && tractoredShipClass
              ? tractoredShipClass.flightEnergyCost
              : 0);
        },
        isDestroyed: () => member.status === SpacecraftStatus.DESTROYED,
      })),
      enter: async (field) => {
        const destination = await this.findLocationBySystemField(field.id);
        for (const member of participants) {
          const origin = member.location;
          await this.setCurrentLocation(member, destination);
          member.status = SpacecraftStatus.IDLE;
          if (!(await this.destructionService.saveUnlessDestroyed(member)))
            continue;
          await this.flightSignatureService.createMovement(
            member,
            origin,
            member.location,
            this.flightDirection(direction),
          );
        }
        if (tractoredShip && ship.tractoredShipId) {
          await this.setCurrentLocation(tractoredShip, destination);
          await this.shipRepo.save(tractoredShip);
        }
        await this.flightConsequencePipeline.onEnterField(ship, field);
        await this.processCartographyArrival(
          ship,
          currentLocation.systemId,
          field.id,
        );
        await this.statisticsService.countEvent(FLOWN_FIELDS_EVENT);
      },
    });
    if (result.completedSteps === 0 && result.stopped === 'INSUFFICIENT_COST') {
      throw new BadRequestException('Not enough EPS for navigation');
    }
    await this.emitOrbitUpdates(currentLocation, resolveSpacecraftField(ship));
    await this.repairService.cancelForFlight(
      participants.map((member) => member.id),
    );
    return this.findOne(ship.id, userId);
  }

  private async processCartographyArrival(
    ship: Spacecraft,
    starSystemId: number,
    fieldId: number,
  ): Promise<void> {
    if (!(await this.isQualifiedForCartography(ship))) return;

    const result = await this.cartographyPlanService.claimArrivedField(
      ship.userId,
      starSystemId,
      fieldId,
    );
    if (!result.claimed) return;

    await this.crewEnhancementService.enhanceSpacecraft(
      ship.id,
      CrewEnhancementEvent.REACH_ASTRO_WAYPOINT,
    );
    await this.prestigeService.change(
      ship.userId,
      1,
      'Kartographie-Messpunkt erreicht',
    );
    await this.messagingService.sendSystem(
      ship.userId,
      'Kartographie',
      'Ein Messpunkt der Systemkartographie wurde erreicht.',
      `cartography-measurement:${ship.userId}:${starSystemId}:${fieldId}`,
    );
    if (result.completed) {
      await this.messagingService.sendSystem(
        ship.userId,
        'Kartographie',
        'Alle Messpunkte wurden erreicht. Die Kartographie kann finalisiert werden.',
        `cartography-measured:${ship.userId}:${starSystemId}`,
      );
    }
  }

  private async isQualifiedForCartography(ship: Spacecraft): Promise<boolean> {
    if (ship.status === SpacecraftStatus.DESTROYED) return false;
    const systems = this.spacecraftRuntimeStateService.initialize(ship);
    return [
      'ASTROMETRY_LAB',
      'SHORT_RANGE_SENSORS',
      'LONG_RANGE_SENSORS',
    ].every((key) => {
      const system = systems[key as SpacecraftRuntimeSystemKey];
      return Boolean(system?.active && system.integrity > 0);
    });
  }

  // Galaxy-map flight: ship-class EPS per entered field
  async flyGalaxy(
    shipId: number,
    userId: number,
    targetX: number,
    targetY: number,
  ): Promise<Spacecraft> {
    const ship = await this.findOne(shipId, userId);
    if (ship.kind === 'STATION')
      throw new BadRequestException('Stationen können nicht fliegen');
    await this.assertFleetLeader(ship, userId);
    const currentLocation = resolveSpacecraftField(ship);
    assertSpacecraftNotInStandby(ship, 'dem Flug');
    await this.assertNotTractored(ship);
    if (ship.status === SpacecraftStatus.IN_COMBAT)
      throw new BadRequestException('Cannot fly during combat');
    if (ship.status === SpacecraftStatus.DESTROYED)
      throw new BadRequestException('Ship is destroyed');
    if (ship.status === SpacecraftStatus.IN_FLIGHT)
      throw new BadRequestException('Ship already in flight');
    if (currentLocation?.scope !== 'GALAXY') {
      throw new BadRequestException(
        'Ship is inside a system. Leave system first.',
      );
    }
    await this.assertEnoughCrew(ship);
    this.activateDriveForFlight(ship, 'WARPDRIVE');
    this.assertSystemsForFlight(ship, 'warp');
    const distance =
      Math.abs(targetX - currentLocation.x) +
      Math.abs(targetY - currentLocation.y);
    this.assertBlindFlightDistance(
      this.spacecraftRuntimeStateService.initialize(ship),
      distance,
    );
    const shipClass = await this.shipClassService.findById(ship.shipClassId);
    if (!shipClass) throw new NotFoundException('Ship class not found');
    this.undockForFlight(ship);
    const fleetMembers = await this.prepareFleetMembers(
      ship,
      userId,
      (member) => {
        this.activateDriveForFlight(member, 'WARPDRIVE');
        this.assertSystemsForFlight(member, 'warp');
        this.undockForFlight(member);
      },
    );
    const participants = [ship, ...fleetMembers];
    const direction = this.directionFromMove(
      currentLocation.x,
      currentLocation.y,
      targetX,
      targetY,
    );
    ship.lastGalaxyFlightDirection = direction;
    const result = await this.fieldTransitionExecutor.execute({
      start: { x: currentLocation.x, y: currentLocation.y },
      target: { x: targetX, y: targetY },
      resolveField: (x, y) =>
        this.galaxyFieldRepo.findOne({
          where: { layerId: currentLocation.layerId, cx: x, cy: y },
        }),
      isPassable: (field) => field.isPassable,
      participants: participants.map((member) => ({
        canPay: () => member.energy >= shipClass.flightEnergyCost,
        pay: () => {
          member.energy -= shipClass.flightEnergyCost;
        },
        isDestroyed: () => member.status === SpacecraftStatus.DESTROYED,
      })),
      enter: async (field, coordinate) => {
        const destination = await this.findLocationByGalaxyField(field.id);
        for (const member of participants) {
          const origin = member.location;
          member.lastGalaxyFlightDirection = direction;
          await this.setCurrentLocation(member, destination);
          member.status = SpacecraftStatus.IDLE;
          if (!(await this.destructionService.saveUnlessDestroyed(member)))
            continue;
          await this.flightSignatureService.createMovement(
            member,
            origin,
            member.location,
            this.flightDirection(direction),
          );
          await this.layerKnowledgeService.markKnown(
            member.userId,
            currentLocation.layerId,
          );
        }
        await this.discoverGalaxyAroundShip(
          ship,
          currentLocation.layerId,
          coordinate.x,
          coordinate.y,
          'FLIGHT',
        );
        await this.flightConsequencePipeline.onEnterField(ship, field);
        await this.statisticsService.countEvent(FLOWN_FIELDS_EVENT);
      },
    });
    if (result.completedSteps === 0 && result.stopped === 'INSUFFICIENT_COST') {
      throw new BadRequestException('Not enough EPS for galaxy flight');
    }
    await this.repairService.cancelForFlight(
      participants.map((member) => member.id),
    );
    return this.findOne(ship.id, userId);
  }

  private activateDriveForFlight(
    ship: Spacecraft,
    systemKey: 'SUBLIGHT_DRIVE' | 'WARPDRIVE',
  ): void {
    const systems = this.spacecraftRuntimeStateService.initialize(ship);
    const drive = systems[systemKey];
    if (!drive) {
      throw new BadRequestException(
        systemKey === 'WARPDRIVE'
          ? 'Kein Hyperantrieb installiert'
          : 'Kein Impulsantrieb installiert',
      );
    }
    if (drive.integrity <= 0) {
      throw new BadRequestException(
        systemKey === 'WARPDRIVE'
          ? 'Hyperantrieb zerstört'
          : 'Impulsantrieb zerstört',
      );
    }
    if (drive.cooldown > 0) {
      throw new BadRequestException(
        systemKey === 'WARPDRIVE'
          ? 'Hyperantrieb kühlt noch ab'
          : 'Impulsantrieb kühlt noch ab',
      );
    }
    if (drive.active) return;
    systems[systemKey] = { ...drive, active: true };
    ship.runtimeSystems = systems;
  }

  private assertBlindFlightDistance(
    systems: ReturnType<SpacecraftRuntimeStateService['initialize']>,
    distance: number,
  ): void {
    if (systems?.LONG_RANGE_SENSORS?.active === false && distance !== 1) {
      throw new BadRequestException(
        'Ohne Langstreckensensoren ist nur ein benachbartes Feld erreichbar',
      );
    }
  }

  // Enter a star system from the galaxy map
  async enterSystem(shipId: number, userId: number): Promise<Spacecraft> {
    const ship = await this.findOne(shipId, userId);
    if (ship.kind === 'STATION') {
      throw new BadRequestException('Stationen können nicht fliegen');
    }
    await this.assertFleetLeader(ship, userId);
    const currentLocation = resolveSpacecraftField(ship);
    assertSpacecraftNotInStandby(ship, 'dem Systemeintritt');
    await this.assertNotTractored(ship);

    if (ship.status === SpacecraftStatus.IN_COMBAT) {
      throw new BadRequestException('Cannot enter system during combat');
    }
    if (ship.status === SpacecraftStatus.DESTROYED) {
      throw new BadRequestException('Ship is destroyed');
    }
    if (ship.status === SpacecraftStatus.IN_FLIGHT) {
      throw new BadRequestException('Ship is in flight');
    }
    if (currentLocation?.scope !== 'GALAXY') {
      throw new BadRequestException('Ship is already in a system');
    }
    await this.assertEnoughCrew(ship);
    this.activateDriveForFlight(ship, 'SUBLIGHT_DRIVE');
    this.assertSystemsForFlight(ship, 'sublight');

    const galaxyField = await this.galaxyFieldRepo.findOne({
      where: {
        layerId: currentLocation.layerId,
        cx: currentLocation.x,
        cy: currentLocation.y,
      },
    });
    if (!galaxyField || !galaxyField.starSystemId) {
      throw new BadRequestException(
        'No star system at current galaxy position',
      );
    }

    const system = await this.systemRepo.findOne({
      where: { id: galaxyField.starSystemId },
    });
    if (!system) throw new NotFoundException('Sternensystem nicht gefunden');
    const entryField = await this.findSystemEntryField(
      system,
      ship.lastGalaxyFlightDirection,
    );

    this.undockForFlight(ship);
    const fleetMembers = await this.prepareFleetMembers(
      ship,
      userId,
      (member) => {
        this.activateDriveForFlight(member, 'SUBLIGHT_DRIVE');
        this.assertSystemsForFlight(member, 'sublight');
        this.undockForFlight(member);
      },
    );
    const previousLocation = ship.location;
    const destination = await this.findLocationBySystemField(entryField.id);
    await this.setCurrentLocation(ship, destination);
    for (const member of fleetMembers) {
      const origin = member.location;
      await this.setCurrentLocation(member, destination);
      member.status = SpacecraftStatus.IDLE;
      const memberSystems =
        this.spacecraftRuntimeStateService.initialize(member);
      if (memberSystems.WARPDRIVE) memberSystems.WARPDRIVE.active = false;
      member.runtimeSystems = memberSystems;
      await this.shipRepo.save(member);
      await this.flightSignatureService.createMovement(
        member,
        origin,
        member.location,
        this.flightDirection(ship.lastGalaxyFlightDirection ?? 'TOP'),
      );
    }
    ship.status = SpacecraftStatus.IDLE;
    const systems = this.spacecraftRuntimeStateService.initialize(ship);
    if (systems.WARPDRIVE) systems.WARPDRIVE.active = false;
    ship.runtimeSystems = systems;

    if (!(await this.destructionService.saveUnlessDestroyed(ship))) {
      throw new BadRequestException('Ship is destroyed');
    }
    await this.flightSignatureService.createMovement(
      ship,
      previousLocation,
      ship.location,
      this.flightDirection(ship.lastGalaxyFlightDirection ?? 'TOP'),
    );
    await this.flightConsequencePipeline.onEnterField(ship, entryField);
    await this.repairService.cancelForFlight([
      ship.id,
      ...fleetMembers.map((member) => member.id),
    ]);

    return ship;
  }

  private directionFromMove(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
  ): NonNullable<Spacecraft['lastGalaxyFlightDirection']> {
    if (toY < fromY) return 'TOP';
    if (toY > fromY) return 'BOTTOM';
    return toX > fromX ? 'RIGHT' : 'LEFT';
  }

  private flightDirection(
    direction: NonNullable<Spacecraft['lastGalaxyFlightDirection']>,
  ): FlightDirection {
    return {
      TOP: 'NORTH',
      RIGHT: 'EAST',
      BOTTOM: 'SOUTH',
      LEFT: 'WEST',
    }[direction] as FlightDirection;
  }

  private async findSystemEntryField(
    system: StarSystem,
    direction: Spacecraft['lastGalaxyFlightDirection'],
  ): Promise<SystemField> {
    const entryDirection =
      direction ??
      (['TOP', 'BOTTOM', 'LEFT', 'RIGHT'] as const)[
        Math.floor(Math.random() * 4)
      ];
    const fields = await this.systemFieldRepo.find({
      where: { starSystemId: system.id, isPassable: true },
    });
    const edgeFields = fields.filter((field) => {
      switch (entryDirection) {
        case 'TOP':
          return field.sy === system.maxY;
        case 'BOTTOM':
          return field.sy === 1;
        case 'LEFT':
          return field.sx === system.maxX;
        case 'RIGHT':
          return field.sx === 1;
        default:
          return false;
      }
    });
    const candidates = edgeFields.length > 0 ? edgeFields : fields;
    if (candidates.length === 0)
      throw new BadRequestException(
        'Kein passierbares Eintrittsfeld im System',
      );
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  // Leave a star system back to the galaxy map
  async leaveSystem(shipId: number, userId: number): Promise<Spacecraft> {
    const ship = await this.findOne(shipId, userId);
    if (ship.kind === 'STATION') {
      throw new BadRequestException('Stationen können nicht fliegen');
    }
    await this.assertFleetLeader(ship, userId);
    const currentLocation = resolveSpacecraftField(ship);
    assertSpacecraftNotInStandby(ship, 'dem Systemaustritt');
    await this.assertNotTractored(ship);

    if (ship.status === SpacecraftStatus.DESTROYED) {
      throw new BadRequestException('Ship is destroyed');
    }
    if (ship.status === SpacecraftStatus.IN_FLIGHT) {
      throw new BadRequestException('Ship is in flight');
    }
    if (ship.status === SpacecraftStatus.IN_COMBAT) {
      throw new BadRequestException('Cannot leave system during combat');
    }
    if (currentLocation?.scope !== 'SYSTEM') {
      throw new BadRequestException('Ship is not in a system');
    }
    if (ship.status !== SpacecraftStatus.IDLE) {
      throw new BadRequestException('Ship must be docked to leave system');
    }
    await this.assertEnoughCrew(ship);
    this.activateDriveForFlight(ship, 'WARPDRIVE');
    this.assertSystemsForFlight(ship, 'warp');

    // Get galaxy coordinates from the star system
    const system = await this.systemRepo.findOne({
      where: { id: currentLocation.systemId },
    });
    if (!system) {
      throw new NotFoundException('Current star system not found');
    }

    const galaxyField = await this.galaxyFieldRepo.findOne({
      where: { layerId: system.layerId, cx: system.cx, cy: system.cy },
    });
    this.undockForFlight(ship);
    const fleetMembers = await this.prepareFleetMembers(
      ship,
      userId,
      (member) => {
        this.activateDriveForFlight(member, 'WARPDRIVE');
        this.assertSystemsForFlight(member, 'warp');
        this.undockForFlight(member);
      },
    );
    const previousLocation = ship.location;
    const destination = galaxyField
      ? await this.findLocationByGalaxyField(galaxyField.id)
      : null;
    await this.setCurrentLocation(ship, destination);
    for (const member of fleetMembers) {
      const origin = member.location;
      await this.setCurrentLocation(member, destination);
      member.status = SpacecraftStatus.IDLE;
      await this.shipRepo.save(member);
      await this.flightSignatureService.createMovement(
        member,
        origin,
        member.location,
        this.flightDirection(ship.lastGalaxyFlightDirection ?? 'TOP'),
      );
    }
    ship.status = SpacecraftStatus.IDLE;

    if (!(await this.destructionService.saveUnlessDestroyed(ship))) {
      throw new BadRequestException('Ship is destroyed');
    }
    await this.flightSignatureService.createMovement(
      ship,
      previousLocation,
      ship.location,
      this.flightDirection(ship.lastGalaxyFlightDirection ?? 'TOP'),
    );
    if (galaxyField) {
      await this.flightConsequencePipeline.onEnterField(ship, galaxyField);
    }
    await this.cartographyPlanService.resetFinishingForSpacecraft(ship.id);
    await this.repairService.cancelForFlight([
      ship.id,
      ...fleetMembers.map((member) => member.id),
    ]);
    return ship;
  }

  // Inter-system warp: 1 WE per galaxy-grid field, 60s per field
  async warp(
    shipId: number,
    userId: number,
    targetSystemId: number,
  ): Promise<Spacecraft> {
    const ship = await this.findOne(shipId, userId);
    await this.assertFleetLeader(ship, userId);
    await this.cartographyPlanService.resetFinishingForSpacecraft(ship.id);
    assertSpacecraftNotInStandby(ship, 'dem Hyperraumflug');
    await this.assertNotTractored(ship);

    if (
      ship.status === SpacecraftStatus.IN_COMBAT ||
      ship.status === SpacecraftStatus.DESTROYED
    ) {
      throw new BadRequestException('Cannot warp in current state');
    }
    if (ship.status === SpacecraftStatus.IN_FLIGHT) {
      throw new BadRequestException('Ship already in flight');
    }
    if (ship.warpCooldown > 0) {
      throw new BadRequestException('Hyperantrieb kühlt noch ab');
    }
    const currentSystemId = ship.location.systemField?.starSystemId;
    if (currentSystemId == null) {
      throw new BadRequestException('Ship has no current system');
    }
    await this.assertEnoughCrew(ship);
    this.assertSystemsForFlight(ship, 'warp');

    const currentSystem = await this.systemRepo.findOne({
      where: { id: currentSystemId },
    });
    const targetSystem = await this.systemRepo.findOne({
      where: { id: targetSystemId },
    });
    if (!targetSystem) throw new NotFoundException('Target system not found');

    const galaxyDistance = currentSystem
      ? Math.max(
          Math.abs(targetSystem.cx - currentSystem.cx),
          Math.abs(targetSystem.cy - currentSystem.cy),
        )
      : 1;

    const warpdriveCost = Math.max(1, galaxyDistance);
    this.undockForFlight(ship);
    const fleetMembers = await this.prepareFleetMembers(
      ship,
      userId,
      (member) => {
        this.assertSystemsForFlight(member, 'warp');
        this.consumeWarpdrive(member, warpdriveCost, 'warp');
        this.undockForFlight(member);
      },
    );
    this.consumeWarpdrive(ship, warpdriveCost, 'warp');

    const warpTimeMs = galaxyDistance * 60_000;
    const targetField = await this.systemFieldRepo.findOne({
      where: { starSystemId: targetSystemId, sx: 1, sy: 1 },
    });
    const destination = targetField
      ? await this.findLocationBySystemField(targetField.id)
      : null;
    const arrivalAt = new Date(Date.now() + warpTimeMs);

    ship.status = SpacecraftStatus.IN_FLIGHT;
    ship.originLocationId = ship.locationId;
    ship.originLocation = ship.location;
    ship.targetLocation = destination;
    ship.targetLocationId = destination?.id ?? null;
    ship.arrivalAt = arrivalAt;
    ship.warpCooldown = 3;
    for (const member of fleetMembers) {
      member.status = SpacecraftStatus.IN_FLIGHT;
      member.originLocationId = member.locationId;
      member.originLocation = member.location;
      member.targetLocation = destination;
      member.targetLocationId = destination?.id ?? null;
      member.arrivalAt = arrivalAt;
      member.warpCooldown = 3;
      await this.shipRepo.save(member);
    }

    this.spacecraftRuntimeStateService.initialize(ship);

    if (!(await this.destructionService.saveUnlessDestroyed(ship))) {
      throw new BadRequestException('Ship is destroyed');
    }
    await this.statisticsService.countEvent(FLOWN_FIELDS_EVENT, galaxyDistance);
    await this.repairService.cancelForFlight([
      ship.id,
      ...fleetMembers.map((member) => member.id),
    ]);
    return ship;
  }

  private assertSystemsForFlight(
    ship: Spacecraft,
    mode: 'sublight' | 'warp',
  ): void {
    const systems = this.spacecraftRuntimeStateService.getSystems(ship);
    const errors: string[] = [];

    if (mode === 'sublight') {
      if (systems.SUBLIGHT_DRIVE?.active !== true) {
        errors.push('Sublight drive offline');
      }
    }

    if (mode === 'warp') {
      if (systems.WARPDRIVE?.active !== true) {
        errors.push('Hyperantrieb offline');
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors.join('; '));
    }
  }

  private async emitOrbitUpdates(
    ...fields: Array<ReturnType<typeof resolveSpacecraftField>>
  ): Promise<void> {
    const systemFields = fields.filter(
      (
        field,
      ): field is Extract<NonNullable<typeof field>, { scope: 'SYSTEM' }> =>
        field?.scope === 'SYSTEM',
    );
    const colonies = await Promise.all(
      systemFields.map((field) =>
        this.dataSource.getRepository(Colony).findOne({
          where: {
            starSystemId: field.systemId,
            posX: field.x,
            posY: field.y,
            isAbandoned: false,
          },
        }),
      ),
    );
    for (const colony of colonies) {
      if (!colony?.userId) continue;
      this.gameGateway.emitToUser(colony.userId, WsEventType.COLONY_UPDATED, {
        colonyId: colony.id,
        reason: 'SPACECRAFT_LOCATION_CHANGED',
      });
    }
  }

  /** A docked ship leaves its station when a flight starts; the undocking costs 1 EPS (STU `DockConsequence`). */
  private undockForFlight(ship: Spacecraft): void {
    if (ship.dockedAtId == null) return;
    if (ship.energy < DOCK_EPS_COST) {
      throw new BadRequestException(
        `${ship.name} konnte wegen Energiemangels nicht abgedockt werden`,
      );
    }
    ship.energy -= DOCK_EPS_COST;
    ship.dockedAtId = null;
    ship.dockedAt = null;
  }

  private consumeWarpdrive(
    ship: Spacecraft,
    amount: number,
    action: string,
  ): void {
    if (ship.warpdrive < amount) {
      throw new BadRequestException(
        `Nicht genug Hyperantriebsenergie für ${action === 'galaxy flight' ? 'Galaxieflug' : 'Hyperraumflug'}: benötigt ${amount}, vorhanden ${ship.warpdrive}`,
      );
    }
    ship.warpdrive -= amount;
  }

  private async assertFleetLeader(
    ship: Spacecraft,
    userId: number,
  ): Promise<Fleet | null> {
    if (!ship.fleetId) return null;
    const fleet = await this.requireFleet(userId, ship.fleetId);
    if (fleet.leaderId !== ship.id) {
      throw new BadRequestException(
        'Nur der Flottenführer kann die Flotte bewegen',
      );
    }
    return fleet;
  }

  private async prepareFleetMembers(
    leader: Spacecraft,
    userId: number,
    validate: (member: Spacecraft) => void,
  ): Promise<Spacecraft[]> {
    const fleet = await this.assertFleetLeader(leader, userId);
    if (!fleet) return [];
    const members = await this.shipRepo.find({ where: { fleetId: fleet.id } });
    const movable: Spacecraft[] = [];
    const blocked: Array<{ member: Spacecraft; reason: string }> = [];
    const snapshots = new Map<
      Spacecraft,
      Pick<Spacecraft, 'energy' | 'warpdrive' | 'runtimeSystems' | 'dockedAtId'>
    >();
    for (const member of members) {
      if (member.id === leader.id || !sameSpacecraftLocation(member, leader))
        continue;
      try {
        if (member.status === SpacecraftStatus.DESTROYED) {
          throw new BadRequestException('Schiff ist zerstört');
        }
        if (member.status !== SpacecraftStatus.IDLE) {
          throw new BadRequestException('Schiff ist nicht flugbereit');
        }
        if (!(await this.spacecraftCrewService.hasEnoughCrew(member))) {
          throw new BadRequestException('Nicht genug Crew');
        }
        snapshots.set(member, {
          energy: member.energy,
          warpdrive: member.warpdrive,
          dockedAtId: member.dockedAtId,
          runtimeSystems: structuredClone(member.runtimeSystems),
        });
        validate(member);
        movable.push(member);
      } catch (error) {
        const snapshot = snapshots.get(member);
        if (snapshot) Object.assign(member, snapshot);
        blocked.push({
          member,
          reason: error instanceof Error ? error.message : 'nicht flugbereit',
        });
      }
    }
    if (fleet.isFixed && blocked.length > 0) {
      for (const member of movable) {
        const snapshot = snapshots.get(member);
        if (snapshot) Object.assign(member, snapshot);
      }
      const first = blocked[0];
      throw new BadRequestException(
        `Fixierte Flotte kann nicht fliegen: ${first.member.name}: ${first.reason}`,
      );
    }
    for (const { member, reason } of blocked) {
      member.fleetId = null;
      await this.shipRepo.save(member);
      this.gameGateway.emitToUser(member.userId, WsEventType.SPACECRAFT_EVENT, {
        shipId: member.id,
        type: 'FLEET_MEMBER_LEFT_BEHIND',
        detail: `${member.name} hat die Flotte verlassen: ${reason}`,
      });
    }
    return movable;
  }

  // Fleet management
  async createFleet(
    userId: number,
    name: string,
    leaderId: number,
  ): Promise<Fleet> {
    const leader = await this.findOne(leaderId, userId);
    if (leader.fleetId) {
      throw new BadRequestException('Das Schiff ist bereits in einer Flotte');
    }
    this.assertFleetName(name);

    const fleet = this.fleetRepo.create({
      name: name.trim(),
      userId,
      leaderId,
    });
    const saved = await this.fleetRepo.save(fleet);
    leader.fleetId = saved.id;
    await this.shipRepo.save(leader);
    return saved;
  }

  async joinFleet(
    userId: number,
    fleetId: number,
    shipId: number,
  ): Promise<Spacecraft> {
    const fleet = await this.requireFleet(userId, fleetId);
    const ship = await this.findOne(shipId, userId);
    if (ship.fleetId) {
      throw new BadRequestException('Das Schiff ist bereits in einer Flotte');
    }
    if (ship.status === SpacecraftStatus.DESTROYED) {
      throw new BadRequestException(
        'Zerstörte Schiffe können keiner Flotte beitreten',
      );
    }
    if (ship.status !== SpacecraftStatus.IDLE) {
      throw new BadRequestException('Schiff darf sich nicht im Flug befinden');
    }
    const leader = await this.findOne(fleet.leaderId, userId);
    if (!sameSpacecraftLocation(ship, leader)) {
      throw new BadRequestException(
        'Schiff und Flottenführer müssen sich auf demselben Feld befinden',
      );
    }

    ship.fleetId = fleetId;
    return this.shipRepo.save(ship);
  }

  async leaveFleet(userId: number, shipId: number): Promise<Spacecraft> {
    const ship = await this.findOne(shipId, userId);
    if (!ship.fleetId) {
      throw new BadRequestException('Das Schiff ist in keiner Flotte');
    }
    const fleet = await this.requireFleet(userId, ship.fleetId);
    if (fleet.leaderId === shipId) {
      await this.dissolveFleet(userId, fleet.id);
      ship.fleetId = null;
      return ship;
    }
    ship.fleetId = null;
    return this.shipRepo.save(ship);
  }

  async dissolveFleet(userId: number, fleetId: number): Promise<void> {
    const fleet = await this.requireFleet(userId, fleetId);
    const members = await this.shipRepo.find({ where: { fleetId } });
    for (const member of members) member.fleetId = null;
    if (members.length > 0) await this.shipRepo.save(members);
    await this.fleetRepo.remove(fleet);
  }

  async renameFleet(
    userId: number,
    fleetId: number,
    name: string,
  ): Promise<Fleet> {
    this.assertFleetName(name);
    const fleet = await this.requireFleet(userId, fleetId);
    fleet.name = name.trim();
    return this.fleetRepo.save(fleet);
  }

  async setFleetAlertState(
    userId: number,
    fleetId: number,
    alertState: AlertState,
  ) {
    await this.requireFleet(userId, fleetId);
    const members = await this.shipRepo.find({ where: { fleetId, userId } });
    const applied: Array<{ shipId: number; shipName: string }> = [];
    const failed: Array<{ shipId: number; shipName: string; reason: string }> =
      [];

    for (const member of members) {
      try {
        await this.setAlertState(member.id, userId, alertState);
        applied.push({ shipId: member.id, shipName: member.name });
      } catch (error: unknown) {
        failed.push({
          shipId: member.id,
          shipName: member.name,
          reason:
            error instanceof Error
              ? error.message
              : 'Alarmstufe konnte nicht geändert werden',
        });
      }
    }

    return { alertState, applied, failed };
  }

  async toggleFleetFixation(userId: number, fleetId: number): Promise<Fleet> {
    const fleet = await this.requireFleet(userId, fleetId);
    await this.findOne(fleet.leaderId, userId);
    fleet.isFixed = !fleet.isFixed;
    return this.fleetRepo.save(fleet);
  }

  async changeFleetLeader(
    userId: number,
    fleetId: number,
    leaderId: number,
  ): Promise<Fleet> {
    const fleet = await this.requireFleet(userId, fleetId);
    const leader = await this.findOne(leaderId, userId);
    if (leader.fleetId !== fleetId) {
      throw new BadRequestException('Der neue Flottenführer ist kein Mitglied');
    }
    fleet.leaderId = leaderId;
    return this.fleetRepo.save(fleet);
  }

  private async requireFleet(userId: number, fleetId: number): Promise<Fleet> {
    const fleet = await this.fleetRepo.findOne({
      where: { id: fleetId, userId },
    });
    if (!fleet) throw new NotFoundException('Flotte nicht gefunden');
    return fleet;
  }

  private assertFleetName(name: string): void {
    const normalized = name?.trim();
    if (!normalized)
      throw new BadRequestException('Flottenname darf nicht leer sein');
    if (normalized.length > 255) {
      throw new BadRequestException(
        'Flottenname ist zu lang (Maximum: 255 Zeichen)',
      );
    }
  }

  async getUserFleets(userId: number): Promise<Fleet[]> {
    return this.fleetRepo.find({
      where: { userId },
      relations: ['members'],
    });
  }

  async processMovement(ship: Spacecraft): Promise<void> {
    if (ship.status !== SpacecraftStatus.IN_FLIGHT || !ship.arrivalAt) return;

    if (new Date() >= ship.arrivalAt) {
      const targetLocation =
        ship.targetLocationId != null
          ? await this.loadLocation(ship.targetLocationId, ship.targetLocation)
          : null;

      if (ship.targetLocationId != null) {
        if (!targetLocation) {
          throw new BadRequestException('Target location not found');
        }

        if (
          targetLocation.kind === 'SYSTEM_FIELD' &&
          targetLocation.systemField
        ) {
          await this.setCurrentLocation(ship, targetLocation);
        } else if (
          targetLocation.kind === 'GALAXY_FIELD' &&
          targetLocation.galaxyField
        ) {
          const targetField = targetLocation.galaxyField;
          await this.setCurrentLocation(ship, targetLocation);
          await this.discoverGalaxyAroundShip(
            ship,
            targetField.layerId,
            targetField.cx,
            targetField.cy,
            'FLIGHT',
          );
        } else {
          throw new BadRequestException('Invalid target location');
        }
      }

      const originLocation = await this.loadLocation(
        ship.originLocationId,
        ship.originLocation,
      );
      if (originLocation && targetLocation) {
        const originField = resolveSpaceLocation(originLocation);
        const targetField = resolveSpaceLocation(targetLocation);
        if (originField && targetField) {
          await this.flightSignatureService.createMovement(
            ship,
            originLocation,
            targetLocation,
            this.flightDirection(
              this.directionFromMove(
                originField.x,
                originField.y,
                targetField.x,
                targetField.y,
              ),
            ),
          );
        }
      }

      ship.arrivalAt = null;
      ship.originLocationId = null;
      ship.originLocation = null;
      ship.targetLocationId = null;
      ship.targetLocation = null;
      ship.status = SpacecraftStatus.IDLE;

      const arrivedField =
        targetLocation?.systemField ?? targetLocation?.galaxyField;
      if (arrivedField) {
        await this.flightConsequencePipeline.onEnterField(ship, arrivedField);
      }
      await this.shipRepo.save(ship);
    }
  }

  private findLocationByGalaxyField(
    galaxyFieldId: number,
  ): Promise<SpaceLocation | null> {
    return this.dataSource.getRepository(SpaceLocation).findOne({
      where: { galaxyFieldId },
      relations: ['galaxyField'],
    });
  }

  private findLocationBySystemField(
    systemFieldId: number,
  ): Promise<SpaceLocation | null> {
    return this.dataSource.getRepository(SpaceLocation).findOne({
      where: { systemFieldId },
      relations: ['systemField', 'systemField.celestialObject'],
    });
  }

  private async loadLocation(
    locationId: number | null | undefined,
    location: SpaceLocation | null | undefined,
  ): Promise<SpaceLocation | null> {
    if (location) return location;
    if (locationId == null) return null;
    return this.dataSource.getRepository(SpaceLocation).findOne({
      where: { id: locationId },
      relations: ['galaxyField', 'systemField', 'systemField.celestialObject'],
    });
  }

  private async setCurrentLocation(
    ship: Spacecraft,
    location: SpaceLocation | null,
  ): Promise<void> {
    if (!location) throw new NotFoundException('Space location not found');
    ship.locationId = location.id;
    ship.location = location;
  }

  private async discoverGalaxyAroundShip(
    ship: Spacecraft,
    layerId: number | null,
    cx: number | null,
    cy: number | null,
    source: string,
  ): Promise<void> {
    if (!layerId || cx == null || cy == null) return;
    await this.explorationService.discoverArea({
      userId: ship.userId,
      layerId,
      cx,
      cy,
      radius: await this.getSensorRange(ship),
      level: ExplorationLevel.TERRAIN,
      source,
    });
  }

  async getSensorRange(ship: Spacecraft): Promise<number> {
    const lss =
      this.spacecraftRuntimeStateService.initialize(ship).LONG_RANGE_SENSORS;
    if (!lss?.active || lss.integrity <= 0) return 0;
    const modules =
      ship.modules ??
      (await this.moduleRepo.find({
        where: { spacecraftId: ship.id },
      }));
    let maxRange = 3;
    for (const mod of modules) {
      const def = this.gameData
        .getAllModules()
        .find((m) => m.name === mod.moduleType);
      if (def?.category === 'SENSORS') {
        const base =
          (def.public as Record<string, number>)?.baseSensorRange ?? 2;
        const range = base + (mod.level - 1);
        if (range > maxRange) maxRange = range;
      }
    }
    return Math.ceil((maxRange * lss.integrity) / 100);
  }

  private hasSurfaceScanner(modules: SpacecraftModule[]): boolean {
    return modules.some((module) => {
      if (!module.isActive || module.integrity <= 0) return false;
      const def = this.gameData
        .getAllModules()
        .find((candidate) => candidate.name === module.moduleType);
      return Boolean(
        def &&
        def.category === 'SENSORS' &&
        (def.public as Record<string, unknown>)?.canSurfaceScan === true,
      );
    });
  }

  async scanNearbyTarget(shipId: number, userId: number, targetShipId: number) {
    const ship = await this.findOne(shipId, userId);
    const systems = this.spacecraftRuntimeStateService.initialize(ship);
    if (
      !systems.SHORT_RANGE_SENSORS?.active ||
      systems.SHORT_RANGE_SENSORS.integrity <= 0
    )
      throw new BadRequestException('Nahbereichssensoren sind nicht aktiv');
    if (ship.energy < 1) throw new BadRequestException('Nicht genug EPS');
    const target = await this.shipRepo.findOne({
      where: { id: targetShipId },
      relations: [
        'user',
        'modules',
        'location',
        'location.galaxyField',
        'location.systemField',
      ],
    });
    if (!target || target.status === SpacecraftStatus.DESTROYED)
      throw new NotFoundException('Zielschiff nicht gefunden');
    const scanDecision = decideNearbyInteraction(
      'SCAN',
      buildNearbyInteractionContext(
        ship,
        systems,
        target,
        this.spacecraftRuntimeStateService.initialize(target),
      ),
    );
    if (!scanDecision.allowed)
      throw new BadRequestException(
        scanDecision.reason ?? 'Ziel muss sich auf demselben Feld befinden',
      );
    ship.energy--;
    await this.shipRepo.save(ship);
    const discoveryService =
      target.kind === SpacecraftKind.STATION
        ? this.stationClassDiscoveryService
        : this.shipClassDiscoveryService;
    const discovery =
      target.userId === userId
        ? { discovered: false, prestigeAwarded: 0, name: null }
        : await discoveryService.discover({
            userId,
            shipClassId: target.shipClassId,
            sourceSpacecraftId: ship.id,
            targetSpacecraftId: target.id,
          });
    return {
      id: target.id,
      name: target.name,
      shipClassId: target.shipClassId,
      username: target.user?.username ?? null,
      hull: target.hull,
      hullMax: target.hullMax,
      shields: target.shields,
      shieldsMax: target.shieldsMax,
      crew: target.crew,
      crewMax: target.crewMax,
      energy: target.energy,
      battery: target.battery,
      reactorFuel: target.reactorFuel,
      reactorFuelMax: target.reactorFuelMax,
      alertState: target.alertState,
      modules: (target.modules ?? []).map((module) => ({
        moduleType: module.moduleType,
        category: module.category,
        integrity: module.integrity,
        isActive: module.isActive,
      })),
      runtimeSystems: this.spacecraftRuntimeStateService.initialize(target),
      discovery,
    };
  }

  async listBuoys(shipId: number, userId: number) {
    await this.findOne(shipId, userId);
    return this.buoyRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async dropBuoy(shipId: number, userId: number, rawText: string) {
    const ship = await this.findOne(shipId, userId);
    const text = rawText?.trim() ?? '';
    if (!text || text.length > 60) throw new BadRequestException('Bojen-Text muss 1 bis 60 Zeichen enthalten');
    if (ship.status !== SpacecraftStatus.IDLE || ship.energy < 1) throw new BadRequestException('Schiff kann derzeit keine Boje setzen');
    const systems = this.spacecraftRuntimeStateService.initialize(ship) as Record<string, { active?: boolean; integrity?: number }>;
    if (systems.SHIELDS?.active === true || systems.CLOAK?.active === true) throw new BadRequestException('Schilde und Tarnung müssen deaktiviert sein');
    const torpedo = await this.cargoRepo.findOneBy({ spacecraftId: ship.id, commodityId: 88 });
    if (!torpedo || torpedo.amount < 1) throw new BadRequestException('Keine Sondenboje geladen');
    const count = await this.buoyRepo.countBy({ userId });
    if (count >= 16) throw new BadRequestException('Maximal 16 aktive Bojen erlaubt');
    torpedo.amount -= 1;
    ship.energy -= 1;
    const buoy = this.buoyRepo.create({ userId, spacecraftId: ship.id, locationId: ship.locationId, text });
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(CargoItem).save(torpedo);
      await manager.getRepository(Spacecraft).save(ship);
      await manager.getRepository(Buoy).save(buoy);
    });
    return buoy;
  }

  async pickUpBuoy(shipId: number, buoyId: number, userId: number) {
    const ship = await this.findOne(shipId, userId);
    if (ship.status !== SpacecraftStatus.IDLE || ship.energy < 1) throw new BadRequestException('Schiff kann derzeit keine Boje aufnehmen');
    const buoy = await this.buoyRepo.findOneBy({ id: buoyId });
    if (!buoy || buoy.locationId !== ship.locationId) throw new NotFoundException('Boje nicht gefunden');
    const result = await this.dataSource.transaction(async (manager) => {
      const current = await manager.getRepository(Buoy).findOneBy({ id: buoyId });
      if (!current) throw new NotFoundException('Boje wurde bereits aufgenommen');
      await manager.getRepository(Buoy).remove(current);
      ship.energy -= 1;
      await manager.getRepository(Spacecraft).save(ship);
      const cargoRepo = manager.getRepository(CargoItem);
      let cargo = await cargoRepo.findOneBy({ spacecraftId: ship.id, commodityId: 88 });
      if (!cargo) cargo = cargoRepo.create({ spacecraftId: ship.id, commodityId: 88, amount: 0 });
      cargo.amount += 1;
      await cargoRepo.save(cargo);
      return current;
    });
    if (result.userId !== userId) {
      await this.messagingService.sendSystem(result.userId, 'Sondenboje aufgenommen', `Deine Boje "${result.text}" wurde von Schiff #${ship.id} aufgenommen.`);
    }
    return { pickedUp: true, buoy: result };
  }

  async getFieldContext(shipId: number, userId: number) {
    const ship = await this.findOne(shipId, userId);
    const location = resolveSpacecraftLocation(ship);
    const celestialObjectId = resolveContextualCelestialObjectId(ship);
    const systems = this.spacecraftRuntimeStateService.initialize(ship);
    const leaveReason = this.getSystemExitUnavailableReason(ship, systems);
    const colony =
      location?.scope === 'SYSTEM'
        ? await this.dataSource.getRepository(Colony).findOne({
            where: {
              starSystemId: location.systemId,
              posX: location.x,
              posY: location.y,
              isAbandoned: false,
            },
            relations: ['celestialObject', 'fields'],
          })
        : null;
    const shipClass = colony
      ? await this.shipClassService.findById(ship.shipClassId)
      : null;
    const canSurfaceScan =
      colony != null &&
      this.hasSurfaceScanner(ship.modules ?? []) &&
      colony.userId !== userId;
    const canLand =
      colony?.userId === userId &&
      colony.fields.some(
        (field) =>
          field.buildingId != null &&
          !field.isBuilding &&
          field.isActive &&
          this.gameData
            .getBuildingFunctions(field.buildingId)
            .includes(COLONY_FUNCTION_IDS.AIRFIELD),
      ) &&
      shipClass != null &&
      this.gameData.getHangarShipDef(shipClass.key) != null;
    const [viewer, colonyOwner] =
      colony?.userId != null && colony.userId !== userId
        ? await Promise.all([
            this.userRepo.findOneBy({ id: userId }),
            this.userRepo.findOneBy({ id: colony.userId }),
          ])
        : [null, null];
    const canAttack =
      viewer?.factionId != null &&
      colonyOwner?.factionId != null &&
      viewer.factionId !== colonyOwner.factionId;
    const attackReason =
      colony?.userId === userId
        ? 'Eigene Kolonie kann nicht angegriffen werden'
        : canAttack
          ? null
          : 'Kolonie ist nicht feindlich';
    const station = await this.shipRepo.findOne({
      where: { locationId: ship.locationId, kind: SpacecraftKind.STATION },
    });
    const cartography =
      location?.scope === 'SYSTEM'
        ? await this.getCartography(ship.id, userId)
        : null;
    const entryField =
      location?.scope === 'GALAXY'
        ? await this.galaxyFieldRepo.findOne({
            where: {
              layerId: location.layerId,
              cx: location.x,
              cy: location.y,
            },
            relations: ['starSystem', 'region'],
          })
        : null;
    const colonizationCandidate =
      location?.scope === 'SYSTEM' && celestialObjectId != null
        ? await this.dataSource.getRepository(CelestialObject).findOne({
            where: { id: celestialObjectId },
          })
        : null;
    const abandonedColony = colonizationCandidate?.isColonizable
      ? await this.dataSource.getRepository(Colony).findOne({
          where: {
            celestialObjectId: colonizationCandidate.id,
            isAbandoned: true,
          },
        })
      : null;
    const colonizationTarget = colony ? null : colonizationCandidate;
    const fieldExplored = entryField
      ? (
          await this.explorationService.getExploredFields(
            userId,
            entryField.layerId,
          )
        ).some(
          (field) => field.cx === entryField.cx && field.cy === entryField.cy,
        )
      : false;
    return {
      coordinates: { x: location?.x ?? 0, y: location?.y ?? 0 },
      region:
        fieldExplored && entryField?.region
          ? {
              id: entryField.region.id,
              name: entryField.region.name,
              description: entryField.region.description,
            }
          : null,
      adminRegion:
        fieldExplored && entryField?.adminRegionKey
          ? {
              key: entryField.adminRegionKey,
              name: adminRegionName(entryField.adminRegionKey),
            }
          : null,
      starSystem:
        location?.scope === 'SYSTEM'
          ? {
              id: location.systemId,
              name:
                ship.location?.systemField?.starSystem?.name ??
                `System ${location.systemId}`,
              canLeave: leaveReason == null,
              leaveReason,
            }
          : null,
      buoys: await this.buoyRepo.find({ where: { locationId: ship.locationId }, order: { createdAt: 'ASC' } }),
      colony: colony
        ? {
            id: colony.id,
            name: colony.name,
            planetName: colony.celestialObject?.name ?? colony.name,
            classId: colony.celestialObject?.classId ?? null,
            isOwn: colony.userId === userId,
            canLand,
            canSurfaceScan,
            canAttack,
            attackReason,
          }
        : null,
      runtimeSystems: systems,
      construction: {
        station: station
          ? {
              id: station.id,
              name: station.name,
              isOwn: station.userId === userId,
            }
          : null,
        canBuild: station == null && ship.kind !== 'STATION',
      },
      information: {
        canSectorScan: systems.SHORT_RANGE_SENSORS?.active === true,
        cartographyKnown:
          cartography?.status === 'DONE' &&
          cartography.completionOutcome !== 'INVALIDATED',
        entrySystem: entryField?.starSystem
          ? {
              id: entryField.starSystem.id,
              name: entryField.starSystem.name,
              x: entryField.cx,
              y: entryField.cy,
              systemTypeId: entryField.starSystem?.systemTypeId ?? null,
            }
          : null,
        colonizationTarget: colonizationTarget
          ? {
              celestialObjectId: colonizationTarget.id,
              name: colonizationTarget.name,
              classId: colonizationTarget.classId,
              className:
                getStuCelestialClass(colonizationTarget.classId)?.name ??
                SWU_PLANET_CLASS_NAME[colonizationTarget.classId ?? -1] ??
                null,
              isColonizable: colonizationTarget.isColonizable,
              isAbandoned: abandonedColony != null,
            }
          : null,
      },
    };
  }

  private getSystemExitUnavailableReason(
    ship: Spacecraft,
    systems: ReturnType<SpacecraftRuntimeStateService['initialize']>,
  ): string | null {
    if (ship.status !== SpacecraftStatus.IDLE)
      return 'Schiff ist nicht flugbereit';
    const drive = systems.WARPDRIVE;
    if (!drive) return 'Kein Hyperantrieb installiert';
    if (drive.integrity <= 0) return 'Hyperantrieb zerstört';
    if (drive.cooldown > 0) return 'Hyperantrieb kühlt noch ab';
    return null;
  }

  async interceptNearbyTarget(
    shipId: number,
    userId: number,
    targetId: number,
  ) {
    const interceptor = await this.findOne(shipId, userId);
    return this.hyperdriveDisruptionService.intercept(interceptor, targetId);
  }

  async getNearby(shipId: number, userId: number) {
    const ship = await this.findOne(shipId, userId);
    const location = resolveSpacecraftLocation(ship);
    if (!location) throw new NotFoundException('Aktuelles Feld nicht gefunden');
    const systems = this.spacecraftRuntimeStateService.initialize(ship);
    const nbs = systems.SHORT_RANGE_SENSORS;
    if (!nbs?.active || nbs.integrity <= 0)
      throw new BadRequestException('Nahbereichssensoren sind nicht aktiv');
    const hyperdriveActive = systems.WARPDRIVE?.active === true;
    const shipQuery = this.shipRepo
      .createQueryBuilder('target')
      .leftJoinAndSelect('target.user', 'user')
      .leftJoinAndSelect('target.fleet', 'fleet')
      .leftJoinAndSelect('target.modules', 'targetModules')
      .leftJoinAndSelect('target.location', 'targetLocation')
      .leftJoinAndSelect('targetLocation.galaxyField', 'targetGalaxyField')
      .leftJoinAndSelect('targetLocation.systemField', 'targetSystemField')
      .where('target.status = :status', { status: SpacecraftStatus.IDLE });
    const wreckQuery = this.dataSource
      .getRepository(SpacecraftWreck)
      .createQueryBuilder('wreck');
    if (ship.locationId != null) {
      shipQuery.andWhere('target.locationId = :locationId', {
        locationId: ship.locationId,
      });
      wreckQuery.where('wreck.locationId = :locationId', {
        locationId: ship.locationId,
      });
    } else if (location.scope === 'SYSTEM') {
      shipQuery
        .andWhere('targetSystemField.starSystemId = :systemId', {
          systemId: location.systemId,
        })
        .andWhere('targetSystemField.sx = :x AND targetSystemField.sy = :y', {
          x: location.x,
          y: location.y,
        });
      wreckQuery
        .leftJoin('wreck.location', 'wreckLocation')
        .leftJoin('wreckLocation.systemField', 'wreckSystemField')
        .where('wreckSystemField.starSystemId = :systemId', {
          systemId: location.systemId,
        })
        .andWhere('wreckSystemField.sx = :x AND wreckSystemField.sy = :y', {
          x: location.x,
          y: location.y,
        });
    } else {
      shipQuery
        .andWhere('targetGalaxyField.layerId = :layerId', {
          layerId: location.layerId,
        })
        .andWhere('targetGalaxyField.cx = :x AND targetGalaxyField.cy = :y', {
          x: location.x,
          y: location.y,
        });
      wreckQuery
        .leftJoin('wreck.location', 'wreckLocation')
        .leftJoin('wreckLocation.galaxyField', 'wreckGalaxyField')
        .where('wreckGalaxyField.layerId = :layerId', {
          layerId: location.layerId,
        })
        .andWhere('wreckGalaxyField.cx = :x AND wreckGalaxyField.cy = :y', {
          x: location.x,
          y: location.y,
        });
    }
    const [ships, wrecks, takeovers] = await Promise.all([
      shipQuery.getMany(),
      wreckQuery.getMany(),
      this.dataSource.getRepository(SpacecraftTakeover).find({
        where: [{ attackerId: ship.id }, { targetId: ship.id }],
      }),
    ]);
    const dockableStationIds =
      await this.dockingPrivilegeService.allowedStationIds(
        ship,
        ships.filter((target) => target.kind === 'STATION'),
      );
    return {
      actionsAvailable: !hyperdriveActive,
      hyperdriveActive,
      ships: ships
        .filter(
          (target) =>
            target.id !== ship.id && !isHiddenFromViewer(target, userId),
        )
        .map((target) => {
          const targetSystems =
            this.spacecraftRuntimeStateService.initialize(target);
          const targetHyperdriveActive =
            targetSystems.WARPDRIVE?.active === true;
          const targetOnVacation =
            target.user != null && isVacationEffective(target.user);
          const interactionContext = buildNearbyInteractionContext(
            ship,
            systems,
            target,
            targetSystems,
            targetOnVacation,
          );
          const interactionDecision = (interaction: NearbyInteraction) =>
            decideNearbyInteraction(interaction, interactionContext);
          const attackDecision = interactionDecision('ATTACK');
          return {
            id: target.id,
            name: target.name,
            shipClassId: target.shipClassId,
            username: target.user?.username ?? null,
            hull: target.hull,
            hullMax: target.hullMax,
            shields: target.shields,
            shieldsActive: targetSystems.SHIELDS?.active === true,
            hyperdriveActive: targetHyperdriveActive,
            isOwn: target.userId === ship.userId,
            fleetId: target.fleetId,
            isFleetLeader:
              target.fleetId != null && target.fleet?.leaderId === target.id,
            inHyperspace:
              resolveSpacecraftLocation(target)?.scope === 'GALAXY' &&
              target.status === SpacecraftStatus.IDLE &&
              targetHyperdriveActive,
            kind: target.kind,
            tractored: ships.some(
              (candidate) => candidate.tractoredShipId === target.id,
            ),
            takeover: (() => {
              const takeover = takeovers.find(
                (entry) => entry.attackerId === target.id || entry.targetId === target.id,
              );
              return takeover
                ? { attackerId: takeover.attackerId, targetId: takeover.targetId, ticksRemaining: takeover.ticksRemaining, totalTicks: 10, prestigeCost: takeover.prestigeCost, completed: false }
                : null;
            })(),
            actions: {
              dock:
                target.kind === 'STATION' &&
                dockableStationIds.has(target.id) &&
                ship.kind === 'SHIP' &&
                ship.dockedAtId == null &&
                interactionDecision('DOCK').allowed,
              attack:
                attackDecision.allowed && systems.WEAPONS?.active === true,
              attackReason:
                targetOnVacation && !attackDecision.allowed
                  ? attackDecision.reason
                  : null,
              scan: interactionDecision('SCAN').allowed,
              intercept:
                interactionDecision('INTERCEPT').allowed &&
                location.scope === 'GALAXY' &&
                resolveSpacecraftLocation(target)?.scope === 'GALAXY' &&
                targetHyperdriveActive &&
                ship.status === SpacecraftStatus.IDLE &&
                (systems.WARPDRIVE?.integrity ?? 0) > 0,
              contact:
                target.userId !== ship.userId &&
                interactionDecision('CONTACT').allowed,
              transfer: interactionDecision('TRANSFER').allowed,
              energyTransfer: interactionDecision('TRANSFER').allowed,
              tractor:
                target.kind === 'SHIP' &&
                target.user != null &&
                target.user.isNpc !== true &&
                !isVacationEffective(target.user) &&
                systems.TRACTOR_BEAM != null &&
                systems.TRACTOR_BEAM.integrity > 0 &&
                systems.SHIELDS?.active !== true &&
                ship.tractoredShipId == null &&
                target.tractoredShipId == null &&
                !ships.some(
                  (candidate) => candidate.tractoredShipId === ship.id,
                ) &&
                !ships.some(
                  (candidate) => candidate.tractoredShipId === target.id,
                ) &&
                !hyperdriveActive &&
                !targetHyperdriveActive,
              takeover:
                target.kind === 'SHIP' &&
                target.userId !== ship.userId &&
                target.user?.isNpc !== true &&
                !targetOnVacation &&
                ship.crew >= Math.max(1, ship.crewRequired) &&
                target.crew === 0 &&
                !takeovers.some((entry) =>
                  [entry.attackerId, entry.targetId].includes(target.id),
                ),
              boarding:
                target.kind === 'SHIP' &&
                target.userId !== ship.userId &&
                target.user?.isNpc !== true &&
                !targetOnVacation &&
                ship.crew > 0 &&
                target.crew > 0 &&
                ship.modules.some(
                  (module) =>
                    module.moduleType === 'Truppenquartiere' &&
                    module.integrity > 0 &&
                    module.isActive,
                ) &&
                interactionDecision('BOARDING').allowed,
            },
          };
        }),
      escapePods: await this.escapePodService.listNearby(
        ship.locationId,
        userId,
      ),
      wrecks: wrecks.map((wreck) => ({
        id: wreck.id,
        hull: wreck.hull,
        cargo: wreck.cargo,
      })),
    };
  }

  async getLocalMap(shipId: number, userId: number) {
    const ship = await this.shipRepo.findOne({
      where: { id: shipId, userId },
      relations: [
        'modules',
        'location',
        'location.galaxyField',
        'location.systemField',
        'location.systemField.starSystem',
      ],
    });
    if (!ship) throw new NotFoundException('Spacecraft not found');
    const location = resolveSpacecraftLocation(ship);
    if (!location) throw new NotFoundException('Aktuelles Feld nicht gefunden');
    const systems = this.spacecraftRuntimeStateService.initialize(ship);
    const lss = systems.LONG_RANGE_SENSORS;
    if (!lss?.active)
      throw new BadRequestException('Langstreckensensoren sind nicht aktiv');
    if (lss.integrity <= 0)
      throw new BadRequestException('Langstreckensensoren sind zerstört');
    const sensorRange = await this.getSensorRange(ship);

    if (location.scope === 'SYSTEM') {
      const shipX = location.x;
      const shipY = location.y;
      const starSystem = ship.location.systemField?.starSystem;

      const bounds = {
        minX: Math.max(1, shipX - sensorRange),
        maxX: Math.min(starSystem?.maxX ?? shipX, shipX + sensorRange),
        minY: Math.max(1, shipY - sensorRange),
        maxY: Math.min(starSystem?.maxY ?? shipY, shipY + sensorRange),
      };
      const [fields, allNearbyShips, starObjects, wrecks, shieldedObjectIds] =
        await Promise.all([
          this.systemFieldRepo
            .createQueryBuilder('sf')
            .leftJoinAndSelect('sf.fieldType', 'ft')
            .leftJoinAndSelect('sf.celestialObject', 'co')
            .where('sf.starSystemId = :sid', { sid: location.systemId })
            .andWhere('sf.sx BETWEEN :minX AND :maxX', {
              minX: bounds.minX,
              maxX: bounds.maxX,
            })
            .andWhere('sf.sy BETWEEN :minY AND :maxY', {
              minY: bounds.minY,
              maxY: bounds.maxY,
            })
            .getMany(),
          this.shipRepo
            .createQueryBuilder('s')
            .leftJoin('s.user', 'u')
            .leftJoinAndSelect('s.location', 'sl')
            .leftJoinAndSelect('sl.systemField', 'ssf')
            .addSelect(['u.username'])
            .where('ssf.starSystemId = :sid', { sid: location.systemId })
            .andWhere('s.id != :shipId', { shipId: ship.id })
            .andWhere('s.status != :destroyed', {
              destroyed: SpacecraftStatus.DESTROYED,
            })
            .andWhere('ssf.sx BETWEEN :minX AND :maxX', {
              minX: bounds.minX,
              maxX: bounds.maxX,
            })
            .andWhere('ssf.sy BETWEEN :minY AND :maxY', {
              minY: bounds.minY,
              maxY: bounds.maxY,
            })
            .getMany(),
          this.objectRepo
            .createQueryBuilder('object')
            .where('object.systemId = :systemId', {
              systemId: location.systemId,
            })
            .andWhere('object.classId IN (:...starClassIds)', {
              starClassIds: [9001, 9002],
            })
            .orderBy('object.classId', 'ASC')
            .addOrderBy('object.id', 'ASC')
            .getMany(),
          this.dataSource
            .getRepository(SpacecraftWreck)
            .createQueryBuilder('wreck')
            .leftJoinAndSelect('wreck.location', 'wl')
            .leftJoinAndSelect('wl.systemField', 'wsf')
            .where('wsf.starSystemId = :sid', { sid: location.systemId })
            .andWhere('wsf.sx BETWEEN :minX AND :maxX', bounds)
            .andWhere('wsf.sy BETWEEN :minY AND :maxY', bounds)
            .getMany(),
          findShieldedColonyObjectIds(
            this.dataSource.getRepository(Colony),
            location.systemId,
          ),
        ]);
      const nearbyShips = allNearbyShips.filter(
        (candidate) => !isHiddenFromViewer(candidate, userId),
      );

      const sensorView = applyLssSensorEffects({
        fields,
        observer: { x: shipX, y: shipY },
        position: (field) => ({ x: field.sx, y: field.sy }),
        signatures: this.countFieldSignatures(
          [ship, ...nearbyShips],
          (entry) => resolveSpacecraftLocation(entry)?.x ?? null,
          (entry) => resolveSpacecraftLocation(entry)?.y ?? null,
        ),
      });
      const visiblePositions = new Set(
        sensorView.fields.flatMap((field) =>
          'redacted' in field ? [] : [`${field.sx},${field.sy}`],
        ),
      );

      return {
        mode: 'system' as const,
        shipX,
        shipY,
        sensorRange,
        bounds,
        warning: sensorView.warning,
        systemId: location.systemId,
        systemName: starSystem?.name ?? null,
        systemTypeId: starSystem?.systemTypeId ?? null,
        stars: starObjects
          .filter((star) => visiblePositions.has(`${star.posX},${star.posY}`))
          .map((star) => ({
            centerX: star.posX,
            centerY: star.posY,
            role: star.classId === 9002 ? 'secondary' : 'primary',
          })),
        fields: sensorView.fields.map((f) => {
          if ('redacted' in f) return { sx: f.x, sy: f.y, redacted: true as const };
          return {
            id: f.id,
            sx: f.sx,
            sy: f.sy,
            effects: f.effects,
            fieldType: {
              id: f.fieldType.id,
              key: f.fieldType.key,
              name: f.fieldType.name,
              effects: f.fieldType.effects,
            },
            celestialObjectId: f.celestialObjectId,
            celestialObject: f.celestialObject
              ? {
                  id: f.celestialObject.id,
                  name: f.celestialObject.name,
                  objectType: f.celestialObject.objectType,
                  classId: f.celestialObject.classId,
                  isColonizable: f.celestialObject.isColonizable,
                  shielded: shieldedObjectIds.has(f.celestialObject.id),
                  posX: f.celestialObject.posX,
                  posY: f.celestialObject.posY,
                }
              : null,
          };
        }),
        wrecks: wrecks
          .filter(
            (wreck) =>
              wreck.location?.systemField?.sx != null &&
              wreck.location.systemField.sy != null &&
              visiblePositions.has(
                `${wreck.location.systemField.sx},${wreck.location.systemField.sy}`,
              ),
          )
          .map((wreck) => ({
            id: wreck.id,
            x: wreck.location!.systemField!.sx,
            y: wreck.location!.systemField!.sy,
            hull: wreck.hull,
            cargo: wreck.cargo,
            modules: wreck.modules,
          })),
        overlays: { signatures: sensorView.signatures },
        ships: nearbyShips
          .filter((s) => {
            const position = resolveSpacecraftLocation(s);
            return position && visiblePositions.has(`${position.x},${position.y}`);
          })
          .map((s) => ({
          id: s.id,
          name: s.name,
          userId: s.userId,
          username: s.user?.username ?? null,
          shipClassId: s.shipClassId,
          posX: resolveSpacecraftLocation(s)?.x ?? null,
          posY: resolveSpacecraftLocation(s)?.y ?? null,
          status: s.status,
          onSameField:
            resolveSpacecraftLocation(s)?.x === shipX &&
            resolveSpacecraftLocation(s)?.y === shipY,
        })),
        canEnterSystem: false,
        canLeaveSystem:
          ship.status === SpacecraftStatus.IDLE &&
          systems.WARPDRIVE != null &&
          systems.WARPDRIVE.integrity > 0 &&
          systems.WARPDRIVE.cooldown === 0,
        context: await this.buildLocalMapContext({
          ship,
          layerId: starSystem?.layerId ?? null,
          cx: starSystem?.cx ?? null,
          cy: starSystem?.cy ?? null,
          localX: shipX,
          localY: shipY,
          sensorRange,
          visibleFields: [],
        }),
      };
    }

    const layer = await this.layerRepo.findOneBy({ id: location.layerId });
    if (!layer)
      throw new NotFoundException('Aktuelle Galaxieebene nicht gefunden');
    const bounds = {
      minX: Math.max(1, location.x - sensorRange),
      maxX: Math.min(layer.width, location.x + sensorRange),
      minY: Math.max(1, location.y - sensorRange),
      maxY: Math.min(layer.height, location.y + sensorRange),
    };
    const [fields, allNearbyShips, wrecks] = await Promise.all([
      this.galaxyFieldRepo
        .createQueryBuilder('gf')
        .leftJoinAndSelect('gf.fieldType', 'ft')
        .leftJoinAndSelect('gf.starSystem', 'ss')
        .leftJoinAndSelect('gf.region', 'region')
        .where('gf.layerId = :lid', { lid: location.layerId })
        .andWhere('gf.cx BETWEEN :minX AND :maxX', {
          minX: bounds.minX,
          maxX: bounds.maxX,
        })
        .andWhere('gf.cy BETWEEN :minY AND :maxY', {
          minY: bounds.minY,
          maxY: bounds.maxY,
        })
        .getMany(),
      this.shipRepo
        .createQueryBuilder('s')
        .leftJoin('s.user', 'u')
        .leftJoinAndSelect('s.location', 'sl')
        .leftJoinAndSelect('sl.galaxyField', 'sgf')
        .addSelect(['u.username'])
        .where('sgf.layerId = :lid', { lid: location.layerId })
        .andWhere('s.id != :shipId', { shipId: ship.id })
        .andWhere('s.status != :destroyed', {
          destroyed: SpacecraftStatus.DESTROYED,
        })
        .andWhere('sgf.cx BETWEEN :minX AND :maxX', {
          minX: bounds.minX,
          maxX: bounds.maxX,
        })
        .andWhere('sgf.cy BETWEEN :minY AND :maxY', {
          minY: bounds.minY,
          maxY: bounds.maxY,
        })
        .getMany(),
      this.dataSource
        .getRepository(SpacecraftWreck)
        .createQueryBuilder('wreck')
        .leftJoinAndSelect('wreck.location', 'wl')
        .leftJoinAndSelect('wl.galaxyField', 'wgf')
        .where('wgf.layerId = :lid', { lid: location.layerId })
        .andWhere('wgf.cx BETWEEN :minX AND :maxX', bounds)
        .andWhere('wgf.cy BETWEEN :minY AND :maxY', bounds)
        .getMany(),
    ]);
    const flightSignatures =
      systems.SUBSPACE_SCANNER?.active === true &&
      systems.SUBSPACE_SCANNER.integrity > 0
        ? await Promise.all(
            fields.map(async (field) => ({
              x: field.cx,
              y: field.cy,
              result: await this.flightSignatureService.getVisibleAt(
                field.id,
                userId,
              ),
            })),
          )
        : [];
    const nearbyShips = allNearbyShips.filter(
      (candidate) => !isHiddenFromViewer(candidate, userId),
    );

    const onSystemField = fields.find(
      (field) =>
        field.cx === location.x &&
        field.cy === location.y &&
        field.starSystemId != null,
    );

    const sensorView = applyLssSensorEffects({
      fields,
      observer: { x: location.x, y: location.y },
      position: (field) => ({ x: field.cx, y: field.cy }),
      signatures: this.countFieldSignatures(
        [ship, ...nearbyShips],
        (entry) => resolveSpacecraftLocation(entry)?.x ?? null,
        (entry) => resolveSpacecraftLocation(entry)?.y ?? null,
      ),
    });
    const visiblePositions = new Set(
      sensorView.fields.flatMap((field) =>
        'redacted' in field ? [] : [`${field.cx},${field.cy}`],
      ),
    );

    return {
      mode: 'galaxy' as const,
      shipX: location.x,
      shipY: location.y,
      sensorRange,
      bounds,
      warning: sensorView.warning,
      fields: sensorView.fields.map((f) => {
        if ('redacted' in f) return { cx: f.x, cy: f.y, redacted: true as const };
        return {
          id: f.id,
          cx: f.cx,
          cy: f.cy,
          effects: f.effects,
          fieldType: {
            id: f.fieldType.id,
            key: f.fieldType.key,
            name: f.fieldType.name,
            effects: f.fieldType.effects,
          },
          starSystemId: f.starSystemId,
          systemTypeId: f.starSystem?.systemTypeId ?? null,
          starSystem: f.starSystem
            ? { id: f.starSystem.id, name: f.starSystem.name }
            : null,
          regionName: f.region?.name ?? null,
          isPassable: f.isPassable,
        };
      }),
      wrecks: wrecks
        .filter(
          (wreck) =>
            wreck.location?.galaxyField != null &&
            visiblePositions.has(
              `${wreck.location.galaxyField.cx},${wreck.location.galaxyField.cy}`,
            ),
        )
        .map((wreck) => ({
          id: wreck.id,
          x: wreck.location!.galaxyField!.cx,
          y: wreck.location!.galaxyField!.cy,
          hull: wreck.hull,
          cargo: wreck.cargo,
        })),
      overlays: {
        signatures: sensorView.signatures,
        subspaceTraces: flightSignatures.flatMap(({ x, y, result }) =>
          result.signatures.map((signature) => ({
            signatureId: signature.id,
            spacecraftId: signature.spacecraftId,
            x,
            y,
            directions: [signature.fromDirection, signature.toDirection].filter(
              (direction): direction is NonNullable<typeof direction> =>
                direction != null,
            ),
            analyzed: ship.analyzedFlightSignatureId === signature.id,
          })),
        ),
      },
      ships: nearbyShips
        .filter((s) => {
          const position = resolveSpacecraftLocation(s);
          return position && visiblePositions.has(`${position.x},${position.y}`);
        })
        .map((s) => ({
        id: s.id,
        name: s.name,
        userId: s.userId,
        username: s.user?.username ?? null,
        shipClassId: s.shipClassId,
        posX: resolveSpacecraftLocation(s)?.x ?? null,
        posY: resolveSpacecraftLocation(s)?.y ?? null,
        status: s.status,
        onSameField:
          resolveSpacecraftLocation(s)?.x === location.x &&
          resolveSpacecraftLocation(s)?.y === location.y,
      })),
      entrySystem: onSystemField?.starSystem
        ? {
            id: onSystemField.starSystem.id,
            name: onSystemField.starSystem.name,
            x: onSystemField.cx,
            y: onSystemField.cy,
          }
        : null,
      canEnterSystem:
        Boolean(onSystemField) && ship.status === SpacecraftStatus.IDLE,
      canLeaveSystem: false,
      context: await this.buildLocalMapContext({
        ship,
        layerId: location.layerId,
        cx: location.x,
        cy: location.y,
        localX: location.x,
        localY: location.y,
        sensorRange,
        visibleFields: fields,
      }),
    };
  }

  private countFieldSignatures(
    ships: Spacecraft[],
    x: (ship: Spacecraft) => number | null,
    y: (ship: Spacecraft) => number | null,
  ): Array<{ x: number; y: number; visibleCount: number }> {
    const counts = new Map<
      string,
      { x: number; y: number; visibleCount: number }
    >();
    for (const ship of ships) {
      if (ship.status === SpacecraftStatus.DESTROYED) continue;
      const fieldX = x(ship);
      const fieldY = y(ship);
      if (fieldX == null || fieldY == null) continue;
      const key = `${fieldX},${fieldY}`;
      const current = counts.get(key);
      if (current) current.visibleCount++;
      else counts.set(key, { x: fieldX, y: fieldY, visibleCount: 1 });
    }
    return [...counts.values()];
  }

  private async buildLocalMapContext(input: {
    ship: Spacecraft;
    layerId: number | null;
    cx: number | null;
    cy: number | null;
    localX: number | null;
    localY: number | null;
    sensorRange: number;
    visibleFields: GalaxyField[];
  }) {
    const {
      ship,
      layerId,
      cx,
      cy,
      localX,
      localY,
      sensorRange,
      visibleFields,
    } = input;
    const layer = layerId
      ? await this.layerRepo.findOneBy({ id: layerId })
      : null;
    const currentField =
      layerId && cx != null && cy != null
        ? await this.galaxyFieldRepo.findOne({
            where: { layerId, cx, cy },
            relations: ['starSystem'],
          })
        : null;
    const sectorX =
      layer && cx != null ? Math.floor((cx - 1) / layer.sectorSize) : null;
    const sectorY =
      layer && cy != null ? Math.floor((cy - 1) / layer.sectorSize) : null;
    const nearestSystemField = visibleFields
      .filter((field) => field.starSystem)
      .sort(
        (a, b) =>
          Math.hypot(a.cx - (cx ?? a.cx), a.cy - (cy ?? a.cy)) -
          Math.hypot(b.cx - (cx ?? b.cx), b.cy - (cy ?? b.cy)),
      )[0];

    const shipLocation = resolveSpacecraftLocation(ship);
    const cartography =
      shipLocation?.scope === 'SYSTEM'
        ? await this.getCartography(ship.id, ship.userId)
        : null;

    return {
      layerId,
      sectorX,
      sectorY,
      sectorNumber:
        layer && sectorX != null && sectorY != null
          ? sectorY * Math.ceil(layer.width / layer.sectorSize) + sectorX + 1
          : null,
      coordinates: { x: localX, y: localY },
      galaxyCoordinates: { x: cx, y: cy },
      sensorRange,
      factionZone: currentField?.factionZone ?? null,
      adminRegionKey: currentField?.adminRegionKey ?? null,
      systemName:
        shipLocation?.scope === 'SYSTEM'
          ? (ship.location?.systemField?.starSystem?.name ?? null)
          : null,
      entrySystem: currentField?.starSystem
        ? {
            id: currentField.starSystem.id,
            name: currentField.starSystem.name,
            x: currentField.cx,
            y: currentField.cy,
            systemTypeId: currentField.starSystem.systemTypeId ?? null,
          }
        : null,
      nearestSystem: nearestSystemField?.starSystem
        ? {
            id: nearestSystemField.starSystem.id,
            name: nearestSystemField.starSystem.name,
            cx: nearestSystemField.starSystem.cx,
            cy: nearestSystemField.starSystem.cy,
          }
        : null,
      nearbyRouteNames: [] as string[],
      lssMode: ship.lssMode ?? SpacecraftLssMode.DISABLED,
      cartography,
    };
  }

  private async abortCartographyFinalization(
    ship: Spacecraft,
    message: string,
  ): Promise<void> {
    const plan =
      await this.cartographyPlanService.getPlanForFinalizingSpacecraft(ship.id);
    if (!plan) return;
    await this.cartographyPlanService.resetFinishingForSpacecraft(ship.id);
    await this.messagingService.sendSystem(
      ship.userId,
      'Kartographie',
      message,
      `cartography-finalization-aborted:${ship.id}`,
    );
  }

  private isAstrometryLaborOperational(
    ship: Spacecraft,
    systems: ReturnType<SpacecraftRuntimeStateService['initialize']>,
  ): boolean {
    const laboratory = systems.ASTROMETRY_LAB;
    const shortRangeSensors = systems.SHORT_RANGE_SENSORS;
    const longRangeSensors = systems.LONG_RANGE_SENSORS;
    return Boolean(
      laboratory?.active &&
      laboratory.integrity > 0 &&
      shortRangeSensors?.active &&
      shortRangeSensors.integrity > 0 &&
      longRangeSensors?.active &&
      longRangeSensors.integrity > 0,
    );
  }

  async processTick(
    ship: Spacecraft,
    options: { skipRepair?: boolean } = {},
  ): Promise<void> {
    const construction = await this.stationConstructionService.processTick(
      ship.id,
    );
    if (construction.completed) {
      await this.messagingService.sendSystem(
        ship.userId,
        'Stationsbau abgeschlossen',
        `${construction.station?.name ?? ship.name} wurde fertiggestellt.`,
        `station-construction-completed:${ship.id}`,
        MessageFolder.STATION,
      );
      return;
    }
    if (construction.paused) {
      await this.messagingService.sendSystem(
        ship.userId,
        'Stationsbau pausiert',
        `Der Bau von ${ship.name} wurde wegen unzureichender angedockter Workbees pausiert.`,
        `station-construction-paused:${ship.id}:${ship.constructionTicksRemaining}`,
        MessageFolder.STATION,
      );
      return;
    }
    if (ship.status === SpacecraftStatus.UNDER_CONSTRUCTION) return;
    await this.takeoverService.processTick(ship.id);
    if (ship.kind === 'STATION') {
      await this.stationRepairService.processTick(ship.id, options);
      await this.stationShipyardService.processTick(ship.id);
    }
    await this.processMovement(ship);
    const tickLocation =
      ship.location?.systemField ?? ship.location?.galaxyField;
    if (tickLocation) {
      await this.flightConsequencePipeline.onTick(ship, tickLocation);
    }
    if (!options.skipRepair) {
      await this.repairService.processTick(ship);
    }
    if (ship.status === SpacecraftStatus.IN_FLIGHT) {
      await this.cartographyPlanService.resetFinishingForSpacecraft(ship.id);
    }

    const [modules, shipClass] = await Promise.all([
      this.moduleRepo.find({ where: { spacecraftId: ship.id } }),
      this.shipClassService.findById(ship.shipClassId),
    ]);
    ship.modules = modules;
    const energyBefore = ship.energy;
    const resourceFlow = this.spacecraftResourceFlowService.recharge(
      ship,
      shipClass?.flightEnergyCost ?? 1,
    );
    const batteryReload = stationBatteryReload(
      ship,
      ship.energy - energyBefore,
    );
    ship.energy -= batteryReload;
    ship.battery += batteryReload;
    if (resourceFlow?.deactivatedSystems.length > 0) {
      const detail = `Wegen Energiemangels abgeschaltet: ${resourceFlow.deactivatedSystems.join(', ')}.`;
      await this.messagingService.sendSystem(
        ship.userId,
        'Systemabschaltung wegen Energiemangels',
        `${ship.name}: ${detail}`,
        undefined,
        MessageFolder.SHIP,
      );
      this.gameGateway.emitToUser(ship.userId, WsEventType.SPACECRAFT_EVENT, {
        shipId: ship.id,
        detail,
      });
    }

    if (ship.shields < ship.shieldsMax && ship.energy > 10) {
      const formulas = this.gameData.getCombatFormulas();
      const rechargeRate = formulas?.shields?.recharge_rate || 0.1;
      const regen = Math.max(1, Math.round(ship.shieldsMax * rechargeRate));
      ship.shields = Math.min(ship.shields + regen, ship.shieldsMax);
      ship.energy -= 2;
    }

    if (ship.warpCooldown > 0) {
      ship.warpCooldown--;
    }

    for (const mod of modules) {
      if (mod.cooldown > 0) {
        mod.cooldown--;
        await this.moduleRepo.save(mod);
      }
    }

    const systems = this.spacecraftRuntimeStateService.initialize(ship);
    const lifeSupport = systems.LIFE_SUPPORT;
    if (
      ship.crew > 0 &&
      (!lifeSupport || !lifeSupport.active || lifeSupport.integrity <= 0)
    ) {
      const evacuated =
        await this.escapePodService.evacuateLifeSupportFailure(ship);
      if (evacuated > 0) {
        await this.messagingService.sendSystem(
          ship.userId,
          'Lebenserhaltung ausgefallen',
          `Die Lebenserhaltung der ${ship.name} ist ausgefallen. ${evacuated} Crewmitglieder haben das Schiff in Rettungskapseln verlassen.`,
        );
      }
    }
    const location = resolveSpacecraftLocation(ship);
    if (
      ship.status === SpacecraftStatus.IN_FLIGHT ||
      ship.status === SpacecraftStatus.DESTROYED ||
      !this.isAstrometryLaborOperational(ship, systems) ||
      location?.scope !== 'SYSTEM' ||
      location.systemId !==
        (
          await this.cartographyPlanService.getPlanForFinalizingSpacecraft(
            ship.id,
          )
        )?.starSystemId
    ) {
      await this.abortCartographyFinalization(
        ship,
        'Die Kartographie-Finalisierung wurde abgebrochen, weil das Schiff die Voraussetzungen nicht mehr erfüllt.',
      );
    } else {
      const finalization =
        await this.cartographyPlanService.progressFinalization(ship.id);
      if (finalization.completed) {
        await this.crewEnhancementService.enhanceSpacecraft(
          ship.id,
          CrewEnhancementEvent.FINISH_ASTRO_MAPPING,
        );
        await this.prestigeService.change(
          finalization.userId!,
          10,
          'Kartographie eines Sternensystems abgeschlossen',
        );
        await this.messagingService.sendSystem(
          finalization.userId!,
          'Kartographie',
          'Die Systemkartographie wurde erfolgreich abgeschlossen.',
          `cartography-completed:${finalization.userId}:${finalization.starSystemId}`,
        );
      }
    }

    await this.trackerService.processTick(ship);
    await this.shipRepo.save(ship);
  }
}
