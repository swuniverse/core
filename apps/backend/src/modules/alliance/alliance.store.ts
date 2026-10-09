import type {
  AllianceChronicleEventType,
  AllianceDiplomacyChronicleEventType,
  AllianceRelationshipType,
  AllianceRole,
  Faction,
} from '@swuniverse/shared';

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
}

export interface FactionRecord {
  id: number;
  key: Faction;
  name: string;
}

export interface AllianceRelationshipRecord {
  id: number;
  firstAllianceId: number;
  secondAllianceId: number;
  type: AllianceRelationshipType;
  startedAt: Date;
  endedAt: Date | null;
  contract: string;
  treatAsFriend: boolean;
  shareLivePositions: boolean;
  lordAllianceId: number | null;
  vassalAllianceId: number | null;
}

export interface AllianceRelationshipProposalRecord {
  id: number;
  firstAllianceId: number;
  secondAllianceId: number;
  senderAllianceId: number;
  recipientAllianceId: number;
  type: AllianceRelationshipType;
  contract: string;
  treatAsFriend: boolean;
  shareLivePositions: boolean;
  createdAt: Date;
}

export interface AllianceRelationshipChangeProposalRecord {
  id: number;
  relationshipId: number;
  senderAllianceId: number;
  recipientAllianceId: number;
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
  firstAllianceId: number;
  firstAllianceName: string;
  secondAllianceId: number;
  secondAllianceName: string;
  relationshipType: AllianceRelationshipType;
  lordAllianceId: number | null;
  vassalAllianceId: number | null;
  occurredAt: Date;
}

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
  transactionHandle(): unknown;
  /**
   * Inside a transaction: lock the alliance row until commit so concurrent
   * changes to the same alliance run one after another. Returns the fresh
   * row, or null if it no longer exists.
   */
  lockAlliance(id: number): Promise<AllianceRecord | null>;

  findPlayer(id: number): Promise<PlayerRecord | null>;
  findPlayers(ids: number[]): Promise<PlayerRecord[]>;
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

  /** Active relationships involving an alliance, newest first. */
  listActiveRelationships(
    allianceId: number,
  ): Promise<AllianceRelationshipRecord[]>;
  findActiveRelationship(
    id: number,
  ): Promise<AllianceRelationshipRecord | null>;
  replaceRelationshipsWithWar(
    firstAllianceId: number,
    secondAllianceId: number,
  ): Promise<void>;
  listRelationshipProposals(
    allianceId: number,
  ): Promise<AllianceRelationshipProposalRecord[]>;
  findRelationshipProposal(
    id: number,
  ): Promise<AllianceRelationshipProposalRecord | null>;
  insertRelationshipProposal(data: {
    senderAllianceId: number;
    recipientAllianceId: number;
    type: AllianceRelationshipType;
    contract: string;
    treatAsFriend: boolean;
    shareLivePositions: boolean;
  }): Promise<AllianceRelationshipProposalRecord>;
  deleteRelationshipProposal(id: number): Promise<boolean>;
  acceptRelationshipProposal(
    id: number,
  ): Promise<AllianceRelationshipRecord | null>;
  listRelationshipChangeProposals(
    allianceId: number,
  ): Promise<AllianceRelationshipChangeProposalRecord[]>;
  findRelationshipChangeProposal(
    id: number,
  ): Promise<AllianceRelationshipChangeProposalRecord | null>;
  insertRelationshipChangeProposal(data: {
    relationshipId: number;
    senderAllianceId: number;
    recipientAllianceId: number;
    contract: string;
    treatAsFriend: boolean;
    shareLivePositions: boolean;
  }): Promise<AllianceRelationshipChangeProposalRecord>;
  deleteRelationshipChangeProposal(id: number): Promise<boolean>;
  acceptRelationshipChangeProposal(
    id: number,
  ): Promise<AllianceRelationshipRecord | null>;
  /** Ends an active non-war relationship and removes pending proposals for its pair. */
  endNonWarRelationship(id: number): Promise<AllianceRelationshipRecord | null>;

  appendDiplomacyChronicleEntry(
    data: Omit<AllianceDiplomacyChronicleEntryRecord, 'id' | 'occurredAt'>,
  ): Promise<void>;
  /** Stable reverse chronological keyset pagination. */
  listDiplomacyChronicleEntries(
    allianceId: number,
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
