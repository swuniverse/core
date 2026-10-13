import type { AllianceTransactionHandle } from '../alliance-context-cleanup';
import {
  AllianceRelationshipType,
  AllianceRole,
  DiplomacyPartyType,
  Faction,
} from '@swuniverse/shared';
import {
  allianceParty,
  comparePartyRefs,
  involvesParty,
  isPair,
  samePartyRef,
  toPartyRef,
  type PartyInput,
  type PartyRef,
} from '../diplomacy-party';
import {
  AllianceConstraintViolation,
  AllianceChronicleEntryRecord,
  AllianceDiplomacyChronicleEntryRecord,
  AllianceAssetDeletionRecord,
  AllianceDiplomacyNotificationRecord,
  AlliancePatch,
  AllianceRecord,
  AllianceStore,
  ApplicationRecord,
  AllianceRelationshipProposalRecord,
  AllianceRelationshipChangeProposalRecord,
  AllianceRelationshipRecord,
  FactionRecord,
  MembershipRecord,
  NewDiplomacyChronicleEntry,
  PlayerRecord,
  ProposalParties,
  chronicleEntryParties,
  proposalParties,
  relationshipRecordOf,
} from '../alliance.store';
import { DEFAULT_ALLIANCE_TITLES } from '../alliance.constants';

interface State {
  players: PlayerRecord[];
  factions: FactionRecord[];
  alliances: AllianceRecord[];
  memberships: MembershipRecord[];
  applications: ApplicationRecord[];
  relationships: AllianceRelationshipRecord[];
  relationshipProposals: AllianceRelationshipProposalRecord[];
  relationshipChangeProposals: AllianceRelationshipChangeProposalRecord[];
  diplomacyChronicleEntries: AllianceDiplomacyChronicleEntryRecord[];
  allianceChronicleEntries: AllianceChronicleEntryRecord[];
  diplomacyNotifications: AllianceDiplomacyNotificationRecord[];
  assetDeletions: AllianceAssetDeletionRecord[];
  nextId: number;
  clock: number;
}

export const REBELS: FactionRecord = {
  id: 1,
  key: Faction.REBEL_ALLIANCE,
  name: 'Rebellenallianz',
};
export const EMPIRE: FactionRecord = {
  id: 2,
  key: Faction.GALACTIC_EMPIRE,
  name: 'Galaktisches Imperium',
};

/**
 * In-memory {@link AllianceStore} for unit tests. Mirrors the database
 * constraints and rolls back a failed transaction.
 */
export class InMemoryAllianceStore implements AllianceStore {
  private state: State = {
    players: [],
    factions: [REBELS, EMPIRE],
    alliances: [],
    memberships: [],
    applications: [],
    relationships: [],
    relationshipProposals: [],
    relationshipChangeProposals: [],
    diplomacyChronicleEntries: [],
    allianceChronicleEntries: [],
    diplomacyNotifications: [],
    assetDeletions: [],
    nextId: 1,
    clock: Date.UTC(2026, 9, 1),
  };

  addPlayer(
    id: number,
    name: string,
    factionId: number | null = REBELS.id,
    avatar: string | null = null,
    faction: Faction | null =
      this.state.factions.find((item) => item.id === factionId)?.key ?? null,
  ) {
    this.state.players.push({
      id,
      name,
      avatar,
      faction,
      factionId,
      lastActiveAt: null,
    });
  }

  /** Test helper: the player's last recorded activity. */
  setLastActive(id: number, at: Date | null) {
    const player = this.state.players.find((p) => p.id === id);
    if (player) player.lastActiveAt = at;
  }

  /** Test helper: a later rename must not alter recorded chronicle names. */
  renamePlayer(id: number, name: string) {
    const player = this.state.players.find((p) => p.id === id);
    if (player) player.name = name;
  }

