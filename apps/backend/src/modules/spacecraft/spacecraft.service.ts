import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Spacecraft, SpacecraftStatus } from './entities/spacecraft.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import { Fleet } from './entities/fleet.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { StarSystem } from '../starmap/entities/star-system.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { CelestialObject } from '../starmap/entities/celestial-object.entity';
import { GameDataService } from '../game-data/game-data.service';
import { ShipClassService } from './ship-class.service';

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
    private readonly gameData: GameDataService,
    private readonly shipClassService: ShipClassService,
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
    return this.shipRepo.findOneOrFail({
      where: { id: ship.id },
      relations: ['modules', 'fleet', 'starSystem'],
    });
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

  // In-system impulse: 1 EPS per field, 10s per field travel time
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

    const dx = Math.abs(targetX - ship.posX);
    const dy = Math.abs(targetY - ship.posY);
    const distance = Math.max(dx, dy);

    if (distance === 0) {
      throw new BadRequestException('Already at target position');
    }

    const energyCost = distance;
    if (ship.energy < energyCost) {
      throw new BadRequestException(
        `Not enough energy: need ${energyCost} EPS, have ${ship.energy}`,
      );
    }

    ship.energy -= energyCost;
    const travelTimeMs = distance * 10_000;

    ship.status = SpacecraftStatus.IN_FLIGHT;
    ship.targetX = targetX;
    ship.targetY = targetY;
    ship.arrivalAt = new Date(Date.now() + travelTimeMs);

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
        ship.starSystemId = ship.targetSystemId;
        ship.posX = 10;
        ship.posY = 10;
        ship.targetSystemId = null;
      } else if (ship.targetX !== null && ship.targetY !== null) {
        ship.posX = ship.targetX;
        ship.posY = ship.targetY;
      }

      ship.targetX = null;
      ship.targetY = null;
      ship.arrivalAt = null;
      ship.status = SpacecraftStatus.DOCKED;

      await this.shipRepo.save(ship);
    }
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
