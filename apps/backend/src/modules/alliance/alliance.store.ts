import type { AllianceTransactionHandle } from './alliance-context-cleanup';
import type {
  AllianceChronicleEventType,
  AllianceDiplomacyChronicleEndReason,
  AllianceDiplomacyChronicleEventType,
  AllianceRelationshipType,
  AllianceRole,
  Faction,
} from '@swuniverse/shared';

import {
  allianceIdOf,
  allianceParty,
  toPartyRef,
  type PartyInput,
  type PartyRef,
} from './diplomacy-party';

export const ALLIANCE_STORE = Symbol('ALLIANCE_STORE');

export interface AllianceRecord {
  id: number;
  name: string;
  description: string;
  homepage: string;
  color: string | null;
  factionId: number;
  acceptsApplications: boolean;
  presidentTitle: string;
  viceTitle: string;
  diplomatTitle: string;
  /** Opaque asset key of the banner, or null without banner. */
  bannerKey: string | null;
  bannerUpdatedAt: Date | null;
  foundedAt: Date;
}

export interface MembershipRecord {
  id: number;
  allianceId: number;
  userId: number;
  role: AllianceRole;
  joinedAt: Date;
}

export interface ApplicationRecord {
  id: number;
  allianceId: number;
  userId: number;
  createdAt: Date;
}

export interface PlayerRecord {
  id: number;
  name: string;
  factionId: number | null;
  /** Last recorded activity; empty counts as the oldest value. */
  lastActiveAt: Date | null;
}

export interface FactionRecord {
  id: number;
  key: Faction;
  name: string;
}

/**
 * An active or ended relationship between two parties. `firstParty` /
 * `secondParty` are in canonical order. The `*AllianceId` fields are the
 * alliance-ID view of the parties: the alliance ID for an alliance party and
 * null for a player party.
 */
export interface AllianceRelationshipRecord {
  id: number;
  firstParty: PartyRef;
  secondParty: PartyRef;
  firstAllianceId: number | null;
  secondAllianceId: number | null;
  type: AllianceRelationshipType;
  startedAt: Date;
  endedAt: Date | null;
  contract: string;
  treatAsFriend: boolean;
  shareLivePositions: boolean;
  lordParty: PartyRef | null;
  vassalParty: PartyRef | null;
  lordAllianceId: number | null;
  vassalAllianceId: number | null;
}

export interface AllianceRelationshipProposalRecord {
  id: number;
  firstParty: PartyRef;
  secondParty: PartyRef;
  senderParty: PartyRef;
  recipientParty: PartyRef;
  type: AllianceRelationshipType;
  contract: string;
  treatAsFriend: boolean;
  shareLivePositions: boolean;
  createdAt: Date;
}

export interface AllianceRelationshipChangeProposalRecord {
  id: number;
  relationshipId: number;
  senderParty: PartyRef;
  recipientParty: PartyRef;
  contract: string;
  treatAsFriend: boolean;
  shareLivePositions: boolean;
  createdAt: Date;
}

export interface AllianceDiplomacyChronicleEntryRecord {
  id: number;
  eventType: AllianceDiplomacyChronicleEventType;
  actorUserId: number | null;
  actorName: string | null;
  firstParty: PartyRef;
  /** Party name at event time. */
  firstPartyName: string;
  secondParty: PartyRef;
  secondPartyName: string;
  relationshipType: AllianceRelationshipType;
  lordParty: PartyRef | null;
  vassalParty: PartyRef | null;
  /** Why the relationship ended without a party's own action, if so. */
  endReason: AllianceDiplomacyChronicleEndReason | null;
  occurredAt: Date;
}

/** A chronicle entry to append; `endReason` defaults to none. */
export type NewDiplomacyChronicleEntry = {
  eventType: AllianceDiplomacyChronicleEventType;
  actorUserId: number | null;
  actorName: string | null;
  relationshipType: AllianceRelationshipType;
  endReason?: AllianceDiplomacyChronicleEndReason | null;
} & (
  | {
      firstParty: PartyRef;
      firstPartyName: string;
      secondParty: PartyRef;
      secondPartyName: string;
      lordParty: PartyRef | null;
      vassalParty: PartyRef | null;
    }
  | {
      /** Alliance-only shorthand. */
      firstAllianceId: number;
      firstAllianceName: string;
      secondAllianceId: number;
      secondAllianceName: string;
      lordAllianceId: number | null;
      vassalAllianceId: number | null;
    }
);

