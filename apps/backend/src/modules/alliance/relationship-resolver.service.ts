import { Inject, Injectable } from '@nestjs/common';
import { AllianceRelationshipType, AllianceRole } from '@swuniverse/shared';
import { ALLIANCE_STORE } from './alliance.store';
import type {
  AllianceRelationshipRecord,
  AllianceStore,
  MembershipRecord,
  PlayerRecord,
} from './alliance.store';

/** Freund, Feind or Neutral between two players (see CONTEXT.md). */
export type Stance = 'FRIEND' | 'ENEMY' | 'NEUTRAL';

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
 * Candidates for the viewer's alliance map: the viewer's current alliance and
 * its other current members. Whether a mate's ships are shown is still decided
 * by the `mayShareAllianceMap` capability of the resolved stance.
 */
export interface AllianceMapCandidates {
  alliance: { id: number; name: string; color: string | null } | null;
  mateIds: number[];
  /** The viewer's current office in that alliance; null without alliance. */
  viewerRole: AllianceRole | null;
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
  ): Promise<Map<number, ResolvedStance>> {
    const ids = [...new Set(otherPlayerIds)];
    if (ids.length === 0) return new Map();
    let context: StanceContext;
    try {
      context = await this.loadStanceContext(viewerId, ids);
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
      const stances = await this.resolveMany(viewerId, mateIds);
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
   * The viewer's current alliance and its other current members, read fresh
   * on every call. Never throws; on failure or without an alliance there are
   * no candidates.
   */
  async allianceMapCandidates(
    viewerId: number,
  ): Promise<AllianceMapCandidates> {
    const none: AllianceMapCandidates = {
      alliance: null,
      mateIds: [],
      viewerRole: null,
    };
    try {
      const membership = await this.store.findMembership(viewerId);
      if (!membership) return none;
      const [alliance, memberships] = await Promise.all([
        this.store.findAlliance(membership.allianceId),
        this.store.listMemberships(membership.allianceId),
      ]);
      if (!alliance) return none;
      return {
        alliance: {
          id: alliance.id,
          name: alliance.name,
          color: alliance.color,
        },
        mateIds: memberships
          .map((member) => member.userId)
          .filter((memberId) => memberId !== viewerId),
        viewerRole: membership.role,
      };
    } catch {
      return none;
    }
  }

  /**
   * Candidates for shared live positions: current members of every alliance
   * in an active relationship with the viewer's alliance, read fresh on every
   * call. Whether their ships are shown is still decided by the
   * `mayShareLivePosition` capability of the resolved stance. Never throws;
   * on failure or without an alliance there are no candidates.
   */
  async livePositionPartnerCandidates(viewerId: number): Promise<number[]> {
    try {
      const membership = await this.store.findMembership(viewerId);
      if (!membership) return [];
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

  /** Players, memberships and the viewer alliance's active relationships. */
  private async loadStanceContext(
    viewerId: number,
    otherPlayerIds: number[],
  ): Promise<StanceContext> {
    const playerIds = [viewerId, ...otherPlayerIds];
    const [players, memberships] = await Promise.all([
      this.store.findPlayers(playerIds),
      this.store.findMemberships(playerIds),
    ]);
    const membershipByPlayer = new Map(
      memberships.map((membership) => [membership.userId, membership]),
    );
    const viewerMembership = membershipByPlayer.get(viewerId);
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
