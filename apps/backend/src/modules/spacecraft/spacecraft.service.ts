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
    private readonly gameData: GameDataService,
    private readonly shipClassService: ShipClassService,
    private readonly explorationService: ExplorationService,
  ) {}

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

  async getShipClasses(): Promise<ShipClassDef[]> {
    return this.shipClassService.findAll();
  }

  private async toShipSummary(ship: Spacecraft): Promise<Spacecraft> {
    const shipClass = await this.shipClassService.findById(ship.shipClassId);
    const moduleCount = await this.moduleRepo.count({
      where: { spacecraftId: ship.id },
    });

    return Object.assign(ship, {
      shipClassName: shipClass?.name || `Class ${ship.shipClassId}`,
      shipClassKey: shipClass?.key || null,
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

  async spawnStarterShip(
    userId: number,
    factionId: number,
    celestialObjectId: number,
  ): Promise<Spacecraft> {
    const existingStarter = await this.shipRepo.findOne({
      where: { userId, celestialObjectId },
      order: { id: 'ASC' },
    });
    if (existingStarter) {
      return existingStarter;
    }

    const shipClass =
      await this.shipClassService.findStarterByFactionId(factionId);
    if (!shipClass) {
      throw new NotFoundException('Starter ship class not found for faction');
    }

    const celestialObject = await this.objectRepo.findOneBy({
      id: celestialObjectId,
    });
    if (!celestialObject) {
      throw new NotFoundException('Celestial object not found');
    }

    const layer = await this.layerRepo.findOne({ where: { isDefault: true } });

    const ship = await this.shipRepo.save(
      this.shipRepo.create({
        name: shipClass.name,
        shipClassId: shipClass.id,
        userId,
        starSystemId: celestialObject.systemId,
        currentLayerId: layer?.id ?? null,
        celestialObjectId: celestialObject.id,
        inSystem: true,
        posX: celestialObject.posX,
        posY: celestialObject.posY,
        currentSystemFieldX: celestialObject.posX,
        currentSystemFieldY: celestialObject.posY,
        status: SpacecraftStatus.DOCKED,
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

    await this.installStarterModules(ship.id);
    await this.ensureStarterFleet(ship);
    const hydratedShip = await this.shipRepo.findOneOrFail({
      where: { id: ship.id },
      relations: ['modules', 'fleet', 'starSystem'],
    });
    const currentSystem = await this.systemRepo.findOneBy({
      id: celestialObject.systemId,
    });
    if (currentSystem) {
      await this.discoverGalaxyAroundShip(
        hydratedShip,
        currentSystem.layerId,
        currentSystem.cx,
        currentSystem.cy,
        'STARTER_SHIP',
      );
    }
    return hydratedShip;
  }

  private async installStarterModules(shipId: number): Promise<void> {
    const starterModules = [
      'Durastahl-Panzerung',
      'Standard-Deflektorschild',
      'Ion-Triebwerk',
      'Standard-Hyperantrieb',
      'Standard-Scanner',
      'Standard-Frachtraum',
      'Standard-Lebenserhaltung',
      'Leichter Turbolaser',
    ];

    for (const moduleType of starterModules) {
      const exists = await this.moduleRepo.findOne({
        where: { spacecraftId: shipId, moduleType },
      });
      if (exists) {
        continue;
      }

      const moduleDef = this.gameData
        .getAllModules()
        .find((module) => module.name === moduleType);
      if (!moduleDef) {
        continue;
      }

      await this.moduleRepo.save(
        this.moduleRepo.create({
          spacecraftId: shipId,
          moduleType,
          category: moduleDef.category,
          level: 1,
          integrity: 100,
          cooldown: 0,
          isActive: true,
        }),
      );
    }

    const ship = await this.shipRepo.findOneByOrFail({ id: shipId });
    await this.recalculateStats(ship);
  }

  private async ensureStarterFleet(ship: Spacecraft): Promise<void> {
    if (ship.fleetId) {
      return;
    }

    const existingFleet = await this.fleetRepo.findOne({
      where: { userId: ship.userId, leaderId: ship.id },
    });
    if (existingFleet) {
      ship.fleetId = existingFleet.id;
      await this.shipRepo.save(ship);
      return;
    }

    const fleet = await this.fleetRepo.save(
      this.fleetRepo.create({
        userId: ship.userId,
        leaderId: ship.id,
        name: `${ship.name} Fleet`,
      }),
    );

    ship.fleetId = fleet.id;
    await this.shipRepo.save(ship);
  }

  private async recalculateStats(ship: Spacecraft): Promise<void> {
    const modules = await this.moduleRepo.find({
      where: { spacecraftId: ship.id },
    });

    let hullBonus = 0;
    let shieldBonus = 0;
    let energyBonus = 0;

    for (const mod of modules) {
      if (!mod.isActive) continue;
      const def = this.gameData
        .getAllModules()
        .find((m) => m.name === mod.moduleType);
      if (!def) continue;

      const levelScale = 1 + (mod.level - 1) * 0.2;

      if (def.category === 'HULL') {
        const baseHull =
          (def.public as Record<string, number>).baseHullPoints || 0;
        hullBonus += Math.round(baseHull * levelScale);
      }
      if (def.category === 'SHIELDS') {
        const baseShield =
          (def.public as Record<string, number>).baseShieldPoints || 0;
        shieldBonus += Math.round(baseShield * levelScale);
      }
      if (def.category === 'ENGINES') {
        const baseEnergy =
          (def.public as Record<string, number>).baseEnergyOutput || 0;
        energyBonus += Math.round(baseEnergy * levelScale);
      }
    }

    ship.hullMax = 50 + hullBonus;
    ship.shieldsMax = 20 + shieldBonus;
    ship.energyMax = 50 + energyBonus;

    ship.hull = Math.min(ship.hull, ship.hullMax);
    ship.shields = Math.min(ship.shields, ship.shieldsMax);
    ship.energy = Math.min(ship.energy, ship.energyMax);

    await this.shipRepo.save(ship);
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
    if (ship.energy < energyCost) {
      throw new BadRequestException(
        `Not enough energy: need ${energyCost} EPS, have ${ship.energy}`,
      );
    }

    ship.energy -= energyCost;
    ship.currentSystemFieldX = targetX;
    ship.currentSystemFieldY = targetY;
    ship.targetX = null;
    ship.targetY = null;
    ship.arrivalAt = null;
    ship.status = SpacecraftStatus.DOCKED;

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

    const energyCost = distance * 5;
    if (ship.energy < energyCost) {
      throw new BadRequestException(
        `Not enough energy: need ${energyCost} EPS, have ${ship.energy}`,
      );
    }

    ship.energy -= energyCost;
    ship.posX = targetX;
    ship.posY = targetY;
    ship.targetX = null;
    ship.targetY = null;
    ship.targetSystemId = null;
    ship.arrivalAt = null;
    ship.status = SpacecraftStatus.DOCKED;

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

    const warpEnergyCost = galaxyDistance * ship.warpSpeed;
    if (ship.energy < warpEnergyCost) {
      throw new BadRequestException(
        `Not enough energy for warp: need ${warpEnergyCost}, have ${ship.energy}`,
      );
    }

    ship.energy -= warpEnergyCost;
    const warpTimeMs = galaxyDistance * 60_000;

    ship.status = SpacecraftStatus.IN_FLIGHT;
    ship.targetSystemId = targetSystemId;
    ship.arrivalAt = new Date(Date.now() + warpTimeMs);
    ship.warpCooldown = 3;

    return this.shipRepo.save(ship);
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
    const modules = await this.moduleRepo.find({
      where: { spacecraftId: ship.id },
    });
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

    if (ship.energy < ship.energyMax) {
      ship.energy = Math.min(ship.energy + 5, ship.energyMax);
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

    await this.shipRepo.save(ship);
  }
}