/** Sender and recipient of a proposal; bare alliance IDs are shorthand. */
export type ProposalParties =
  | { senderParty: PartyInput; recipientParty: PartyInput }
  | { senderAllianceId: number; recipientAllianceId: number };

/** Immutable internal chronicle entry; names are as of the event time. */
export interface AllianceChronicleEntryRecord {
  id: number;
  allianceId: number;
  eventType: AllianceChronicleEventType;
  actorUserId: number | null;
  actorName: string | null;
  subjectUserId: number | null;
  subjectName: string | null;
  metadata: Record<string, unknown> | null;
  occurredAt: Date;
}

/** A durable, post-commit system-message intent for a diplomacy transition. */
export interface AllianceDiplomacyNotificationRecord {
  id: number;
  recipientUserId: number;
  body: string;
  /** Stable idempotency token used when creating the actual system message. */
  deliveryKey: string;
  createdAt: Date;
  deliveredAt: Date | null;
  leaseToken: string | null;
}

/** A durable retry task for deleting a physical alliance asset. */
export interface AllianceAssetDeletionRecord {
  id: number;
  assetKey: string;
  attempts: number;
  nextAttemptAt: Date;
}

export type AlliancePatch = Partial<
  Pick<
    AllianceRecord,
    | 'name'
    | 'description'
    | 'homepage'
    | 'color'
    | 'acceptsApplications'
    | 'presidentTitle'
    | 'viceTitle'
    | 'diplomatTitle'
    | 'bannerKey'
    | 'bannerUpdatedAt'
  >
>;

/** Which database constraint rejected a write. */
export type AllianceConstraint =
  | 'alliance_name'
  | 'membership_user'
  | 'alliance_president'
  | 'application'
  | 'relationship_proposal'
  | 'relationship_change_proposal';

export class AllianceConstraintViolation extends Error {
  constructor(readonly constraint: AllianceConstraint) {
    super(`Alliance constraint violated: ${constraint}`);
    this.name = 'AllianceConstraintViolation';
  }
}

/**
 * Persistence port for alliances. Implementations enforce the same
 * uniqueness rules as the database and report violations as
 * {@link AllianceConstraintViolation}. Deleting an alliance cascades to its
 * memberships and applications.
 */
export interface AllianceStore {
  transaction<T>(work: (store: AllianceStore) => Promise<T>): Promise<T>;
  /** Opaque handle of the surrounding transaction (the EntityManager for TypeORM), for cleanup consumers. */
  transactionHandle(): AllianceTransactionHandle;
  /**
   * Inside a transaction: lock the alliance row until commit so concurrent
   * changes to the same alliance run one after another. Returns the fresh
   * row, or null if it no longer exists.
   */
  lockAlliance(id: number): Promise<AllianceRecord | null>;

  findPlayer(id: number): Promise<PlayerRecord | null>;
  findPlayers(ids: number[]): Promise<PlayerRecord[]>;
  /**
   * Alliance-less players of one faction by ascending ID after `afterId`,
   * excluding one player. `query` matches the display name as a
   * case-insensitive literal substring. Identity and name only.
   */
  searchSettlers(criteria: {
    factionId: number;
    excludeUserId: number;
    query: string;
    afterId: number;
    limit: number;
  }): Promise<Array<{ id: number; name: string }>>;
  listFactions(): Promise<FactionRecord[]>;

  findAlliance(id: number): Promise<AllianceRecord | null>;
  listAlliances(): Promise<AllianceRecord[]>;
  countMembers(): Promise<Map<number, number>>;
  isNameTaken(name: string, exceptAllianceId?: number): Promise<boolean>;
  insertAlliance(data: {
    name: string;
    description: string;
    factionId: number;
  }): Promise<AllianceRecord>;
  updateAlliance(id: number, patch: AlliancePatch): Promise<void>;
  deleteAlliance(id: number): Promise<void>;

