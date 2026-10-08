import { Inject, Injectable } from '@nestjs/common';
import {
  AllianceRelationshipType,
  AllianceRole,
  type Stance,
} from '@swuniverse/shared';
import { ALLIANCE_STORE } from './alliance.store';
import type {
  AllianceRelationshipRecord,
  AllianceStore,
  MembershipRecord,
  PlayerRecord,
} from './alliance.store';

/**
 * The stance between two players plus the capabilities derived from it.
 * Consumers ask for a capability instead of interpreting relationship types.
 */
export interface ResolvedStance {
  status: Stance;
  isFriend: boolean;
  isEnemy: boolean;
  mayReactAutomatically: boolean;
  mayTransferSafely: boolean;
  mayProvisionProtectedShip: boolean;
  mayShareLivePosition: boolean;
  mayShareHistoricalScans: boolean;
  /** Same-alliance only: the other player's ships appear on the alliance map. */
  mayShareAllianceMap: boolean;
}

/**
 * Candidates for the viewer's starmap, derived from one read of the viewer's
 * membership. Whether a candidate's ships are shown is still decided by the
 * capabilities of the resolved stance.
 */
export interface StarmapCandidates {
  /** The membership snapshot all other fields were derived from. */
  viewerMembership: MembershipRecord | null;
  /** The viewer's current alliance; null without one. */
  alliance: { id: number; name: string; color: string | null } | null;
  /** Other current members of that alliance. */
  mateIds: number[];
  /** The viewer's current office in that alliance; null without alliance. */
  viewerRole: AllianceRole | null;
  /** Current members of alliances in an active relationship with it. */
  partnerIds: number[];
}

/** Options for {@link RelationshipResolverService.resolveMany}. */
export interface ResolveManyOptions {
  /**
   * The viewer's membership as already read in this request (null for none).
   * Used instead of a second read so one response stays consistent.
   */
  viewerMembership?: MembershipRecord | null;
}

/**
 * Extension seam for the lowest-priority rule: a personal contact marking
 * another player as Freund. SWU has no contact list yet, so the default
 * implementation never reports one; the Siedler-Abkommen stage plugs in here.
 */
export interface PersonalContactStatusPort {
  isFriend(firstPlayerId: number, secondPlayerId: number): Promise<boolean>;
}

export const PERSONAL_CONTACT_STATUS = Symbol('PERSONAL_CONTACT_STATUS');

@Injectable()
export class NoPersonalContactStatusPort implements PersonalContactStatusPort {
  async isFriend(): Promise<boolean> {
    return false;
  }
}

@Injectable()
export class RelationshipResolverService {
  constructor(
    @Inject(ALLIANCE_STORE) private readonly store: AllianceStore,
    @Inject(PERSONAL_CONTACT_STATUS)
    private readonly personalContactStatus: PersonalContactStatusPort,
  ) {}

  /**
   * Resolves the viewer's stance towards several players at once with a
   * fixed number of store lookups, however many players are asked for.
   * Never throws; failures resolve to a closed Neutral.
   */
  async resolveMany(
    viewerId: number,
    otherPlayerIds: Iterable<number>,
    options: ResolveManyOptions = {},
  ): Promise<Map<number, ResolvedStance>> {
    const ids = [...new Set(otherPlayerIds)];
    if (ids.length === 0) return new Map();
    let context: StanceContext;
    try {
      context = await this.loadStanceContext(viewerId, ids, options);
    } catch {
      return new Map(ids.map((id) => [id, resolved('NEUTRAL')]));
    }
    const stances = await Promise.all(
      ids.map((id) => this.stanceWithin(context, viewerId, id)),
    );
    return new Map(ids.map((id, index) => [id, stances[index]]));
  }

