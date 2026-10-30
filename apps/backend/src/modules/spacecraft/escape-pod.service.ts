import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type {
  LostCrewPodDto,
  SpacecraftSalvagePodsResultDto,
} from '@swuniverse/shared';
import { DataSource, EntityManager, In } from 'typeorm';
import { User } from '../auth/user.entity';
import { ColonyCrewService } from '../colony/colony-crew.service';
import { ColonyChangeable } from '../colony/entities/colony-changeable.entity';
import { Colony } from '../colony/entities/colony.entity';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { GameDataService } from '../game-data/game-data.service';
import { MessageFolder } from '../messaging/message-folder';
import { MessagingService } from '../messaging/messaging.service';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { SystemField } from '../starmap/entities/system-field.entity';
import { EscapePod, EscapePodLaunchReason } from './entities/escape-pod.entity';
import { Spacecraft, SpacecraftStatus } from './entities/spacecraft.entity';
import { SpacecraftRuntimeStateService } from './spacecraft-runtime-state.service';
import { resolveSpaceLocation } from './spacecraft-field';

type FlightDirection = 'TOP' | 'RIGHT' | 'BOTTOM' | 'LEFT';

/** Deterministic fallback order when the last flight direction is unusable. */
const DIRECTION_ORDER: readonly FlightDirection[] = [
  'TOP',
  'RIGHT',
  'BOTTOM',
  'LEFT',
];
const DIRECTION_DELTA: Record<FlightDirection, [number, number]> = {
  TOP: [0, -1],
  RIGHT: [1, 0],
  BOTTOM: [0, 1],
  LEFT: [-1, 0],
};

const FALLBACK_PRESENTATION_KEY = 'REBEL_ESCAPE_PODS';

/** EPS cost of one salvage action (STU parity). */
export const SALVAGE_EPS_COST = 1;

export interface EscapePodLaunchResult {
  podId: number;
  crewCount: number;
}

export interface NearbyEscapePod {
  id: number;
  targetType: 'ESCAPE_POD';
  originShipName: string;
  occupantCount: number;
  presentationKey: string;
  displayName: string;
  icon: string | null;
  canSalvage: boolean;
}

/**
 * Neutral escape pods: launched with the individual crew of a lost ship and
 * landed on a colony of the crew's owner by the tick.
 */
@Injectable()
export class EscapePodService {
  private readonly logger = new Logger(EscapePodService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly gameData: GameDataService,
    private readonly colonyCrewService: ColonyCrewService,
    private readonly messagingService: MessagingService,
    private readonly runtimeState: SpacecraftRuntimeStateService = {
      initialize: () => ({}),
    } as unknown as SpacecraftRuntimeStateService,
  ) {}

  /**
   * Moves all crew of `ship` into a new pod inside the caller's transaction.
   * Returns null when nobody is aboard. The caller persists the ship.
   */
  async launchForShip(
    manager: EntityManager,
    ship: Spacecraft,
    reason: EscapePodLaunchReason,
  ): Promise<EscapePodLaunchResult | null> {
    const assignments = await manager.find(CrewAssignment, {
      where: { spacecraftId: ship.id },
      order: { crewId: 'ASC' },
      lock: { mode: 'pessimistic_write' },
    });
    if (assignments.length === 0) return null;

    const owner = await manager.findOne(User, { where: { id: ship.userId } });
    const presentation = this.gameData.getEscapePodPresentationForFaction(
      owner?.faction,
    );
    const location = await this.resolvePodLocation(manager, ship);
    const pod = await manager.save(
      manager.create(EscapePod, {
        locationId: location.id,
        originSpacecraftId: ship.id,
        originShipName: ship.name,
        originShipClassId: ship.shipClassId,
        originFaction: owner?.faction ?? null,
        presentationKey: presentation?.key ?? FALLBACK_PRESENTATION_KEY,
        launchReason: reason,
      }),
    );
    for (const assignment of assignments) {
      assignment.spacecraftId = null;
      assignment.colonyId = null;
      assignment.escapePodId = pod.id;
      assignment.slot = null;
    }
    await manager.save(assignments);
    ship.crew = 0;
    return { podId: pod.id, crewCount: assignments.length };
  }

