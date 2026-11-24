import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Faction,
  type ShuttleManagementDto,
  type SpacecraftRuntimeSystemsDto,
} from '@swuniverse/shared';
import { DataSource, EntityManager, In, QueryFailedError } from 'typeorm';
import { GameDataService } from '../game-data/game-data.service';
import { User } from '../auth/user.entity';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { Colony } from '../colony/entities/colony.entity';
import { ColonyField } from '../colony/entities/colony-field.entity';
import { ColonyStorage } from '../colony/entities/colony-storage.entity';
import { ColonyChangeable } from '../colony/entities/colony-changeable.entity';
import { ColonyStatsService } from '../colony/colony-stats.service';
import { ColonyEconomyService } from '../colony/colony-economy.service';
import { ColonyCrewService } from '../colony/colony-crew.service';
import {
  MessagingService,
  type TransactionalNotifications,
} from '../messaging/messaging.service';
import { MessageFolder } from '../messaging/message-folder';
import { Spacecraft, SpacecraftKind } from './entities/spacecraft.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import { CargoItem } from './entities/cargo-item.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { matchesColonyOrbit } from './spacecraft-field';
import {
  initializeSpacecraftRuntimeSystems,
  isCoolingDown,
} from './spacecraft-runtime-state.service';
import {
  createSmallCraft,
  assignSmallCraftCrew,
  prepareSmallCraft,
} from './small-craft-launch';

const readLock = {
  mode: 'pessimistic_read' as const,
  onLocked: 'nowait' as const,
};
const writeLock = {
  mode: 'pessimistic_write' as const,
  onLocked: 'nowait' as const,
};

