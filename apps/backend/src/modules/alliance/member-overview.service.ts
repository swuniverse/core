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
  AllianceRole,
} from '@swuniverse/shared';
import { mayActOnAlliance } from './alliance-permissions';
import { ALLIANCE_STORE } from './alliance.store';
import type { AllianceRecord, AllianceStore } from './alliance.store';
import { MEMBER_OPERATIONS_READER } from './member-operations.port';
import type {
  MemberOperationsReader,
  MemberOperationsRecord,
} from './member-operations.port';

const { PRESIDENT, VICE, DIPLOMAT } = AllianceRole;

const ERR = {
  allianceNotFound: 'Die Allianz existiert nicht',
  colonyNotFound: 'Die Kolonie existiert nicht',
  forbidden: 'Dazu fehlt Dir die Berechtigung',
} as const;

const ROLE_ORDER: Record<AllianceRole, number> = {
  [PRESIDENT]: 0,
  [VICE]: 1,
  [DIPLOMAT]: 2,
  [AllianceRole.NONE]: 3,
};

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
    const alliance = await this.requireViewableAlliance(viewerId, allianceId);
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
      .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role])
      .map((m): AllianceMemberOperationsDto => {
        const info = player.get(m.userId);
        const faction = factions.find((f) => f.id === info?.factionId);
        const ops = operationsOf.get(m.userId) ?? emptyOperations(m.userId);
        return {
          userId: m.userId,
          name: info?.name ?? 'Unbekannt',
          faction: faction?.key ?? null,
          factionName: faction?.name ?? null,
          role: m.role,
          roleTitle: this.roleTitle(alliance, m.role),
          lastActiveAt: ops.lastActiveAt?.toISOString() ?? null,
          crew: { assigned: ops.crew.assigned, limit: ops.crew.limit },
          colonies: ops.colonies.map((c) => ({
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
          shipGroups: this.groupShips(ops),
        };
      });
    return { allianceId, members };
  }

  async getColonyStock(
    viewerId: number,
    allianceId: number,
    colonyId: number,
  ): Promise<AllianceColonyStockDto> {
    await this.requireViewableAlliance(viewerId, allianceId);
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

  /** Not Found for outsiders, Forbidden for members without the right. */
  private async requireViewableAlliance(
    viewerId: number,
    allianceId: number,
  ): Promise<AllianceRecord> {
    const alliance = await this.store.findAlliance(allianceId);
    const membership = await this.store.findMembership(viewerId);
    if (!alliance || membership?.allianceId !== allianceId) {
      throw new NotFoundException(ERR.allianceNotFound);
    }
    if (!mayActOnAlliance(membership.role, 'viewMemberOperations')) {
      throw new ForbiddenException(ERR.forbidden);
    }
    return alliance;
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

  private roleTitle(alliance: AllianceRecord, role: AllianceRole) {
    switch (role) {
      case PRESIDENT:
        return alliance.presidentTitle;
      case VICE:
        return alliance.viceTitle;
      case DIPLOMAT:
        return alliance.diplomatTitle;
      default:
        return null;
    }
  }
}