  /**
   * Players whose historical scans the viewer may read: the viewer and every
   * player granting mayShareHistoricalScans. Only current alliance mates can
   * grant it, so they are the only candidates. Never throws; on failure only
   * the viewer's own scans remain readable.
   */
  async historicalScanSharerIds(viewerId: number): Promise<number[]> {
    try {
      const membership = await this.store.findMembership(viewerId);
      if (!membership) return [viewerId];
      const mateIds = (await this.store.listMemberships(membership.allianceId))
        .map((member) => member.userId)
        .filter((memberId) => memberId !== viewerId);
      const stances = await this.resolveMany(viewerId, mateIds, {
        viewerMembership: membership,
      });
      return [
        viewerId,
        ...mateIds.filter(
          (mateId) => stances.get(mateId)?.mayShareHistoricalScans,
        ),
      ];
    } catch {
      return [viewerId];
    }
  }

  /**
   * Candidates for the viewer's starmap, all derived from one read of the
   * viewer's current membership: the alliance with its other current members
   * and the viewer's office, plus the current members of every alliance in an
   * active relationship with it. Whether a candidate's ships are shown is
   * still decided by the capabilities of the resolved stance; pass
   * `viewerMembership` on to `resolveMany` so both use the same snapshot.
   * Never throws; on failure or without an alliance there are no candidates.
   */
  async starmapCandidates(viewerId: number): Promise<StarmapCandidates> {
    const none: StarmapCandidates = {
      viewerMembership: null,
      alliance: null,
      mateIds: [],
      viewerRole: null,
      partnerIds: [],
    };
    let membership: MembershipRecord | null;
    try {
      membership = await this.store.findMembership(viewerId);
    } catch {
      return none;
    }
    if (!membership) return none;
    const [allianceMap, partnerIds] = await Promise.all([
      this.allianceMapOf(membership),
      this.livePositionPartnersOf(membership),
    ]);
    return {
      viewerMembership: membership,
      ...(allianceMap ?? { alliance: null, mateIds: [], viewerRole: null }),
      partnerIds,
    };
  }

  /** The member's alliance and its other members; null when unavailable. */
  private async allianceMapOf(membership: MembershipRecord) {
    try {
      const [alliance, memberships] = await Promise.all([
        this.store.findAlliance(membership.allianceId),
        this.store.listMemberships(membership.allianceId),
      ]);
      if (!alliance) return null;
      return {
        alliance: {
          id: alliance.id,
          name: alliance.name,
          color: alliance.color,
        },
        mateIds: memberships
          .map((member) => member.userId)
          .filter((memberId) => memberId !== membership.userId),
        viewerRole: membership.role,
      };
    } catch {
      return null;
    }
  }

  /** Members of alliances in an active relationship; empty when unavailable. */
  private async livePositionPartnersOf(
    membership: MembershipRecord,
  ): Promise<number[]> {
    try {
      const partnerAllianceIds = new Set(
        (await this.store.listActiveRelationships(membership.allianceId)).map(
          (relationship) =>
            relationship.firstAllianceId === membership.allianceId
              ? relationship.secondAllianceId
              : relationship.firstAllianceId,
        ),
      );
      partnerAllianceIds.delete(membership.allianceId);
      const memberships = await Promise.all(
        [...partnerAllianceIds].map((id) => this.store.listMemberships(id)),
      );
      return memberships.flat().map((member) => member.userId);
    } catch {
      return [];
    }
  }

  /** Never throws; failures resolve to a closed Neutral without capabilities. */
  async resolve(
    firstPlayerId: number,
    secondPlayerId: number,
  ): Promise<ResolvedStance> {
    const stances = await this.resolveMany(firstPlayerId, [secondPlayerId]);
    return stances.get(secondPlayerId) ?? resolved('NEUTRAL');
  }

  /**
   * Players, memberships and the viewer alliance's active relationships. A
   * viewer membership already read in this request is reused, not re-read.
   */
  private async loadStanceContext(
    viewerId: number,
    otherPlayerIds: number[],
    { viewerMembership: knownViewerMembership }: ResolveManyOptions,
  ): Promise<StanceContext> {
    const playerIds = [viewerId, ...otherPlayerIds];
    const viewerKnown = knownViewerMembership !== undefined;
    const [players, memberships] = await Promise.all([
      this.store.findPlayers(playerIds),
      this.store.findMemberships(viewerKnown ? otherPlayerIds : playerIds),
    ]);
    const membershipByPlayer = new Map(
      memberships
        .filter((membership) => membership.userId !== viewerId)
        .map((membership) => [membership.userId, membership]),
    );
    const viewerMembership = viewerKnown
      ? knownViewerMembership
      : memberships.find((membership) => membership.userId === viewerId);
    if (viewerMembership) membershipByPlayer.set(viewerId, viewerMembership);
    return {
      players: new Map(players.map((player) => [player.id, player])),
      memberships: membershipByPlayer,
      viewerRelationships: viewerMembership
        ? await this.store.listActiveRelationships(viewerMembership.allianceId)
        : [],
    };
  }

