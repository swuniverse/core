import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  SpacecraftDockResultDto,
  SpacecraftDockShipResultDto,
} from '@swuniverse/shared';
import { DataSource, EntityManager, In } from 'typeorm';
import { DOCK_EPS_COST } from './docking.constants';
import { Fleet } from './entities/fleet.entity';
import {
  AlertState,
  Spacecraft,
  SpacecraftKind,
  SpacecraftStatus,
} from './entities/spacecraft.entity';
import {
  buildNearbyInteractionContext,
  decideNearbyInteraction,
} from './nearby-interaction';
import { DockingPrivilegeService } from './docking-privilege.service';
import { MessagingService } from '../messaging/messaging.service';
import { SpacecraftCrewService } from './spacecraft-crew.service';
import { SpacecraftRepairService } from './spacecraft-repair.service';
import { initializeSpacecraftRuntimeSystems } from './spacecraft-runtime-state.service';
import { sameSpacecraftLocation } from './spacecraft-field';
import { isCloaked } from './spacecraft-cloak';
import { isRpgHidden } from './rpg-visibility';
import { cancelShipyardJobs } from './shipyard-job-cancel';
import { ColonyShipBuildQueueMode } from '../colony/entities/colony-ship-build-queue.entity';


const SHIP_RELATIONS = {
  modules: true,
  location: { galaxyField: true, systemField: true },
} as const;

type Outcome = {
  message: string;
  shipIds: number[];
  cancelled: Array<{ userId: number; name: string }>;
  /** Foreign docking to report to the station owner after the commit. */
  foreignDocking?: {
    station: Pick<Spacecraft, 'id' | 'userId' | 'name' | 'dockPmAutoRead'>;
    ships: Array<Pick<Spacecraft, 'id' | 'userId' | 'name'>>;
  };
  /** System message to send after the commit. */
  notice?: { userId: number; subject: string; body: string };
  /** Per-ship result of a fleet action. */
  results?: SpacecraftDockShipResultDto[];
};

/**
 * Fleet members with the leader first, as STU's fleet wrapper iterates them.
 * Hidden RPG scene ships are left out silently: the HTTP guard only covers the URL ids.
 */
function fleetOrder(rows: Spacecraft[], fleet: Fleet): Spacecraft[] {
  return rows
    .filter((row) => row.fleetId === fleet.id && !isRpgHidden(row))
    .sort((a, b) => Number(b.id === fleet.leaderId) - Number(a.id === fleet.leaderId));
}

