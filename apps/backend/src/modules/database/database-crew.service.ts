import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  DatabaseCrewDismissResultDto,
  DatabaseCrewDto,
  DatabaseCrewLocationDto,
  DatabaseCrewMemberDto,
} from '@swuniverse/shared';
import { DataSource, EntityManager, In } from 'typeorm';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { Colony } from '../colony/entities/colony.entity';
import { Crew, CrewType } from '../colony/entities/crew.entity';
import { CrewRank, CREW_RANKS, crewRankDefinition } from '../spacecraft/crew-expertise';
import { CrewSkill } from '../spacecraft/entities/crew-skill.entity';
import { EscapePod } from '../spacecraft/entities/escape-pod.entity';
import { Spacecraft, SpacecraftKind } from '../spacecraft/entities/spacecraft.entity';
import { resolveSpaceLocation } from '../spacecraft/spacecraft-field';
import { CREW_LOCATION_RELATIONS } from '../spacecraft/crew-trade-post';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { TradePost } from '../trade/entities/trade-post.entity';

const MAX_DISMISS_IDS = 500;

const POSITION_LABELS: Record<CrewType, string> = {
  [CrewType.CAPTAIN]: 'Captain',
  [CrewType.COMMAND]: 'Kommando',
  [CrewType.SECURITY]: 'Sicherheit',
  [CrewType.SCIENCE]: 'Wissenschaft',
  [CrewType.TECHNICAL]: 'Technik',
  [CrewType.NAVIGATION]: 'Navigation',
  [CrewType.CREWMAN]: 'Crewman',
};
const POSITION_ORDER = [
  CrewType.CAPTAIN,
  CrewType.COMMAND,
  CrewType.SECURITY,
  CrewType.SCIENCE,
  CrewType.TECHNICAL,
  CrewType.NAVIGATION,
  CrewType.CREWMAN,
];

const SECTOR_RELATIONS = CREW_LOCATION_RELATIONS.map((relation) => `location.${relation}`);

/** STU `ShowCrewManagement` and `DismissCrew`: the player's whole crew in one list. */
@Injectable()
export class DatabaseCrewService {
  constructor(private readonly dataSource: DataSource) {}