  /** Test setup shortcut: alliance with the given members, bypassing rules. */
  seedAlliance(
    data: Partial<AllianceRecord> & { name: string },
    members: Array<[userId: number, role: AllianceRole]>,
  ): AllianceRecord {
    const alliance: AllianceRecord = {
      id: this.nextId(),
      description: '',
      homepage: '',
      color: null,
      factionId: REBELS.id,
      acceptsApplications: true,
      presidentTitle: DEFAULT_ALLIANCE_TITLES.president,
      viceTitle: DEFAULT_ALLIANCE_TITLES.vice,
      diplomatTitle: DEFAULT_ALLIANCE_TITLES.diplomat,
      bannerKey: null,
      bannerUpdatedAt: null,
      foundedAt: this.now(),
      ...data,
    };
    this.state.alliances.push(alliance);
    for (const [userId, role] of members) {
      this.state.memberships.push({
        id: this.nextId(),
        allianceId: alliance.id,
        userId,
        role,
        joinedAt: this.now(),
      });
    }
    return alliance;
  }

  seedApplication(allianceId: number, userId: number): ApplicationRecord {
    const application = {
      id: this.nextId(),
      allianceId,
      userId,
      createdAt: this.now(),
    };
    this.state.applications.push(application);
    return application;
  }

  /** Test setup shortcut for an already-active relationship. */
  seedActiveAllianceRelationship(
    data: Omit<
      Partial<AllianceRelationshipRecord>,
      | 'id'
      | 'firstAllianceId'
      | 'secondAllianceId'
      | 'firstParty'
      | 'secondParty'
      | 'lordParty'
      | 'vassalParty'
      | 'startedAt'
      | 'endedAt'
    > & {
      /** Alliance-ID shorthand for two alliance parties. */
      firstAllianceId?: number;
      secondAllianceId?: number;
      /** Explicit parties; take precedence over the shorthand. */
      firstParty?: PartyRef;
      secondParty?: PartyRef;
      lordParty?: PartyRef | null;
      vassalParty?: PartyRef | null;
      type: AllianceRelationshipType;
    },
  ): AllianceRelationshipRecord {
    const [firstParty, secondParty] = [
      data.firstParty ?? allianceParty(data.firstAllianceId!),
      data.secondParty ?? allianceParty(data.secondAllianceId!),
    ].sort(comparePartyRefs);
    if (samePartyRef(firstParty, secondParty)) {
      throw new Error('Alliance relationships need two distinct parties');
    }
    this.assertSameFaction(firstParty, secondParty);
    if (
      this.state.relationships.some(
        (relationship) =>
          relationship.endedAt === null &&
          isPair(
            relationship.firstParty,
            relationship.secondParty,
            firstParty,
            secondParty,
          ),
      )
    ) {
      throw new Error('Alliance relationship already active for this pair');
    }
    const contract = this.normalizeRelationshipContract(
      data.type,
      data.contract,
    );
    const lordParty =
      data.lordParty ??
      (data.lordAllianceId == null ? null : allianceParty(data.lordAllianceId));
    const vassalParty =
      data.vassalParty ??
      (data.vassalAllianceId == null
        ? null
        : allianceParty(data.vassalAllianceId));
    this.assertRelationshipShape({
      type: data.type,
      firstParty,
      secondParty,
      treatAsFriend: data.treatAsFriend ?? false,
      shareLivePositions: data.shareLivePositions ?? false,
      lordParty,
      vassalParty,
    });
    const relationship = relationshipRecordOf({
      id: this.nextId(),
      firstParty,
      secondParty,
      type: data.type,
      startedAt: this.now(),
      endedAt: null,
      contract,
      treatAsFriend: data.treatAsFriend ?? false,
      shareLivePositions: data.shareLivePositions ?? false,
      lordParty,
      vassalParty,
    });
    this.state.relationships.push(relationship);
    return relationship;
  }

  snapshot() {
    return structuredClone(this.state);
  }

  async transaction<T>(work: (store: AllianceStore) => Promise<T>): Promise<T> {
    const before = structuredClone(this.state);
    try {
      return await work(this);
    } catch (error) {
      this.state = before;
      throw error;
    }
  }

  transactionHandle(): AllianceTransactionHandle {
    return this;
  }

  async lockAlliance(id: number) {
    this.lockOrder.push(`alliance:${id}`);
    return this.findAlliance(id);
  }

  async findPlayer(id: number) {
    return this.state.players.find((p) => p.id === id) ?? null;
  }

  // Batch lookups go through the single lookups so that tests can make
  // either fail with one spy.
  async findPlayers(ids: number[]) {
    const players = await Promise.all(
      [...new Set(ids)].map((id) => this.findPlayer(id)),
    );
    return players.filter((player) => player !== null);
  }

