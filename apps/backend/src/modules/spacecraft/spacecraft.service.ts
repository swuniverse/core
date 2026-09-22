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
  SpacecraftOperatingMode,
  SpacecraftLssMode,
  SpacecraftStatus,
} from './entities/spacecraft.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import { SpacecraftWreck } from './entities/spacecraft-wreck.entity';
import { Fleet } from './entities/fleet.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { StarSystem } from '../starmap/entities/star-system.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { CelestialObject } from '../starmap/entities/celestial-object.entity';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { SystemField } from '../starmap/entities/system-field.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
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
  type SpacecraftCartographyDto,
  type SpacecraftLssMode as SpacecraftLssModeDto,
  WsEventType,
  getStuCelestialClass,
} from '@swuniverse/shared';
import { Colony } from '../colony/entities/colony.entity';
import { assertSpacecraftNotInStandby } from './spacecraft-mode.util';
import { ShipColonyContextService } from './ship-colony-context.service';
import { AdminShipBuildplan } from './entities/admin-ship-buildplan.entity';
import { SpacecraftDestructionService } from './spacecraft-destruction.service';
import { ShipClassDiscoveryService } from './ship-class-discovery.service';
import { HyperdriveDisruptionService } from './hyperdrive-disruption.service';
import { GameEventService } from '../events/game-event.service';
import { GameEventType } from '../events/entities/game-event.entity';
import { SpacecraftAlertService } from './spacecraft-alert.service';
import {
  projectSpacecraftLocationToGalaxy,
  resolveContextualCelestialObject,
  resolveContextualCelestialObjectId,
  resolveSpaceLocation,
  resolveSpacecraftField,
  resolveSpacecraftLocation,
  sameSpacecraftLocation,
} from './spacecraft-field';
import { COLONY_FUNCTION_IDS } from '../colony/colony.constants';

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
    private readonly gameEvents: GameEventService,
    private readonly spacecraftAlertService: SpacecraftAlertService,
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
        'fleet',
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
    const summaries = await Promise.all(
      ships.map((ship) => this.toShipSummary(ship)),
    );
    return summaries.map((ship) => ({
      ...ship,
      location: resolveSpacecraftLocation(ship),
    }));
  }

  async findOne(shipId: number, userId: number): Promise<Spacecraft> {
    const ship = await this.shipRepo.findOne({
      where: { id: shipId, userId },
      relations: [
        'modules',
        'fleet',
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
    const [crewRoster, shipClass, sensorRange, crewRequired] =
      await Promise.all([
        this.spacecraftCrewService.getAssignedCrew(ship.id),
        this.shipClassService.findById(ship.shipClassId),
        this.getSensorRange(ship),
        this.spacecraftCrewService.getRequiredCrew(ship),
      ]);
    const effective = shipClass
      ? this.spacecraftStatsService.calculateStats(
          shipClass,
          ship.modules ?? [],
        )
      : null;
    const normal =
      (ship.operatingMode ?? SpacecraftOperatingMode.NORMAL) !==
      SpacecraftOperatingMode.STANDBY;
    return {
      ...ship,
      crew: crewRoster.length,
      crewMax: effective?.crewMax ?? ship.crewMax,
      operatingMode: ship.operatingMode ?? SpacecraftOperatingMode.NORMAL,
      alertState: ship.alertState,
      arrivalAt: ship.arrivalAt?.toISOString() ?? null,
      location: resolveSpacecraftLocation(ship)!,
      runtimeSystems: this.spacecraftRuntimeStateService.initialize(ship),
      crewRoster,
      crewRequired,
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
  ): Promise<SpacecraftCartographyDto> {
    const ship = await this.findOne(shipId, userId);
    const location = resolveSpacecraftLocation(ship);
    if (location?.scope !== 'SYSTEM') {
      return {
        systemId: null,
        explored: false,
        progress: 0,
        surveyedFields: 0,
        totalFields: 0,
      };
    }
    const [explored, totalFields] = await Promise.all([
      this.explorationService.isSystemExplored(userId, location.systemId),
      this.systemFieldRepo.count({
        where: { starSystemId: location.systemId },
      }),
    ]);
    return {
      systemId: location.systemId,
      explored,
      progress: explored ? 100 : 0,
      surveyedFields: explored ? totalFields : 0,
      totalFields,
    };
  }

  async surveyCurrentSystem(
    shipId: number,
    userId: number,
  ): Promise<SpacecraftCartographyDto> {
    const ship = await this.findOne(shipId, userId);
    const location = resolveSpacecraftLocation(ship);
    if (location?.scope !== 'SYSTEM')
      throw new BadRequestException('Schiff befindet sich in keinem System');
    const systems = this.spacecraftRuntimeStateService.initialize(ship);
    if (systems.LONG_RANGE_SENSORS?.active !== true)
      throw new BadRequestException('Langstreckensensoren sind nicht aktiv');
    await this.explorationService.discoverSystem({
      userId,
      starSystemId: location.systemId,
      source: 'ship_survey',
    });
    return this.getCartography(shipId, userId);
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
      LIFE_SUPPORT: 'Lebenserhaltung',
    };
    this.gameGateway.emitToUser(ship.userId, WsEventType.SPACECRAFT_EVENT, {
      shipId: ship.id,
      type: 'SYSTEM_TOGGLED',
      detail: `${systemName[systemKey]} ${active ? 'aktiviert' : 'deaktiviert'}`,
    });
    return { systems };
  }

  async setReactorDistribution(
    shipId: number,
    userId: number,
    warpSplit: number,
  ): Promise<{ reactorWarpSplit: number }> {
    if (warpSplit < 0 || warpSplit > 100) {
      throw new BadRequestException('warpSplit must be 0-100');
    }
    const ship = await this.findOne(shipId, userId);
    ship.reactorWarpSplit = Math.round(warpSplit);
    await this.shipRepo.save(ship);
    this.gameGateway.emitToUser(ship.userId, WsEventType.SPACECRAFT_EVENT, {
      shipId: ship.id,
      type: 'REACTOR_ADJUSTED',
      detail: `Verteilung: EPS ${100 - ship.reactorWarpSplit}% / Hyperantrieb ${ship.reactorWarpSplit}%`,
    });
    return { reactorWarpSplit: ship.reactorWarpSplit };
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

  async installModule(
    shipId: number,
    userId: number,
    moduleType: string,
  ): Promise<SpacecraftModule> {
    const ship = await this.findOne(shipId, userId);

    if (ship.status === SpacecraftStatus.IN_COMBAT) {
      throw new BadRequestException('Cannot install modules during combat');
    }

    const moduleDef = this.gameData
      .getAllModules()
      .find((m) => m.name === moduleType);
    if (!moduleDef) {
      throw new BadRequestException('Unknown module type');
    }

    const mod = this.moduleRepo.create({
      spacecraftId: ship.id,
      moduleType,
      category: moduleDef.category,
      level: 1,
      integrity: 100,
      cooldown: 0,
      isActive: true,
    });

    const saved = await this.moduleRepo.save(mod);
    await this.recalculateStats(ship);
    return saved;
  }

  async removeModule(
    shipId: number,
    userId: number,
    moduleId: number,
  ): Promise<void> {
    const ship = await this.findOne(shipId, userId);

    if (ship.status === SpacecraftStatus.IN_COMBAT) {
      throw new BadRequestException('Cannot remove modules during combat');
    }

    const mod = ship.modules.find((m) => m.id === moduleId);
    if (!mod) throw new NotFoundException('Module not found on this ship');

    await this.moduleRepo.remove(mod);
    await this.recalculateStats(ship);
  }

  async levelUpModule(
    shipId: number,
    userId: number,
    moduleId: number,
  ): Promise<SpacecraftModule> {
    const ship = await this.findOne(shipId, userId);

    const mod = ship.modules.find((m) => m.id === moduleId);
    if (!mod) throw new NotFoundException('Module not found on this ship');

    const moduleDef = this.gameData
      .getAllModules()
      .find((m) => m.name === mod.moduleType);
    if (!moduleDef)
      throw new BadRequestException('Module definition not found');

    if (mod.level >= moduleDef.maxLevel) {
      throw new BadRequestException('Module already at max level');
    }

    mod.level += 1;
    const saved = await this.moduleRepo.save(mod);
    await this.recalculateStats(ship);
    return saved;
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

  private async recalculateStats(ship: Spacecraft): Promise<void> {
    const [modules, shipClass] = await Promise.all([
      this.moduleRepo.find({ where: { spacecraftId: ship.id } }),
      this.shipClassService.findById(ship.shipClassId),
    ]);
    if (!shipClass) return;
    this.spacecraftStatsService.applyStats(ship, shipClass, modules);
    this.spacecraftCrewService.applyRequiredCrew(
      ship,
      shipClass.crewMin,
      modules,
    );
    await this.shipRepo.save(ship);
  }

  private async assertEnoughCrew(ship: Spacecraft): Promise<void> {
    if (!(await this.spacecraftCrewService.hasEnoughCrew(ship))) {
      throw new BadRequestException('Not enough crew');
    }
  }

  // In-system impulse navigation: 1 EPS per field, 5s per field
  async navigate(
    shipId: number,
    userId: number,
    targetX: number,
    targetY: number,
  ): Promise<Spacecraft> {
    const ship = await this.findOne(shipId, userId);
    const currentLocation = resolveSpacecraftField(ship);
    assertSpacecraftNotInStandby(ship, 'dem Flug');

    if (ship.status === SpacecraftStatus.IN_COMBAT) {
      throw new BadRequestException('Cannot navigate during combat');
    }
    if (ship.status === SpacecraftStatus.DESTROYED) {
      throw new BadRequestException('Ship is destroyed');
    }
    if (ship.status === SpacecraftStatus.IN_FLIGHT) {
      throw new BadRequestException('Ship already in flight');
    }
    if (currentLocation?.scope !== 'SYSTEM') {
      throw new BadRequestException(
        'Ship is not in a system. Use galaxy flight instead.',
      );
    }
    const currentSystemId = currentLocation.systemId;
    await this.assertEnoughCrew(ship);
    this.activateDriveForFlight(ship, 'SUBLIGHT_DRIVE');
    this.assertSystemsForFlight(ship, 'sublight');

    const system = await this.systemRepo.findOne({
      where: { id: currentSystemId },
    });
    if (!system) {
      throw new NotFoundException('Current star system not found');
    }

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

    const targetField = await this.systemFieldRepo.findOne({
      where: { starSystemId: currentSystemId, sx: targetX, sy: targetY },
    });
    if (targetField && !targetField.isPassable) {
      throw new BadRequestException('Target field is not passable');
    }

    const startX = currentLocation.x;
    const startY = currentLocation.y;
    const dx = Math.abs(targetX - startX);
    const dy = Math.abs(targetY - startY);

    if (dx > 0 && dy > 0) {
      throw new BadRequestException(
        'Only orthogonal movement allowed (horizontal or vertical)',
      );
    }

    const distance = dx + dy;

    this.assertBlindFlightDistance(
      this.spacecraftRuntimeStateService.initialize(ship),
      distance,
    );
    if (distance === 0) {
      throw new BadRequestException('Already at target position');
    }

    const shipClass = await this.shipClassService.findById(ship.shipClassId);
    if (!shipClass) throw new NotFoundException('Ship class not found');
    const energyCost = distance * shipClass.flightEnergyCost;
    this.consumeEps(ship, energyCost, 'navigation');

    const previousField = resolveSpacecraftField(ship);
    if (!targetField) throw new NotFoundException('Target field not found');
    await this.setCurrentLocation(
      ship,
      await this.findLocationBySystemField(targetField.id),
    );
    ship.targetLocationId = null;
    ship.targetLocation = null;
    ship.arrivalAt = null;
    ship.status = SpacecraftStatus.IDLE;

    this.spacecraftRuntimeStateService.initialize(ship);

    if (!(await this.destructionService.saveUnlessDestroyed(ship))) {
      throw new BadRequestException('Ship is destroyed');
    }

    await this.explorationService.discoverSystem({
      userId: ship.userId,
      starSystemId: currentSystemId,
      source: 'NAVIGATE',
    });
    await this.emitOrbitUpdates(previousField, resolveSpacecraftField(ship));

    return this.findOne(ship.id, userId);
  }

  // Galaxy-map flight: move between galaxy fields when NOT in a system
  async flyGalaxy(
    shipId: number,
    userId: number,
    targetX: number,
    targetY: number,
  ): Promise<Spacecraft> {
    const ship = await this.findOne(shipId, userId);
    const currentLocation = resolveSpacecraftField(ship);
    assertSpacecraftNotInStandby(ship, 'dem Flug');

    if (ship.status === SpacecraftStatus.IN_COMBAT) {
      throw new BadRequestException('Cannot fly during combat');
    }
    if (ship.status === SpacecraftStatus.DESTROYED) {
      throw new BadRequestException('Ship is destroyed');
    }
    if (ship.status === SpacecraftStatus.IN_FLIGHT) {
      throw new BadRequestException('Ship already in flight');
    }
    if (currentLocation?.scope !== 'GALAXY') {
      throw new BadRequestException(
        'Ship is inside a system. Leave system first.',
      );
    }
    const currentLayerId = currentLocation.layerId;
    await this.assertEnoughCrew(ship);
    this.activateDriveForFlight(ship, 'WARPDRIVE');
    this.assertSystemsForFlight(ship, 'warp');

    const targetField = await this.galaxyFieldRepo.findOne({
      where: { layerId: currentLayerId, cx: targetX, cy: targetY },
    });
    if (!targetField) {
      throw new BadRequestException('Target galaxy field does not exist');
    }
    if (!targetField.isPassable) {
      throw new BadRequestException('Target galaxy field is not passable');
    }

    const dx = Math.abs(targetX - currentLocation.x);
    const dy = Math.abs(targetY - currentLocation.y);

    if (dx > 0 && dy > 0) {
      throw new BadRequestException(
        'Only orthogonal movement allowed (horizontal or vertical)',
      );
    }

    const distance = dx + dy;

    this.assertBlindFlightDistance(
      this.spacecraftRuntimeStateService.initialize(ship),
      distance,
    );
    if (distance === 0) {
      throw new BadRequestException('Already at target position');
    }

    const warpdriveCost = distance;
    this.consumeWarpdrive(ship, warpdriveCost, 'galaxy flight');
    ship.lastGalaxyFlightDirection = this.directionFromMove(
      currentLocation.x,
      currentLocation.y,
      targetX,
      targetY,
    );

    await this.setCurrentLocation(
      ship,
      await this.findLocationByGalaxyField(targetField.id),
    );
    ship.targetLocationId = null;
    ship.targetLocation = null;
    ship.arrivalAt = null;
    ship.status = SpacecraftStatus.IDLE;

    this.spacecraftRuntimeStateService.initialize(ship);

    if (!(await this.destructionService.saveUnlessDestroyed(ship))) {
      throw new BadRequestException('Ship is destroyed');
    }

    await this.discoverGalaxyAroundShip(
      ship,
      currentLayerId,
      targetX,
      targetY,
      'FLIGHT',
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
    const currentLocation = resolveSpacecraftField(ship);
    assertSpacecraftNotInStandby(ship, 'dem Systemeintritt');

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

    await this.setCurrentLocation(
      ship,
      await this.findLocationBySystemField(entryField.id),
    );
    ship.status = SpacecraftStatus.IDLE;
    const systems = this.spacecraftRuntimeStateService.initialize(ship);
    if (systems.WARPDRIVE) systems.WARPDRIVE.active = false;
    ship.runtimeSystems = systems;

    if (!(await this.destructionService.saveUnlessDestroyed(ship))) {
      throw new BadRequestException('Ship is destroyed');
    }

    await this.explorationService.discoverSystem({
      userId,
      starSystemId: galaxyField.starSystemId,
      source: 'ENTER',
    });
    await this.gameEvents.recordSpacecraft(
      GameEventType.SYSTEM_ENTERED,
      `${ship.name} ist in das Sternensystem ${system.name} eingeflogen.`,
      ship,
    );

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
    const currentLocation = resolveSpacecraftField(ship);
    assertSpacecraftNotInStandby(ship, 'dem Systemaustritt');

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
    await this.setCurrentLocation(
      ship,
      galaxyField ? await this.findLocationByGalaxyField(galaxyField.id) : null,
    );
    ship.status = SpacecraftStatus.IDLE;

    if (!(await this.destructionService.saveUnlessDestroyed(ship))) {
      throw new BadRequestException('Ship is destroyed');
    }
    return ship;
  }

  // Inter-system warp: 1 WE per galaxy-grid field, 60s per field
  async warp(
    shipId: number,
    userId: number,
    targetSystemId: number,
  ): Promise<Spacecraft> {
    const ship = await this.findOne(shipId, userId);
    assertSpacecraftNotInStandby(ship, 'dem Hyperraumflug');

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
    this.consumeWarpdrive(ship, warpdriveCost, 'warp');

    const warpTimeMs = galaxyDistance * 60_000;

    ship.status = SpacecraftStatus.IN_FLIGHT;
    ship.originLocationId = ship.locationId;
    ship.originLocation = ship.location;
    const targetField = await this.systemFieldRepo.findOne({
      where: { starSystemId: targetSystemId, sx: 1, sy: 1 },
    });
    ship.targetLocation = targetField
      ? await this.findLocationBySystemField(targetField.id)
      : null;
    ship.targetLocationId = ship.targetLocation?.id ?? null;
    ship.arrivalAt = new Date(Date.now() + warpTimeMs);
    ship.warpCooldown = 3;

    this.spacecraftRuntimeStateService.initialize(ship);

    if (!(await this.destructionService.saveUnlessDestroyed(ship))) {
      throw new BadRequestException('Ship is destroyed');
    }
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

  private consumeEps(ship: Spacecraft, amount: number, action: string): void {
    if (ship.energy < amount) {
      throw new BadRequestException(
        `Not enough EPS for ${action}: need ${amount}, have ${ship.energy}`,
      );
    }
    ship.energy -= amount;
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

  // Fleet management
  async createFleet(
    userId: number,
    name: string,
    leaderId: number,
  ): Promise<Fleet> {
    const leader = await this.findOne(leaderId, userId);
    if (leader.fleetId) {
      throw new BadRequestException('Ship already in a fleet');
    }

    const fleet = this.fleetRepo.create({ name, userId, leaderId });
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
    const fleet = await this.fleetRepo.findOne({
      where: { id: fleetId, userId },
    });
    if (!fleet) throw new NotFoundException('Fleet not found');

    const ship = await this.findOne(shipId, userId);
    if (ship.fleetId) {
      throw new BadRequestException('Ship already in a fleet');
    }

    ship.fleetId = fleetId;
    return this.shipRepo.save(ship);
  }

  async leaveFleet(userId: number, shipId: number): Promise<Spacecraft> {
    const ship = await this.findOne(shipId, userId);
    if (!ship.fleetId) {
      throw new BadRequestException('Ship not in a fleet');
    }

    const fleet = await this.fleetRepo.findOne({ where: { id: ship.fleetId } });
    ship.fleetId = null;

    // Dissolve fleet if leader leaves
    if (fleet && fleet.leaderId === shipId) {
      const members = await this.shipRepo.find({
        where: { fleetId: fleet.id },
      });
      for (const m of members) {
        if (m.id !== shipId) {
          m.fleetId = null;
          await this.shipRepo.save(m);
        }
      }
      await this.fleetRepo.remove(fleet);
    }

    return this.shipRepo.save(ship);
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
      const currentCanonicalLocation = await this.loadLocation(
        ship.locationId,
        ship.location,
      );
      const currentLocation = resolveSpaceLocation(currentCanonicalLocation);
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
          const targetField = targetLocation.systemField;
          const targetSystemId = targetField.starSystemId;
          const isWarpArrival =
            currentLocation?.scope !== 'SYSTEM' ||
            currentLocation.systemId !== targetSystemId;

          await this.setCurrentLocation(ship, targetLocation);

          await this.explorationService.discoverSystem({
            userId: ship.userId,
            starSystemId: targetSystemId,
            source: isWarpArrival ? 'WARP' : 'NAVIGATE',
          });
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

      ship.arrivalAt = null;
      ship.originLocationId = null;
      ship.originLocation = null;
      ship.targetLocationId = null;
      ship.targetLocation = null;
      ship.status = SpacecraftStatus.IDLE;

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
    if (!sameSpacecraftLocation(ship, target))
      throw new BadRequestException(
        'Ziel muss sich auf demselben Feld befinden',
      );
    ship.energy--;
    await this.shipRepo.save(ship);
    const discovery = await this.shipClassDiscoveryService.discover({
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
            relations: ['starSystem'],
          })
        : null;
    const colonizationCandidate =
      location?.scope === 'SYSTEM' && celestialObjectId != null
        ? await this.dataSource.getRepository(CelestialObject).findOne({
            where: { id: celestialObjectId, isColonizable: true },
          })
        : null;
    const abandonedColony = colonizationCandidate
      ? await this.dataSource.getRepository(Colony).findOne({
          where: {
            celestialObjectId: colonizationCandidate.id,
            isAbandoned: true,
          },
        })
      : null;
    const colonizationTarget = colony ? null : colonizationCandidate;
    return {
      coordinates: { x: location?.x ?? 0, y: location?.y ?? 0 },
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
      colony: colony
        ? {
            id: colony.id,
            name: colony.name,
            planetName: colony.celestialObject?.name ?? colony.name,
            isOwn: colony.userId === userId,
            canLand,
          }
        : null,
      information: {
        canSectorScan: systems.SHORT_RANGE_SENSORS?.active === true,
        cartographyKnown: cartography?.explored === true,
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
                getStuCelestialClass(colonizationTarget.classId)?.name ?? null,
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
    const [ships, wrecks] = await Promise.all([
      shipQuery.getMany(),
      wreckQuery.getMany(),
    ]);
    return {
      actionsAvailable: !hyperdriveActive,
      hyperdriveActive,
      ships: ships
        .filter((target) => target.id !== ship.id)
        .map((target) => {
          const targetSystems =
            this.spacecraftRuntimeStateService.initialize(target);
          const targetHyperdriveActive =
            targetSystems.WARPDRIVE?.active === true;
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
            inHyperspace:
              resolveSpacecraftLocation(target)?.scope === 'GALAXY' &&
              target.status === SpacecraftStatus.IDLE &&
              targetHyperdriveActive,
            actions: {
              attack:
                !hyperdriveActive &&
                !targetHyperdriveActive &&
                systems.WEAPONS?.active === true,
              scan: true,
              intercept:
                location.scope === 'GALAXY' &&
                resolveSpacecraftLocation(target)?.scope === 'GALAXY' &&
                targetHyperdriveActive &&
                ship.status === SpacecraftStatus.IDLE &&
                (systems.WARPDRIVE?.integrity ?? 0) > 0,
              contact:
                target.userId !== ship.userId &&
                (location.scope === 'SYSTEM' || !hyperdriveActive) &&
                (resolveSpacecraftLocation(target)?.scope === 'SYSTEM' ||
                  !targetHyperdriveActive),
              transfer:
                (location.scope === 'SYSTEM' || !hyperdriveActive) &&
                (resolveSpacecraftLocation(target)?.scope === 'SYSTEM' ||
                  !targetHyperdriveActive),
              energyTransfer: false,
              tractor: false,
              boarding: false,
            },
          };
        }),
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
      const starSystem =
        ship.location.systemField?.starSystem;

      const bounds = {
        minX: Math.max(1, shipX - sensorRange),
        maxX: Math.min(starSystem?.maxX ?? shipX, shipX + sensorRange),
        minY: Math.max(1, shipY - sensorRange),
        maxY: Math.min(starSystem?.maxY ?? shipY, shipY + sensorRange),
      };
      const [fields, nearbyShips, starObjects, wrecks] = await Promise.all([
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
      ]);

      return {
        mode: 'system' as const,
        shipX,
        shipY,
        sensorRange,
        bounds,
        systemId: location.systemId,
        systemName: starSystem?.name ?? null,
        systemTypeId: starSystem?.systemTypeId ?? null,
        stars: starObjects.map((star) => ({
          centerX: star.posX,
          centerY: star.posY,
          role: star.classId === 9002 ? 'secondary' : 'primary',
        })),
        fields: fields.map((f) => ({
          id: f.id,
          sx: f.sx,
          sy: f.sy,
          fieldType: {
            id: f.fieldType.id,
            key: f.fieldType.key,
            name: f.fieldType.name,
          },
          celestialObjectId: f.celestialObjectId,
          celestialObject: f.celestialObject
            ? {
                id: f.celestialObject.id,
                name: f.celestialObject.name,
                objectType: f.celestialObject.objectType,
                classId: f.celestialObject.classId,
                isColonizable: f.celestialObject.isColonizable,
                posX: f.celestialObject.posX,
                posY: f.celestialObject.posY,
              }
            : null,
        })),
        wrecks: wrecks
          .filter(
            (wreck) =>
              wreck.location?.systemField?.sx != null &&
              wreck.location.systemField.sy != null,
          )
          .map((wreck) => ({
            id: wreck.id,
            x: wreck.location!.systemField!.sx,
            y: wreck.location!.systemField!.sy,
            hull: wreck.hull,
            cargo: wreck.cargo,
          })),
        overlays: {
          signatures: this.countFieldSignatures(
            [ship, ...nearbyShips],
            (entry) => resolveSpacecraftLocation(entry)?.x ?? null,
            (entry) => resolveSpacecraftLocation(entry)?.y ?? null,
          ),
        },
        ships: nearbyShips.map((s) => ({
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
    const [fields, nearbyShips, wrecks] = await Promise.all([
      this.galaxyFieldRepo
        .createQueryBuilder('gf')
        .leftJoinAndSelect('gf.fieldType', 'ft')
        .leftJoinAndSelect('gf.starSystem', 'ss')
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

    const onSystemField = fields.find(
      (field) =>
        field.cx === location.x &&
        field.cy === location.y &&
        field.starSystemId != null,
    );

    return {
      mode: 'galaxy' as const,
      shipX: location.x,
      shipY: location.y,
      sensorRange,
      bounds,
      fields: fields.map((f) => ({
        id: f.id,
        cx: f.cx,
        cy: f.cy,
        fieldType: {
          id: f.fieldType.id,
          key: f.fieldType.key,
          name: f.fieldType.name,
        },
        starSystemId: f.starSystemId,
        systemTypeId: f.starSystem?.systemTypeId ?? null,
        starSystem: f.starSystem
          ? { id: f.starSystem.id, name: f.starSystem.name }
          : null,
        isPassable: f.isPassable,
      })),
      wrecks: wrecks
        .filter((wreck) => wreck.location?.galaxyField != null)
        .map((wreck) => ({
          id: wreck.id,
          x: wreck.location!.galaxyField!.cx,
          y: wreck.location!.galaxyField!.cy,
          hull: wreck.hull,
          cargo: wreck.cargo,
        })),
      overlays: {
        signatures: this.countFieldSignatures(
          [ship, ...nearbyShips],
          (entry) => resolveSpacecraftLocation(entry)?.x ?? null,
          (entry) => resolveSpacecraftLocation(entry)?.y ?? null,
        ),
      },
      ships: nearbyShips.map((s) => ({
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
        : {
            systemId: null,
            explored: false,
            progress: 0,
            surveyedFields: 0,
            totalFields: 0,
          };

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
          ? (ship.location?.systemField?.starSystem?.name ??
            null)
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

  async processTick(ship: Spacecraft): Promise<void> {
    await this.processMovement(ship);

    const [modules, shipClass] = await Promise.all([
      this.moduleRepo.find({ where: { spacecraftId: ship.id } }),
      this.shipClassService.findById(ship.shipClassId),
    ]);
    ship.modules = modules;
    this.spacecraftResourceFlowService.recharge(
      ship,
      shipClass?.flightEnergyCost ?? 1,
    );

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

    // Passive module repair (1% integrity per tick)
    for (const mod of modules) {
      if (mod.integrity < 100) {
        mod.integrity = Math.min(100, mod.integrity + 1);
        await this.moduleRepo.save(mod);
      }
      if (mod.cooldown > 0) {
        mod.cooldown--;
        await this.moduleRepo.save(mod);
      }
    }

    this.spacecraftRuntimeStateService.initialize(ship);

    await this.shipRepo.save(ship);
  }
}