  async list(userId: number): Promise<DatabaseCrewDto> {
    const manager = this.dataSource.manager;
    const assignments = await manager.find(CrewAssignment, {
      where: { userId },
      relations: { crew: true },
      order: { crewId: 'ASC' },
    });
    const ids = (pick: (assignment: CrewAssignment) => number | null) => [
      ...new Set(assignments.map(pick).filter((id): id is number => id != null)),
    ];
    const [skills, ships, colonies, posts, pods] = await Promise.all([
      manager.find(CrewSkill, { where: { crewId: In(assignments.map((a) => a.crewId)) } }),
      manager.find(Spacecraft, {
        where: { id: In(ids((a) => a.spacecraftId)) },
        relations: ['shipClass', 'location', ...SECTOR_RELATIONS],
      }),
      manager.find(Colony, { where: { id: In(ids((a) => a.colonyId)) } }),
      manager.find(TradePost, { where: { id: In(ids((a) => a.tradePostId)) } }),
      manager.find(EscapePod, {
        where: { id: In(ids((a) => a.escapePodId)) },
        relations: ['location', ...SECTOR_RELATIONS],
      }),
    ]);
    const [stations, postLocations] = await Promise.all([
      manager.find(Spacecraft, {
        where: { id: In(posts.flatMap((post) => (post.stationId == null ? [] : [post.stationId]))) },
      }),
      manager.find(SpaceLocation, {
        where: { id: In(posts.map((post) => post.locationId)) },
        relations: CREW_LOCATION_RELATIONS,
      }),
    ]);

    const skillsOf = (crewId: number) => skills.filter((skill) => skill.crewId === crewId);
    const shipById = new Map(ships.map((ship) => [ship.id, ship]));
    const colonyById = new Map(colonies.map((colony) => [colony.id, colony]));
    const postById = new Map(posts.map((post) => [post.id, post]));
    const podById = new Map(pods.map((pod) => [pod.id, pod]));
    const stationById = new Map(stations.map((station) => [station.id, station]));

    const members = assignments.map((assignment): DatabaseCrewMemberDto => {
      const { crew } = assignment;
      const crewSkills = skillsOf(crew.id);
      const rank = crew.rank ?? CrewRank.CADET;
      let location: DatabaseCrewLocationDto | null = null;
      let foreignStation = false;
      let onShip = false;
      const ship = assignment.spacecraftId == null ? undefined : shipById.get(assignment.spacecraftId);
      const colony = assignment.colonyId == null ? undefined : colonyById.get(assignment.colonyId);
      const post = assignment.tradePostId == null ? undefined : postById.get(assignment.tradePostId);
      const pod = assignment.escapePodId == null ? undefined : podById.get(assignment.escapePodId);
      if (ship) {
        const isStation = ship.kind === SpacecraftKind.STATION;
        onShip = true;
        foreignStation = isStation && ship.userId !== userId;
        location = {
          type: isStation ? 'STATION' : 'SHIP',
          id: ship.id,
          name: ship.name,
          own: ship.userId === userId,
          shipClassId: ship.shipClassId,
          shipClassKey: ship.shipClass?.key ?? null,
          sector: resolveSpaceLocation(ship.location),
        };
      } else if (colony) {
        location = {
          type: 'COLONY',
          id: colony.id,
          name: colony.name,
          own: true,
          shipClassId: null,
          shipClassKey: null,
          sector: null,
        };
      } else if (post) {
        const station = post.stationId == null ? undefined : stationById.get(post.stationId);
        foreignStation = (station?.userId ?? post.ownerId) !== userId;
        location = {
          type: 'TRADE_POST',
          id: post.id,
          name: post.name,
          own: !foreignStation,
          shipClassId: station?.shipClassId ?? null,
          shipClassKey: null,
          sector: resolveSpaceLocation(postLocations.find((entry) => entry.id === post.locationId)),
        };
      } else if (pod) {
        location = {
          type: 'ESCAPE_POD',
          id: pod.id,
          name: pod.originShipName,
          own: true,
          shipClassId: null,
          shipClassKey: null,
          sector: resolveSpaceLocation(pod.location),
        };
      }
      const position = onShip ? assignment.slot : null;
      return {
        id: crew.id,
        name: crew.name,
        rank,
        rankLabel: crewRankDefinition(rank).label,
        rankExpertise: crewRankDefinition(rank).expertise,
        highestExpertise: Math.max(0, ...crewSkills.map((skill) => skill.expertise)),
        skills: crewSkills
          .map((skill) => ({
            position: skill.position,
            positionLabel: POSITION_LABELS[skill.position] ?? skill.position,
            expertise: skill.expertise,
          }))
          .sort((a, b) => b.expertise - a.expertise),
        position,
        positionLabel: position ? (POSITION_LABELS[position] ?? position) : null,
        location,
        inEscapePod: pod !== undefined,
        onForeignStation: foreignStation,
        onForeignStationInactive: foreignStation && (post !== undefined || !assignment.slot),
      };
    });
    return {
      members,
      ranks: CREW_RANKS.map(({ rank, label, expertise }) => ({ rank, label, expertise })),
      positions: POSITION_ORDER.map((position) => ({ position, label: POSITION_LABELS[position] })),
    };
  }

  /** Dismisses the player's own crew; foreign or unknown ids are skipped and reported. */
  async dismiss(userId: number, crewIds: number[]): Promise<DatabaseCrewDismissResultDto> {
    const requested = [...new Set(crewIds)];
    if (requested.length > MAX_DISMISS_IDS) {
      throw new BadRequestException(`Es können höchstens ${MAX_DISMISS_IDS} Crewmitglieder auf einmal entlassen werden`);
    }
    return this.dataSource.transaction(async (manager) => {
      const owned = await manager.find(CrewAssignment, {
        where: { crewId: In(requested), userId },
        lock: { mode: 'pessimistic_write' },
        order: { crewId: 'ASC' },
      });
      const dismissedIds = owned.map((assignment) => assignment.crewId);
      const shipIds = [...new Set(owned.flatMap((a) => (a.spacecraftId == null ? [] : [a.spacecraftId])))];
      const podIds = [...new Set(owned.flatMap((a) => (a.escapePodId == null ? [] : [a.escapePodId])))];
      if (dismissedIds.length) {
        // Assignments and skills go with the crew row (ON DELETE CASCADE).
        await manager.delete(Crew, { id: In(dismissedIds) });
      }
      await this.refreshShipCrew(manager, shipIds);
      const removedEscapePods = await this.removeEmptyPods(manager, podIds);
      const owns = new Set(dismissedIds);
      return {
        dismissed: dismissedIds.length,
        skippedIds: requested.filter((id) => !owns.has(id)),
        removedEscapePods,
      };
    });
  }

  private async refreshShipCrew(manager: EntityManager, shipIds: number[]) {
    for (const id of shipIds) {
      const crew = await manager.count(CrewAssignment, { where: { spacecraftId: id } });
      await manager.update(Spacecraft, { id }, { crew });
    }
  }

  private async removeEmptyPods(manager: EntityManager, podIds: number[]) {
    let removed = 0;
    for (const id of podIds) {
      if (await manager.exists(CrewAssignment, { where: { escapePodId: id } })) continue;
      await manager.delete(EscapePod, { id });
      removed += 1;
    }
    return removed;
  }
}