  async searchSettlers(criteria: {
    factionId: number;
    excludeUserId: number;
    query: string;
    afterId: number;
    limit: number;
  }) {
    const needle = criteria.query.toLowerCase();
    return this.state.players
      .filter(
        (player) =>
          player.factionId === criteria.factionId &&
          player.id !== criteria.excludeUserId &&
          player.id > criteria.afterId &&
          !this.state.memberships.some((m) => m.userId === player.id) &&
          player.name.toLowerCase().includes(needle),
      )
      .sort((a, b) => a.id - b.id)
      .slice(0, criteria.limit)
      .map(({ id, name }) => ({ id, name }));
  }

  async listFactions() {
    return [...this.state.factions];
  }

  async findAlliance(id: number) {
    const alliance = this.state.alliances.find((a) => a.id === id);
    return alliance ? { ...alliance } : null;
  }

  async listAlliances() {
    return [...this.state.alliances].sort((a, b) => a.id - b.id);
  }

  async countMembers() {
    const counts = new Map<number, number>();
    for (const m of this.state.memberships) {
      counts.set(m.allianceId, (counts.get(m.allianceId) ?? 0) + 1);
    }
    return counts;
  }

  async isNameTaken(name: string, exceptAllianceId?: number) {
    return this.state.alliances.some(
      (a) =>
        a.id !== exceptAllianceId &&
        a.name.toLowerCase() === name.toLowerCase(),
    );
  }

  async insertAlliance(data: {
    name: string;
    description: string;
    factionId: number;
  }) {
    if (await this.isNameTaken(data.name)) {
      throw new AllianceConstraintViolation('alliance_name');
    }
    return this.seedAlliance({ ...data, acceptsApplications: false }, []);
  }

  async updateAlliance(id: number, patch: AlliancePatch) {
    if (patch.name !== undefined && (await this.isNameTaken(patch.name, id))) {
      throw new AllianceConstraintViolation('alliance_name');
    }
    const alliance = this.state.alliances.find((a) => a.id === id);
    if (alliance) Object.assign(alliance, patch);
  }

  async deleteAlliance(id: number) {
    this.state.alliances = this.state.alliances.filter((a) => a.id !== id);
    this.state.memberships = this.state.memberships.filter(
      (m) => m.allianceId !== id,
    );
    this.state.applications = this.state.applications.filter(
      (a) => a.allianceId !== id,
    );
    this.state.allianceChronicleEntries =
      this.state.allianceChronicleEntries.filter(
        (entry) => entry.allianceId !== id,
      );
    const party = allianceParty(id);
    const goneRelationshipIds = new Set(
      this.state.relationships
        .filter((relationship) => involvesParty(relationship, party))
        .map((relationship) => relationship.id),
    );
    this.state.relationships = this.state.relationships.filter(
      (relationship) => !goneRelationshipIds.has(relationship.id),
    );
    this.state.relationshipProposals = this.state.relationshipProposals.filter(
      (proposal) => !involvesParty(proposal, party),
    );
    this.state.relationshipChangeProposals =
      this.state.relationshipChangeProposals.filter(
        (proposal) => !goneRelationshipIds.has(proposal.relationshipId),
      );
  }

  async deleteAllAllianceData() {
    const { players, factions, nextId, clock } = this.state;
    this.state = {
      players,
      factions,
      alliances: [],
      memberships: [],
      applications: [],
      relationships: [],
      relationshipProposals: [],
      relationshipChangeProposals: [],
      diplomacyChronicleEntries: [],
      allianceChronicleEntries: [],
      diplomacyNotifications: [],
      assetDeletions: [],
      nextId,
      clock,
    };
  }

  async listActiveRelationships(partyInput: PartyInput) {
    const party = toPartyRef(partyInput);
    return this.state.relationships
      .filter(
        (relationship) =>
          relationship.endedAt === null && involvesParty(relationship, party),
      )
      .sort(
        (a, b) => b.startedAt.getTime() - a.startedAt.getTime() || b.id - a.id,
      )
      .map((relationship) => ({ ...relationship }));
  }

