import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { User } from '../auth/user.entity';
import { AllianceMembership } from '../alliance/entities/alliance-membership.entity';
import { DockingPrivilege } from './entities/docking-privilege.entity';
import { decideDockingAccess } from './docking-access';
import { Spacecraft } from './entities/spacecraft.entity';
import {
  initializeSpacecraftRuntimeSystems,
  SpacecraftRuntimeStateService,
} from './spacecraft-runtime-state.service';
import type { StationUplinkDto } from '@swuniverse/shared';

export const hasStationUplink = (
  ship: Pick<Spacecraft, 'kind' | 'stationRole'>,
) => ship.kind === 'STATION' && ship.stationRole === 'SENSOR';

/** Crew ownership, admission and withdrawal are independent of cargo permissions. */
@Injectable()
export class StationUplinkService {
  constructor(private readonly db: DataSource) {}

  async getOverview(id: number, userId: number): Promise<StationUplinkDto> {
    const station = await this.db.manager.findOne(Spacecraft, {
      where: { id, userId },
    });
    if (!station || station.rpgHidden || !hasStationUplink(station))
      throw new NotFoundException('Sensorphalanx nicht gefunden');
    const assignments = await this.db.manager.find(CrewAssignment, {
      where: { spacecraftId: id },
      relations: ['crew'],
      order: { crewId: 'ASC' },
    });
    const guests = assignments.filter((member) => member.userId !== userId);
    const owners = guests.length
      ? await this.db.manager.find(User, {
          where: { id: In(guests.map((member) => member.userId)) },
        })
      : [];
    const ownCrew = assignments.length - guests.length;
    return {
      system: initializeSpacecraftRuntimeSystems(station).UPLINK!,
      ownCrew,
      crewRequired: station.crewRequired,
      capacity: 3,
      activationEps: 0,
      epsPerTick: 5,
      activationReason:
        ownCrew < station.crewRequired
          ? 'Nicht genug Crew des Stationsbesitzers'
          : guests.length === 0
            ? 'Keine fremde Crew an Bord'
            : null,
      guests: guests.map((member) => {
        const owner = owners.find((owner) => owner.id === member.userId);
        return {
          id: member.crewId,
          name: member.crew.name,
          ownerId: member.userId,
          ownerName:
            owner?.displayName ?? owner?.username ?? String(member.userId),
        };
      }),
    };
  }

  async transferLimit(
    manager: EntityManager,
    source: Spacecraft,
    target: Spacecraft,
    userId: number,
  ): Promise<{ maximum: number; reason: string | null }> {
    const own = await manager.count(CrewAssignment, {
      where: { spacecraftId: source.id, userId },
    });
    const aboard = await manager.count(CrewAssignment, {
      where: { spacecraftId: target.id },
    });
    let maximum = Math.min(own, Math.max(0, target.crewMax - aboard));
    if (target.userId !== userId) {
      if (!hasStationUplink(target))
        return {
          maximum: 0,
          reason:
            'Fremde Crew ist nur an einer Sensorphalanx mit Kooperationsuplink möglich',
        };
      if (
        (initializeSpacecraftRuntimeSystems(target).UPLINK?.integrity ?? 0) <= 0
      )
        return {
          maximum: 0,
          reason: 'Das Ziel verfügt über keinen intakten Kooperationsuplink',
        };
      const [actor, membership, rules] = await Promise.all([
        manager.findOneBy(User, { id: userId }),
        manager.findOneBy(AllianceMembership, { userId }),
        manager.find(DockingPrivilege, { where: { stationId: target.id } }),
      ]);
      if (
        !decideDockingAccess(
          target.userId,
          {
            shipId: source.id,
            userId,
            factionId: actor?.factionId ?? null,
            allianceId: membership?.allianceId ?? null,
          },
          rules,
        ).allowed
      )
        return {
          maximum: 0,
          reason: 'Benötigte Andockerlaubnis wurde verweigert',
        };
      const guests = await manager.find(CrewAssignment, {
        where: { spacecraftId: target.id },
      });
      if (guests.some((member) => member.userId === userId))
        return {
          maximum: 0,
          reason: 'Pro fremdem Spieler ist ein Crewmitglied zugelassen',
        };
      if (
        guests.filter((member) => member.userId !== target.userId).length >= 3
      )
        return {
          maximum: 0,
          reason: 'Die drei Fremdspielerplätze sind belegt',
        };
      maximum = Math.min(maximum, 1);
    }
    if (source.userId !== userId && !hasStationUplink(source))
      return {
        maximum: 0,
        reason: 'Crew kann von diesem fremden Schiff nicht abgezogen werden',
      };
    return {
      maximum,
      reason:
        maximum > 0
          ? null
          : own === 0
            ? 'Keine eigene Crew zum Transfer vorhanden'
            : 'Nicht genug Crewkapazität',
    };
  }

  async assertActivation(
    ship: Spacecraft,
    manager = this.db.manager,
  ): Promise<void> {
    const assignments = await manager.find(CrewAssignment, {
      where: { spacecraftId: ship.id },
    });
    if (
      assignments.filter((member) => member.userId === ship.userId).length <
      ship.crewRequired
    )
      throw new BadRequestException('Nicht genug Crew des Stationsbesitzers');
    if (!assignments.some((member) => member.userId !== ship.userId))
      throw new BadRequestException('Keine fremde Crew an Bord');
  }

  async toggle(id: number, userId: number, active: boolean) {
    return this.db.transaction(async (manager) => {
      const station = await manager.findOne(Spacecraft, {
        where: { id, userId },
        relations: ['modules'],
        lock: { mode: 'pessimistic_write', tables: ['spacecraft'] },
      });
      if (!station || station.rpgHidden || !hasStationUplink(station))
        throw new NotFoundException('Sensorphalanx nicht gefunden');
      const systems = initializeSpacecraftRuntimeSystems(station);
      if (active) {
        new SpacecraftRuntimeStateService().requireActivation(
          systems,
          'UPLINK',
        );
        if (!systems.EPS)
          throw new BadRequestException(
            'Kooperationsuplink benötigt ein EPS-System',
          );
        await this.assertActivation(station, manager);
      }
      systems.UPLINK!.active = active;
      await manager.update(Spacecraft, id, { runtimeSystems: systems });
      return { systems };
    });
  }

  /** A tick cannot use guests to satisfy the station owner's crew requirement. */
  async prepareTick(ship: Spacecraft): Promise<void> {
    if (!hasStationUplink(ship)) return;
    const own = await this.db.manager.count(CrewAssignment, {
      where: { spacecraftId: ship.id, userId: ship.userId },
    });
    const foreign =
      (await this.db.manager.count(CrewAssignment, {
        where: { spacecraftId: ship.id },
      })) - own;
    const systems = initializeSpacecraftRuntimeSystems(ship);
    if (
      systems.UPLINK &&
      (own < ship.crewRequired ||
        foreign === 0 ||
        systems.UPLINK.integrity <= 0)
    )
      systems.UPLINK.active = false;
  }
}
