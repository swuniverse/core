import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { SpacecraftDockResultDto } from '@swuniverse/shared';
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
};

/** Docking of ships and fleets at stations; every action is atomic and runs in one transaction. */
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
    if (outcome.foreignDocking) {
      await this.privileges.notifyForeignDocking(
        outcome.foreignDocking.station,
        outcome.foreignDocking.ships,
      );
    }
    if (outcome.notice) {
      await this.messaging.sendSystem(outcome.notice.userId, outcome.notice.subject, outcome.notice.body);
    }
    return { message: outcome.message, shipIds: outcome.shipIds };
  }

  private async dockInTransaction(
    manager: EntityManager,
    shipId: number,
    userId: number,
    stationId: number,
  ): Promise<Outcome> {
    const [lead, station] = await this.lockPair(manager, shipId, stationId);
    if (!lead || lead.userId !== userId) throw new NotFoundException('Schiff nicht gefunden');
    if (!station || station.kind !== SpacecraftKind.STATION) {
      throw new BadRequestException('Ziel ist keine Station');
    }
    if (lead.kind !== SpacecraftKind.SHIP) {
      throw new BadRequestException('Nur Schiffe können andocken');
    }
    const fleet = lead.fleetId
      ? await manager.getRepository(Fleet).findOne({ where: { id: lead.fleetId, userId } })
      : null;
    const isFleetAction = fleet != null && fleet.leaderId === lead.id;
    let ships: Spacecraft[] = [lead];
    if (isFleetAction) {
      const members = await manager.getRepository(Spacecraft).find({
        where: { fleetId: fleet.id },
        select: { id: true },
      });
      ships = await this.lock(
        manager,
        members.map((member) => member.id),
      );
    }

    const stationSystems = initializeSpacecraftRuntimeSystems(station);
    const pending: Spacecraft[] = [];
    for (const ship of ships) {
      const label = isFleetAction ? `${ship.name}: ` : '';
      if (ship.dockedAtId === station.id) {
        if (!isFleetAction) throw new BadRequestException('Das Schiff ist bereits angedockt');
        continue;
      }
      if (ship.dockedAtId != null) {
        throw new BadRequestException(`${label}Das Schiff ist bereits an einer anderen Station angedockt`);
      }
      if (ship.kind !== SpacecraftKind.SHIP || ship.userId !== userId) {
        throw new BadRequestException(`${label}Nur eigene Schiffe können andocken`);
      }
      if (ship.status !== SpacecraftStatus.IDLE) {
        throw new BadRequestException(`${label}Das Schiff ist nicht bereit zum Andocken`);
      }
      if (!sameSpacecraftLocation(ship, station)) {
        throw new BadRequestException(`${label}Das Schiff befindet sich nicht am Feld der Station`);
      }
      const access = await this.privileges.decide(manager, station, ship);
      if (!access.allowed) {
        throw new BadRequestException(
          `${label}${access.reason ?? 'Das Andocken wurde verweigert'}`,
        );
      }
      const decision = decideNearbyInteraction(
        'DOCK',
        buildNearbyInteractionContext(
          ship,
          initializeSpacecraftRuntimeSystems(ship),
          station,
          stationSystems,
        ),
      );
      if (!decision.allowed) {
        throw new BadRequestException(
          `${label}${decision.reason ?? 'Andocken nicht möglich'}`,
        );
      }
      if (!(await this.crewService.hasEnoughCrew(ship))) {
        throw new BadRequestException(`${label}Nicht genügend Crew vorhanden`);
      }
      if (ship.energy < DOCK_EPS_COST) {
        throw new BadRequestException(`${label}Zum Andocken wird 1 Energie benötigt`);
      }
      pending.push(ship);
    }
    if (station.status !== SpacecraftStatus.IDLE && station.status !== SpacecraftStatus.UNDER_SCRAPPING) {
      throw new BadRequestException('Die Station ist nicht bereit');
    }
    const occupied = await manager
      .getRepository(Spacecraft)
      .countBy({ dockedAtId: station.id });
    if (pending.length > Math.max(0, station.dockCapacity - occupied)) {
      throw new BadRequestException('Zurzeit sind alle Dockplätze belegt');
    }

    for (const ship of pending) {
      const systems = initializeSpacecraftRuntimeSystems(ship);
      if (systems.SHIELDS) systems.SHIELDS = { ...systems.SHIELDS, active: false };
      if (systems.WARPDRIVE) systems.WARPDRIVE = { ...systems.WARPDRIVE, active: false };
      ship.runtimeSystems = systems;
      ship.energy -= DOCK_EPS_COST;
      ship.dockedAtId = station.id;
    }
    if (pending.length > 0) await manager.save(pending);
    return {
      message: isFleetAction
        ? `Flottenbefehl ausgeführt: Andocken an ${station.name}`
        : 'Andockvorgang abgeschlossen',
      shipIds: pending.map((ship) => ship.id),
      cancelled: await this.repairService.cancelTasks(
        manager,
        pending.map((ship) => ship.id),
      ),
      foreignDocking: {
        station,
        ships: pending,
      },
    };
  }

  private async undockInTransaction(
    manager: EntityManager,
    shipId: number,
    userId: number,
  ): Promise<Outcome> {
    const lead = (await this.lock(manager, [shipId]))[0];
    if (!lead || lead.userId !== userId) throw new NotFoundException('Schiff nicht gefunden');
    if (lead.dockedAtId == null) throw new BadRequestException('Das Schiff ist nicht angedockt');
    const fleet = lead.fleetId
      ? await manager.getRepository(Fleet).findOne({ where: { id: lead.fleetId, userId } })
      : null;
    const isFleetAction = fleet != null && fleet.leaderId === lead.id;
    let ships: Spacecraft[] = [lead];
    if (isFleetAction) {
      const members = await manager.getRepository(Spacecraft).find({
        where: { fleetId: fleet.id },
        select: { id: true },
      });
      ships = (await this.lock(manager, members.map((member) => member.id))).filter(
        (ship) => ship.dockedAtId === lead.dockedAtId,
      );
    }
    for (const ship of ships) {
      const label = isFleetAction ? `${ship.name}: ` : '';
      if (!(await this.crewService.hasEnoughCrew(ship))) {
        throw new BadRequestException(`${label}Nicht genügend Crew vorhanden`);
      }
      if (ship.energy < DOCK_EPS_COST) {
        throw new BadRequestException(`${label}Zum Abdocken wird 1 Energie benötigt`);
      }
    }
    const stationName =
      (await manager.getRepository(Spacecraft).findOneBy({ id: lead.dockedAtId }))?.name ??
      'der Station';
    for (const ship of ships) {
      ship.energy -= DOCK_EPS_COST;
      ship.dockedAtId = null;
    }
    await manager.save(ships);
    return {
      message: isFleetAction
        ? `Flottenbefehl ausgeführt: Abdocken von ${stationName}`
        : 'Abdockvorgang abgeschlossen',
      shipIds: ships.map((ship) => ship.id),
      cancelled: await this.repairService.cancelTasks(
        manager,
        ships.map((ship) => ship.id),
      ),
    };
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

  private async lockPair(
    manager: EntityManager,
    shipId: number,
    stationId: number,
  ): Promise<[Spacecraft | undefined, Spacecraft | undefined]> {
    const rows = await this.lock(manager, [shipId, stationId]);
    return [rows.find((row) => row.id === shipId), rows.find((row) => row.id === stationId)];
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