  async findActiveRelationship(id: number) {
    const relationship = this.state.relationships.find(
      (entry) => entry.id === id && entry.endedAt === null,
    );
    return relationship ? { ...relationship } : null;
  }

  async replaceRelationshipsWithWar(
    firstInput: PartyInput,
    secondInput: PartyInput,
  ) {
    const [first, second] = [
      toPartyRef(firstInput),
      toPartyRef(secondInput),
    ].sort(comparePartyRefs);
    this.assertSameFaction(first, second);
    const now = this.now();
    const replaced = new Set<number>();
    for (const relationship of this.state.relationships) {
      if (
        relationship.endedAt === null &&
        isPair(relationship.firstParty, relationship.secondParty, first, second)
      ) {
        relationship.endedAt = now;
        replaced.add(relationship.id);
      }
    }
    this.state.relationshipProposals = this.state.relationshipProposals.filter(
      (proposal) =>
        !isPair(proposal.firstParty, proposal.secondParty, first, second),
    );
    this.state.relationshipChangeProposals =
      this.state.relationshipChangeProposals.filter(
        (proposal) => !replaced.has(proposal.relationshipId),
      );
    this.state.relationships.push(
      relationshipRecordOf({
        id: this.nextId(),
        firstParty: first,
        secondParty: second,
        type: AllianceRelationshipType.WAR,
        startedAt: now,
        endedAt: null,
        contract: '',
        treatAsFriend: false,
        shareLivePositions: false,
        lordParty: null,
        vassalParty: null,
      }),
    );
  }

  private readonly lockedPlayerParties = new Set<number>();
  private readonly lockOrder: string[] = [];

  /** Locks in the order taken, e.g. `player:1`, `alliance:2`. */
  lockSequence(): string[] {
    return [...this.lockOrder];
  }

  clearLockSequence(): void {
    this.lockOrder.length = 0;
  }

  /** Player parties a mutation created or locked; reads must not add any. */
  lockedPlayerPartyIds(): number[] {
    return [...this.lockedPlayerParties];
  }

  async lockPlayerParty(userId: number) {
    // Single-threaded: nothing to serialise, only record the party row.
    this.lockedPlayerParties.add(userId);
    this.lockOrder.push(`player:${userId}`);
  }

  async endPlayerPartyDiplomacy(userId: number) {
    const party = toPartyRef({ type: DiplomacyPartyType.PLAYER, id: userId });
    const now = this.now();
    const relationships = this.state.relationships.filter(
      (relationship) =>
        relationship.endedAt === null && involvesParty(relationship, party),
    );
    const proposals = this.state.relationshipProposals.filter((proposal) =>
      involvesParty(proposal, party),
    );
    const ended = new Set(relationships.map((relationship) => relationship.id));
    const result = {
      relationships: relationships.map((relationship) => ({ ...relationship })),
      proposals: proposals.map((proposal) => ({ ...proposal })),
    };
    for (const relationship of relationships) relationship.endedAt = now;
    this.state.relationshipProposals = this.state.relationshipProposals.filter(
      (proposal) => !involvesParty(proposal, party),
    );
    this.state.relationshipChangeProposals =
      this.state.relationshipChangeProposals.filter(
        (proposal) => !ended.has(proposal.relationshipId),
      );
    return result;
  }

