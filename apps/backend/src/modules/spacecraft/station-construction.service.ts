import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Faction,
  FieldEffect,
  type StationExpansionOptionDto,
} from '@swuniverse/shared';
import { DataSource, EntityManager } from 'typeorm';
import { GameDataService, type ShipClassYamlDef } from '../game-data/game-data.service';
import { FieldEffectQuery } from '../starmap/field-effect-query';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { CargoItem } from './entities/cargo-item.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import {
  AlertState,
  Spacecraft,
  SpacecraftKind,
  SpacecraftOperatingMode,
  SpacecraftStatus,
  StationRole,
} from './entities/spacecraft.entity';

const BUILDING_MATERIALS_ID = 2;
const DURANIUM_ID = 21;
const WORKBEE_COMMODITY_IDS = [20061, 20062, 20063, 20064, 20065];
const WORKBEE_COUNT = 5;
const CONSTRUCTION_LIMIT = 2;

@Injectable()
export class StationConstructionService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly gameData?: GameDataService,
    private readonly fieldEffectQuery: FieldEffectQuery = new FieldEffectQuery(),
  ) {}

  async build(shipId: number, userId: number) {
    return this.dataSource.transaction(async (manager) => {
      const shipRepo = manager.getRepository(Spacecraft);
      const ship = await shipRepo.findOne({
        where: { id: shipId, userId },
        relations: [
          'location',
          'location.systemField',
          'location.systemField.fieldType',
          'location.systemField.starSystem',
          'location.galaxyField',
          'location.galaxyField.fieldType',
          'user',
        ],
        lock: { mode: 'pessimistic_write', tables: ['spacecraft'] },
      });
      if (!ship) throw new NotFoundException('Spacecraft not found');
      this.assertShipCanBuild(ship);
      if (this.isWormhole(ship)) {
        throw new BadRequestException('In Wurmlöchern können keine Stationen errichtet werden');
      }
      if (this.fieldBlocksConstruction(ship)) {
        throw new BadRequestException('In diesem Sektor kann keine Station errichtet werden');
      }
      const stations = await shipRepo.find({
        where: { locationId: ship.locationId, kind: SpacecraftKind.STATION },
      });
      if (stations.length > 0) {
        throw new BadRequestException('Hier ist bereits eine Station errichtet');
      }
      if (
        (await shipRepo.countBy({
          userId,
          kind: SpacecraftKind.STATION,
          stationRole: StationRole.CONSTRUCTION,
        })) >= CONSTRUCTION_LIMIT
      ) {
        throw new BadRequestException('Es können nur 2 Konstrukte errichtet werden');
      }

      const classRepo = manager.getRepository(ShipClassDef);
      const factionPrefix = ship.user?.faction === Faction.GALACTIC_EMPIRE ? 'EMPIRE' : 'REBEL';
      const workbeeClass = await classRepo.findOneBy({ key: `${factionPrefix}_WORKBEE_DROID` });
      const constructionClass = await classRepo.findOneBy({ key: `${factionPrefix}_CONSTRUCTION` });
      if (!workbeeClass || !constructionClass) {
        throw new BadRequestException('Stationsklassen sind nicht verfügbar');
      }

      const cargoRepo = manager.getRepository(CargoItem);
      const cargo = await cargoRepo.find({ where: { spacecraftId: ship.id } });
      const workbeeCargo = cargo.filter((item) => WORKBEE_COMMODITY_IDS.includes(item.commodityId));
      if (workbeeCargo.reduce((sum, item) => sum + item.amount, 0) < WORKBEE_COUNT) {
        throw new BadRequestException('Es werden 5 Workbees im Lager benötigt');
      }
      this.requireCargo(cargo, BUILDING_MATERIALS_ID, 100, '100 Doonium werden benötigt');
      this.requireCargo(cargo, DURANIUM_ID, 50, '50 Durastahl-Legierung werden benötigt');
      const energyCost = workbeeClass.epsBase * WORKBEE_COUNT;
      if (ship.energy < energyCost) {
        throw new BadRequestException(`Es wird insgesamt ${energyCost} Energie für den Start der 5 Workbees benötigt`);
      }
      const requiredCrew = workbeeClass.crewMin * WORKBEE_COUNT;
      const assignedCrew = await manager.getRepository(CrewAssignment).find({
        where: { spacecraftId: ship.id },
      });
      const excessCrew = Math.max(0, assignedCrew.length - ship.crewRequired);
      if (excessCrew < requiredCrew) {
        throw new BadRequestException(`Nicht genügend Crew für den Start der 5 Workbees vorhanden, benötigt wird ${requiredCrew}`);
      }

      ship.energy -= energyCost;
      await shipRepo.save(ship);
      this.consumeCargo(cargo, BUILDING_MATERIALS_ID, 100);
      this.consumeCargo(cargo, DURANIUM_ID, 50);
      this.consumeWorkbees(workbeeCargo, WORKBEE_COUNT);
      await cargoRepo.save(cargo.filter((item) => item.amount >= 0));

      const station = await shipRepo.save(
        shipRepo.create({
          name: 'Konstrukt',
          shipClassId: constructionClass.id,
          userId,
          locationId: ship.locationId,
          location: ship.location,
          kind: SpacecraftKind.STATION,
          stationRole: StationRole.CONSTRUCTION,
          dockCapacity: 50,
          status: SpacecraftStatus.IDLE,
          alertState: AlertState.GREEN,
          operatingMode: SpacecraftOperatingMode.NORMAL,
          hull: constructionClass.hullBase,
          hullMax: constructionClass.hullBase,
          shields: 0,
          shieldsMax: constructionClass.shieldBase,
          energy: 0,
          energyMax: constructionClass.epsBase,
          crew: 0,
          crewMax: constructionClass.crewMax,
          cargoUsed: 0,
          cargoMax: constructionClass.cargoCapacity,
          battery: 0,
          batteryMax: constructionClass.batteryBase,
          reactorFuel: 0,
          reactorFuelMax: constructionClass.reactorBase * 10,
          warpSpeed: 0,
          warpdrive: 0,
          warpdriveMax: 0,
          runtimeSystems: {},
        }),
      );

      const workbees: Spacecraft[] = [];
      for (let index = 0; index < WORKBEE_COUNT; index++) {
        workbees.push(
          await shipRepo.save(
            shipRepo.create({
              name: `${workbeeClass.name} ${index + 1}`,
              shipClassId: workbeeClass.id,
              userId,
              locationId: ship.locationId,
              location: ship.location,
              kind: SpacecraftKind.SHIP,
              stationRole: null,
              dockedAtId: station.id,
              dockCapacity: 0,
              status: SpacecraftStatus.IDLE,
              alertState: AlertState.GREEN,
              operatingMode: SpacecraftOperatingMode.NORMAL,
              hull: workbeeClass.hullBase,
              hullMax: workbeeClass.hullBase,
              shields: 0,
              shieldsMax: workbeeClass.shieldBase,
              energy: workbeeClass.epsBase,
              energyMax: workbeeClass.epsBase,
              crew: workbeeClass.crewMin,
              crewMax: workbeeClass.crewMax,
              cargoUsed: 0,
              cargoMax: workbeeClass.cargoCapacity,
              battery: workbeeClass.batteryBase,
              batteryMax: workbeeClass.batteryBase,
              reactorFuel: workbeeClass.reactorBase * 10,
              reactorFuelMax: workbeeClass.reactorBase * 10,
              warpSpeed: 0,
              warpdrive: 0,
              warpdriveMax: 0,
              runtimeSystems: {},
            }),
          ),
        );
      }
      await this.transferCrew(manager, assignedCrew, workbees, requiredCrew);
      return { station, workbees };
    });
  }

  async getExpansionOptions(
    stationId: number,
    userId: number,
  ): Promise<StationExpansionOptionDto[]> {
    return this.dataSource.transaction(async (manager) => {
      const station = await this.findConstruction(manager, stationId, userId);
      const prefix = this.factionPrefix(station);
      const classes = await manager.getRepository(ShipClassDef).find({
        where: { category: 'STATION' },
        order: { id: 'ASC' },
      });
      const available = classes.filter(
        (shipClass) =>
          shipClass.key.startsWith(`${prefix}_`) &&
          shipClass.role !== StationRole.CONSTRUCTION,
      );
      const [cargo, workbees] = await Promise.all([
        manager.getRepository(CargoItem).find({ where: { spacecraftId: station.id } }),
        this.getDockedWorkbees(manager, station.id),
      ]);
      return Promise.all(
        available.map((shipClass) =>
          this.toExpansionOption(manager, station, shipClass, cargo, workbees.length),
        ),
      );
    });
  }

  async expand(
    stationId: number,
    userId: number,
    classKey: string,
  ): Promise<Spacecraft> {
    return this.dataSource.transaction(async (manager) => {
      const station = await this.findConstruction(manager, stationId, userId, true);
      const prefix = this.factionPrefix(station);
      if (!classKey.startsWith(`${prefix}_`)) {
        throw new BadRequestException('Stationsklasse gehört nicht zur eigenen Fraktion');
      }
      const shipClass = await manager.getRepository(ShipClassDef).findOneBy({ key: classKey });
      if (!shipClass || shipClass.category !== 'STATION' || shipClass.role === StationRole.CONSTRUCTION) {
        throw new BadRequestException('Stationsklasse ist nicht verfügbar');
      }
      const [cargo, workbees] = await Promise.all([
        manager.getRepository(CargoItem).find({ where: { spacecraftId: station.id } }),
        this.getDockedWorkbees(manager, station.id),
      ]);
      const option = await this.toExpansionOption(
        manager,
        station,
        shipClass,
        cargo,
        workbees.length,
      );
      if (!option.location.allowed) {
        throw new BadRequestException(
          `Diese Station kann ${this.locationMessage(option.location.rule)} errichtet werden`,
        );
      }
      if (option.limit.reached) throw new BadRequestException('Stationslimit erreicht');
      if (!option.workbees.sufficient) throw new BadRequestException('Nicht genügend Workbees angedockt');
      const missing = option.modules.find((module) => !module.sufficient);
      if (missing) throw new BadRequestException(`Nicht genügend ${missing.name} geladen`);

      for (const cost of option.modules) {
        this.consumeCargo(cargo, cost.commodityId, cost.required);
      }
      if (option.modules.length > 0) {
        await manager.getRepository(CargoItem).save(cargo);
      }
      station.name = `${shipClass.name} im Bau`;
      station.shipClassId = shipClass.id;
      station.stationRole = shipClass.role as StationRole;
      station.status = SpacecraftStatus.UNDER_CONSTRUCTION;
      station.constructionTicksRemaining = shipClass.buildTimeTicks;
      station.hullMax = shipClass.hullBase;
      station.hull = Math.floor(shipClass.hullBase / 2);
      return manager.getRepository(Spacecraft).save(station);
    });
  }

  async processTick(stationId: number): Promise<{
    paused: boolean;
    completed: boolean;
    station: Spacecraft | null;
  }> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Spacecraft);
      const station = await repository.findOne({
        where: { id: stationId },
        relations: ['shipClass'],
        lock: { mode: 'pessimistic_write', tables: ['spacecraft'] },
      });
      if (
        !station ||
        station.kind !== SpacecraftKind.STATION ||
        station.status !== SpacecraftStatus.UNDER_CONSTRUCTION ||
        station.constructionTicksRemaining <= 0
      ) {
        return { paused: false, completed: false, station: station ?? null };
      }
      const definition = this.getStationDefinition(station.shipClass);
      const workbees = await this.getDockedWorkbees(manager, station.id);
      if (workbees.length < definition.requiredWorkbees) {
        return { paused: true, completed: false, station };
      }
      station.constructionTicksRemaining -= 1;
      if (station.constructionTicksRemaining > 0) {
        station.hull = Math.min(
          station.hullMax,
          station.hull + Math.ceil(station.hullMax / (2 * station.shipClass.buildTimeTicks)),
        );
        await repository.save(station);
        return { paused: false, completed: false, station };
      }
      this.finishExpansion(station, station.shipClass, definition.dockCapacity);
      await repository.save(station);
      return { paused: false, completed: true, station };
    });
  }

  async remove(stationId: number, userId: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Spacecraft);
      const station = await repository.findOne({
        where: { id: stationId, userId },
        lock: { mode: 'pessimistic_write', tables: ['spacecraft'] },
      });
      if (!station || station.kind !== SpacecraftKind.STATION || station.stationRole !== StationRole.CONSTRUCTION) {
        throw new NotFoundException('Konstrukt nicht gefunden');
      }
      const workbees = await repository.find({ where: { dockedAtId: station.id } });
      for (const workbee of workbees) workbee.dockedAtId = null;
      if (workbees.length > 0) await repository.save(workbees);
      await repository.remove(station);
    });
  }

  private async findConstruction(
    manager: EntityManager,
    stationId: number,
    userId: number,
    lock = false,
  ): Promise<Spacecraft> {
    const station = await manager.getRepository(Spacecraft).findOne({
      where: { id: stationId, userId },
      relations: ['location', 'location.systemField', 'location.systemField.starSystem', 'location.galaxyField', 'location.galaxyField.starSystem', 'user'],
      ...(lock ? { lock: { mode: 'pessimistic_write' as const, tables: ['spacecraft'] } } : {}),
    });
    if (
      !station ||
      station.kind !== SpacecraftKind.STATION ||
      station.stationRole !== StationRole.CONSTRUCTION ||
      station.status !== SpacecraftStatus.IDLE
    ) {
      throw new NotFoundException('Konstrukt nicht gefunden');
    }
    return station;
  }

  private factionPrefix(station: Spacecraft): 'REBEL' | 'EMPIRE' {
    return station.user?.faction === Faction.GALACTIC_EMPIRE ? 'EMPIRE' : 'REBEL';
  }

  private async getDockedWorkbees(manager: EntityManager, stationId: number): Promise<Spacecraft[]> {
    const docked = await manager.getRepository(Spacecraft).find({
      where: { dockedAtId: stationId },
      relations: ['shipClass'],
    });
    return docked.filter((ship) => ship.shipClass?.role === 'WORKBEE');
  }

  private async toExpansionOption(
    manager: EntityManager,
    station: Spacecraft,
    shipClass: ShipClassDef,
    cargo: CargoItem[],
    dockedWorkbees: number,
  ): Promise<StationExpansionOptionDto> {
    const definition = this.getStationDefinition(shipClass);
    const current = await manager.getRepository(Spacecraft).countBy({
      userId: station.userId,
      kind: SpacecraftKind.STATION,
      stationRole: shipClass.role as StationRole,
    });
    const modules = this.getBuildCosts(shipClass).map((cost) => {
      const stored = cargo.find((item) => item.commodityId === cost.commodityId)?.amount ?? 0;
      return {
        commodityId: cost.commodityId,
        name: this.gameData?.getCommodity(cost.commodityId)?.name ?? `Modul #${cost.commodityId}`,
        level: null,
        stored,
        required: cost.amount,
        sufficient: stored >= cost.amount,
      };
    });
    const locationAllowed = this.isExpansionLocationAllowed(station, definition.location);
    const reached = definition.buildLimit != null && current >= definition.buildLimit;
    const enoughWorkbees = dockedWorkbees >= definition.requiredWorkbees;
    return {
      classKey: shipClass.key,
      name: shipClass.name,
      role: shipClass.role,
      buildTimeTicks: shipClass.buildTimeTicks,
      workbees: { docked: dockedWorkbees, required: definition.requiredWorkbees, sufficient: enoughWorkbees },
      location: { rule: definition.location, allowed: locationAllowed },
      limit: { maximum: definition.buildLimit, current, reached },
      modules,
      canStart: locationAllowed && !reached && enoughWorkbees && modules.every((module) => module.sufficient),
    };
  }

  private getStationDefinition(shipClass: ShipClassDef): NonNullable<ShipClassYamlDef['station']> {
    const definition = this.gameData?.getShipClassDefByKey(shipClass.key)?.station;
    if (definition) return definition;
    const defaults: Record<string, NonNullable<ShipClassYamlDef['station']>> = {
      DEPOT_SMALL: { location: 'INSIDE_SYSTEM', buildLimit: null, requiredWorkbees: 15, dockCapacity: 15 },
      DEPOT_LARGE: { location: 'INSIDE_SYSTEM', buildLimit: 1, requiredWorkbees: 20, dockCapacity: 20 },
      SHIPYARD: { location: 'INSIDE_SYSTEM', buildLimit: 2, requiredWorkbees: 10, dockCapacity: 2 },
      SENSOR: { location: 'EVERYWHERE', buildLimit: null, requiredWorkbees: 5, dockCapacity: 2 },
      OUTPOST: { location: 'OUTSIDE_SYSTEM', buildLimit: null, requiredWorkbees: 30, dockCapacity: 30 },
      BASE: { location: 'OVER_SYSTEM', buildLimit: null, requiredWorkbees: 40, dockCapacity: 40 },
    };
    const value = defaults[shipClass.role];
    if (!value) throw new BadRequestException('Stationsrolle ist nicht verfügbar');
    return value;
  }

  private getBuildCosts(shipClass: ShipClassDef): Array<{ commodityId: number; amount: number }> {
    return this.gameData?.getShipClassDefByKey(shipClass.key)?.buildCosts ??
      (shipClass.role === 'DEPOT_SMALL' ? [{ commodityId: 10101, amount: 4 }] : []);
  }

  private isExpansionLocationAllowed(
    station: Spacecraft,
    rule: NonNullable<ShipClassYamlDef['station']>['location'],
  ): boolean {
    if (rule === 'EVERYWHERE') return true;
    const inside = station.location?.kind === 'SYSTEM_FIELD';
    const over = station.location?.kind === 'GALAXY_FIELD' && Boolean(station.location.galaxyField?.starSystem);
    if (rule === 'INSIDE_SYSTEM') return inside;
    if (rule === 'OVER_SYSTEM') return over;
    return !inside && !over;
  }

  private locationMessage(rule: NonNullable<ShipClassYamlDef['station']>['location']): string {
    return ({
      EVERYWHERE: 'überall',
      OVER_SYSTEM: 'nur über einem System',
      INSIDE_SYSTEM: 'nur innerhalb eines Systems',
      OUTSIDE_SYSTEM: 'nur außerhalb eines Systems',
    })[rule];
  }

  private finishExpansion(station: Spacecraft, shipClass: ShipClassDef, dockCapacity: number): void {
    station.name = shipClass.name;
    station.status = SpacecraftStatus.IDLE;
    station.hull = shipClass.hullBase;
    station.hullMax = shipClass.hullBase;
    station.shields = shipClass.shieldBase;
    station.shieldsMax = shipClass.shieldBase;
    station.energy = shipClass.epsBase;
    station.energyMax = shipClass.epsBase;
    station.crew = 0;
    station.crewMax = shipClass.crewMax;
    station.cargoMax = shipClass.cargoCapacity;
    station.battery = shipClass.batteryBase;
    station.batteryMax = shipClass.batteryBase;
    station.reactorFuel = shipClass.reactorBase * 10;
    station.reactorFuelMax = shipClass.reactorBase * 10;
    station.warpdrive = 0;
    station.warpdriveMax = 0;
    station.dockCapacity = dockCapacity;
  }

  private assertShipCanBuild(ship: Spacecraft): void {
    if (ship.kind === SpacecraftKind.STATION || ship.status !== SpacecraftStatus.IDLE) {
      throw new BadRequestException('Schiff muss betriebsbereit sein');
    }
    const shuttleRamp = ship.runtimeSystems?.SHUTTLE_RAMP as { integrity?: number } | undefined;
    if (!shuttleRamp || (shuttleRamp.integrity ?? 0) <= 0) throw new BadRequestException('Die Shuttle-Rampe ist zerstört');
    if (ship.shields > 0) throw new BadRequestException('Die Schilde sind aktiviert');
    const cloak = ship.runtimeSystems?.CLOAK as { active?: boolean } | undefined;
    if (cloak?.active) throw new BadRequestException('Die Tarnung ist aktiviert');
  }

  private fieldBlocksConstruction(ship: Spacecraft): boolean {
    const field = ship.location?.systemField ?? ship.location?.galaxyField;
    return this.fieldEffectQuery.has(field, FieldEffect.NO_STATION_CONSTRUCTION);
  }

  private isWormhole(ship: Spacecraft): boolean {
    return Boolean((ship.location?.systemField?.starSystem as { isWormhole?: boolean } | undefined)?.isWormhole);
  }

  private requireCargo(cargo: CargoItem[], commodityId: number, amount: number, message: string): void {
    if ((cargo.find((item) => item.commodityId === commodityId)?.amount ?? 0) < amount) throw new BadRequestException(message);
  }

  private consumeCargo(cargo: CargoItem[], commodityId: number, amount: number): void {
    const item = cargo.find((entry) => entry.commodityId === commodityId)!;
    item.amount -= amount;
  }

  private consumeWorkbees(cargo: CargoItem[], amount: number): void {
    let remaining = amount;
    for (const item of cargo) {
      const used = Math.min(item.amount, remaining);
      item.amount -= used;
      remaining -= used;
      if (remaining === 0) return;
    }
  }

  private async transferCrew(manager: EntityManager, crew: CrewAssignment[], workbees: Spacecraft[], amount: number): Promise<void> {
    if (amount === 0) return;
    const assignments = crew.slice(-amount);
    assignments.forEach((assignment, index) => {
      assignment.spacecraftId = workbees[index].id;
      assignment.slot = null;
    });
    await manager.getRepository(CrewAssignment).save(assignments);
  }
}
