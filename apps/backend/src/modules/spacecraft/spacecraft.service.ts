import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import {
  AlertState,
  Spacecraft,
  SpacecraftStatus,
} from './entities/spacecraft.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import { Fleet } from './entities/fleet.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { StarSystem } from '../starmap/entities/star-system.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { CelestialObject } from '../starmap/entities/celestial-object.entity';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { SystemField } from '../starmap/entities/system-field.entity';
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
  SpacecraftRuntimeStateService,
  SpacecraftRuntimeSystemKey,
} from './spacecraft-runtime-state.service';
import { GameGateway } from '../websocket/game.gateway';
import { WsEventType } from '@swuniverse/shared';
import { Colony } from '../colony/entities/colony.entity';

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
    @InjectRepository(Colony)
    private readonly colonyRepo: Repository<Colony>,
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
  ) {}

  async getTorpedoStorage(shipId: number, userId: number) {
    await this.findOne(shipId, userId);
    return this.spacecraftTorpedoService.getStorage(shipId);
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
  ) {
    const { ship, colony } = await this.getShipAndColonyForTransfer(
      shipId,
      userId,
      colonyId,
    );
    return this.spacecraftTorpedoService.unloadToColony(
      colony,
      ship,
      amount,
      colony.storageMax,
    );
  }

  private async getShipAndColonyForTransfer(
    shipId: number,
    userId: number,
    colonyId: number,
  ): Promise<{ ship: Spacecraft; colony: Colony }> {
    const ship = await this.findOne(shipId, userId);
    if (ship.status !== SpacecraftStatus.DOCKED) {
      throw new BadRequestException('Ship must be idle');
    }
    const colony = await this.colonyRepo.findOne({
      where: { id: colonyId, userId },
    });
    if (!colony) throw new NotFoundException('Colony not found');
    if (
      ship.starSystemId !== colony.starSystemId ||
      (colony.celestialObjectId != null &&
        ship.celestialObjectId !== colony.celestialObjectId)
    ) {
      throw new BadRequestException('Ship must be in colony orbit');
    }
    return { ship, colony };
  }

  async findAllByUser(userId: number): Promise<Spacecraft[]> {
    const ships = await this.shipRepo.find({
      where: { userId },
      relations: ['starSystem', 'fleet', 'celestialObject'],
      order: { id: 'ASC' },
    });
    return Promise.all(ships.map((ship) => this.toShipSummary(ship)));
  }

  async findOne(shipId: number, userId: number): Promise<Spacecraft> {
    const ship = await this.shipRepo.findOne({
      where: { id: shipId, userId },
      relations: ['starSystem', 'modules', 'fleet', 'celestialObject'],
    });
    if (!ship) throw new NotFoundException('Spacecraft not found');
    return this.toShipDetail(ship);
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
    const systems = this.spacecraftRuntimeStateService.initialize(ship);
    const system = systems[systemKey];
    if (!system) throw new BadRequestException(`Unknown system: ${systemKey}`);
    if (system.cooldown > 0) {
      throw new BadRequestException(`System ${systemKey} is on cooldown`);
    }
    if (active) {
      this.assertCrewForActivation(ship, systemKey);
    }
    systems[systemKey] = { ...system, active };
    ship.runtimeSystems = systems;
    await this.shipRepo.save(ship);
    this.gameGateway.emitToUser(ship.userId, WsEventType.SPACECRAFT_EVENT, {
      shipId: ship.id,
      type: 'SYSTEM_TOGGLED',
      detail: `${systemKey} ${active ? 'aktiviert' : 'deaktiviert'}`,
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
      detail: `Verteilung: EPS ${100 - ship.reactorWarpSplit}% / Warp ${ship.reactorWarpSplit}%`,
    });
    return { reactorWarpSplit: ship.reactorWarpSplit };
  }

  async manualRecharge(
    shipId: number,
    userId: number,
  ): Promise<{ energy: number; warpdrive: number; battery: number }> {
    const ship = await this.findOne(shipId, userId);
    this.spacecraftResourceFlowService.recharge(ship);
    await this.shipRepo.save(ship);
    this.gameGateway.emitToUser(ship.userId, WsEventType.SPACECRAFT_EVENT, {
      shipId: ship.id,
      type: 'RECHARGE',
      detail: `EPS ${ship.energy}, Warp ${ship.warpdrive}, Bat ${ship.battery}`,
    });
    return { energy: ship.energy, warpdrive: ship.warpdrive, battery: ship.battery };
  }

  private assertCrewForActivation(
    ship: Spacecraft,
    systemKey: SpacecraftRuntimeSystemKey,
  ): void {
    const modules = ship.modules ?? [];
    const category = this.systemKeyToCategory(systemKey);
    if (!category) return;

    const modulesForSystem = modules.filter(
      (m) => m.category === category && m.isActive && m.integrity > 0,
    );
    if (modulesForSystem.length === 0) return;

    const crewNeeded = this.getActiveCrewDemand(modules, systemKey);
    if (crewNeeded > ship.crew) {
      throw new BadRequestException(
        `Not enough crew to activate ${systemKey}: need ${crewNeeded}, have ${ship.crew}`,
      );
    }
  }

  private getActiveCrewDemand(
    modules: SpacecraftModule[],
    activatingKey: SpacecraftRuntimeSystemKey,
  ): number {
    let total = 0;
    for (const mod of modules) {
      if (!mod.isActive || mod.integrity <= 0) continue;
      const def = this.gameData
        .getAllModules()
        .find((d) => d.name === mod.moduleType);
      const crew =
        (def?.public as Record<string, number>)?.baseCrewCapacity ?? 0;
      total += crew;
    }
    const activatingCategory = this.systemKeyToCategory(activatingKey);
    if (activatingCategory) {
      for (const mod of modules) {
        if (mod.category !== activatingCategory) continue;
        if (mod.isActive || mod.integrity <= 0) continue;
        const def = this.gameData
          .getAllModules()
          .find((d) => d.name === mod.moduleType);
        const crew =
          (def?.public as Record<string, number>)?.baseCrewCapacity ?? 0;
        total += crew;
      }
    }
    return total;
  }

  private systemKeyToCategory(
    key: SpacecraftRuntimeSystemKey,
  ): string | null {
    const map: Partial<Record<SpacecraftRuntimeSystemKey, string>> = {
      SHIELDS: 'SHIELDS',
      WEAPONS: 'WEAPONS',
      TORPEDO_BANK: 'PROJECTILE',
      SENSORS: 'SENSORS',
      COMPUTER: 'COMPUTER',
      SUBLIGHT_DRIVE: 'SUBLIGHT_ENGINE',
      WARPDRIVE: 'HYPERDRIVE',
      REACTOR: 'SPECIAL',
      EPS: 'SPECIAL',
    };
    return map[key] ?? null;
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

  async getModules(
    shipId: number,
    userId: number,
  ): Promise<SpacecraftModule[]> {
    await this.findOne(shipId, userId);
    return this.moduleRepo.find({ where: { spacecraftId: shipId } });
  }

  async surfaceScan(
    shipId: number,
    userId: number,
    celestialObjectId: number,
  ): Promise<{ celestialObjectId: number; created: number }> {
    const ship = await this.shipRepo.findOne({
      where: { id: shipId, userId },
      relations: ['modules'],
    });
    if (!ship) throw new NotFoundException('Spacecraft not found');
    if (!ship.inSystem || !ship.starSystemId) {
      throw new BadRequestException(
        'Surface scan requires ship inside a system',
      );
    }
    if (!this.hasSurfaceScanner(ship.modules ?? [])) {
      throw new BadRequestException('Matrixsensoren module required');
    }

    const object = await this.objectRepo.findOneBy({ id: celestialObjectId });
    if (!object) throw new NotFoundException('Celestial object not found');
    if (object.systemId !== ship.starSystemId) {
      throw new BadRequestException(
        'Celestial object is not in current system',
      );
    }
    if (!supportsStuSurface(object.classId)) {
      throw new BadRequestException(
        'Celestial object has no scannable surface',
      );
    }

    const shipX = ship.currentSystemFieldX ?? ship.posX;
    const shipY = ship.currentSystemFieldY ?? ship.posY;
    const range = await this.getSensorRange(ship);
    const distance = Math.max(
      Math.abs(object.posX - shipX),
      Math.abs(object.posY - shipY),
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
        buildCosts?: Array<{ commodityId: number; amount: number; name: string }>;
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
        ship.celestialObject?.name || ship.starSystem?.name || 'Deep Space',
      moduleCount,
      fleetName: ship.fleet?.name || null,
    });
  }

  private async toShipDetail(ship: Spacecraft): Promise<Spacecraft> {
    const withSummary = await this.toShipSummary(ship);
    return Object.assign(withSummary, {
      moduleCategories: ship.modules?.map((module) => module.category) || [],
    });
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

  async adminSpawnShip(
    userId: number,
    shipClassId: number,
    name: string,
    layerId: number,
    posX: number,
    posY: number,
  ): Promise<Spacecraft> {
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

    const shipName = name.trim() || shipClass.name;
    const ship = await this.shipRepo.save(
      this.shipRepo.create({
        name: shipName,
        shipClassId: shipClass.id,
        userId: user.id,
        starSystemId: galaxyField.starSystemId,
        currentLayerId: layer.id,
        celestialObjectId: null,
        inSystem: false,
        currentSystemFieldX: null,
        currentSystemFieldY: null,
        posX,
        posY,
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
      }),
    );

    const hydratedShip = await this.shipRepo.findOneOrFail({
      where: { id: ship.id },
      relations: ['modules', 'fleet', 'starSystem', 'celestialObject'],
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

  private async recalculateStats(ship: Spacecraft): Promise<void> {
    const [modules, shipClass] = await Promise.all([
      this.moduleRepo.find({ where: { spacecraftId: ship.id } }),
      this.shipClassService.findById(ship.shipClassId),
    ]);
    if (!shipClass) return;
    this.spacecraftStatsService.applyStats(ship, shipClass, modules);
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

    if (ship.status === SpacecraftStatus.IN_COMBAT) {
      throw new BadRequestException('Cannot navigate during combat');
    }
    if (ship.status === SpacecraftStatus.DESTROYED) {
      throw new BadRequestException('Ship is destroyed');
    }
    if (ship.status === SpacecraftStatus.IN_FLIGHT) {
      throw new BadRequestException('Ship already in flight');
    }
    if (!ship.inSystem) {
      throw new BadRequestException(
        'Ship is not in a system. Use galaxy flight instead.',
      );
    }
    if (!ship.starSystemId) {
      throw new BadRequestException('Ship has no current system');
    }
    await this.assertEnoughCrew(ship);
    this.assertSystemsForFlight(ship, 'sublight');

    const system = await this.systemRepo.findOne({
      where: { id: ship.starSystemId },
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
      where: { starSystemId: ship.starSystemId, sx: targetX, sy: targetY },
    });
    if (targetField && !targetField.isPassable) {
      throw new BadRequestException('Target field is not passable');
    }

    const startX = ship.currentSystemFieldX ?? 1;
    const startY = ship.currentSystemFieldY ?? 1;
    const dx = Math.abs(targetX - startX);
    const dy = Math.abs(targetY - startY);

    if (dx > 0 && dy > 0) {
      throw new BadRequestException(
        'Only orthogonal movement allowed (horizontal or vertical)',
      );
    }

    const distance = dx + dy;

    if (distance === 0) {
      throw new BadRequestException('Already at target position');
    }

    const energyCost = distance * 5;
    this.consumeEps(ship, energyCost, 'navigation');

    ship.currentSystemFieldX = targetX;
    ship.currentSystemFieldY = targetY;
    ship.targetX = null;
    ship.targetY = null;
    ship.arrivalAt = null;
    ship.status = SpacecraftStatus.DOCKED;

    this.spacecraftRuntimeStateService.initialize(ship);

    await this.shipRepo.save(ship);

    await this.explorationService.discoverSystem({
      userId: ship.userId,
      starSystemId: ship.starSystemId,
      source: 'NAVIGATE',
    });

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

    if (ship.status === SpacecraftStatus.IN_COMBAT) {
      throw new BadRequestException('Cannot fly during combat');
    }
    if (ship.status === SpacecraftStatus.DESTROYED) {
      throw new BadRequestException('Ship is destroyed');
    }
    if (ship.status === SpacecraftStatus.IN_FLIGHT) {
      throw new BadRequestException('Ship already in flight');
    }
    if (ship.inSystem) {
      throw new BadRequestException(
        'Ship is inside a system. Leave system first.',
      );
    }
    if (!ship.currentLayerId) {
      throw new BadRequestException('Ship has no current layer');
    }
    await this.assertEnoughCrew(ship);
    this.assertSystemsForFlight(ship, 'warp');

    const targetField = await this.galaxyFieldRepo.findOne({
      where: { layerId: ship.currentLayerId, cx: targetX, cy: targetY },
    });
    if (!targetField) {
      throw new BadRequestException('Target galaxy field does not exist');
    }
    if (!targetField.isPassable) {
      throw new BadRequestException('Target galaxy field is not passable');
    }

    const dx = Math.abs(targetX - ship.posX);
    const dy = Math.abs(targetY - ship.posY);

    if (dx > 0 && dy > 0) {
      throw new BadRequestException(
        'Only orthogonal movement allowed (horizontal or vertical)',
      );
    }

    const distance = dx + dy;

    if (distance === 0) {
      throw new BadRequestException('Already at target position');
    }

    const warpdriveCost = distance;
    this.consumeWarpdrive(ship, warpdriveCost, 'galaxy flight');

    ship.posX = targetX;
    ship.posY = targetY;
    ship.targetX = null;
    ship.targetY = null;
    ship.targetSystemId = null;
    ship.arrivalAt = null;
    ship.status = SpacecraftStatus.DOCKED;

    this.spacecraftRuntimeStateService.initialize(ship);

    await this.shipRepo.save(ship);

    await this.discoverGalaxyAroundShip(
      ship,
      ship.currentLayerId,
      targetX,
      targetY,
      'FLIGHT',
    );

    return this.findOne(ship.id, userId);
  }

  // Enter a star system from the galaxy map
  async enterSystem(shipId: number, userId: number): Promise<Spacecraft> {
    const ship = await this.findOne(shipId, userId);

    if (ship.status === SpacecraftStatus.IN_COMBAT) {
      throw new BadRequestException('Cannot enter system during combat');
    }
    if (ship.status === SpacecraftStatus.DESTROYED) {
      throw new BadRequestException('Ship is destroyed');
    }
    if (ship.status === SpacecraftStatus.IN_FLIGHT) {
      throw new BadRequestException('Ship is in flight');
    }
    if (ship.inSystem) {
      throw new BadRequestException('Ship is already in a system');
    }
    if (!ship.currentLayerId) {
      throw new BadRequestException('Ship has no current layer');
    }
    await this.assertEnoughCrew(ship);

    const galaxyField = await this.galaxyFieldRepo.findOne({
      where: { layerId: ship.currentLayerId, cx: ship.posX, cy: ship.posY },
    });
    if (!galaxyField || !galaxyField.starSystemId) {
      throw new BadRequestException(
        'No star system at current galaxy position',
      );
    }

    ship.inSystem = true;
    ship.starSystemId = galaxyField.starSystemId;
    ship.currentSystemFieldX = 1;
    ship.currentSystemFieldY = 1;
    ship.status = SpacecraftStatus.DOCKED;

    await this.shipRepo.save(ship);

    await this.explorationService.discoverSystem({
      userId,
      starSystemId: galaxyField.starSystemId,
      source: 'ENTER',
    });

    return ship;
  }

  // Leave a star system back to the galaxy map
  async leaveSystem(shipId: number, userId: number): Promise<Spacecraft> {
    const ship = await this.findOne(shipId, userId);

    if (ship.status === SpacecraftStatus.DESTROYED) {
      throw new BadRequestException('Ship is destroyed');
    }
    if (ship.status === SpacecraftStatus.IN_FLIGHT) {
      throw new BadRequestException('Ship is in flight');
    }
    if (ship.status === SpacecraftStatus.IN_COMBAT) {
      throw new BadRequestException('Cannot leave system during combat');
    }
    if (!ship.inSystem) {
      throw new BadRequestException('Ship is not in a system');
    }
    if (ship.status !== SpacecraftStatus.DOCKED) {
      throw new BadRequestException('Ship must be docked to leave system');
    }
    if (!ship.starSystemId) {
      throw new BadRequestException('Ship has no current system');
    }
    await this.assertEnoughCrew(ship);

    // Get galaxy coordinates from the star system
    const system = await this.systemRepo.findOne({
      where: { id: ship.starSystemId },
    });
    if (!system) {
      throw new NotFoundException('Current star system not found');
    }

    ship.inSystem = false;
    ship.currentSystemFieldX = null;
    ship.currentSystemFieldY = null;
    ship.starSystemId = null;
    ship.celestialObjectId = null;
    ship.posX = system.cx;
    ship.posY = system.cy;
    ship.currentLayerId = system.layerId;
    ship.status = SpacecraftStatus.DOCKED;

    return this.shipRepo.save(ship);
  }

  // Inter-system warp: 1 WE per galaxy-grid field, 60s per field
  async warp(
    shipId: number,
    userId: number,
    targetSystemId: number,
  ): Promise<Spacecraft> {
    const ship = await this.findOne(shipId, userId);

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
      throw new BadRequestException('Warp drive cooling down');
    }
    if (!ship.starSystemId) {
      throw new BadRequestException('Ship has no current system');
    }
    await this.assertEnoughCrew(ship);
    this.assertSystemsForFlight(ship, 'warp');

    const currentSystem = await this.systemRepo.findOne({
      where: { id: ship.starSystemId },
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
    ship.targetSystemId = targetSystemId;
    ship.arrivalAt = new Date(Date.now() + warpTimeMs);
    ship.warpCooldown = 3;

    this.spacecraftRuntimeStateService.initialize(ship);

    return this.shipRepo.save(ship);
  }

  private assertSystemsForFlight(
    ship: Spacecraft,
    mode: 'sublight' | 'warp',
  ): void {
    const systems = this.spacecraftRuntimeStateService.getSystems(ship);
    const errors: string[] = [];

    if (mode === 'sublight') {
      if (systems.SUBLIGHT_DRIVE?.active === false) {
        errors.push('Sublight drive offline');
      }
      if (systems.COMPUTER?.active === false) {
        errors.push('Navigation computer offline');
      }
    }

    if (mode === 'warp') {
      if (systems.WARPDRIVE?.active === false) {
        errors.push('Warp drive offline');
      }
      if (systems.COMPUTER?.active === false) {
        errors.push('Navigation computer offline');
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors.join('; '));
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

  private consumeWarpdrive(ship: Spacecraft, amount: number, action: string): void {
    if (ship.warpdrive < amount) {
      throw new BadRequestException(
        `Not enough warpdrive for ${action}: need ${amount}, have ${ship.warpdrive}`,
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
      if (ship.targetSystemId) {
        // Warp arrival: enter target system
        const targetSystem = await this.systemRepo.findOne({
          where: { id: ship.targetSystemId },
        });
        ship.starSystemId = ship.targetSystemId;
        ship.inSystem = true;
        ship.currentSystemFieldX = 1;
        ship.currentSystemFieldY = 1;
        ship.posX = targetSystem?.cx ?? ship.posX;
        ship.posY = targetSystem?.cy ?? ship.posY;
        ship.currentLayerId = targetSystem?.layerId ?? ship.currentLayerId;
        ship.targetSystemId = null;

        if (targetSystem) {
          await this.explorationService.discoverSystem({
            userId: ship.userId,
            starSystemId: targetSystem.id,
            source: 'WARP',
          });
        }
      } else if (ship.targetX !== null && ship.targetY !== null) {
        if (ship.inSystem) {
          // In-system navigation arrival
          ship.currentSystemFieldX = ship.targetX;
          ship.currentSystemFieldY = ship.targetY;

          if (ship.starSystemId) {
            await this.explorationService.discoverSystem({
              userId: ship.userId,
              starSystemId: ship.starSystemId,
              source: 'NAVIGATE',
            });
          }
        } else {
          // Galaxy flight arrival
          ship.posX = ship.targetX;
          ship.posY = ship.targetY;

          if (ship.currentLayerId) {
            await this.discoverGalaxyAroundShip(
              ship,
              ship.currentLayerId,
              ship.targetX,
              ship.targetY,
              'FLIGHT',
            );
          }
        }
      }

      ship.targetX = null;
      ship.targetY = null;
      ship.arrivalAt = null;
      ship.status = SpacecraftStatus.DOCKED;

      await this.shipRepo.save(ship);
    }
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
    return maxRange;
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

  async getLocalMap(shipId: number, userId: number) {
    const ship = await this.shipRepo.findOne({
      where: { id: shipId, userId },
      relations: ['starSystem'],
    });
    if (!ship) throw new NotFoundException('Spacecraft not found');
    const sensorRange = await this.getSensorRange(ship);

    if (ship.inSystem && ship.starSystemId) {
      const shipX = ship.currentSystemFieldX ?? 1;
      const shipY = ship.currentSystemFieldY ?? 1;

      const [fields, nearbyShips] = await Promise.all([
        this.systemFieldRepo
          .createQueryBuilder('sf')
          .leftJoinAndSelect('sf.fieldType', 'ft')
          .leftJoinAndSelect('sf.celestialObject', 'co')
          .where('sf.starSystemId = :sid', { sid: ship.starSystemId })
          .andWhere('sf.sx BETWEEN :minX AND :maxX', {
            minX: shipX - sensorRange,
            maxX: shipX + sensorRange,
          })
          .andWhere('sf.sy BETWEEN :minY AND :maxY', {
            minY: shipY - sensorRange,
            maxY: shipY + sensorRange,
          })
          .getMany(),
        this.shipRepo
          .createQueryBuilder('s')
          .leftJoin('s.user', 'u')
          .addSelect(['u.username'])
          .where('s.starSystemId = :sid', { sid: ship.starSystemId })
          .andWhere('s.inSystem = true')
          .andWhere('s.id != :shipId', { shipId: ship.id })
          .andWhere('s.status != :destroyed', {
            destroyed: SpacecraftStatus.DESTROYED,
          })
          .andWhere('s.currentSystemFieldX BETWEEN :minX AND :maxX', {
            minX: shipX - sensorRange,
            maxX: shipX + sensorRange,
          })
          .andWhere('s.currentSystemFieldY BETWEEN :minY AND :maxY', {
            minY: shipY - sensorRange,
            maxY: shipY + sensorRange,
          })
          .getMany(),
      ]);

      return {
        mode: 'system' as const,
        shipX,
        shipY,
        sensorRange,
        systemId: ship.starSystemId,
        systemName: ship.starSystem?.name ?? null,
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
        ships: nearbyShips.map((s) => ({
          id: s.id,
          name: s.name,
          userId: s.userId,
          username: s.user?.username ?? null,
          shipClassId: s.shipClassId,
          posX: s.currentSystemFieldX,
          posY: s.currentSystemFieldY,
          status: s.status,
          onSameField:
            s.currentSystemFieldX === shipX && s.currentSystemFieldY === shipY,
        })),
        canEnterSystem: false,
        canLeaveSystem: ship.status === SpacecraftStatus.DOCKED,
        context: await this.buildLocalMapContext({
          ship,
          layerId: ship.currentLayerId,
          cx: ship.starSystem?.cx ?? null,
          cy: ship.starSystem?.cy ?? null,
          localX: shipX,
          localY: shipY,
          sensorRange,
          visibleFields: [],
        }),
      };
    }

    const [fields, nearbyShips] = await Promise.all([
      this.galaxyFieldRepo
        .createQueryBuilder('gf')
        .leftJoinAndSelect('gf.fieldType', 'ft')
        .leftJoinAndSelect('gf.starSystem', 'ss')
        .where('gf.layerId = :lid', { lid: ship.currentLayerId })
        .andWhere('gf.cx BETWEEN :minX AND :maxX', {
          minX: ship.posX - sensorRange,
          maxX: ship.posX + sensorRange,
        })
        .andWhere('gf.cy BETWEEN :minY AND :maxY', {
          minY: ship.posY - sensorRange,
          maxY: ship.posY + sensorRange,
        })
        .getMany(),
      this.shipRepo
        .createQueryBuilder('s')
        .leftJoin('s.user', 'u')
        .addSelect(['u.username'])
        .where('s.currentLayerId = :lid', { lid: ship.currentLayerId })
        .andWhere('s.inSystem = false')
        .andWhere('s.id != :shipId', { shipId: ship.id })
        .andWhere('s.status != :destroyed', {
          destroyed: SpacecraftStatus.DESTROYED,
        })
        .andWhere('s.posX BETWEEN :minX AND :maxX', {
          minX: ship.posX - sensorRange,
          maxX: ship.posX + sensorRange,
        })
        .andWhere('s.posY BETWEEN :minY AND :maxY', {
          minY: ship.posY - sensorRange,
          maxY: ship.posY + sensorRange,
        })
        .getMany(),
    ]);

    const onSystemField = fields.find(
      (f) => f.cx === ship.posX && f.cy === ship.posY && f.starSystemId,
    );

    return {
      mode: 'galaxy' as const,
      shipX: ship.posX,
      shipY: ship.posY,
      sensorRange,
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
        starSystem: f.starSystem
          ? { id: f.starSystem.id, name: f.starSystem.name }
          : null,
        isPassable: f.isPassable,
      })),
      ships: nearbyShips.map((s) => ({
        id: s.id,
        name: s.name,
        userId: s.userId,
        username: s.user?.username ?? null,
        shipClassId: s.shipClassId,
        posX: s.posX,
        posY: s.posY,
        status: s.status,
        onSameField: s.posX === ship.posX && s.posY === ship.posY,
      })),
      canEnterSystem:
        Boolean(onSystemField) && ship.status === SpacecraftStatus.DOCKED,
      canLeaveSystem: false,
      context: await this.buildLocalMapContext({
        ship,
        layerId: ship.currentLayerId,
        cx: ship.posX,
        cy: ship.posY,
        localX: ship.posX,
        localY: ship.posY,
        sensorRange,
        visibleFields: fields,
      }),
    };
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
        ship.starSystem?.name ?? currentField?.starSystem?.name ?? null,
      nearestSystem: nearestSystemField?.starSystem
        ? {
            id: nearestSystemField.starSystem.id,
            name: nearestSystemField.starSystem.name,
            cx: nearestSystemField.starSystem.cx,
            cy: nearestSystemField.starSystem.cy,
          }
        : null,
      nearbyRouteNames: [] as string[],
    };
  }

  async processTick(ship: Spacecraft): Promise<void> {
    await this.processMovement(ship);

    this.spacecraftResourceFlowService.recharge(ship);

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
    const modules = await this.moduleRepo.find({
      where: { spacecraftId: ship.id },
    });
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
