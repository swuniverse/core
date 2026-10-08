import { Inject, Injectable } from '@nestjs/common';
import { AllianceRelationshipType } from '@swuniverse/shared';
import { ALLIANCE_STORE } from './alliance.store';
import type { AllianceStore } from './alliance.store';

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
   * Resolves the viewer's stance towards several players at once, one lookup
   * per distinct player. Never throws; failures resolve to a closed Neutral.
   */
  async resolveMany(
    viewerId: number,
    otherPlayerIds: Iterable<number>,
  ): Promise<Map<number, ResolvedStance>> {
    const ids = [...new Set(otherPlayerIds)];
    const stances = await Promise.all(
      ids.map((id) => this.resolve(viewerId, id)),
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

  /** Never throws; failures resolve to a closed Neutral without capabilities. */
  async resolve(
    firstPlayerId: number,
    secondPlayerId: number,
  ): Promise<ResolvedStance> {
    try {
      const [firstPlayer, secondPlayer] = await Promise.all([
        this.store.findPlayer(firstPlayerId),
        this.store.findPlayer(secondPlayerId),
      ]);
      if (!firstPlayer || !secondPlayer) return resolved('NEUTRAL');
      if (firstPlayer.factionId === null || secondPlayer.factionId === null) {
        return resolved('NEUTRAL');
      }
      if (firstPlayer.factionId !== secondPlayer.factionId) {
        return resolved('ENEMY');
      }

      const [firstMembership, secondMembership] = await Promise.all([
        this.store.findMembership(firstPlayer.id),
        this.store.findMembership(secondPlayer.id),
      ]);
      if (
        firstMembership &&
        secondMembership &&
        firstMembership.allianceId === secondMembership.allianceId
      ) {
        return resolved('FRIEND', { mayShareHistoricalScans: true });
      }

      let mayShareLivePosition = false;
      if (firstMembership && secondMembership) {
        const relationship = await this.findRelationship(
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

  private async findRelationship(
    firstAllianceId: number,
    secondAllianceId: number,
  ) {
    if (firstAllianceId === secondAllianceId) return null;
    const relationships =
      await this.store.listActiveRelationships(firstAllianceId);
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
}

function resolved(
  status: Stance,
  {
    mayShareLivePosition = false,
    mayShareHistoricalScans = false,
  }: { mayShareLivePosition?: boolean; mayShareHistoricalScans?: boolean } = {},
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
  };
}