  /** The priority matrix for one pair; never throws. */
  private async stanceWithin(
    context: StanceContext,
    viewerId: number,
    otherPlayerId: number,
  ): Promise<ResolvedStance> {
    try {
      const firstPlayer = context.players.get(viewerId);
      const secondPlayer = context.players.get(otherPlayerId);
      if (!firstPlayer || !secondPlayer) return resolved('NEUTRAL');
      if (firstPlayer.factionId === null || secondPlayer.factionId === null) {
        return resolved('NEUTRAL');
      }
      if (firstPlayer.factionId !== secondPlayer.factionId) {
        return resolved('ENEMY');
      }

      const firstMembership = context.memberships.get(firstPlayer.id);
      const secondMembership = context.memberships.get(secondPlayer.id);
      if (
        firstMembership &&
        secondMembership &&
        firstMembership.allianceId === secondMembership.allianceId
      ) {
        return resolved('FRIEND', {
          mayShareHistoricalScans: true,
          mayShareAllianceMap: true,
        });
      }

      let mayShareLivePosition = false;
      if (firstMembership && secondMembership) {
        const relationship = relationshipBetween(
          context.viewerRelationships,
          firstMembership.allianceId,
          secondMembership.allianceId,
        );
        if (relationship?.type === AllianceRelationshipType.WAR) {
          return resolved('ENEMY');
        }
        if (relationship) {
          mayShareLivePosition = relationship.shareLivePositions;
          if (relationship.treatAsFriend) {
            return resolved('FRIEND', { mayShareLivePosition });
          }
        }
      }

      if (
        await this.personalContactStatus.isFriend(
          firstPlayer.id,
          secondPlayer.id,
        )
      ) {
        return resolved('FRIEND', { mayShareLivePosition });
      }
      return resolved('NEUTRAL', { mayShareLivePosition });
    } catch {
      return resolved('NEUTRAL');
    }
  }
}

/** What the stances of one viewer towards a batch of players depend on. */
interface StanceContext {
  players: Map<number, PlayerRecord>;
  memberships: Map<number, MembershipRecord>;
  /** Active relationships of the viewer's alliance; empty without one. */
  viewerRelationships: AllianceRelationshipRecord[];
}

function relationshipBetween(
  relationships: AllianceRelationshipRecord[],
  firstAllianceId: number,
  secondAllianceId: number,
): AllianceRelationshipRecord | null {
  if (firstAllianceId === secondAllianceId) return null;
  return (
    relationships.find(
      (relationship) =>
        (relationship.firstAllianceId === firstAllianceId &&
          relationship.secondAllianceId === secondAllianceId) ||
        (relationship.firstAllianceId === secondAllianceId &&
          relationship.secondAllianceId === firstAllianceId),
    ) ?? null
  );
}

function resolved(
  status: Stance,
  {
    mayShareLivePosition = false,
    mayShareHistoricalScans = false,
    mayShareAllianceMap = false,
  }: {
    mayShareLivePosition?: boolean;
    mayShareHistoricalScans?: boolean;
    mayShareAllianceMap?: boolean;
  } = {},
): ResolvedStance {
  const isFriend = status === 'FRIEND';
  const isEnemy = status === 'ENEMY';
  return {
    status,
    isFriend,
    isEnemy,
    mayReactAutomatically: isEnemy,
    mayTransferSafely: isFriend,
    mayProvisionProtectedShip: isFriend,
    mayShareLivePosition,
    mayShareHistoricalScans: isFriend && mayShareHistoricalScans,
    mayShareAllianceMap: isFriend && mayShareAllianceMap,
  };
}