/** Docking of ships and fleets at stations; one transaction each, fleets dock ship by ship as in STU. */
@Injectable()
export class SpacecraftDockingService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly crewService: SpacecraftCrewService,
    private readonly repairService: SpacecraftRepairService,
    private readonly privileges: DockingPrivilegeService,
    private readonly messaging: MessagingService,
  ) {}

  /** Docks the ship, or its whole fleet when the ship leads one. */
  async dock(
    shipId: number,
    userId: number,
    stationId: number,
  ): Promise<SpacecraftDockResultDto> {
    return this.run((manager) => this.dockInTransaction(manager, shipId, userId, stationId));
  }

  /** Undocks the ship (paying EPS), or its whole fleet when the ship leads one. */
  async undock(shipId: number, userId: number): Promise<SpacecraftDockResultDto> {
    return this.run((manager) => this.undockInTransaction(manager, shipId, userId));
  }

  /** The station owner forces one docked ship out; the target pays no EPS. */
  async undockFromStation(
    stationId: number,
    userId: number,
    targetId: number,
  ): Promise<SpacecraftDockResultDto> {
    return this.run(async (manager) => {
      const station = await this.lockOwnedStation(manager, stationId, userId);
      const target = (await this.lock(manager, [targetId]))[0];
      if (!target || target.dockedAtId !== station.id) {
        throw new BadRequestException('Das Schiff ist nicht an dieser Station angedockt');
      }
      target.dockedAtId = null;
      await manager.save(target);
      return {
        message: `Die ${target.name} wurde erfolgreich abgedockt`,
        shipIds: [target.id],
        cancelled: await this.repairService.cancelTasks(manager, [target.id]),
      };
    });
  }

  /** The station owner forces every docked ship out; the targets pay no EPS. */
  async undockAll(stationId: number, userId: number): Promise<SpacecraftDockResultDto> {
    return this.run(async (manager) => {
      const station = await this.lockOwnedStation(manager, stationId, userId);
      const ids = (
        await manager.getRepository(Spacecraft).find({
          where: { dockedAtId: station.id },
          select: { id: true },
        })
      ).map((ship) => ship.id);
      const docked = await this.lock(manager, ids);
      for (const ship of docked) ship.dockedAtId = null;
      if (docked.length > 0) await manager.save(docked);
      return {
        message: `Alle ${docked.length} Schiffe wurden erfolgreich abgedockt`,
        shipIds: docked.map((ship) => ship.id),
        cancelled: await this.repairService.cancelTasks(
          manager,
          docked.map((ship) => ship.id),
        ),
      };
    });
  }

  /** STU `DockTractoredShip`: the station docks the ship held by its tractor beam and releases the beam. */
  async dockTractored(stationId: number, userId: number): Promise<SpacecraftDockResultDto> {
    return this.run(async (manager) => {
      const targetId = (
        await manager.getRepository(Spacecraft).findOneBy({ id: stationId })
      )?.tractoredShipId;
      const rows = await this.lock(manager, targetId ? [stationId, targetId] : [stationId]);
      const station = rows.find((row) => row.id === stationId);
      if (!station || station.userId !== userId || station.kind !== SpacecraftKind.STATION) {
        throw new NotFoundException('Station nicht gefunden');
      }
      const target = rows.find((row) => row.id === station.tractoredShipId);
      if (!target) throw new BadRequestException('Die Station hält kein Schiff im Traktorstrahl');
      if (!(await this.crewService.hasEnoughCrew(station))) {
        throw new BadRequestException('Nicht genügend Crew vorhanden');
      }
      if (station.energy < DOCK_EPS_COST) {
        throw new BadRequestException('Zum Andocken wird 1 Energie benötigt');
      }
      const occupied = await manager
        .getRepository(Spacecraft)
        .countBy({ dockedAtId: station.id });
      if (occupied >= station.dockCapacity) {
        throw new BadRequestException('Zurzeit sind alle Dockplätze belegt');
      }
      if (target.fleetId != null) {
        const members = await manager.getRepository(Spacecraft).find({
          where: { fleetId: target.fleetId },
          select: { id: true },
        });
        if (members.length > 1) {
          throw new BadRequestException('Aktion nicht möglich. Das Ziel befindet sich in einer Flotte.');
        }
      }
      if (target.alertState !== AlertState.GREEN) {
        throw new BadRequestException('Aktion nicht möglich. Das Ziel ist nicht auf Alarm Grün.');
      }

      const stationSystems = initializeSpacecraftRuntimeSystems(station);
      if (stationSystems.TRACTOR_BEAM) {
        stationSystems.TRACTOR_BEAM = { ...stationSystems.TRACTOR_BEAM, active: false };
      }
      station.runtimeSystems = stationSystems;
      station.energy -= DOCK_EPS_COST;
      station.tractoredShipId = null;
      station.tractoredShip = null;
      // Same docked-state invariant as a regular dock.
      const targetSystems = initializeSpacecraftRuntimeSystems(target);
      if (targetSystems.SHIELDS) targetSystems.SHIELDS = { ...targetSystems.SHIELDS, active: false };
      if (targetSystems.WARPDRIVE) targetSystems.WARPDRIVE = { ...targetSystems.WARPDRIVE, active: false };
      target.runtimeSystems = targetSystems;
      target.dockedAtId = station.id;
      await manager.save([station, target]);
      return {
        message: 'Andockvorgang abgeschlossen',
        shipIds: [target.id],
        cancelled: await this.repairService.cancelTasks(manager, [target.id]),
        notice: {
          userId: target.userId,
          subject: 'Traktorstrahl',
          body: `Die ${target.name} wurde an der Station ${station.name} angedockt`,
        },
      };
    });
  }

  private async run(
    work: (manager: EntityManager) => Promise<Outcome>,
  ): Promise<SpacecraftDockResultDto> {
    const outcome = await this.dataSource.transaction(work);
    await this.repairService.notifyCancelled(outcome.cancelled, 'Das Andocken oder Abdocken');
    if (outcome.foreignDocking && outcome.foreignDocking.ships.length > 0) {
      await this.privileges.notifyForeignDocking(
        outcome.foreignDocking.station,
        outcome.foreignDocking.ships,
      );
    }
    if (outcome.notice) {
      await this.messaging.sendSystem(outcome.notice.userId, outcome.notice.subject, outcome.notice.body);
    }
    return {
      message: outcome.message,
      shipIds: outcome.shipIds,
      ...(outcome.results ? { ships: outcome.results } : {}),
    };
  }

  private async dockInTransaction(
    manager: EntityManager,
    shipId: number,
    userId: number,
    stationId: number,
  ): Promise<Outcome> {
    const fleet = await this.ledFleet(manager, shipId, userId);
    const members = fleet ? await this.memberIds(manager, fleet.id) : [];
    const rows = await this.lock(manager, [shipId, stationId, ...members]);
    const lead = rows.find((row) => row.id === shipId);
    const station = rows.find((row) => row.id === stationId);
    if (!lead || lead.userId !== userId) throw new NotFoundException('Schiff nicht gefunden');
    if (!station || station.kind !== SpacecraftKind.STATION) {
      throw new BadRequestException('Ziel ist keine Station');
    }
    if (lead.kind !== SpacecraftKind.SHIP) {
      throw new BadRequestException('Nur Schiffe können andocken');
    }
    if (station.status !== SpacecraftStatus.IDLE && station.status !== SpacecraftStatus.UNDER_SCRAPPING) {
      throw new BadRequestException('Die Station ist nicht bereit');
    }
    if (fleet) {
      const outcome = await this.dockShips(manager, fleetOrder(rows, fleet), station, userId, false);
      return {
        ...outcome,
        message: `Flottenbefehl ausgeführt: Andocken an ${station.name}`,
        foreignDocking: { station, ships: outcome.docked },
      };
    }

    if (lead.dockedAtId === station.id) throw new BadRequestException('Das Schiff ist bereits angedockt');
    const reason =
      (lead.dockedAtId != null ? 'Das Schiff ist bereits an einer anderen Station angedockt' : null) ??
      (await this.dockBlocker(manager, lead, station, userId, true)) ??
      (!(await this.crewService.hasEnoughCrew(lead)) ? 'Nicht genügend Crew vorhanden' : null) ??
      (lead.energy < DOCK_EPS_COST ? 'Zum Andocken wird 1 Energie benötigt' : null);
    if (reason) throw new BadRequestException(reason);
    const occupied = await manager.getRepository(Spacecraft).countBy({ dockedAtId: station.id });
    if (occupied >= station.dockCapacity) {
      throw new BadRequestException('Zurzeit sind alle Dockplätze belegt');
    }
    this.attach(lead, station, lead);
    await manager.save(lead);
    return {
      message: 'Andockvorgang abgeschlossen',
      shipIds: [lead.id],
      cancelled: await this.repairService.cancelTasks(manager, [lead.id]),
      foreignDocking: { station, ships: [lead] },
    };
  }

  /** STU `DockFleet`: the own station docks an own fleet on its field and pays the EPS. */
  async dockFleetAtStation(
    stationId: number,
    userId: number,
    fleetId: number,
  ): Promise<SpacecraftDockResultDto> {
    return this.run(async (manager) => {
      const fleet = await manager.getRepository(Fleet).findOne({ where: { id: fleetId, userId } });
      if (!fleet) throw new NotFoundException('Flotte nicht gefunden');
      const rows = await this.lock(manager, [stationId, ...(await this.memberIds(manager, fleet.id))]);
      const station = rows.find((row) => row.id === stationId);
      if (!station || station.userId !== userId || station.kind !== SpacecraftKind.STATION) {
        throw new NotFoundException('Station nicht gefunden');
      }
      const ships = fleetOrder(rows, fleet);
      const leader = ships.find((ship) => ship.id === fleet.leaderId);
      if (!leader || !sameSpacecraftLocation(leader, station)) {
        throw new BadRequestException('Die Flotte befindet sich nicht am Feld der Station');
      }
      if (station.status !== SpacecraftStatus.IDLE && station.status !== SpacecraftStatus.UNDER_SCRAPPING) {
        throw new BadRequestException('Die Station ist nicht bereit');
      }
      if (!(await this.crewService.hasEnoughCrew(station))) {
        throw new BadRequestException('Nicht genügend Crew vorhanden');
      }
      if (initializeSpacecraftRuntimeSystems(station).SHIELDS?.active) {
        throw new BadRequestException('Aktion nicht möglich. Die Station hat die Schilde aktiviert');
      }
      const outcome = await this.dockShips(manager, ships, station, userId, true);
      if (outcome.docked.length > 0) await manager.save(station);
      return {
        ...outcome,
        message: `Station aktiviert Andockleitsystem zur Flotte: ${fleet.name}`,
      };
    });
  }

  /**
   * STU `fleetDock`/`DockFleet` loop: each ship docks or is skipped with a reason;
   * missing EPS or full docking slots stop the loop and keep earlier ships docked.
   */
  private async dockShips(
    manager: EntityManager,
    ships: Spacecraft[],
    station: Spacecraft,
    userId: number,
    stationPays: boolean,
  ): Promise<Outcome & { docked: Spacecraft[] }> {
    const results: SpacecraftDockShipResultDto[] = [];
    const docked: Spacecraft[] = [];
    const cancelled: Outcome['cancelled'] = [];
    let free =
      station.dockCapacity -
      (await manager.getRepository(Spacecraft).countBy({ dockedAtId: station.id }));
    for (const ship of ships) {
      const report = (status: SpacecraftDockShipResultDto['status'], reason: string | null) =>
        results.push({ shipId: ship.id, name: ship.name, status, reason });
      if (free <= 0) {
        report('aborted', 'Es sind alle Dockplätze belegt');
        break;
      }
      if (ship.dockedAtId != null) {
        report('skipped', 'Das Schiff ist bereits angedockt');
        continue;
      }
      if (!stationPays && !(await this.crewService.hasEnoughCrew(ship))) {
        report('skipped', 'Nicht genügend Crew vorhanden');
        continue;
      }
      const payer = stationPays ? station : ship;
      if (payer.energy < DOCK_EPS_COST) {
        report('aborted', `${stationPays ? `${station.name}: ` : ''}Nicht genügend Energie vorhanden`);
        break;
      }
      if (isCloaked(ship)) {
        report('skipped', 'Das Schiff ist getarnt');
        continue;
      }
      const blocker = await this.dockBlocker(manager, ship, station, userId, !stationPays);
      if (blocker) {
        report('skipped', blocker);
        continue;
      }
      const notes = await this.cancelJobs(manager, ship, cancelled);
      // The ship's own dock skips it after cancelling; the station's DockFleet docks it anyway.
      if (notes && !stationPays) {
        report('skipped', notes);
        continue;
      }
      this.attach(ship, station, payer);
      docked.push(ship);
      free--;
      report('docked', notes);
    }
    if (docked.length > 0) await manager.save(docked);
    return { message: '', shipIds: docked.map((ship) => ship.id), cancelled, results, docked };
  }

  /** SWU rules beyond STU's loop checks; a fleet member failing one is skipped. */
  private async dockBlocker(
    manager: EntityManager,
    ship: Spacecraft,
    station: Spacecraft,
    userId: number,
    checkPrivileges: boolean,
  ): Promise<string | null> {
    if (ship.kind !== SpacecraftKind.SHIP || ship.userId !== userId) {
      return 'Nur eigene Schiffe können andocken';
    }
    if (ship.status !== SpacecraftStatus.IDLE) return 'Das Schiff ist nicht bereit zum Andocken';
    if (!sameSpacecraftLocation(ship, station)) {
      return 'Das Schiff befindet sich nicht am Feld der Station';
    }
    if (checkPrivileges) {
      const access = await this.privileges.decide(manager, station, ship);
      if (!access.allowed) return access.reason ?? 'Das Andocken wurde verweigert';
    }
    const decision = decideNearbyInteraction(
      'DOCK',
      buildNearbyInteractionContext(
        ship,
        initializeSpacecraftRuntimeSystems(ship),
        station,
        initializeSpacecraftRuntimeSystems(station),
      ),
    );
    return decision.allowed ? null : (decision.reason ?? 'Andocken nicht möglich');
  }

  /** STU cancelRepair/cancelRetrofit; returns the per-ship note, or null when nothing ran. */
  private async cancelJobs(
    manager: EntityManager,
    ship: Spacecraft,
    cancelled: Outcome['cancelled'],
  ): Promise<string | null> {
    const repairs = await this.repairService.cancelTasks(manager, [ship.id]);
    cancelled.push(...repairs);
    const jobs = await cancelShipyardJobs(manager, ship.id);
    const notes = [
      ...(repairs.length > 0 || jobs.includes(ColonyShipBuildQueueMode.REPAIR)
        ? ['Die Reparatur wurde abgebrochen']
        : []),
      ...(jobs.includes(ColonyShipBuildQueueMode.RETROFIT) ? ['Die Umrüstung wurde abgebrochen'] : []),
    ];
    return notes.length > 0 ? notes.join('; ') : null;
  }

  /** Docked-state invariant: shields and hyperdrive drop, the payer spends the dock EPS. */
  private attach(ship: Spacecraft, station: Spacecraft, payer: Spacecraft) {
    const systems = initializeSpacecraftRuntimeSystems(ship);
    if (systems.SHIELDS) systems.SHIELDS = { ...systems.SHIELDS, active: false };
    if (systems.WARPDRIVE) systems.WARPDRIVE = { ...systems.WARPDRIVE, active: false };
    ship.runtimeSystems = systems;
    payer.energy -= DOCK_EPS_COST;
    ship.dockedAtId = station.id;
  }

  private async undockInTransaction(
    manager: EntityManager,
    shipId: number,
    userId: number,
  ): Promise<Outcome> {
    const fleet = await this.ledFleet(manager, shipId, userId);
    const rows = await this.lock(manager, [
      shipId,
      ...(fleet ? await this.memberIds(manager, fleet.id) : []),
    ]);
    const lead = rows.find((row) => row.id === shipId);
    if (!lead || lead.userId !== userId) throw new NotFoundException('Schiff nicht gefunden');
    if (lead.dockedAtId == null) throw new BadRequestException('Das Schiff ist nicht angedockt');
    const stationName =
      (await manager.getRepository(Spacecraft).findOneBy({ id: lead.dockedAtId }))?.name ??
      'der Station';
    if (!fleet) {
      if (!(await this.crewService.hasEnoughCrew(lead))) {
        throw new BadRequestException('Nicht genügend Crew vorhanden');
      }
      if (lead.energy < DOCK_EPS_COST) {
        throw new BadRequestException('Zum Abdocken wird 1 Energie benötigt');
      }
      lead.energy -= DOCK_EPS_COST;
      lead.dockedAtId = null;
      await manager.save(lead);
      return {
        message: 'Abdockvorgang abgeschlossen',
        shipIds: [lead.id],
        cancelled: await this.repairService.cancelTasks(manager, [lead.id]),
      };
    }

    // STU UndockShip fleet loop: per-ship skips, missing EPS stops the remaining ships.
    const results: SpacecraftDockShipResultDto[] = [];
    const cancelled: Outcome['cancelled'] = [];
    const undocked: Spacecraft[] = [];
    for (const ship of fleetOrder(rows, fleet)) {
      const report = (status: SpacecraftDockShipResultDto['status'], reason: string | null) =>
        results.push({ shipId: ship.id, name: ship.name, status, reason });
      if (ship.dockedAtId == null) continue;
      if (!(await this.crewService.hasEnoughCrew(ship))) {
        report('skipped', 'Nicht genügend Crew vorhanden');
        continue;
      }
      if (ship.energy < DOCK_EPS_COST) {
        report('aborted', 'Nicht genügend Energie vorhanden');
        break;
      }
      const notes = await this.cancelJobs(manager, ship, cancelled);
      if (notes) {
        report('skipped', notes);
        continue;
      }
      ship.energy -= DOCK_EPS_COST;
      ship.dockedAtId = null;
      undocked.push(ship);
      report('undocked', null);
    }
    if (undocked.length > 0) await manager.save(undocked);
    return {
      message: `Flottenbefehl ausgeführt: Abdocken von ${stationName}`,
      shipIds: undocked.map((ship) => ship.id),
      cancelled,
      results,
    };
  }

  /** The fleet the ship leads, or null; membership is re-read from the locked ship rows. */
  private async ledFleet(
    manager: EntityManager,
    shipId: number,
    userId: number,
  ): Promise<Fleet | null> {
    const hint = await manager.getRepository(Spacecraft).findOneBy({ id: shipId, userId });
    if (hint?.fleetId == null) return null;
    const fleet = await manager.getRepository(Fleet).findOne({
      where: { id: hint.fleetId, userId },
    });
    return fleet?.leaderId === shipId ? fleet : null;
  }

  private async memberIds(manager: EntityManager, fleetId: number): Promise<number[]> {
    return (
      await manager.getRepository(Spacecraft).find({
        where: { fleetId },
        select: { id: true },
      })
    ).map((member) => member.id);
  }

  private async lockOwnedStation(
    manager: EntityManager,
    stationId: number,
    userId: number,
  ): Promise<Spacecraft> {
    const station = (await this.lock(manager, [stationId]))[0];
    if (!station || station.userId !== userId || station.kind !== SpacecraftKind.STATION) {
      throw new NotFoundException('Station nicht gefunden');
    }
    return station;
  }

  /** Locks rows in ascending id order so concurrent docking actions cannot deadlock. */
  private lock(manager: EntityManager, ids: number[]): Promise<Spacecraft[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return manager.getRepository(Spacecraft).find({
      where: { id: In(ids) },
      relations: SHIP_RELATIONS,
      order: { id: 'ASC' },
      lock: { mode: 'pessimistic_write', tables: ['spacecraft'] },
    });
  }
}