  async listRelationshipProposals(partyInput: PartyInput) {
    const party = toPartyRef(partyInput);
    return this.state.relationshipProposals
      .filter((proposal) => involvesParty(proposal, party))
      .sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id,
      )
      .map((proposal) => ({ ...proposal }));
  }

  async findRelationshipProposal(id: number) {
    const proposal = this.state.relationshipProposals.find(
      (entry) => entry.id === id,
    );
    return proposal ? { ...proposal } : null;
  }

  async insertRelationshipProposal(
    data: ProposalParties & {
      type: AllianceRelationshipType;
      contract: string;
      treatAsFriend: boolean;
      shareLivePositions: boolean;
    },
  ) {
    const { senderParty, recipientParty } = proposalParties(data);
    const [firstParty, secondParty] = [senderParty, recipientParty].sort(
      comparePartyRefs,
    );
    this.assertSameFaction(firstParty, secondParty);
    if (
      this.state.relationshipProposals.some((proposal) =>
        isPair(
          proposal.firstParty,
          proposal.secondParty,
          firstParty,
          secondParty,
        ),
      )
    ) {
      throw new AllianceConstraintViolation('relationship_proposal');
    }
    const proposal: AllianceRelationshipProposalRecord = {
      id: this.nextId(),
      firstParty,
      secondParty,
      senderParty,
      recipientParty,
      type: data.type,
      contract: data.contract,
      treatAsFriend: data.treatAsFriend,
      shareLivePositions: data.shareLivePositions,
      createdAt: this.now(),
    };
    this.state.relationshipProposals.push(proposal);
    return { ...proposal };
  }

  async deleteRelationshipProposal(id: number) {
    const before = this.state.relationshipProposals.length;
    this.state.relationshipProposals = this.state.relationshipProposals.filter(
      (proposal) => proposal.id !== id,
    );
    return this.state.relationshipProposals.length !== before;
  }

  async acceptRelationshipProposal(id: number) {
    const proposal = this.state.relationshipProposals.find(
      (entry) => entry.id === id,
    );
    if (!proposal) return null;
    const now = this.now();
    for (const relationship of this.state.relationships) {
      if (
        relationship.endedAt === null &&
        isPair(
          relationship.firstParty,
          relationship.secondParty,
          proposal.firstParty,
          proposal.secondParty,
        )
      ) {
        relationship.endedAt = now;
      }
    }
    this.state.relationshipProposals = this.state.relationshipProposals.filter(
      (entry) => entry.id !== id,
    );
    const isVassalage = proposal.type === AllianceRelationshipType.VASSALAGE;
    const relationship = relationshipRecordOf({
      id: this.nextId(),
      firstParty: proposal.firstParty,
      secondParty: proposal.secondParty,
      type: proposal.type,
      startedAt: now,
      endedAt: null,
      contract: proposal.contract,
      treatAsFriend: proposal.treatAsFriend,
      shareLivePositions: proposal.shareLivePositions,
      lordParty: isVassalage ? proposal.senderParty : null,
      vassalParty: isVassalage ? proposal.recipientParty : null,
    });
    this.state.relationships.push(relationship);
    return { ...relationship };
  }

  async listRelationshipChangeProposals(partyInput: PartyInput) {
    const party = toPartyRef(partyInput);
    return this.state.relationshipChangeProposals
      .filter(
        (proposal) =>
          samePartyRef(proposal.senderParty, party) ||
          samePartyRef(proposal.recipientParty, party),
      )
      .sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id,
      )
      .map((proposal) => ({ ...proposal }));
  }

  async findRelationshipChangeProposal(id: number) {
    const proposal = this.state.relationshipChangeProposals.find(
      (entry) => entry.id === id,
    );
    return proposal ? { ...proposal } : null;
  }

  async insertRelationshipChangeProposal(
    data: ProposalParties & {
      relationshipId: number;
      contract: string;
      treatAsFriend: boolean;
      shareLivePositions: boolean;
    },
  ) {
    if (
      this.state.relationshipChangeProposals.some(
        (proposal) => proposal.relationshipId === data.relationshipId,
      )
    ) {
      throw new AllianceConstraintViolation('relationship_change_proposal');
    }
    const { senderParty, recipientParty } = proposalParties(data);
    const proposal: AllianceRelationshipChangeProposalRecord = {
      id: this.nextId(),
      relationshipId: data.relationshipId,
      senderParty,
      recipientParty,
      contract: data.contract,
      treatAsFriend: data.treatAsFriend,
      shareLivePositions: data.shareLivePositions,
      createdAt: this.now(),
    };
    this.state.relationshipChangeProposals.push(proposal);
    return { ...proposal };
  }

  async deleteRelationshipChangeProposal(id: number) {
    const before = this.state.relationshipChangeProposals.length;
    this.state.relationshipChangeProposals =
      this.state.relationshipChangeProposals.filter(
        (proposal) => proposal.id !== id,
      );
    return this.state.relationshipChangeProposals.length !== before;
  }

  async acceptRelationshipChangeProposal(id: number) {
    const proposal = this.state.relationshipChangeProposals.find(
      (entry) => entry.id === id,
    );
    if (!proposal) return null;
    const relationship = this.state.relationships.find(
      (entry) => entry.id === proposal.relationshipId && entry.endedAt === null,
    );
    if (!relationship) return null;
    relationship.contract = proposal.contract;
    relationship.treatAsFriend = proposal.treatAsFriend;
    relationship.shareLivePositions = proposal.shareLivePositions;
    this.state.relationshipChangeProposals =
      this.state.relationshipChangeProposals.filter((entry) => entry.id !== id);
    return { ...relationship };
  }

  async endNonWarRelationship(id: number) {
    const relationship = this.state.relationships.find(
      (entry) => entry.id === id && entry.endedAt === null,
    );
    if (!relationship || relationship.type === AllianceRelationshipType.WAR) {
      return null;
    }
    relationship.endedAt = this.now();
    this.state.relationshipProposals = this.state.relationshipProposals.filter(
      (proposal) =>
        !isPair(
          proposal.firstParty,
          proposal.secondParty,
          relationship.firstParty,
          relationship.secondParty,
        ),
    );
    this.state.relationshipChangeProposals =
      this.state.relationshipChangeProposals.filter(
        (proposal) => proposal.relationshipId !== relationship.id,
      );
    return { ...relationship };
  }

  async appendDiplomacyChronicleEntry(data: NewDiplomacyChronicleEntry) {
    this.state.diplomacyChronicleEntries.push({
      id: this.nextId(),
      eventType: data.eventType,
      actorUserId: data.actorUserId,
      actorName: data.actorName,
      relationshipType: data.relationshipType,
      ...chronicleEntryParties(data),
      endReason: data.endReason ?? null,
      occurredAt: this.now(),
    });
  }

  async appendAllianceChronicleEntry(
    data: Omit<AllianceChronicleEntryRecord, 'id' | 'occurredAt'>,
  ) {
    this.state.allianceChronicleEntries.push({
      id: this.nextId(),
      ...data,
      occurredAt: this.now(),
    });
  }

  async listAllianceChronicleEntries(
    allianceId: number,
    cursor: { occurredAt: Date; id: number } | null,
    limit: number,
  ) {
    return this.state.allianceChronicleEntries
      .filter((entry) => entry.allianceId === allianceId)
      .filter(
        (entry) =>
          !cursor ||
          entry.occurredAt < cursor.occurredAt ||
          (entry.occurredAt.getTime() === cursor.occurredAt.getTime() &&
            entry.id < cursor.id),
      )
      .sort(
        (a, b) =>
          b.occurredAt.getTime() - a.occurredAt.getTime() || b.id - a.id,
      )
      .slice(0, limit)
      .map((entry) => ({ ...entry }));
  }

  async listDiplomacyChronicleEntries(
    partyInput: PartyInput,
    cursor: { occurredAt: Date; id: number } | null,
    limit: number,
  ) {
    const party = toPartyRef(partyInput);
    return this.state.diplomacyChronicleEntries
      .filter((entry) => involvesParty(entry, party))
      .filter(
        (entry) =>
          !cursor ||
          entry.occurredAt < cursor.occurredAt ||
          (entry.occurredAt.getTime() === cursor.occurredAt.getTime() &&
            entry.id < cursor.id),
      )
      .sort(
        (a, b) =>
          b.occurredAt.getTime() - a.occurredAt.getTime() || b.id - a.id,
      )
      .slice(0, limit)
      .map((entry) => ({ ...entry }));
  }

  async enqueueDiplomacyNotifications(
    notifications: Array<{ recipientUserId: number; body: string }>,
  ) {
    for (const notification of notifications) {
      const id = this.nextId();
      this.state.diplomacyNotifications.push({
        id,
        ...notification,
        deliveryKey: `alliance-diplomacy-notification:${id}`,
        createdAt: this.now(),
        deliveredAt: null,
        leaseToken: null,
      });
    }
  }

  async listPendingDiplomacyNotifications() {
    return this.state.diplomacyNotifications
      .filter((notification) => notification.deliveredAt === null)
      .sort((a, b) => a.id - b.id)
      .map((notification) => ({ ...notification }));
  }

  async claimDiplomacyNotifications(limit: number) {
    return this.state.diplomacyNotifications
      .filter(
        (notification) =>
          notification.deliveredAt === null && notification.leaseToken === null,
      )
      .sort((a, b) => a.id - b.id)
      .slice(0, limit)
      .map((notification) => {
        notification.leaseToken = `in-memory-lease:${notification.id}:${this.nextId()}`;
        return { ...notification };
      });
  }

  async markDiplomacyNotificationDelivered(id: number, leaseToken: string) {
    const notification = this.state.diplomacyNotifications.find(
      (entry) =>
        entry.id === id &&
        entry.deliveredAt === null &&
        entry.leaseToken === leaseToken,
    );
    if (!notification) return false;
    notification.deliveredAt = this.now();
    notification.leaseToken = null;
    return true;
  }

  async releaseDiplomacyNotificationClaim(id: number, leaseToken: string) {
    const notification = this.state.diplomacyNotifications.find(
      (entry) =>
        entry.id === id &&
        entry.deliveredAt === null &&
        entry.leaseToken === leaseToken,
    );
    if (notification) notification.leaseToken = null;
  }

  async enqueueAssetDeletion(assetKey: string) {
    if (this.state.assetDeletions.some((t) => t.assetKey === assetKey)) return;
    this.state.assetDeletions.push({
      id: this.nextId(),
      assetKey,
      attempts: 0,
      nextAttemptAt: new Date(0),
    });
  }

  async listPendingAssetDeletions() {
    return this.state.assetDeletions.map((task) => ({ ...task }));
  }

  async claimDueAssetDeletions(
    limit: number,
    now: Date,
    backoffMs: (attempts: number) => number,
  ) {
    return this.state.assetDeletions
      .filter((task) => task.nextAttemptAt <= now)
      .slice(0, limit)
      .map((task) => {
        task.attempts += 1;
        task.nextAttemptAt = new Date(now.getTime() + backoffMs(task.attempts));
        return { ...task };
      });
  }

  async completeAssetDeletion(id: number) {
    this.state.assetDeletions = this.state.assetDeletions.filter(
      (task) => task.id !== id,
    );
  }

  async findMembership(userId: number) {
    const membership = this.state.memberships.find((m) => m.userId === userId);
    return membership ? { ...membership } : null;
  }

  async findMemberships(userIds: number[]) {
    const memberships = await Promise.all(
      [...new Set(userIds)].map((userId) => this.findMembership(userId)),
    );
    return memberships.filter((membership) => membership !== null);
  }

  async listMemberships(allianceId: number) {
    return this.state.memberships
      .filter((m) => m.allianceId === allianceId)
      .sort(
        (a, b) => a.joinedAt.getTime() - b.joinedAt.getTime() || a.id - b.id,
      )
      .map((m) => ({ ...m }));
  }

  async listMembershipsForAlliances(allianceIds: number[]) {
    const ids = new Set(allianceIds);
    return this.state.memberships
      .filter((m) => ids.has(m.allianceId))
      .sort(
        (a, b) =>
          a.allianceId - b.allianceId ||
          a.joinedAt.getTime() - b.joinedAt.getTime() ||
          a.id - b.id,
      )
      .map((m) => ({ ...m }));
  }

  async insertMembership(data: {
    allianceId: number;
    userId: number;
    role: AllianceRole;
  }) {
    if (this.state.memberships.some((m) => m.userId === data.userId)) {
      throw new AllianceConstraintViolation('membership_user');
    }
    this.assertSinglePresident(data.allianceId, data.role);
    this.state.memberships.push({
      id: this.nextId(),
      ...data,
      joinedAt: this.now(),
    });
  }

  async setRole(allianceId: number, userId: number, role: AllianceRole) {
    const membership = this.state.memberships.find(
      (m) => m.userId === userId && m.allianceId === allianceId,
    );
    if (!membership) return false;
    if (membership.role !== role) {
      this.assertSinglePresident(allianceId, role);
    }
    membership.role = role;
    return true;
  }

  async deleteMembership(allianceId: number, userId: number) {
    const before = this.state.memberships.length;
    this.state.memberships = this.state.memberships.filter(
      (m) => !(m.userId === userId && m.allianceId === allianceId),
    );
    return this.state.memberships.length < before;
  }

  async findApplication(id: number) {
    return this.state.applications.find((a) => a.id === id) ?? null;
  }

  async findApplicationOf(allianceId: number, userId: number) {
    return (
      this.state.applications.find(
        (a) => a.allianceId === allianceId && a.userId === userId,
      ) ?? null
    );
  }

  async listApplicationsForAlliance(allianceId: number) {
    return this.state.applications
      .filter((a) => a.allianceId === allianceId)
      .sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id,
      );
  }

  async listApplicationsOfPlayer(userId: number) {
    return this.state.applications.filter((a) => a.userId === userId);
  }

  async insertApplication(data: { allianceId: number; userId: number }) {
    if (await this.findApplicationOf(data.allianceId, data.userId)) {
      throw new AllianceConstraintViolation('application');
    }
    return this.seedApplication(data.allianceId, data.userId);
  }

  async deleteApplications(ids: number[]) {
    const before = this.state.applications.length;
    this.state.applications = this.state.applications.filter(
      (a) => !ids.includes(a.id),
    );
    return before - this.state.applications.length;
  }

  private normalizeRelationshipContract(
    type: AllianceRelationshipType,
    contract: string | undefined,
  ) {
    if (type === AllianceRelationshipType.WAR) return '';
    const normalized = (contract ?? '').trim();
    if (Array.from(normalized).length > 20_000) {
      throw new Error(
        'Alliance relationship contract exceeds 20,000 characters',
      );
    }
    return normalized;
  }

  /** Mirrors the database: both parties exist and share one faction. */
  private assertSameFaction(first: PartyRef, second: PartyRef) {
    const factionOf = (party: PartyRef) =>
      party.type === DiplomacyPartyType.ALLIANCE
        ? this.state.alliances.find((alliance) => alliance.id === party.id)
            ?.factionId
        : this.state.players.find((player) => player.id === party.id)
            ?.factionId;
    const firstFaction = factionOf(first);
    const secondFaction = factionOf(second);
    if (
      firstFaction === undefined ||
      firstFaction === null ||
      firstFaction !== secondFaction
    ) {
      throw new Error(
        'Alliance relationships need parties from the same faction',
      );
    }
  }

  private assertRelationshipShape(data: {
    type: AllianceRelationshipType;
    firstParty: PartyRef;
    secondParty: PartyRef;
    treatAsFriend: boolean;
    shareLivePositions: boolean;
    lordParty: PartyRef | null;
    vassalParty: PartyRef | null;
  }) {
    const validParties = (party: PartyRef | null) =>
      party !== null &&
      (samePartyRef(party, data.firstParty) ||
        samePartyRef(party, data.secondParty));
    if (data.type === AllianceRelationshipType.VASSALAGE) {
      if (
        data.lordParty === null ||
        data.vassalParty === null ||
        samePartyRef(data.lordParty, data.vassalParty) ||
        !validParties(data.lordParty) ||
        !validParties(data.vassalParty)
      ) {
        throw new Error('Vassalage needs two distinct relationship parties');
      }
    } else if (data.lordParty !== null || data.vassalParty !== null) {
      throw new Error('Only vassalage has a directional relationship');
    }
    if (
      data.treatAsFriend &&
      ![
        AllianceRelationshipType.FRIENDSHIP,
        AllianceRelationshipType.ALLIANCE,
        AllianceRelationshipType.TRADE_AGREEMENT,
        AllianceRelationshipType.VASSALAGE,
      ].includes(data.type)
    ) {
      throw new Error(
        'This relationship type cannot treat the counterparty as a friend',
      );
    }
    if (
      data.shareLivePositions &&
      data.type !== AllianceRelationshipType.ALLIANCE
    ) {
      throw new Error('Only an alliance relationship can share live positions');
    }
  }

  private assertSinglePresident(allianceId: number, role: AllianceRole) {
    if (
      role === AllianceRole.PRESIDENT &&
      this.state.memberships.some(
        (m) => m.allianceId === allianceId && m.role === AllianceRole.PRESIDENT,
      )
    ) {
      throw new AllianceConstraintViolation('alliance_president');
    }
  }

  private nextId() {
    return this.state.nextId++;
  }

  /** Strictly increasing timestamps so "oldest first" is deterministic. */
  private now() {
    this.state.clock += 1000;
    return new Date(this.state.clock);
  }
}