  /** Life support failure: the ship survives, its crew leaves in a pod. */
  async evacuateLifeSupportFailure(ship: Spacecraft): Promise<number> {
    return this.dataSource.transaction(async (manager) => {
      const result = await this.launchForShip(
        manager,
        ship,
        EscapePodLaunchReason.LIFE_SUPPORT_FAILURE,
      );
      if (!result) return 0;
      await manager.save(ship);
      return result.crewCount;
    });
  }

  async listNearby(
    locationId: number | null,
    viewerId?: number,
  ): Promise<NearbyEscapePod[]> {
    if (locationId == null) return [];
    const pods = await this.dataSource
      .getRepository(EscapePod)
      .find({ where: { locationId }, order: { id: 'ASC' } });
    if (pods.length === 0) return [];
    const rows: Array<{ podId: number; userId: number; cnt: string }> =
      await this.dataSource
        .getRepository(CrewAssignment)
        .createQueryBuilder('ca')
        .select('ca.escapePodId', 'podId')
        .addSelect('ca.userId', 'userId')
        .addSelect('COUNT(*)', 'cnt')
        .where('ca.escapePodId IN (:...ids)', {
          ids: pods.map((pod) => pod.id),
        })
        .groupBy('ca.escapePodId')
        .addGroupBy('ca.userId')
        .getRawMany();
    const counts = new Map<number, number>();
    const ownPods = new Set<number>();
    for (const row of rows) {
      counts.set(row.podId, (counts.get(row.podId) ?? 0) + Number(row.cnt));
      if (viewerId != null && row.userId === viewerId) ownPods.add(row.podId);
    }
    return pods.map((pod) => {
      const presentation = this.gameData.getEscapePodPresentation(
        pod.presentationKey,
      );
      return {
        id: pod.id,
        targetType: 'ESCAPE_POD' as const,
        originShipName: pod.originShipName,
        occupantCount: counts.get(pod.id) ?? 0,
        presentationKey: pod.presentationKey,
        displayName: presentation?.displayName ?? 'Rettungskapseln',
        icon: presentation?.icon ?? null,
        canSalvage: ownPods.has(pod.id),
      };
    });
  }

  /** Pods holding crew of `userId`, for the "Verschollene Crew" list. */
  async listLostCrew(userId: number): Promise<LostCrewPodDto[]> {
    const rows: Array<{ podId: number; cnt: string }> = await this.dataSource
      .getRepository(CrewAssignment)
      .createQueryBuilder('ca')
      .select('ca.escapePodId', 'podId')
      .addSelect('COUNT(*)', 'cnt')
      .where('ca.userId = :userId AND ca.escapePodId IS NOT NULL', { userId })
      .groupBy('ca.escapePodId')
      .getRawMany();
    if (rows.length === 0) return [];
    const pods = await this.dataSource.getRepository(EscapePod).find({
      where: { id: In(rows.map((row) => row.podId)) },
      relations: { location: { galaxyField: true, systemField: true } },
      order: { id: 'ASC' },
    });
    const counts = new Map(rows.map((row) => [row.podId, Number(row.cnt)]));
    return pods.map((pod) => {
      const presentation = this.gameData.getEscapePodPresentation(
        pod.presentationKey,
      );
      const location = resolveSpaceLocation(pod.location);
      return {
        podId: pod.id,
        originShipName: pod.originShipName,
        crewCount: counts.get(pod.id) ?? 0,
        displayName: presentation?.displayName ?? 'Rettungskapseln',
        icon: presentation?.icon ?? null,
        location: location
          ? {
              scope: location.scope,
              x: location.x,
              y: location.y,
              ...(location.scope === 'SYSTEM'
                ? { systemId: location.systemId }
                : { layerId: location.layerId }),
            }
          : null,
      };
    });
  }