@Injectable()
export class ShuttleService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly gameData: GameDataService,
    private readonly colonyStats: ColonyStatsService,
    private readonly colonyEconomy: ColonyEconomyService,
    private readonly colonyCrew: ColonyCrewService,
    private readonly messaging: MessagingService,
  ) {}

  async get(id: number, userId: number): Promise<ShuttleManagementDto> {
    const manager = this.dataSource.manager;
    const ship = await this.load(manager, id, userId);
    const cargo = await this.cargo(manager, id);
    const roster = await this.crew(manager, id);
    const blockReason =
      this.rampReason(ship) ?? this.actorReason(ship, roster.length);
    const stored: ShuttleManagementDto['stored'] = [];
    for (const row of cargo.filter(
      (row) =>
        row.amount > 0 && this.gameData.isSmallCraftCommodity(row.commodityId),
    )) {
      const hull = await this.classForCommodity(
        manager,
        row.commodityId,
        userId,
      );
      if (!hull) continue;
      const plan = prepareSmallCraft(hull, this.gameData);
      stored.push({
        commodityId: row.commodityId,
        name: this.gameData.getCommodity(row.commodityId)?.name ?? hull.name,
        amount: row.amount,
        energyCost: plan.energyCost,
        crewRequired: plan.crewRequired,
        blockReason:
          blockReason ??
          (ship.energy < plan.energyCost
            ? `${plan.energyCost} EPS erforderlich`
            : roster.filter((row) => row.userId === userId).length -
                  ship.crewRequired <
                plan.crewRequired
              ? 'Nicht genug freie Crew'
              : null),
      });
    }
    const nearby: ShuttleManagementDto['nearby'] = [];
    if (!this.rampReason(ship)) {
      const candidates = await manager.find(Spacecraft, {
        where: { locationId: ship.locationId, userId },
        order: { id: 'ASC' },
      });
      for (const candidate of candidates) {
        if (candidate.id === ship.id) continue;
        const target = await this.load(manager, candidate.id, userId);
        if (!this.isShuttle(target)) continue;
        nearby.push({
          id: target.id,
          name: target.name,
          blockReason: await this.storeReason(
            manager,
            ship,
            target,
            cargo,
            roster,
          ),
        });
      }
    }
    const colonies: ShuttleManagementDto['colonies'] = [];
    if (this.isShuttle(ship)) {
      const candidates = await manager.find(Colony, {
        where: { userId, isAbandoned: false },
        relations: ['systemField'],
        order: { id: 'ASC' },
      });
      for (const candidate of candidates) {
        if (!matchesColonyOrbit(ship, candidate)) continue;
        const colony = await this.colony(manager, candidate.id, userId);
        colonies.push({
          id: colony.id,
          name: colony.name,
          blockReason: await this.landReason(
            manager,
            ship,
            colony,
            cargo,
            roster,
          ),
        });
      }
    }
    return {
      isShuttle: this.isShuttle(ship),
      capacity: this.capacity(ship),
      storedCount: this.storedCount(cargo),
      blockReason,
      stored,
      nearby,
      colonies,
    };
  }

  /** Existing colony ramp transfers share the same locks and slot accounting. */
  async transferStored(
    colonyId: number,
    userId: number,
    shipId: number,
    items: Array<{ commodityId: number; amount: number }>,
  ): Promise<void> {
    await this.transaction(async (transaction) => {
      const manager = transaction.manager;
      const colony = await this.colony(manager, colonyId, userId, true);
      const ship = await this.load(manager, shipId, userId, true);
      if (!matchesColonyOrbit(ship, colony))
        throw new BadRequestException('Schiff ist nicht im Kolonieorbit');
      const reason = this.rampReason(ship);
      if (reason) throw new BadRequestException(reason);
      const amounts = new Map<number, number>();
      for (const item of items ?? []) {
        if (
          !Number.isInteger(item?.commodityId) ||
          !Number.isInteger(item?.amount) ||
          !this.gameData.isSmallCraftCommodity(item.commodityId)
        )
          throw new BadRequestException('Ungültige Shuttle-Ware oder Menge');
        amounts.set(
          item.commodityId,
          (amounts.get(item.commodityId) ?? 0) + item.amount,
        );
      }
      const delta = [...amounts.values()].reduce(
        (sum, amount) => sum + amount,
        0,
      );
      const cargo = await this.cargo(manager, shipId, true);
      const storage = await manager.find(ColonyStorage, {
        where: { colonyId },
        order: { id: 'ASC' },
        lock: writeLock,
      });
      if (this.storedCount(cargo) + delta > this.capacity(ship))
        throw new BadRequestException('Shuttleplätze sind belegt');
      if (this.cargoUsed(cargo) + delta > ship.cargoMax)
        throw new BadRequestException('Nicht genug Schiffslager frei');
      if (
        this.cargoUsed(storage) - delta >
        this.colonyStats.calculateSummary(colony).effectiveStorageMax
      )
        throw new BadRequestException('Nicht genug Kolonielager frei');
      for (const [commodityId, amount] of amounts) {
        const source =
          amount > 0
            ? storage.find((row) => row.commodityId === commodityId)
            : cargo.find((row) => row.commodityId === commodityId);
        if ((source?.amount ?? 0) < Math.abs(amount))
          throw new BadRequestException('Nicht genug Shuttles im Quelllager');
      }
      for (const [commodityId, amount] of amounts) {
        if (!amount) continue;
        let colonyRow = storage.find((row) => row.commodityId === commodityId);
        if (!colonyRow) {
          colonyRow = manager.create(ColonyStorage, {
            colonyId,
            commodityId,
            amount: 0,
          });
          storage.push(colonyRow);
        }
        colonyRow.amount -= amount;
        await this.addCargo(manager, shipId, cargo, [{ commodityId, amount }]);
      }
      await manager.save(storage);
      ship.cargoUsed = this.cargoUsed(cargo);
      await manager.save(ship);
      await manager.update(Colony, colonyId, {
        storageUsed: this.cargoUsed(storage),
      });
    });
  }

  async launch(
    id: number,
    userId: number,
    commodityId: number,
  ): Promise<{ shipId: number }> {
    return this.transaction(async (transaction) => {
      const manager = transaction.manager;
      const carrier = await this.load(manager, id, userId, true);
      const roster = await this.crew(manager, id, true);
      const reason =
        this.rampReason(carrier) ?? this.actorReason(carrier, roster.length);
      if (reason) throw new BadRequestException(reason);
      const hull = await this.classForCommodity(manager, commodityId, userId);
      if (!hull)
        throw new BadRequestException('Diese Ware ist kein startbares Shuttle');
      const cargo = await this.cargo(manager, id, true);
      const row = cargo.find((row) => row.commodityId === commodityId);
      if (!row || row.amount < 1)
        throw new BadRequestException('Kein Shuttle im Lager');
      const plan = prepareSmallCraft(hull, this.gameData);
      const own = roster.filter((row) => row.userId === userId);
      if (own.length - carrier.crewRequired < plan.crewRequired)
        throw new BadRequestException('Nicht genug freie Crew');
      if (carrier.energy < plan.energyCost)
        throw new BadRequestException(`${plan.energyCost} EPS erforderlich`);
      const shuttle = await createSmallCraft(
        manager,
        hull,
        {
          name: hull.name,
          userId,
          locationId: carrier.locationId,
          shuttleCommodityId: commodityId,
        },
        this.gameData,
      );
      await assignSmallCraftCrew(
        manager,
        plan.crewRequired ? own.slice(-plan.crewRequired) : [],
        [shuttle],
      );
      carrier.energy -= plan.energyCost;
      carrier.crew = roster.length - plan.crewRequired;
      row.amount -= 1;
      carrier.cargoUsed = this.cargoUsed(cargo);
      initializeSpacecraftRuntimeSystems(carrier);
      await manager.save(row);
      await manager.save(carrier);
      await this.notify(
        carrier,
        `${shuttle.name} wurde gestartet.`,
        transaction,
      );
      return { shipId: shuttle.id };
    });
  }

  async store(id: number, userId: number, targetId: number): Promise<void> {
    await this.transaction(async (transaction) => {
      const manager = transaction.manager;
      if (id === targetId)
        throw new BadRequestException(
          'Ein Shuttle kann sich nicht selbst aufnehmen',
        );
      // Stable ship lock order; all following locks fail fast to avoid colony/ship inversions.
      await manager.find(Spacecraft, {
        where: { id: In([id, targetId]) },
        order: { id: 'ASC' },
        lock: writeLock,
      });
      const carrier = await this.load(manager, id, userId, true);
      const target = await this.load(manager, targetId, userId, true);
      const cargo = await this.cargo(manager, id, true);
      const roster = await this.crew(manager, id, true);
      const reason = await this.storeReason(
        manager,
        carrier,
        target,
        cargo,
        roster,
        true,
      );
      if (reason) throw new BadRequestException(reason);
      const targetCargo = await this.cargo(manager, targetId, true);
      const targetCrew = await this.crew(manager, targetId, true);
      const commodityId = this.commodityForShip(target)!;
      await this.addCargo(manager, id, cargo, [
        ...targetCargo.map((row) => ({
          commodityId: row.commodityId,
          amount: row.amount,
        })),
        { commodityId, amount: 1 },
      ]);
      for (const assignment of targetCrew) {
        assignment.spacecraftId = id;
        assignment.slot = null;
      }
      if (targetCrew.length) await manager.save(targetCrew);
      carrier.crew = roster.length + targetCrew.length;
      carrier.cargoUsed = this.cargoUsed(cargo);
      await manager.save(carrier);
      await manager.delete(Spacecraft, targetId);
      await this.notify(
        carrier,
        `${target.name} wurde aufgenommen.`,
        transaction,
      );
    });
  }

  async land(id: number, userId: number, colonyId: number): Promise<void> {
    await this.transaction(async (transaction) => {
      const manager = transaction.manager;
      const colony = await this.colony(manager, colonyId, userId, true);
      const shuttle = await this.load(manager, id, userId, true);
      const cargo = await this.cargo(manager, id, true);
      const roster = await this.crew(manager, id, true);
      const reason = await this.landReason(
        manager,
        shuttle,
        colony,
        cargo,
        roster,
        true,
      );
      if (reason) throw new BadRequestException(reason);
      const storage = await manager.find(ColonyStorage, {
        where: { colonyId },
        order: { id: 'ASC' },
        lock: writeLock,
      });
      const items = [
        ...cargo.map((row) => ({
          commodityId: row.commodityId,
          amount: row.amount,
        })),
        { commodityId: this.commodityForShip(shuttle)!, amount: 1 },
      ];
      for (const item of items) {
        let row = storage.find((row) => row.commodityId === item.commodityId);
        if (!row) {
          row = manager.create(ColonyStorage, {
            colonyId,
            commodityId: item.commodityId,
            amount: 0,
          });
          storage.push(row);
        }
        row.amount += item.amount;
      }
      await manager.save(storage);
      for (const assignment of roster) {
        assignment.spacecraftId = null;
        assignment.colonyId = colonyId;
        assignment.slot = null;
      }
      if (roster.length) await manager.save(roster);
      colony.storageUsed = storage.reduce(
        (sum, row) => sum + Math.max(0, row.amount),
        0,
      );
      await manager.update(Colony, colonyId, {
        storageUsed: colony.storageUsed,
      });
      if (colony.changeable) {
        colony.changeable.trainedCrew = await manager.countBy(CrewAssignment, {
          colonyId,
        });
        await manager.save(colony.changeable);
      }
      await manager.delete(Spacecraft, id);
      await this.notify(shuttle, `Auf ${colony.name} gelandet.`, transaction);
    });
  }

  /** Ramp capacity and block reason; `ship` needs `modules` and `shipClass`. */
  rampStatus(ship: Spacecraft): { capacity: number; blockReason: string | null } {
    return { capacity: this.capacity(ship), blockReason: this.rampReason(ship) };
  }

  private actorReason(ship: Spacecraft, crew: number): string | null {
    const systems = ship.runtimeSystems as SpacecraftRuntimeSystemsDto;
    if (ship.status !== 'IDLE' || ship.operatingMode === 'STANDBY')
      return 'Raumschiff ist nicht einsatzbereit';
    if (crew < ship.crewRequired) return 'Nicht genug Besatzung';
    if (systems.CLOAK?.active) return 'Tarnung ist aktiviert';
    if (systems.SHIELDS?.active) return 'Schilde sind aktiviert';
    if (systems.WARPDRIVE?.active) return 'Hyperantrieb ist aktiviert';
    return null;
  }
  private rampReason(ship: Spacecraft): string | null {
    const ramp = (ship.runtimeSystems as SpacecraftRuntimeSystemsDto)
      .SHUTTLE_RAMP;
    const modules = ship.modules.filter(
      (module) =>
        module.category === 'SPECIAL' &&
        module.moduleType.toLowerCase() === 'shuttlerampe',
    );
    if (
      !ramp ||
      ramp.integrity <= 0 ||
      !modules.some((module) => module.integrity > 0)
    )
      return 'Keine intakte Shuttlerampe';
    if (isCoolingDown(ramp) || modules.some((module) => isCoolingDown(module)))
      return 'Shuttlerampe kühlt ab';
    return this.capacity(ship) > 0 ? null : 'Keine Shuttleplätze';
  }
  private capacity(ship: Spacecraft): number {
    const ramp = this.gameData
      .getAllModules()
      .find((module) => module.name === 'Shuttlerampe');
    const capacity = Number(ramp?.secret['shuttleLaunchCapacity'] ?? 0);
    const fromModules = ship.modules
      .filter(
        (module) =>
          module.category === 'SPECIAL' &&
          module.moduleType.toLowerCase() === 'shuttlerampe' &&
          module.integrity > 0,
      )
      .reduce(
        (sum, module) => sum + Math.max(0, Math.floor(capacity * module.level)),
        0,
      );
    return Math.max(ship.shipClass.shuttleSlots, fromModules);
  }
  private isShuttle(ship: Spacecraft): boolean {
    return (
      ship.kind === SpacecraftKind.SHIP &&
      ['SHUTTLE', 'WORKBEE'].includes(ship.shipClass.role) &&
      this.commodityForShip(ship) != null
    );
  }
  private commodityForShip(ship: Spacecraft): number | null {
    const original = ship.shuttleCommodityId;
    if (original != null && this.gameData.isSmallCraftCommodity(original))
      return original;
    return (
      this.gameData.getHangarShipDef(ship.shipClass.key)?.hangarCommodityId ??
      null
    );
  }
  private async classForCommodity(
    manager: EntityManager,
    id: number,
    userId: number,
  ): Promise<ShipClassDef | null> {
    if (!this.gameData.isSmallCraftCommodity(id)) return null;
    let key = this.gameData.getHangarShipDefByCommodity(id)?.shipClassKey;
    if (!key && id >= 20061 && id <= 20065) {
      const user = await manager.findOneByOrFail(User, { id: userId });
      key = `${user.faction === Faction.GALACTIC_EMPIRE ? 'EMPIRE' : 'REBEL'}_WORKBEE_DROID`;
    }
    return key ? manager.findOneBy(ShipClassDef, { key }) : null;
  }
  private storedCount(cargo: CargoItem[]): number {
    return cargo
      .filter((row) => this.gameData.isSmallCraftCommodity(row.commodityId))
      .reduce((sum, row) => sum + Math.max(0, row.amount), 0);
  }
  private cargoUsed(cargo: Array<{ amount: number }>): number {
    return cargo.reduce((sum, row) => sum + Math.max(0, row.amount), 0);
  }

  private async storeReason(
    manager: EntityManager,
    carrier: Spacecraft,
    target: Spacecraft,
    cargo: CargoItem[],
    roster: CrewAssignment[],
    locked = false,
  ): Promise<string | null> {
    const reason =
      this.rampReason(carrier) ?? this.actorReason(carrier, roster.length);
    if (reason) return reason;
    if (!this.isShuttle(target)) return 'Ziel ist kein Shuttle';
    if (carrier.locationId !== target.locationId)
      return 'Shuttle ist nicht am selben Feld';
    if (target.dockedAtId != null && target.dockedAtId !== carrier.id)
      return 'Shuttle ist an einer anderen Station angedockt';
    const unavailable = await this.targetReason(manager, target);
    if (unavailable) return unavailable;
    if (this.storedCount(cargo) >= this.capacity(carrier))
      return 'Shuttlerampe ist belegt';
    const targetCrew = await this.crew(manager, target.id, locked);
    if (roster.length + targetCrew.length > carrier.crewMax)
      return 'Nicht genügend Crew-Quartiere frei';
    const targetCargo = await this.cargo(manager, target.id, locked);
    if (
      this.storedCount(cargo) + this.storedCount(targetCargo) + 1 >
      this.capacity(carrier)
    )
      return 'Shuttlerampe ist belegt';
    if (
      this.cargoUsed(cargo) + this.cargoUsed(targetCargo) + 1 >
      carrier.cargoMax
    )
      return 'Nicht genug Lagerraum';
    return null;
  }
  private async targetReason(
    manager: EntityManager,
    ship: Spacecraft,
  ): Promise<string | null> {
    const systems = ship.runtimeSystems as SpacecraftRuntimeSystemsDto;
    if (ship.status !== 'IDLE' || ship.operatingMode === 'STANDBY')
      return 'Shuttle ist nicht einsatzbereit';
    if (
      systems.SHIELDS?.active ||
      systems.WARPDRIVE?.active ||
      systems.CLOAK?.active
    )
      return 'Shuttle muss Schilde, Hyperantrieb und Tarnung deaktivieren';
    if (ship.fleetId != null) return 'Shuttle muss seine Flotte verlassen';
    if (
      ship.tractoredShipId != null ||
      (await manager.existsBy(Spacecraft, { tractoredShipId: ship.id }))
    )
      return 'Shuttle ist an einen Traktorstrahl gebunden';
    if (
      Object.values(systems).some(
        (state) => state?.ticksRemaining && state.ticksRemaining > 0,
      )
    )
      return 'Shuttle hat einen laufenden Systemauftrag';
    return null;
  }
  private async landReason(
    manager: EntityManager,
    ship: Spacecraft,
    colony: Colony,
    cargo: CargoItem[],
    crew: CrewAssignment[],
    locked = false,
  ): Promise<string | null> {
    if (!this.isShuttle(ship)) return 'Schiff ist kein Shuttle';
    if (!matchesColonyOrbit(ship, colony))
      return 'Shuttle ist nicht im Kolonieorbit';
    const reason =
      (await this.targetReason(manager, ship)) ??
      this.actorReason(ship, crew.length);
    if (reason) return reason;
    if (ship.dockedAtId != null) return 'Shuttle muss zuerst abdocken';
    if (!this.colonyEconomy.hasActiveFunction(colony, 4))
      return 'Aktiver Landeplatz erforderlich';
    const assigned = await manager.find(CrewAssignment, {
      where: { colonyId: colony.id },
      order: { crewId: 'ASC' },
      ...(locked ? { lock: readLock } : {}),
    });
    if (
      assigned.length + crew.length >
      this.colonyCrew.getLocalCrewLimit(colony)
    )
      return 'Nicht genug Crewplätze auf der Kolonie';
    const storage = await manager.find(ColonyStorage, {
      where: { colonyId: colony.id },
      order: { id: 'ASC' },
      ...(locked ? { lock: writeLock } : {}),
    });
    if (
      this.cargoUsed(storage) + this.cargoUsed(cargo) + 1 >
      this.colonyStats.calculateSummary(colony).effectiveStorageMax
    )
      return 'Nicht genug Kolonielager frei';
    return null;
  }

  private async load(
    manager: EntityManager,
    id: number,
    userId: number,
    locked = false,
  ): Promise<Spacecraft> {
    const ship = await manager.findOne(Spacecraft, {
      where: { id, userId },
      ...(locked ? { lock: writeLock } : {}),
    });
    if (!ship) throw new NotFoundException('Raumschiff nicht gefunden');
    ship.modules = await manager.find(SpacecraftModule, {
      where: { spacecraftId: id },
      order: { id: 'ASC' },
      ...(locked ? { lock: readLock } : {}),
    });
    const hydrated = await manager.findOneOrFail(Spacecraft, {
      where: { id },
      relations: ['shipClass', 'location', 'location.systemField'],
    });
    ship.shipClass = hydrated.shipClass;
    ship.location = hydrated.location;
    initializeSpacecraftRuntimeSystems(ship);
    return ship;
  }
  private cargo(manager: EntityManager, id: number, locked = false) {
    return manager.find(CargoItem, {
      where: { spacecraftId: id },
      order: { id: 'ASC' },
      ...(locked ? { lock: writeLock } : {}),
    });
  }
  private crew(manager: EntityManager, id: number, locked = false) {
    return manager.find(CrewAssignment, {
      where: { spacecraftId: id },
      order: { crewId: 'ASC' },
      ...(locked ? { lock: writeLock } : {}),
    });
  }
  private async colony(
    manager: EntityManager,
    id: number,
    userId: number,
    locked = false,
  ): Promise<Colony> {
    const colony = await manager.findOne(Colony, {
      where: { id, userId, isAbandoned: false },
      ...(locked ? { lock: writeLock } : {}),
    });
    if (!colony) throw new NotFoundException('Kolonie nicht gefunden');
    const hydrated = await manager.findOneOrFail(Colony, {
      where: { id },
      relations: ['stats', 'changeable', 'celestialObject', 'systemField'],
    });
    Object.assign(colony, {
      stats: hydrated.stats,
      changeable: hydrated.changeable,
      celestialObject: hydrated.celestialObject,
      systemField: hydrated.systemField,
    });
    colony.fields = await manager.find(ColonyField, {
      where: { colonyId: id },
      order: { id: 'ASC' },
      ...(locked ? { lock: readLock } : {}),
    });
    if (locked && colony.changeable)
      colony.changeable = await manager.findOneOrFail(ColonyChangeable, {
        where: { colonyId: id },
        lock: writeLock,
      });
    return colony;
  }
  private async addCargo(
    manager: EntityManager,
    id: number,
    rows: CargoItem[],
    items: Array<{ commodityId: number; amount: number }>,
  ) {
    for (const item of items) {
      let row = rows.find((row) => row.commodityId === item.commodityId);
      if (!row) {
        row = manager.create(CargoItem, {
          spacecraftId: id,
          commodityId: item.commodityId,
          amount: 0,
        });
        rows.push(row);
      }
      row.amount += item.amount;
    }
    await manager.save(rows);
  }
  private notify(
    ship: Spacecraft,
    text: string,
    transaction: TransactionalNotifications,
  ) {
    return this.messaging.sendSystem(
      ship.userId,
      `${ship.name}: ${text}`,
      undefined,
      ship.kind === 'STATION' ? MessageFolder.STATION : MessageFolder.SHIP,
      undefined,
      false,
      transaction,
    );
  }
  private async transaction<T>(
    work: (transaction: TransactionalNotifications) => Promise<T>,
  ): Promise<T> {
    const afterCommit: Array<() => void> = [];
    const result = await this.dataSource
      .transaction('READ COMMITTED', (manager) =>
        work({ manager, afterCommit }),
      )
      .catch((error: unknown) => {
        if (
          error instanceof QueryFailedError &&
          error.driverError.code === '55P03'
        )
          throw new BadRequestException(
            'Shuttle-Zustand ist gesperrt; bitte erneut versuchen',
          );
        throw error;
      });
    for (const callback of afterCommit) callback();
    return result;
  }
}