  /**
   * Active relationships involving a party, newest first. A bare number is
   * the alliance with that ID.
   */
  listActiveRelationships(
    party: PartyInput,
  ): Promise<AllianceRelationshipRecord[]>;
  findActiveRelationship(
    id: number,
  ): Promise<AllianceRelationshipRecord | null>;
  /**
   * Replaces everything between two parties (relationship, proposal, pending
   * changes) with an active war. Creates missing player parties.
   */
  replaceRelationshipsWithWar(
    first: PartyInput,
    second: PartyInput,
  ): Promise<void>;
  listRelationshipProposals(
    party: PartyInput,
  ): Promise<AllianceRelationshipProposalRecord[]>;
  findRelationshipProposal(
    id: number,
  ): Promise<AllianceRelationshipProposalRecord | null>;
  insertRelationshipProposal(
    data: ProposalParties & {
      type: AllianceRelationshipType;
      contract: string;
      treatAsFriend: boolean;
      shareLivePositions: boolean;
    },
  ): Promise<AllianceRelationshipProposalRecord>;
  deleteRelationshipProposal(id: number): Promise<boolean>;
  acceptRelationshipProposal(
    id: number,
  ): Promise<AllianceRelationshipRecord | null>;
  listRelationshipChangeProposals(
    party: PartyInput,
  ): Promise<AllianceRelationshipChangeProposalRecord[]>;
  findRelationshipChangeProposal(
    id: number,
  ): Promise<AllianceRelationshipChangeProposalRecord | null>;
  insertRelationshipChangeProposal(
    data: ProposalParties & {
      relationshipId: number;
      contract: string;
      treatAsFriend: boolean;
      shareLivePositions: boolean;
    },
  ): Promise<AllianceRelationshipChangeProposalRecord>;
  deleteRelationshipChangeProposal(id: number): Promise<boolean>;
  acceptRelationshipChangeProposal(
    id: number,
  ): Promise<AllianceRelationshipRecord | null>;
  /** Ends an active non-war relationship and removes pending proposals for its pair. */
  endNonWarRelationship(id: number): Promise<AllianceRelationshipRecord | null>;

  appendDiplomacyChronicleEntry(
    data: NewDiplomacyChronicleEntry,
  ): Promise<void>;
  /** Stable reverse chronological keyset pagination. */
  listDiplomacyChronicleEntries(
    party: PartyInput,
    cursor: { occurredAt: Date; id: number } | null,
    limit: number,
  ): Promise<AllianceDiplomacyChronicleEntryRecord[]>;

  /** Called inside the transaction of the action that causes the event. */
  appendAllianceChronicleEntry(
    data: Omit<AllianceChronicleEntryRecord, 'id' | 'occurredAt'>,
  ): Promise<void>;
  /** Stable reverse chronological keyset pagination. */
  listAllianceChronicleEntries(
    allianceId: number,
    cursor: { occurredAt: Date; id: number } | null,
    limit: number,
  ): Promise<AllianceChronicleEntryRecord[]>;

  /** Enqueued inside the same transaction as the diplomatic state change. */
  enqueueDiplomacyNotifications(
    notifications: Array<{ recipientUserId: number; body: string }>,
  ): Promise<void>;
  /** Returns pending intents for diagnostics and acceptance checks. */
  listPendingDiplomacyNotifications(): Promise<
    AllianceDiplomacyNotificationRecord[]
  >;
  /**
   * Atomically leases pending intents to one dispatcher. Expired leases become
   * eligible again after a dispatcher crash.
   */
  claimDiplomacyNotifications(
    limit: number,
  ): Promise<AllianceDiplomacyNotificationRecord[]>;
  /** Completes an intent only when its active lease is still owned. */
  markDiplomacyNotificationDelivered(
    id: number,
    leaseToken: string,
  ): Promise<boolean>;
  /** Makes a failed delivery eligible for immediate retry by another dispatcher. */
  releaseDiplomacyNotificationClaim(
    id: number,
    leaseToken: string,
  ): Promise<void>;

  /**
   * Persists the intent to delete an asset file. Called inside the transaction
   * that unreferences the asset; enqueueing a known key is a no-op.
   */
  enqueueAssetDeletion(assetKey: string): Promise<void>;
  /** All unfinished deletion tasks, oldest first (diagnostics, acceptance). */
  listPendingAssetDeletions(): Promise<AllianceAssetDeletionRecord[]>;
  /**
   * Atomically claims tasks due at `now`: counts the attempt and pushes
   * `nextAttemptAt` out by `backoffMs(attempts)`, so concurrent workers skip
   * them and a failed attempt is retried only after the backoff.
   */
  claimDueAssetDeletions(
    limit: number,
    now: Date,
    backoffMs: (attempts: number) => number,
  ): Promise<AllianceAssetDeletionRecord[]>;
  /** Removes a finished task. */
  completeAssetDeletion(id: number): Promise<void>;

