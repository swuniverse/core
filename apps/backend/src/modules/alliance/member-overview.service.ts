import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AllianceColonyStockDto,
  AllianceMemberOperationsDto,
  AllianceMemberOverviewDto,
  AllianceMemberShipGroupDto,
  AlliancePermission,
} from '@swuniverse/shared';
import { hasPermission } from './alliance-permissions';
import { ALLIANCE_STORE } from './alliance.store';
import type { AllianceStore, MembershipRecord } from './alliance.store';
import { MEMBER_OPERATIONS_READER } from './member-operations.port';
import type {
  MemberOperationsReader,
  MemberOperationsRecord,
} from './member-operations.port';

const ERR = {
  allianceNotFound: 'Die Allianz existiert nicht',
  colonyNotFound: 'Die Kolonie existiert nicht',
  forbidden: 'Dazu fehlt Dir die Berechtigung',
} as const;

const rank = (m: MembershipRecord) =>
  m.roles[0]?.sort ?? Number.POSITIVE_INFINITY;

const emptyOperations = (userId: number): MemberOperationsRecord => ({
  userId,
  lastActiveAt: null,
  crew: { assigned: 0, limit: 0 },
  colonies: [],
  ships: [],
});

/**
 * Operational overview of all current alliance members for president and
 * vice. Derived from the current membership on every request.
 */
@Injectable()
export class MemberOverviewService {
  constructor(
    @Inject(ALLIANCE_STORE) private readonly store: AllianceStore,
    @Inject(MEMBER_OPERATIONS_READER)
    private readonly reader: MemberOperationsReader,
  ) {}

  async getOverview(
    viewerId: number,
    allianceId: number,
  ): Promise<AllianceMemberOverviewDto> {
    const viewer = await this.requireViewableAlliance(viewerId, allianceId);
    const seesColonies = hasPermission(viewer, AlliancePermission.VIEW_COLONIES);
    const seesShips = hasPermission(viewer, AlliancePermission.VIEW_SHIPS);
    const memberships = await this.store.listMemberships(allianceId);
    const ids = memberships.map((m) => m.userId);
    const [players, factions, operations] = await Promise.all([
      this.store.findPlayers(ids),
      this.store.listFactions(),
      this.reader.memberOperations(ids),
    ]);
    const player = new Map(players.map((p) => [p.id, p]));
    const operationsOf = new Map(operations.map((o) => [o.userId, o]));

    const members = [...memberships]
      .sort((a, b) => rank(a) - rank(b))
      .map((m): AllianceMemberOperationsDto => {
        const info = player.get(m.userId);
        const faction = factions.find((f) => f.id === info?.factionId);
        const ops = operationsOf.get(m.userId) ?? emptyOperations(m.userId);
        return {
          userId: m.userId,
          name: info?.name ?? 'Unbekannt',
          avatar: info?.avatar ?? null,
          faction: faction?.key ?? null,
          factionName: faction?.name ?? null,
          roles: m.roles.map(({ id, title, sort }) => ({ id, title, sort })),
          lastActiveAt: ops.lastActiveAt?.toISOString() ?? null,
          crew: { assigned: ops.crew.assigned, limit: ops.crew.limit },
          colonies: (seesColonies ? ops.colonies : []).map((c) => ({
            id: c.id,
            name: c.name,
            location: c.location,
            energy: c.energy,
            energyMax: c.energyMax,
            storageUsed: c.storageUsed,
            storageMax: c.storageMax,
            population: c.population,
            populationMax: c.populationMax,
          })),
          shipGroups: seesShips ? this.groupShips(ops) : [],
        };
      });
    return { allianceId, members };
  }

  async getColonyStock(
    viewerId: number,
    allianceId: number,
    colonyId: number,
  ): Promise<AllianceColonyStockDto> {
    const viewer = await this.requireViewableAlliance(viewerId, allianceId);
    if (!hasPermission(viewer, AlliancePermission.VIEW_COLONIES)) {
      throw new ForbiddenException(ERR.forbidden);
    }
    const stock = await this.reader.colonyStock(colonyId);
    const memberships = await this.store.listMemberships(allianceId);
    if (!stock || !memberships.some((m) => m.userId === stock.userId)) {
      throw new NotFoundException(ERR.colonyNotFound);
    }
    return {
      allianceId,
      colonyId: stock.colonyId,
      items: stock.items.map((i) => ({
        commodityId: i.commodityId,
        name: i.name,
        amount: i.amount,
      })),
    };
  }

  /**
   * Not Found for outsiders, Forbidden without VIEW_MEMBER_DATA. Deviation
   * from STU (any of several rights opens the page): colonies and ships are
   * additionally gated by VIEW_COLONIES and VIEW_SHIPS.
   */
  private async requireViewableAlliance(
    viewerId: number,
    allianceId: number,
  ): Promise<MembershipRecord> {
    const alliance = await this.store.findAlliance(allianceId);
    const membership = await this.store.findMembership(viewerId);
    if (!alliance || membership?.allianceId !== allianceId) {
      throw new NotFoundException(ERR.allianceNotFound);
    }
    if (!hasPermission(membership, AlliancePermission.VIEW_MEMBER_DATA)) {
      throw new ForbiddenException(ERR.forbidden);
    }
    return membership;
  }

  private groupShips(
    ops: MemberOperationsRecord,
  ): AllianceMemberShipGroupDto[] {
    const groups = new Map<number, AllianceMemberShipGroupDto>();
    for (const ship of ops.ships) {
      let group = groups.get(ship.shipClassId);
      if (!group) {
        group = {
          shipClassId: ship.shipClassId,
          shipClassName: ship.shipClassName,
          ships: [],
        };
        groups.set(ship.shipClassId, group);
      }
      group.ships.push({
        id: ship.id,
        name: ship.name,
        location: ship.location,
      });
    }
    return [...groups.values()].sort((a, b) =>
      a.shipClassName.localeCompare(b.shipClassName, 'de'),
    );
  }
}