  /**
   * Salvages the caller's own crew from a pod at the ship's field (STU
   * `SalvageEmergencyPods`). Crew of other players stays in the pod.
   */
  async salvage(
    shipId: number,
    userId: number,
    podId: number,
  ): Promise<SpacecraftSalvagePodsResultDto> {
    return this.dataSource.transaction(async (manager) => {
      const ship = await manager.findOne(Spacecraft, {
        where: { id: shipId, userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!ship) throw new NotFoundException('Schiff nicht gefunden');
      const pod = await manager.findOne(EscapePod, {
        where: { id: podId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!pod || pod.locationId !== ship.locationId) {
        throw new BadRequestException('Rettungskapseln nicht gefunden');
      }
      if (ship.status !== SpacecraftStatus.IDLE) {
        throw new BadRequestException('Das Schiff ist nicht bereit');
      }
      const systems = this.runtimeState.initialize(ship);
      if (systems.WARPDRIVE?.active === true) {
        throw new BadRequestException('Der Warpantrieb ist aktiviert');
      }
      if (systems.SHIELDS?.active === true) {
        throw new BadRequestException('Die Schilde sind aktiviert');
      }
      if (ship.energy < SALVAGE_EPS_COST) {
        throw new BadRequestException('Nicht genug Energie vorhanden');
      }

      const podCrew = await manager.find(CrewAssignment, {
        where: { escapePodId: pod.id },
        order: { crewId: 'ASC' },
        lock: { mode: 'pessimistic_write' },
      });
      const own = podCrew.filter((member) => member.userId === userId);
      const foreign = podCrew.length - own.length;
      if (own.length === 0) {
        throw new BadRequestException(
          foreign > 0
            ? 'Die Insassen gehören einem anderen Spieler und können noch nicht geborgen werden'
            : 'In den Rettungskapseln befindet sich keine Crew',
        );
      }
      const aboard = await manager.count(CrewAssignment, {
        where: { spacecraftId: ship.id },
      });
      if ((ship.crewRequired ?? 0) > 0 && aboard < ship.crewRequired) {
        throw new BadRequestException('Nicht genügend Crew vorhanden');
      }
      const free = Math.max(0, ship.crewMax - aboard);
      if (free === 0) {
        throw new BadRequestException('Nicht genug Crewkapazität');
      }
      const boarding = own.slice(0, free);
      for (const member of boarding) {
        member.escapePodId = null;
        member.spacecraftId = ship.id;
        member.slot = null;
      }
      await manager.save(boarding);
      if (boarding.length === podCrew.length) await manager.remove(pod);
      ship.crew = aboard + boarding.length;
      ship.energy -= SALVAGE_EPS_COST;
      await manager.save(ship);

      const remaining = own.length - boarding.length;
      return {
        salvaged: boarding.length,
        remaining,
        foreign,
        energy: ship.energy,
        message:
          `${boarding.length} Crewmitglieder wurden von den Rettungskapseln geborgen` +
          (remaining > 0
            ? `, ${remaining} weitere haben keinen Platz mehr an Bord`
            : '') +
          (foreign > 0
            ? `, ${foreign} fremde Insassen können noch nicht geborgen werden`
            : ''),
      };
    });
  }

  /** Tick: land crew on the colony of its owner; drop empty pods. */
  async processTick(): Promise<void> {
    const pods = await this.dataSource
      .getRepository(EscapePod)
      .find({ order: { id: 'ASC' } });
    const landedByOwner = new Map<number, Map<string, number>>();
    for (const { id } of pods) {
      try {
        await this.dataSource.transaction((manager) =>
          this.landPod(manager, id, landedByOwner),
        );
      } catch (error) {
        this.logger.error(
          `Escape pod ${id} could not be processed`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
    for (const [userId, byColony] of landedByOwner) {
      const total = [...byColony.values()].reduce((sum, n) => sum + n, 0);
      const detail = [...byColony]
        .map(([name, count]) => `${count} auf ${name}`)
        .join(', ');
      await this.messagingService.sendSystem(
        userId,
        'Rettungskapseln gelandet',
        `${total} deiner Crewmitglieder sind aus Rettungskapseln gelandet: ${detail}.`,
        undefined,
        MessageFolder.COLONY,
      );
    }
  }

  private async landPod(
    manager: EntityManager,
    podId: number,
    landedByOwner: Map<number, Map<string, number>>,
  ): Promise<void> {
    const pod = await manager.findOne(EscapePod, {
      where: { id: podId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!pod) return;
    const assignments = await manager.find(CrewAssignment, {
      where: { escapePodId: pod.id },
      order: { crewId: 'ASC' },
      lock: { mode: 'pessimistic_write' },
    });
    if (assignments.length === 0) {
      await manager.remove(pod);
      return;
    }
    const location = await manager.findOne(SpaceLocation, {
      where: { id: pod.locationId },
      relations: ['systemField'],
    });
    const field = location?.systemField;
    if (!field) return;
    const colony = await manager.findOne(Colony, {
      where: [
        { systemFieldId: field.id },
        { starSystemId: field.starSystemId, posX: field.sx, posY: field.sy },
      ],
      relations: ['fields', 'changeable'],
    });
    if (!colony || colony.userId == null) return;

    const own = assignments.filter(
      (assignment) => assignment.userId === colony.userId,
    );
    const colonyCrew = await manager.find(CrewAssignment, {
      where: { colonyId: colony.id },
      lock: { mode: 'pessimistic_write' },
    });
    const free = Math.max(
      0,
      this.colonyCrewService.getLocalCrewLimit(colony) - colonyCrew.length,
    );
    const landing = own.slice(0, free);
    if (landing.length === 0) return;

    for (const assignment of landing) {
      assignment.escapePodId = null;
      assignment.colonyId = colony.id;
    }
    await manager.save(landing);
    await manager.update(
      ColonyChangeable,
      { colonyId: colony.id },
      { trainedCrew: colonyCrew.length + landing.length },
    );
    if (landing.length === assignments.length) await manager.remove(pod);

    const byColony = landedByOwner.get(colony.userId) ?? new Map();
    byColony.set(
      colony.name,
      (byColony.get(colony.name) ?? 0) + landing.length,
    );
    landedByOwner.set(colony.userId, byColony);
  }

  /**
   * The ship's own field, or - when that field deals special damage - the
   * neighbour in the last flight direction, else the first passable
   * orthogonal neighbour; the origin if none exists.
   */
  private async resolvePodLocation(
    manager: EntityManager,
    ship: Spacecraft,
  ): Promise<SpaceLocation> {
    const origin = await manager.findOne(SpaceLocation, {
      where: { id: ship.locationId },
      relations: ['galaxyField', 'systemField'],
    });
    if (!origin) throw new NotFoundException('Spacecraft location not found');
    const field = origin.galaxyField ?? origin.systemField;
    if (!field || (field.damage ?? 0) === 0) return origin;

    const preferred = ship.lastGalaxyFlightDirection;
    const order = preferred
      ? [preferred, ...DIRECTION_ORDER.filter((d) => d !== preferred)]
      : DIRECTION_ORDER;
    for (const direction of order) {
      const neighbour = await this.findPassableNeighbour(
        manager,
        origin,
        direction,
      );
      if (neighbour) return neighbour;
    }
    return origin;
  }

  private async findPassableNeighbour(
    manager: EntityManager,
    origin: SpaceLocation,
    direction: FlightDirection,
  ): Promise<SpaceLocation | null> {
    const [dx, dy] = DIRECTION_DELTA[direction];
    if (origin.galaxyField) {
      const target = await manager.findOne(GalaxyField, {
        where: {
          layerId: origin.galaxyField.layerId,
          cx: origin.galaxyField.cx + dx,
          cy: origin.galaxyField.cy + dy,
        },
      });
      if (!target || !(target.passableOverride ?? target.isPassable)) {
        return null;
      }
      return manager.findOne(SpaceLocation, {
        where: { galaxyFieldId: target.id },
        relations: ['galaxyField'],
      });
    }
    if (origin.systemField) {
      const target = await manager.findOne(SystemField, {
        where: {
          starSystemId: origin.systemField.starSystemId,
          sx: origin.systemField.sx + dx,
          sy: origin.systemField.sy + dy,
        },
      });
      if (!target || !target.isPassable) return null;
      return manager.findOne(SpaceLocation, {
        where: { systemFieldId: target.id },
        relations: ['systemField'],
      });
    }
    return null;
  }
}
