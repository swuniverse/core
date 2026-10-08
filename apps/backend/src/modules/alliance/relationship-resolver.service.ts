import { Inject, Injectable } from '@nestjs/common';
import { AllianceRelationshipType } from '@swuniverse/shared';
import { ALLIANCE_STORE } from './alliance.store';
import type { AllianceStore } from './alliance.store';

export type RelationshipStatus = 'FRIEND' | 'ENEMY' | 'NEUTRAL';

export interface ResolvedRelationship {
  status: RelationshipStatus;
  isFriend: boolean;
  isEnemy: boolean;
  mayReactAutomatically: boolean;
  mayTransferSafely: boolean;
  mayProvisionProtectedShip: boolean;
  mayShareLivePosition: boolean;
  mayShareHistoricalScans: boolean;
}

/**
 * Extension seam for personal contact markers. It deliberately has no
 * persistence implementation in this stage, so it safely returns no marker.
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

  async resolve(
    firstPlayerId: number,
    secondPlayerId: number,
  ): Promise<ResolvedRelationship> {
    try {
      const [firstPlayer, secondPlayer] = await Promise.all([
        this.store.findPlayer(firstPlayerId),
        this.store.findPlayer(secondPlayerId),
      ]);
      if (!firstPlayer || !secondPlayer) return resolved('NEUTRAL', false);
      if (firstPlayer.factionId === null || secondPlayer.factionId === null) {
        return resolved('NEUTRAL', false);
      }
      if (firstPlayer.factionId !== secondPlayer.factionId) {
        return resolved('ENEMY', false);
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
        return resolved('FRIEND', false, true);
      }

      let mayShareLivePosition = false;
      if (firstMembership && secondMembership) {
        const relationship = await this.findRelationship(
          firstMembership.allianceId,
          secondMembership.allianceId,
        );
        if (relationship?.type === AllianceRelationshipType.WAR) {
          return resolved('ENEMY', false);
        }
        if (relationship) {
          mayShareLivePosition = relationship.shareLivePositions;
          if (relationship.treatAsFriend) {
            return resolved('FRIEND', mayShareLivePosition);
          }
        }
      }

      if (
        await this.personalContactStatus.isFriend(
          firstPlayer.id,
          secondPlayer.id,
        )
      ) {
        return resolved('FRIEND', mayShareLivePosition);
      }
      return resolved('NEUTRAL', mayShareLivePosition);
    } catch {
      return resolved('NEUTRAL', false);
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
  status: RelationshipStatus,
  mayShareLivePosition: boolean,
  mayShareHistoricalScans = false,
): ResolvedRelationship {
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