  /**
   * Removes every alliance, party, relationship, proposal, chronicle (public
   * and internal), forum, notification intent and pending asset deletion task.
   * Identity counters keep counting, so removed ids are never reused.
   */
  deleteAllAllianceData(): Promise<void>;

  findMembership(userId: number): Promise<MembershipRecord | null>;
  /** Current memberships of the given players; players without one are absent. */
  findMemberships(userIds: number[]): Promise<MembershipRecord[]>;
  /** Ordered by join time, oldest first. */
  listMemberships(allianceId: number): Promise<MembershipRecord[]>;
  insertMembership(data: {
    allianceId: number;
    userId: number;
    role: AllianceRole;
  }): Promise<void>;
  /** Returns false if the player is not a member of that alliance. */
  setRole(
    allianceId: number,
    userId: number,
    role: AllianceRole,
  ): Promise<boolean>;
  /** Returns false if the player is not a member of that alliance. */
  deleteMembership(allianceId: number, userId: number): Promise<boolean>;

  findApplication(id: number): Promise<ApplicationRecord | null>;
  findApplicationOf(
    allianceId: number,
    userId: number,
  ): Promise<ApplicationRecord | null>;
  /** Ordered by creation time, oldest first. */
  listApplicationsForAlliance(allianceId: number): Promise<ApplicationRecord[]>;
  listApplicationsOfPlayer(userId: number): Promise<ApplicationRecord[]>;
  insertApplication(data: {
    allianceId: number;
    userId: number;
  }): Promise<ApplicationRecord>;
  /** Returns the number of applications actually deleted. */
  deleteApplications(ids: number[]): Promise<number>;
}

/** Normalizes the alliance-ID shorthand of proposal parties. */
export function proposalParties(data: ProposalParties): {
  senderParty: PartyRef;
  recipientParty: PartyRef;
} {
  return 'senderParty' in data
    ? {
        senderParty: toPartyRef(data.senderParty),
        recipientParty: toPartyRef(data.recipientParty),
      }
    : {
        senderParty: allianceParty(data.senderAllianceId),
        recipientParty: allianceParty(data.recipientAllianceId),
      };
}

/** Normalizes a chronicle entry to its party form. */
export function chronicleEntryParties(data: NewDiplomacyChronicleEntry): {
  firstParty: PartyRef;
  firstPartyName: string;
  secondParty: PartyRef;
  secondPartyName: string;
  lordParty: PartyRef | null;
  vassalParty: PartyRef | null;
} {
  if ('firstParty' in data) {
    return {
      firstParty: data.firstParty,
      firstPartyName: data.firstPartyName,
      secondParty: data.secondParty,
      secondPartyName: data.secondPartyName,
      lordParty: data.lordParty,
      vassalParty: data.vassalParty,
    };
  }
  return {
    firstParty: allianceParty(data.firstAllianceId),
    firstPartyName: data.firstAllianceName,
    secondParty: allianceParty(data.secondAllianceId),
    secondPartyName: data.secondAllianceName,
    lordParty:
      data.lordAllianceId === null ? null : allianceParty(data.lordAllianceId),
    vassalParty:
      data.vassalAllianceId === null
        ? null
        : allianceParty(data.vassalAllianceId),
  };
}

/** Derives the alliance-ID view of a relationship from its parties. */
export function relationshipRecordOf(
  base: Omit<
    AllianceRelationshipRecord,
    | 'firstAllianceId'
    | 'secondAllianceId'
    | 'lordAllianceId'
    | 'vassalAllianceId'
  >,
): AllianceRelationshipRecord {
  return {
    ...base,
    firstAllianceId: allianceIdOf(base.firstParty),
    secondAllianceId: allianceIdOf(base.secondParty),
    lordAllianceId: allianceIdOf(base.lordParty),
    vassalAllianceId: allianceIdOf(base.vassalParty),
  };
}
