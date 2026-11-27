import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  Optional,
  NotFoundException,
} from '@nestjs/common';
import {
  AllianceApplicationDto,
  AllianceBannerDto,
  allianceBannerUrl,
  AllianceChronicleDto,
  AllianceChronicleEntryDto,
  AllianceChronicleEventType,
  AllianceDiplomacyChronicleDto,
  AllianceDiplomacyChronicleEntryDto,
  AllianceDiplomacyChronicleEndReason,
  AllianceDiplomacyChronicleEventType,
  AllianceDetailDto,
  AllianceDiplomacyManagementDto,
  AllianceDiplomacyCapabilitiesDto,
  AllianceMemberActionsDto,
  AllianceMemberRoleDto,
  AlliancePermission,
  AllianceRoleDto,
  AllianceRelationshipChangeProposalDto,
  AllianceRelationshipContractDto,
  AllianceRelationshipPermissionsDto,
  AllianceRelationshipProposalDto,
  AllianceRelationshipSummaryDto,
  AllianceRefDto,
  AllianceRelationshipType,
  AllianceRole,
  type MyAllianceDto,
  type ProposeSettlerRelationshipRequest,
  type SettlerCounterpartyPageDto,
  type SettlerDiplomacyManagementDto,
  type SettlerPublicDiplomacyDto,
  AllianceSummaryDto,
  CreateAllianceRoleRequest,
  FoundAllianceRequest,
  LeaveAllianceResponse,
  ProposeAllianceRelationshipChangeRequest,
  ProposeAllianceRelationshipRequest,
  UpdateAllianceRequest,
  UpdateAllianceRoleRequest,
} from '@swuniverse/shared';
import { chooseSuccessor } from './presidential-succession';
import { MessagingService } from '../messaging/messaging.service';
import { GameEventService } from '../events/game-event.service';
import type { EntityManager } from 'typeorm';
import {
  ALLIANCE_CHRONICLE_PAGE_DEFAULT,
  ALLIANCE_CHRONICLE_PAGE_MAX,
  SETTLER_SEARCH_PAGE_DEFAULT,
  SETTLER_SEARCH_PAGE_MAX,
  SETTLER_SEARCH_QUERY_MAX,
  ALLIANCE_DESCRIPTION_MAX,
  ALLIANCE_HOMEPAGE_MAX,
  ALLIANCE_NAME_MAX,
  ALLIANCE_NAME_MIN,
  ALLIANCE_TITLE_MAX,
  ALLIANCE_TITLE_MIN,
} from './alliance.constants';
import {
  hasPermission,
  heldPermissions,
  isFounder,
  mayChangeRoleHolders,
  mayHandleRole,
  mayManageMember,
  PUBLIC_ROLE_PERMISSIONS,
} from './alliance-permissions';
import { ONLINE_PLAYERS } from './online-players.port';
import type { OnlinePlayersPort } from './online-players.port';
import {
  ALLIANCE_CONTEXT_CLEANUP,
  AllianceContextCleanup,
} from './alliance-context-cleanup';
import { ALLIANCE_STORE, AllianceConstraintViolation } from './alliance.store';
import {
  allianceParty,
  isAllianceParty,
  playerParty,
  isPair,
  otherParty,
  samePartyRef,
  type PartyRef,
} from './diplomacy-party';
import { AllianceBannerService } from './alliance-banner.service';
import { AllianceRateLimiterService } from './alliance-rate-limiter.service';
import type {
  AllianceConstraint,
  AllianceChronicleEntryRecord,
  AllianceDiplomacyChronicleEntryRecord,
  AlliancePatch,
  AllianceRecord,
  AllianceRoleRecord,
  AllianceRelationshipChangeProposalRecord,
  AllianceRelationshipProposalRecord,
  AllianceRelationshipRecord,
  AllianceStore,
  ApplicationRecord,
  FactionRecord,
  MembershipRecord,
  PlayerRecord,
} from './alliance.store';

const P = AlliancePermission;
/** Rights a role may carry; FOUNDER is never handed out through roles. */
const ASSIGNABLE_PERMISSIONS = new Set<AlliancePermission>(
  Object.values(P).filter((p) => p !== P.FOUNDER),
);

/** Members by their first role's sort; members without role last. */
function byRoleRank(a: MembershipRecord, b: MembershipRecord): number {
  const rank = (m: MembershipRecord) =>
    m.roles[0]?.sort ?? Number.POSITIVE_INFINITY;
  return rank(a) - rank(b);
}

const isFounderRole = (role: AllianceRoleRecord) =>
  role.permissions.includes(P.FOUNDER);

const UNKNOWN_NAME = 'Unbekannt';

const ERR = {
  roleRights:
    'Du kannst nur Rollen mit Rechten verwalten, die Du selbst besitzt',
  roleNotFound: 'Rolle nicht gefunden',
  founderRoleFirst: 'Die Präsidentenrolle steht immer an erster Stelle',
  invalidRole: 'Ungültige Rolle',
  alreadyMember: 'Du bist bereits Mitglied einer Allianz',
  notMember: 'Du bist in keiner Allianz',
  noFaction: 'Du musst zuerst eine Fraktion wählen',
  nameTaken: 'Dieser Allianzname ist bereits vergeben',
  allianceNotFound: 'Die Allianz existiert nicht',
  applicationNotFound: 'Die Bewerbung existiert nicht',
  relationshipContractNotFound: 'Das Vertragswerk ist nicht verfügbar',
  relationshipProposalNotFound: 'Der Beziehungsvorschlag ist nicht verfügbar',
  relationshipProposalExists:
    'Für dieses Allianzpaar existiert bereits ein Beziehungsvorschlag',
  relationshipChangeProposalNotFound:
    'Der Beziehungsvorschlag ist nicht verfügbar',
  relationshipChangeProposalExists:
    'Für diese Beziehung existiert bereits ein Änderungsvorschlag',
  invalidRelationshipProposal: 'Dies ist kein gültiger Beziehungsvorschlag',
  memberNotFound: 'Der Siedler ist kein Mitglied dieser Allianz',
  invalidSettlerTarget: 'Dieser Siedler ist kein gültiges Ziel',
  invalidSearchCursor: 'Ungültiger Such-Cursor',
  invalidSearchQuery: 'Der Suchbegriff ist zu lang',
  forbidden: 'Dazu fehlt Dir die Berechtigung',
  applicantTaken: 'Der Siedler ist bereits Mitglied einer Allianz',
  alreadyApplied: 'Du hast Dich bei dieser Allianz bereits beworben',
  concurrentChange:
    'Die Allianz wurde gerade geändert. Bitte lade die Seite neu und versuche es erneut',
} as const;

/** German label of each relationship type for system messages. */
const RELATIONSHIP_TYPE_LABEL: Record<AllianceRelationshipType, string> = {
  [AllianceRelationshipType.WAR]: 'Krieg',
  [AllianceRelationshipType.PEACE]: 'Frieden',
  [AllianceRelationshipType.FRIENDSHIP]: 'Freundschaft',
  [AllianceRelationshipType.ALLIANCE]: 'Bündnis',
  [AllianceRelationshipType.TRADE_AGREEMENT]: 'Handelsabkommen',
  [AllianceRelationshipType.VASSALAGE]: 'Vasallenschaft',
};

/** Domain error for a constraint that rejected a write (last line of defence). */
const CONSTRAINT_ERRORS: Record<AllianceConstraint, string> = {
  alliance_name: ERR.nameTaken,
  membership_user: ERR.applicantTaken,
  alliance_president: ERR.concurrentChange,
  application: ERR.alreadyApplied,
  relationship_proposal: ERR.relationshipProposalExists,
  relationship_change_proposal: ERR.relationshipChangeProposalExists,
};

/** Which negotiable permissions each relationship type may carry. */
const RELATIONSHIP_PERMISSIONS: Record<
  AllianceRelationshipType,
  { treatAsFriend: boolean; shareLivePositions: boolean }
> = {
  [AllianceRelationshipType.WAR]: {
    treatAsFriend: false,
    shareLivePositions: false,
  },
  [AllianceRelationshipType.PEACE]: {
    treatAsFriend: false,
    shareLivePositions: false,
  },
  [AllianceRelationshipType.FRIENDSHIP]: {
    treatAsFriend: true,
    shareLivePositions: false,
  },
  [AllianceRelationshipType.ALLIANCE]: {
    treatAsFriend: true,
    shareLivePositions: true,
  },
  [AllianceRelationshipType.TRADE_AGREEMENT]: {
    treatAsFriend: true,
    shareLivePositions: false,
  },
  [AllianceRelationshipType.VASSALAGE]: {
    treatAsFriend: true,
    shareLivePositions: false,
  },
};

interface OutgoingMessage {
  to: number;
  body: string;
}

/**
 * A diplomacy party loaded inside a transaction: the alliance or alliance-less
 * player that stands on one side, with everyone who is informed about it.
 */
interface PartyContext {
  ref: PartyRef;
  name: string;
  factionId: number | null;
  recipientIds: number[];
}

@Injectable()
export class AllianceService {
  private readonly logger = new Logger(AllianceService.name);

  constructor(
    @Inject(ALLIANCE_STORE) private readonly store: AllianceStore,
    private readonly messaging: MessagingService,
    private readonly rateLimiter?: AllianceRateLimiterService,
    @Optional()
    @Inject(ONLINE_PLAYERS)
    private readonly onlinePlayers?: OnlinePlayersPort,
    @Optional()
    @Inject(ALLIANCE_CONTEXT_CLEANUP)
    private readonly contextCleanup?: AllianceContextCleanup,
    @Optional()
    private readonly banners?: AllianceBannerService,
    @Optional()
    private readonly gameEvents?: GameEventService,
  ) {}

  // --- Queries ---

  async list(): Promise<AllianceSummaryDto[]> {
    const [alliances, factions] = await Promise.all([
      this.store.listAlliances(),
      this.store.listFactions(),
    ]);
    const memberships = await this.store.listMembershipsForAlliances(
      alliances.map((alliance) => alliance.id),
    );
    const playersById = await this.playersById(
      memberships.map((membership) => membership.userId),
    );
    const membersByAlliance = new Map<number, MembershipRecord[]>();
    for (const membership of memberships) {
      const members = membersByAlliance.get(membership.allianceId) ?? [];
      members.push(membership);
      membersByAlliance.set(membership.allianceId, members);
    }
    return alliances.map((alliance) => {
      const members = membersByAlliance.get(alliance.id) ?? [];
      return this.toSummary(
        alliance,
        members.length,
        factions,
        members,
        playersById,
      );
    });
  }

  async listDiplomacyChronicle(
    viewerId: number,
    allianceId: number,
    cursor?: string,
    limit?: number,
  ): Promise<AllianceDiplomacyChronicleDto> {
    await this.requireAlliance(allianceId);
    return this.diplomacyChronicleOf(allianceParty(allianceId), cursor, limit);
  }

  /** Public view of a Siedler: active relationships, never proposals or drafts. */
  async getPublicSettlerDiplomacy(
    _viewerId: number,
    playerId: number,
  ): Promise<SettlerPublicDiplomacyDto> {
    const player = await this.store.findPlayer(playerId);
    if (!player) throw new NotFoundException(ERR.invalidSettlerTarget);
    const ref = playerParty(playerId);
    const relationships = await this.store.listActiveRelationships(ref);
    return {
      playerId,
      name: player.name,
      relationships: await this.relationshipSummaries(ref, relationships),
    };
  }

  /** Public diplomacy chronicle of an alliance-less player. */
  async listSettlerDiplomacyChronicle(
    _viewerId: number,
    playerId: number,
    cursor?: string,
    limit?: number,
  ): Promise<AllianceDiplomacyChronicleDto> {
    if (!(await this.store.findPlayer(playerId))) {
      throw new NotFoundException(ERR.invalidSettlerTarget);
    }
    return this.diplomacyChronicleOf(playerParty(playerId), cursor, limit);
  }

  private async diplomacyChronicleOf(
    party: PartyRef,
    cursor?: string,
    limit?: number,
  ): Promise<AllianceDiplomacyChronicleDto> {
    const pageSize = Math.min(
      Math.max(limit ?? ALLIANCE_CHRONICLE_PAGE_DEFAULT, 1),
      ALLIANCE_CHRONICLE_PAGE_MAX,
    );
    const paginationCursor = this.parseChronicleCursor(cursor);
    const entries = await this.store.listDiplomacyChronicleEntries(
      party,
      paginationCursor,
      pageSize + 1,
    );
    const page = entries.slice(0, pageSize);
    const last = page.at(-1);
    return {
      entries: page.map((entry) => this.toChronicleEntry(entry)),
      nextCursor:
        entries.length > pageSize && last
          ? this.encodeChronicleCursor(last)
          : null,
    };
  }

  /** Internal chronicle: members with VIEW_ALLIANCE_HISTORY; outsiders get Not Found. */
  async listChronicle(
    viewerId: number,
    allianceId: number,
    cursor?: string,
    limit?: number,
  ): Promise<AllianceChronicleDto> {
    const membership = await this.store.findMembership(viewerId);
    if (!membership || membership.allianceId !== allianceId) {
      throw new NotFoundException(ERR.allianceNotFound);
    }
    if (!hasPermission(membership, P.VIEW_ALLIANCE_HISTORY)) {
      throw new ForbiddenException(ERR.forbidden);
    }
    const pageSize = Math.min(
      Math.max(limit ?? ALLIANCE_CHRONICLE_PAGE_DEFAULT, 1),
      ALLIANCE_CHRONICLE_PAGE_MAX,
    );
    const paginationCursor = this.parseChronicleCursor(cursor);
    const entries = await this.store.listAllianceChronicleEntries(
      allianceId,
      paginationCursor,
      pageSize + 1,
    );
    const page = entries.slice(0, pageSize);
    const last = page.at(-1);
    return {
      entries: page.map((entry) => this.toAllianceChronicleEntry(entry)),
      nextCursor:
        entries.length > pageSize && last
          ? this.encodeChronicleCursor(last)
          : null,
    };
  }

  async getDetail(
    viewerId: number,
    allianceId: number,
  ): Promise<AllianceDetailDto> {
    const alliance = await this.requireAlliance(allianceId);
    const [
      memberships,
      factions,
      viewer,
      viewerMembership,
      application,
      relationships,
      roles,
    ] = await Promise.all([
      this.store.listMemberships(allianceId),
      this.store.listFactions(),
      this.store.findPlayer(viewerId),
      this.store.findMembership(viewerId),
      this.store.findApplicationOf(allianceId, viewerId),
      this.store.listActiveRelationships(allianceId),
      this.store.listRoles(allianceId),
    ]);
    const playersById = await this.playersById(
      memberships.map((membership) => membership.userId),
    );
    const relationshipSummaries = await this.relationshipSummaries(
      allianceId,
      relationships,
    );
    const own =
      viewerMembership?.allianceId === allianceId ? viewerMembership : null;

    // Online status is internal: only members of this very alliance see it.
    const onlineIds = own
      ? new Set(this.onlinePlayers?.onlineUserIds() ?? [])
      : null;

    const members = [...memberships].sort(byRoleRank).map((m) => {
      const player = playersById.get(m.userId);
      return {
        userId: m.userId,
        name: player?.name ?? UNKNOWN_NAME,
        avatar: player?.avatar ?? null,
        faction: this.playerFaction(player, factions),
        roles: this.memberRoles(m),
        joinedAt: m.joinedAt.toISOString(),
        actions: this.memberActions(own, m),
        ...(onlineIds ? { online: onlineIds.has(m.userId) } : {}),
      };
    });

    const may = (permission: AlliancePermission) =>
      hasPermission(own, permission);

    return {
      ...this.toSummary(
        alliance,
        memberships.length,
        factions,
        memberships,
        playersById,
      ),
      homepage: alliance.homepage,
      description: alliance.description,
      renderedDescription: this.renderDescription(
        alliance,
        memberships,
        playersById,
        relationshipSummaries,
      ),
      roles: roles.map((role) => this.roleDto(own, role, memberships)),
      members,
      relationships: relationshipSummaries,
      viewer: {
        permissions: own ? heldPermissions(own) : null,
        actions: {
          apply:
            !viewerMembership &&
            !application &&
            alliance.acceptsApplications &&
            viewer?.factionId === alliance.factionId,
          withdrawApplication: !!application,
          leave: !!own && (!isFounder(own) || memberships.length === 1),
          editDetails: may(P.EDIT_ALLIANCE),
          manageApplications: may(P.MANAGE_APPLICATIONS),
          dissolve: may(P.FOUNDER),
          manageDiplomacy:
            may(P.CREATE_AGREEMENTS) || may(P.EDIT_DIPLOMATIC_DOCUMENTS),
          readForum: !!own,
          viewMemberOperations: may(P.VIEW_MEMBER_DATA),
          viewChronicle: may(P.VIEW_ALLIANCE_HISTORY),
          manageRoles: may(P.MANAGE_JOBS),
          manageBanner: may(P.EDIT_ALLIANCE),
        },
      },
    };
  }

  async getPublicRelationshipContract(
    allianceId: number,
    relationshipId: number,
  ): Promise<AllianceRelationshipContractDto> {
    return this.publicContractOf(allianceParty(allianceId), relationshipId);
  }

  /** The active Vertragswerk of a settler's relationship is public. */
  async getPublicSettlerRelationshipContract(
    playerId: number,
    relationshipId: number,
  ): Promise<AllianceRelationshipContractDto> {
    return this.publicContractOf(playerParty(playerId), relationshipId);
  }

  private async publicContractOf(
    party: PartyRef,
    relationshipId: number,
  ): Promise<AllianceRelationshipContractDto> {
    const relationship =
      await this.store.findActiveRelationship(relationshipId);
    if (
      !relationship ||
      !this.isPartyOf(relationship, party) ||
      !relationship.contract
    ) {
      throw new NotFoundException(ERR.relationshipContractNotFound);
    }
    return { relationshipId: relationship.id, contract: relationship.contract };
  }

  /** The player's alliance and the capabilities the server grants them. */
  async getMyAlliance(userId: number): Promise<MyAllianceDto> {
    const [alliance, player] = await Promise.all([
      this.getRef(userId),
      this.store.findPlayer(userId),
    ]);
    return {
      alliance,
      actions: {
        settlerDiplomacy:
          alliance === null && !!player && player.factionId !== null,
      },
    };
  }

  /**
   * The requester as their own diplomacy party. Alliance members act for their
   * alliance only, so they never get a player party; the party is never chosen
   * by the client.
   */
  private async requireSettler(
    tx: AllianceStore,
    actorId: number,
    { lock = true }: { lock?: boolean } = {},
  ): Promise<PartyContext> {
    // Lock first: a concurrent join then commits before the membership check.
    // Reads pass `lock: false`: they must not create the party row.
    if (lock) await tx.lockPlayerParty(actorId);
    const actor = await tx.findPlayer(actorId);
    if (
      !actor ||
      actor.factionId === null ||
      (await tx.findMembership(actorId))
    ) {
      throw new ForbiddenException(ERR.forbidden);
    }
    return {
      ref: playerParty(actor.id),
      name: actor.name,
      factionId: actor.factionId,
      recipientIds: [actor.id],
    };
  }

  /**
   * Locks a Siedler counterparty ahead of the alliance. Invalid ids are left to
   * `requireSettlerCounterparty`, which rejects them.
   */
  private async lockSettlerTarget(
    tx: AllianceStore,
    targetId: unknown,
  ): Promise<void> {
    if (Number.isInteger(targetId))
      await tx.lockPlayerParty(targetId as number);
  }

  /** A valid counterparty: another alliance-less player of the same faction. */
  private async requireSettlerCounterparty(
    tx: AllianceStore,
    actor: PartyContext,
    targetId: unknown,
  ): Promise<PartyContext> {
    if (
      !Number.isInteger(targetId) ||
      (!isAllianceParty(actor.ref) && targetId === actor.ref.id)
    ) {
      throw new BadRequestException(ERR.invalidSettlerTarget);
    }
    await tx.lockPlayerParty(targetId as number);
    const target = await tx.findPlayer(targetId as number);
    if (
      !target ||
      target.factionId === null ||
      target.factionId !== actor.factionId ||
      (await tx.findMembership(target.id))
    ) {
      throw new BadRequestException(ERR.invalidSettlerTarget);
    }
    return {
      ref: playerParty(target.id),
      name: target.name,
      factionId: target.factionId,
      recipientIds: [target.id],
    };
  }

  async declareSettlerWar(actorId: number, targetPlayerId: number) {
    await this.rateLimiter?.check(actorId, 'war');
    await this.mutateDiplomacy(async (tx) => {
      const actor = await this.requireSettler(tx, actorId);
      const target = await this.requireSettlerCounterparty(
        tx,
        actor,
        targetPlayerId,
      );
      return this.declareWarBetween(tx, actorId, actor, target);
    });
  }

  /** A Siedler declares war on an alliance of their faction. */
  async declareSettlerWarOnAlliance(actorId: number, allianceId: number) {
    await this.rateLimiter?.check(actorId, 'war');
    await this.mutateDiplomacy(async (tx) => {
      const actor = await this.requireSettler(tx, actorId);
      const target = await this.requireAllianceCounterparty(
        tx,
        actor,
        allianceId,
      );
      return this.declareWarBetween(tx, actorId, actor, target);
    });
  }

  /** An alliance (president or diplomat) declares war on a Siedler. */
  async declareWarOnSettler(
    actorId: number,
    allianceId: number,
    targetPlayerId: number,
  ) {
    await this.rateLimiter?.check(actorId, 'war');
    await this.mutateDiplomacy(async (tx) => {
      // Player party before alliance, like a join, so the two cannot deadlock.
      await this.lockSettlerTarget(tx, targetPlayerId);
      await this.lockedAllianceRight(
        tx,
        actorId,
        allianceId,
        P.CREATE_AGREEMENTS,
      );
      const actor = await this.loadParty(tx, allianceParty(allianceId));
      const target = await this.requireSettlerCounterparty(
        tx,
        actor,
        targetPlayerId,
      );
      return this.declareWarBetween(tx, actorId, actor, target);
    });
  }

  private async declareWarBetween(
    tx: AllianceStore,
    actorId: number,
    actor: PartyContext,
    target: PartyContext,
  ): Promise<OutgoingMessage[]> {
    await tx.replaceRelationshipsWithWar(actor.ref, target.ref);
    const relationship = (await tx.listActiveRelationships(actor.ref)).find(
      (entry) =>
        isPair(entry.firstParty, entry.secondParty, actor.ref, target.ref),
    );
    if (!relationship) throw new Error('War relationship was not created');
    await this.appendPartyChronicleEntry(
      tx,
      AllianceDiplomacyChronicleEventType.WAR_DECLARED,
      actorId,
      relationship,
      this.partyOf(relationship.firstParty, [actor, target]),
      this.partyOf(relationship.secondParty, [actor, target]),
    );
    return this.partyMessages(tx, actorId, actor, target, 'den Krieg erklärt');
  }

  /** A valid alliance counterparty: another alliance of the same faction. */
  private async requireAllianceCounterparty(
    tx: AllianceStore,
    actor: PartyContext,
    allianceId: unknown,
  ): Promise<PartyContext> {
    if (
      !Number.isInteger(allianceId) ||
      (isAllianceParty(actor.ref) && allianceId === actor.ref.id)
    ) {
      throw new BadRequestException(ERR.invalidRelationshipProposal);
    }
    const alliance = await tx.lockAlliance(allianceId as number);
    if (!alliance || alliance.factionId !== actor.factionId) {
      throw new BadRequestException(ERR.invalidRelationshipProposal);
    }
    return this.loadParty(tx, allianceParty(alliance.id));
  }

  /** The counterparty of a proposal: exactly one of alliance or player. */
  private async requireRecipient(
    tx: AllianceStore,
    sender: PartyContext,
    request: { recipientAllianceId?: unknown; recipientPlayerId?: unknown },
  ): Promise<PartyContext> {
    const hasAlliance = request?.recipientAllianceId != null;
    const hasPlayer = request?.recipientPlayerId != null;
    if (hasAlliance === hasPlayer) {
      throw new BadRequestException(ERR.invalidRelationshipProposal);
    }
    return hasAlliance
      ? this.requireAllianceCounterparty(
          tx,
          sender,
          request.recipientAllianceId,
        )
      : this.requireSettlerCounterparty(tx, sender, request.recipientPlayerId);
  }

  /** Validates and stores a proposal between two loaded parties. */
  private async createProposal(
    tx: AllianceStore,
    actorId: number,
    sender: PartyContext,
    recipient: PartyContext,
    request: {
      type: AllianceRelationshipType;
      contract?: string;
      permissions?: Partial<AllianceRelationshipPermissionsDto>;
    },
  ): Promise<{ id: number; messages: OutgoingMessage[] }> {
    const active = (await tx.listActiveRelationships(sender.ref)).find(
      (relationship) =>
        isPair(
          relationship.firstParty,
          relationship.secondParty,
          sender.ref,
          recipient.ref,
        ),
    );
    const type = request?.type;
    this.assertProposableType(type, active);
    const contract = this.validateRelationshipContract(request.contract);
    const permissions =
      type === AllianceRelationshipType.PEACE
        ? { treatAsFriend: false, shareLivePositions: false }
        : this.validateRelationshipPermissions(type, request.permissions);
    const proposal = await tx.insertRelationshipProposal({
      senderParty: sender.ref,
      recipientParty: recipient.ref,
      type,
      contract,
      ...permissions,
    });
    const messages = await this.partyMessages(
      tx,
      actorId,
      sender,
      recipient,
      'einen Beziehungsvorschlag gesendet',
    );
    return { id: proposal.id, messages };
  }

  async proposeSettlerRelationship(
    actorId: number,
    request: ProposeSettlerRelationshipRequest,
  ): Promise<{ id: number }> {
    await this.rateLimiter?.check(actorId, 'proposal');
    const result = await this.mutateDiplomacy(
      async (tx) => {
        const sender = await this.requireSettler(tx, actorId);
        const recipient = await this.requireRecipient(tx, sender, request);
        return this.createProposal(tx, actorId, sender, recipient, request);
      },
      (result) => result.messages,
    );
    return { id: result.id };
  }

  /** Confidential diplomacy view of an alliance-less player. */
  async getSettlerDiplomacy(
    actorId: number,
  ): Promise<SettlerDiplomacyManagementDto> {
    const actor = await this.requireSettler(this.store, actorId, {
      lock: false,
    });
    const [relationships, proposals, changes, alliances] = await Promise.all([
      this.store.listActiveRelationships(actor.ref),
      this.store.listRelationshipProposals(actor.ref),
      this.store.listRelationshipChangeProposals(actor.ref),
      this.store.listAlliances(),
    ]);
    const changesByRelationship = new Map(
      changes.map((change) => [change.relationshipId, change]),
    );
    const summaries = await this.relationshipSummaries(
      actor.ref,
      relationships,
    );
    const hasPendingProposal = (relationship: AllianceRelationshipRecord) =>
      proposals.some((proposal) =>
        isPair(
          proposal.firstParty,
          proposal.secondParty,
          relationship.firstParty,
          relationship.secondParty,
        ),
      );
    return {
      capabilities: { create: true, declareWar: true },
      targets: alliances
        .filter((candidate) => candidate.factionId === actor.factionId)
        .map(({ id, name, color }) => ({ id, name, color })),
      relationships: summaries.map((summary) => {
        const relationship = relationships.find(
          (candidate) => candidate.id === summary.id,
        )!;
        const change = changesByRelationship.get(relationship.id);
        const direction = change
          ? samePartyRef(change.senderParty, actor.ref)
            ? 'SENT'
            : 'RECEIVED'
          : null;
        const isWar = relationship.type === AllianceRelationshipType.WAR;
        return {
          relationship: { ...summary, contract: relationship.contract },
          change:
            change && direction
              ? { ...this.toChangeProposalDto(change), direction }
              : null,
          capabilities: {
            ...this.diplomacyCapabilities(relationship.type, direction, true),
            declareWar: !isWar,
            offerPeace: isWar && !hasPendingProposal(relationship),
          },
        };
      }),
      proposals: proposals.map((proposal) => {
        const direction = samePartyRef(proposal.senderParty, actor.ref)
          ? 'SENT'
          : 'RECEIVED';
        return {
          proposal: this.toProposalDto(proposal),
          direction,
          capabilities: this.diplomacyCapabilities(
            proposal.type,
            direction,
            false,
          ),
        };
      }),
      permissions: RELATIONSHIP_PERMISSIONS,
    };
  }

  /** Alliance-less players of the requester's faction, for the picker. */
  async searchSettlerCounterparties(
    actorId: number,
    query?: string,
    cursor?: string,
    limit?: number,
  ): Promise<SettlerCounterpartyPageDto> {
    const actor = await this.requireSettler(this.store, actorId, {
      lock: false,
    });
    return this.searchSettlersFor(
      actor.factionId as number,
      actorId,
      query,
      cursor,
      limit,
    );
  }

  /**
   * Alliance-less players of the alliance's faction for the picker of its
   * president or diplomat; only id and name are exposed.
   */
  async searchAllianceCounterparties(
    actorId: number,
    allianceId: number,
    query?: string,
    cursor?: string,
    limit?: number,
  ): Promise<SettlerCounterpartyPageDto> {
    const alliance = await this.requireAlliance(allianceId);
    const membership = await this.ownMembership(
      this.store,
      actorId,
      allianceId,
    );
    if (!this.mayViewDiplomacy(membership)) {
      throw new ForbiddenException(ERR.forbidden);
    }
    return this.searchSettlersFor(
      alliance.factionId,
      actorId,
      query,
      cursor,
      limit,
    );
  }

  private async searchSettlersFor(
    factionId: number,
    excludeUserId: number,
    query?: string,
    cursor?: string,
    limit?: number,
  ): Promise<SettlerCounterpartyPageDto> {
    const text = (query ?? '').trim();
    if (Array.from(text).length > SETTLER_SEARCH_QUERY_MAX) {
      throw new BadRequestException(ERR.invalidSearchQuery);
    }
    const requested = Number.isFinite(limit)
      ? Math.floor(limit as number)
      : SETTLER_SEARCH_PAGE_DEFAULT;
    const pageSize = Math.min(Math.max(requested, 1), SETTLER_SEARCH_PAGE_MAX);
    let afterId = 0;
    if (cursor) {
      const decoded = Number(Buffer.from(cursor, 'base64url').toString('utf8'));
      if (!Number.isInteger(decoded) || decoded < 0) {
        throw new BadRequestException(ERR.invalidSearchCursor);
      }
      afterId = decoded;
    }
    const found = await this.store.searchSettlers({
      factionId,
      excludeUserId,
      query: text,
      afterId,
      limit: pageSize + 1,
    });
    const page = found.slice(0, pageSize);
    const last = page.at(-1);
    return {
      players: page.map(({ id, name }) => ({ id, name })),
      nextCursor:
        found.length > pageSize && last
          ? Buffer.from(String(last.id)).toString('base64url')
          : null,
    };
  }

  async getMemberIds(userId: number): Promise<number[]> {
    const membership = await this.store.findMembership(userId);
    if (!membership) return [];
    const members = await this.store.listMemberships(membership.allianceId);
    return members.map((member) => member.userId);
  }

  async getRef(userId: number): Promise<AllianceRefDto | null> {
    const membership = await this.store.findMembership(userId);
    if (!membership) return null;
    const alliance = await this.store.findAlliance(membership.allianceId);
    return alliance
      ? { id: alliance.id, name: alliance.name, color: alliance.color }
      : null;
  }

  async declareWar(
    actorId: number,
    allianceId: number,
    targetAllianceId: number,
  ): Promise<void> {
    await this.rateLimiter?.check(actorId, 'war');
    await this.mutateDiplomacy(async (tx) => {
      const alliance = await this.lockedAllianceRight(
        tx,
        actorId,
        allianceId,
        P.CREATE_AGREEMENTS,
      );
      if (allianceId === targetAllianceId) {
        throw new BadRequestException(
          'Diese Allianz ist kein gültiges Kriegsziel',
        );
      }
      const target = await this.lockedAlliance(tx, targetAllianceId);
      if (alliance.factionId !== target.factionId) {
        throw new BadRequestException(
          'Diese Allianz ist kein gültiges Kriegsziel',
        );
      }
      const actor = await tx.findPlayer(actorId);
      await tx.replaceRelationshipsWithWar(allianceId, targetAllianceId);
      const relationship = (await tx.listActiveRelationships(allianceId)).find(
        (entry) =>
          isPair(
            entry.firstParty,
            entry.secondParty,
            allianceParty(allianceId),
            allianceParty(targetAllianceId),
          ),
      );
      if (!relationship) throw new Error('War relationship was not created');
      const own = await this.loadParty(tx, allianceParty(allianceId));
      const other = await this.loadParty(tx, allianceParty(targetAllianceId));
      await this.appendPartyChronicleEntry(
        tx,
        AllianceDiplomacyChronicleEventType.WAR_DECLARED,
        actorId,
        relationship,
        this.partyOf(relationship.firstParty, [own, other]),
        this.partyOf(relationship.secondParty, [own, other]),
      );
      const recipients = await tx.listMemberships(targetAllianceId);
      return recipients.map((member) => ({
        to: member.userId,
        body: `${actor?.name ?? UNKNOWN_NAME} hat im Namen der Allianz ${alliance.name} den Krieg erklärt`,
      }));
    });
  }

  async getDiplomacyManagement(
    actorId: number,
    allianceId: number,
  ): Promise<AllianceDiplomacyManagementDto> {
    const alliance = await this.requireAlliance(allianceId);
    const membership = await this.ownMembership(
      this.store,
      actorId,
      allianceId,
    );
    if (!this.mayViewDiplomacy(membership)) {
      throw new ForbiddenException(ERR.forbidden);
    }

    const [alliances, relationships, proposals, changes] = await Promise.all([
      this.store.listAlliances(),
      this.store.listActiveRelationships(allianceId),
      this.store.listRelationshipProposals(allianceId),
      this.store.listRelationshipChangeProposals(allianceId),
    ]);
    const changesByRelationship = new Map(
      changes.map((change) => [change.relationshipId, change]),
    );
    const relationshipSummaries = await this.relationshipSummaries(
      allianceId,
      relationships,
    );

    return {
      capabilities: { create: true },
      targets: alliances
        .filter(
          (candidate) =>
            candidate.id !== allianceId &&
            candidate.factionId === alliance.factionId,
        )
        .map(({ id, name, color }) => ({ id, name, color })),
      relationships: relationshipSummaries.map((summary) => {
        const relationship = relationships.find(
          (candidate) => candidate.id === summary.id,
        )!;
        const change = changesByRelationship.get(relationship.id);
        return {
          relationship: { ...summary, contract: relationship.contract },
          change: change
            ? {
                ...this.toChangeProposalDto(change),
                direction: this.isSentBy(change.senderParty, allianceId)
                  ? 'SENT'
                  : 'RECEIVED',
              }
            : null,
          capabilities: this.diplomacyCapabilities(
            relationship.type,
            change && this.isSentBy(change.senderParty, allianceId)
              ? 'SENT'
              : change
                ? 'RECEIVED'
                : null,
            true,
          ),
        };
      }),
      proposals: proposals.map((proposal) => {
        const direction = this.isSentBy(proposal.senderParty, allianceId)
          ? 'SENT'
          : 'RECEIVED';
        return {
          proposal: this.toProposalDto(proposal),
          direction,
          capabilities: this.diplomacyCapabilities(
            proposal.type,
            direction,
            false,
          ),
        };
      }),
      permissions: RELATIONSHIP_PERMISSIONS,
    };
  }

  async listRelationshipProposals(
    actorId: number,
    allianceId: number,
  ): Promise<AllianceRelationshipProposalDto[]> {
    await this.requireAlliance(allianceId);
    const membership = await this.ownMembership(
      this.store,
      actorId,
      allianceId,
    );
    if (!this.mayViewDiplomacy(membership)) {
      throw new ForbiddenException(ERR.forbidden);
    }
    const proposals = await this.store.listRelationshipProposals(allianceId);
    return proposals.map((proposal) => this.toProposalDto(proposal));
  }

  async listRelationshipChangeProposals(
    actorId: number,
    allianceId: number,
  ): Promise<AllianceRelationshipChangeProposalDto[]> {
    await this.requireAlliance(allianceId);
    const membership = await this.ownMembership(
      this.store,
      actorId,
      allianceId,
    );
    if (!this.mayViewDiplomacy(membership)) {
      throw new ForbiddenException(ERR.forbidden);
    }
    const proposals =
      await this.store.listRelationshipChangeProposals(allianceId);
    return proposals.map((proposal) => this.toChangeProposalDto(proposal));
  }

  async proposeRelationshipChange(
    actorId: number,
    relationshipId: number,
    request: ProposeAllianceRelationshipChangeRequest,
  ): Promise<{ id: number }> {
    await this.rateLimiter?.check(actorId, 'change');
    const result = await this.mutateDiplomacy(
      async (tx) => {
        const relationship = await tx.findActiveRelationship(relationshipId);
        if (
          !relationship ||
          relationship.type === AllianceRelationshipType.WAR ||
          relationship.type === AllianceRelationshipType.PEACE
        ) {
          throw new NotFoundException(ERR.relationshipChangeProposalNotFound);
        }
        const sender = await this.representedParty(
          tx,
          actorId,
          relationship,
          P.EDIT_DIPLOMATIC_DOCUMENTS,
        );
        const recipient = await this.loadParty(
          tx,
          otherParty(relationship, sender.ref),
        );
        const contract = this.validateRelationshipContract(request?.contract);
        const permissions = this.validateRelationshipPermissions(
          relationship.type,
          request?.permissions,
        );
        if (
          contract === relationship.contract &&
          permissions.treatAsFriend === relationship.treatAsFriend &&
          permissions.shareLivePositions === relationship.shareLivePositions
        ) {
          throw new BadRequestException(ERR.invalidRelationshipProposal);
        }
        const proposal = await tx.insertRelationshipChangeProposal({
          relationshipId,
          senderParty: sender.ref,
          recipientParty: recipient.ref,
          contract,
          ...permissions,
        });
        const messages = await this.partyMessages(
          tx,
          actorId,
          sender,
          recipient,
          'eine Beziehungsänderung vorgeschlagen',
        );
        return { id: proposal.id, messages };
      },
      (result) => result.messages,
    );
    return { id: result.id };
  }

  async acceptRelationshipChange(
    actorId: number,
    proposalId: number,
  ): Promise<void> {
    await this.mutateDiplomacy(async (tx) => {
      const proposal = await this.requireRelationshipChangeProposal(
        tx,
        proposalId,
      );
      const actingFor = await this.actingParty(
        tx,
        actorId,
        proposal.recipientParty,
        P.EDIT_DIPLOMATIC_DOCUMENTS,
      );
      const relationship =
        await tx.acceptRelationshipChangeProposal(proposalId);
      if (!relationship) {
        throw new NotFoundException(ERR.relationshipChangeProposalNotFound);
      }
      const other = await this.loadParty(tx, proposal.senderParty);
      if (relationship.contractChanged) {
        await this.appendPartyChronicleEntry(
          tx,
          AllianceDiplomacyChronicleEventType.RELATIONSHIP_CHANGED,
          actorId,
          relationship,
          this.partyOf(relationship.firstParty, [actingFor, other]),
          this.partyOf(relationship.secondParty, [actingFor, other]),
        );
      }
      return this.partyMessages(
        tx,
        actorId,
        actingFor,
        other,
        'die Beziehungsänderung angenommen',
      );
    });
  }

  async declineRelationshipChange(
    actorId: number,
    proposalId: number,
  ): Promise<void> {
    await this.mutateDiplomacy(async (tx) => {
      const proposal = await this.requireRelationshipChangeProposal(
        tx,
        proposalId,
      );
      const actingFor = await this.actingParty(
        tx,
        actorId,
        proposal.recipientParty,
        P.EDIT_DIPLOMATIC_DOCUMENTS,
      );
      if (!(await tx.deleteRelationshipChangeProposal(proposalId))) {
        throw new NotFoundException(ERR.relationshipChangeProposalNotFound);
      }
      const other = await this.loadParty(tx, proposal.senderParty);
      return this.partyMessages(
        tx,
        actorId,
        actingFor,
        other,
        'die Beziehungsänderung abgelehnt',
      );
    });
  }

  async withdrawRelationshipChange(
    actorId: number,
    proposalId: number,
  ): Promise<void> {
    await this.mutateDiplomacy(async (tx) => {
      const proposal = await this.requireRelationshipChangeProposal(
        tx,
        proposalId,
      );
      const actingFor = await this.actingParty(
        tx,
        actorId,
        proposal.senderParty,
        P.EDIT_DIPLOMATIC_DOCUMENTS,
      );
      if (!(await tx.deleteRelationshipChangeProposal(proposalId))) {
        throw new NotFoundException(ERR.relationshipChangeProposalNotFound);
      }
      const other = await this.loadParty(tx, proposal.recipientParty);
      return this.partyMessages(
        tx,
        actorId,
        actingFor,
        other,
        'die Beziehungsänderung zurückgezogen',
      );
    });
  }

  async proposeRelationship(
    actorId: number,
    allianceId: number,
    request: ProposeAllianceRelationshipRequest,
  ): Promise<{ id: number }> {
    await this.rateLimiter?.check(actorId, 'proposal');
    const result = await this.mutateDiplomacy(
      async (tx) => {
        // Player party before alliance, like a join, so the two cannot deadlock.
        await this.lockSettlerTarget(tx, request?.recipientPlayerId);
        await this.lockedAllianceRight(
          tx,
          actorId,
          allianceId,
          P.CREATE_AGREEMENTS,
        );
        const sender = await this.loadParty(tx, allianceParty(allianceId));
        const recipient = await this.requireRecipient(tx, sender, request);
        return this.createProposal(tx, actorId, sender, recipient, request);
      },
      (result) => result.messages,
    );
    return { id: result.id };
  }

  async endRelationship(
    actorId: number,
    relationshipId: number,
  ): Promise<void> {
    await this.mutateDiplomacy(async (tx) => {
      const relationship = await tx.findActiveRelationship(relationshipId);
      if (!relationship || relationship.type === AllianceRelationshipType.WAR) {
        throw new NotFoundException(ERR.relationshipProposalNotFound);
      }
      const actingFor = await this.representedParty(
        tx,
        actorId,
        relationship,
        P.CREATE_AGREEMENTS,
      );
      const counterpart = await this.loadParty(
        tx,
        otherParty(relationship, actingFor.ref),
      );
      const endedRelationship = await tx.endNonWarRelationship(relationshipId);
      if (!endedRelationship) {
        throw new NotFoundException(ERR.relationshipProposalNotFound);
      }
      await this.appendPartyChronicleEntry(
        tx,
        AllianceDiplomacyChronicleEventType.RELATIONSHIP_ENDED,
        actorId,
        endedRelationship,
        this.partyOf(endedRelationship.firstParty, [actingFor, counterpart]),
        this.partyOf(endedRelationship.secondParty, [actingFor, counterpart]),
      );
      return this.partyMessages(
        tx,
        actorId,
        actingFor,
        counterpart,
        'die Beziehung beendet',
      );
    });
  }

  async acceptRelationshipProposal(
    actorId: number,
    proposalId: number,
  ): Promise<void> {
    await this.mutateDiplomacy(async (tx) => {
      const proposal = await this.requireRelationshipProposal(tx, proposalId);
      const recipient = await this.actingParty(
        tx,
        actorId,
        proposal.recipientParty,
        P.CREATE_AGREEMENTS,
      );
      const activeRelationship = (
        await tx.listActiveRelationships(proposal.senderParty)
      ).find((relationship) =>
        isPair(
          relationship.firstParty,
          relationship.secondParty,
          proposal.firstParty,
          proposal.secondParty,
        ),
      );
      const proposalIsStillApplicable =
        proposal.type === AllianceRelationshipType.PEACE
          ? activeRelationship?.type === AllianceRelationshipType.WAR
          : activeRelationship?.type !== AllianceRelationshipType.WAR;
      if (!proposalIsStillApplicable) {
        throw new BadRequestException(ERR.invalidRelationshipProposal);
      }
      const relationship = await tx.acceptRelationshipProposal(proposalId);
      if (!relationship)
        throw new NotFoundException(ERR.relationshipProposalNotFound);
      const sender = await this.loadParty(tx, proposal.senderParty);
      await this.appendPartyChronicleEntry(
        tx,
        activeRelationship
          ? AllianceDiplomacyChronicleEventType.RELATIONSHIP_CHANGED
          : AllianceDiplomacyChronicleEventType.RELATIONSHIP_STARTED,
        actorId,
        relationship,
        this.partyOf(relationship.firstParty, [recipient, sender]),
        this.partyOf(relationship.secondParty, [recipient, sender]),
      );
      return this.partyMessages(
        tx,
        actorId,
        recipient,
        sender,
        'den Beziehungsvorschlag angenommen',
      );
    });
  }

  async declineRelationshipProposal(
    actorId: number,
    proposalId: number,
  ): Promise<void> {
    await this.mutateDiplomacy(async (tx) => {
      const proposal = await this.requireRelationshipProposal(tx, proposalId);
      const recipient = await this.actingParty(
        tx,
        actorId,
        proposal.recipientParty,
        P.CREATE_AGREEMENTS,
      );
      if (!(await tx.deleteRelationshipProposal(proposalId))) {
        throw new NotFoundException(ERR.relationshipProposalNotFound);
      }
      const sender = await this.loadParty(tx, proposal.senderParty);
      return this.partyMessages(
        tx,
        actorId,
        recipient,
        sender,
        'den Beziehungsvorschlag abgelehnt',
      );
    });
  }

  async withdrawRelationshipProposal(
    actorId: number,
    proposalId: number,
  ): Promise<void> {
    await this.mutateDiplomacy(async (tx) => {
      const proposal = await this.requireRelationshipProposal(tx, proposalId);
      const sender = await this.actingParty(
        tx,
        actorId,
        proposal.senderParty,
        P.CREATE_AGREEMENTS,
      );
      if (!(await tx.deleteRelationshipProposal(proposalId))) {
        throw new NotFoundException(ERR.relationshipProposalNotFound);
      }
      const recipient = await this.loadParty(tx, proposal.recipientParty);
      return this.partyMessages(
        tx,
        actorId,
        sender,
        recipient,
        'den Beziehungsvorschlag zurückgezogen',
      );
    });
  }

  async listApplications(
    actorId: number,
    allianceId: number,
  ): Promise<AllianceApplicationDto[]> {
    await this.requireAlliance(allianceId);
    const membership = await this.ownMembership(
      this.store,
      actorId,
      allianceId,
    );
    if (!hasPermission(membership, P.MANAGE_APPLICATIONS)) {
      throw new ForbiddenException(ERR.forbidden);
    }
    const applications =
      await this.store.listApplicationsForAlliance(allianceId);
    const playersById = await this.playersById(
      applications.map((application) => application.userId),
    );
    return applications.map((a) => ({
      id: a.id,
      userId: a.userId,
      name: playersById.get(a.userId)?.name ?? UNKNOWN_NAME,
      createdAt: a.createdAt.toISOString(),
    }));
  }

  // --- Founding ---

  async found(
    userId: number,
    request: FoundAllianceRequest,
  ): Promise<{ id: number }> {
    const name = this.validateName(request.name);
    const description = this.validateDescription(request.description ?? '');

    const player = await this.store.findPlayer(userId);
    if (!player) throw new NotFoundException('Spieler nicht gefunden');
    if (!player.factionId) throw new BadRequestException(ERR.noFaction);
    const factionId = player.factionId;

    const result = await this.mutateDiplomacy(
      async (tx) => {
        await tx.lockPlayerParty(userId);
        if (await tx.findMembership(userId)) {
          throw new BadRequestException(ERR.alreadyMember);
        }
        if (await tx.isNameTaken(name)) {
          throw new BadRequestException(ERR.nameTaken);
        }
        let created: AllianceRecord;
        try {
          created = await tx.insertAlliance({ name, description, factionId });
          await tx.insertMembership({
            allianceId: created.id,
            userId,
            role: AllianceRole.PRESIDENT,
          });
        } catch (error) {
          if (error instanceof AllianceConstraintViolation) {
            throw new BadRequestException(
              error.constraint === 'membership_user'
                ? ERR.alreadyMember
                : CONSTRAINT_ERRORS[error.constraint],
            );
          }
          throw error;
        }
        await this.appendAllianceChronicle(
          tx,
          created.id,
          AllianceChronicleEventType.FOUNDED,
          userId,
          null,
        );
        const own = await tx.listApplicationsOfPlayer(userId);
        await tx.deleteApplications(own.map((a) => a.id));
        const messages = await this.endPlayerPartyDiplomacy(
          tx,
          player,
          created.name,
        );
        return { id: created.id, messages };
      },
      (value) => value.messages,
    );
    return { id: result.id };
  }

  // --- Applications ---

  async apply(userId: number, allianceId: number): Promise<void> {
    const player = await this.store.findPlayer(userId);
    if (!player) throw new NotFoundException('Spieler nicht gefunden');

    const messages = await this.mutate(async (tx) => {
      // The lock serialises against closing applications (STU §4.7.7).
      const alliance = await this.lockedAlliance(tx, allianceId);
      if (await tx.findMembership(userId)) {
        throw new BadRequestException(ERR.alreadyMember);
      }
      if (player.factionId !== alliance.factionId) {
        throw new BadRequestException(
          'Du kannst Dich nur bei Allianzen Deiner Fraktion bewerben',
        );
      }
      if (!alliance.acceptsApplications) {
        throw new BadRequestException(
          'Diese Allianz nimmt derzeit keine Bewerbungen an',
        );
      }
      if (await tx.findApplicationOf(allianceId, userId)) {
        throw new BadRequestException(ERR.alreadyApplied);
      }
      await tx.insertApplication({ allianceId, userId });
      const leaders = await this.leaderIds(allianceId, tx);
      return leaders.map((to) => ({
        to,
        body: `Der Siedler ${player.name} hat sich für die Allianz beworben`,
      }));
    });
    await this.send(messages);
  }

  async withdrawApplication(userId: number, allianceId: number): Promise<void> {
    const application = await this.store.findApplicationOf(allianceId, userId);
    if (
      !application ||
      (await this.store.deleteApplications([application.id])) === 0
    ) {
      throw new NotFoundException(ERR.applicationNotFound);
    }
  }

  async acceptApplication(
    actorId: number,
    applicationId: number,
  ): Promise<void> {
    const application = await this.requireApplication(applicationId);
    const applicant = await this.store.findPlayer(application.userId);
    const applicantName = applicant?.name ?? UNKNOWN_NAME;

    await this.mutateDiplomacy(async (tx) => {
      // Player party before alliance, like every path touching both, so a
      // concurrent war/proposal of the applicant serialises with the join.
      await tx.lockPlayerParty(application.userId);
      const alliance = await this.lockedAllianceRight(
        tx,
        actorId,
        application.allianceId,
        P.MANAGE_APPLICATIONS,
      );
      if (await tx.findMembership(application.userId)) {
        throw new BadRequestException(ERR.applicantTaken);
      }
      const all = await tx.listApplicationsOfPlayer(application.userId);
      if (!all.some((a) => a.id === application.id)) {
        // Withdrawn or handled concurrently.
        throw new NotFoundException(ERR.applicationNotFound);
      }
      await tx.insertMembership({
        allianceId: alliance.id,
        userId: application.userId,
      });
      await this.appendAllianceChronicle(
        tx,
        alliance.id,
        AllianceChronicleEventType.MEMBER_JOINED,
        actorId,
        application.userId,
      );
      await tx.deleteApplications(all.map((a) => a.id));

      const out: OutgoingMessage[] = [
        {
          to: application.userId,
          body: `Deine Bewerbung wurde akzeptiert - Du bist jetzt Mitglied der Allianz ${alliance.name}`,
        },
        ...(await this.endPlayerPartyDiplomacy(
          tx,
          { id: application.userId, name: applicantName },
          alliance.name,
        )),
      ];
      for (const dropped of all) {
        if (dropped.allianceId === alliance.id) continue;
        for (const to of await this.leaderIds(dropped.allianceId, tx)) {
          out.push({
            to,
            body: `Der Siedler ${applicantName} wurde bei einer anderen Allianz aufgenommen`,
          });
        }
      }
      return out;
    });
    // Delivered after the commit by mutateDiplomacy.
  }

  async declineApplication(
    actorId: number,
    applicationId: number,
  ): Promise<void> {
    const application = await this.requireApplication(applicationId);
    const messages = await this.mutate(async (tx) => {
      const alliance = await this.lockedAllianceRight(
        tx,
        actorId,
        application.allianceId,
        P.MANAGE_APPLICATIONS,
      );
      if ((await tx.deleteApplications([application.id])) === 0) {
        throw new NotFoundException(ERR.applicationNotFound);
      }
      return [this.declinedMessage(application.userId, alliance)];
    });
    await this.send(messages);
  }

  // --- Membership ---

  async leave(userId: number): Promise<LeaveAllianceResponse> {
    const membership = await this.store.findMembership(userId);
    if (!membership) throw new BadRequestException(ERR.notMember);
    const player = await this.store.findPlayer(userId);

    let dissolved = false;
    await this.mutateDiplomacy(async (tx) => {
      const alliance = await this.lockedAlliance(tx, membership.allianceId);
      const members = await tx.listMemberships(alliance.id);
      const own = members.find((m) => m.userId === userId);
      if (!own) throw new BadRequestException(ERR.notMember);

      if (isFounder(own)) {
        if (members.length > 1) {
          throw new BadRequestException(
            'Du musst das Präsidentenamt zuerst übergeben, bevor Du die Allianz verlassen kannst',
          );
        }
        dissolved = true;
        return this.dissolveAlliance(tx, alliance, members, userId);
      }

      return this.memberLeaves(tx, alliance, members, userId, player?.name);
    });
    if (dissolved) await this.tryBannerDeletion();
    return { dissolved };
  }

  async kick(
    actorId: number,
    allianceId: number,
    targetId: number,
  ): Promise<void> {
    if (actorId === targetId) {
      throw new BadRequestException(
        'Du kannst Dich nicht selbst rauswerfen. Nutze dafür den Austritt',
      );
    }
    const messages = await this.mutate(async (tx) => {
      const { alliance } = await this.lockedMemberRight(
        tx,
        actorId,
        allianceId,
        targetId,
      );
      await this.endMembership(tx, allianceId, targetId);
      await this.appendAllianceChronicle(
        tx,
        allianceId,
        AllianceChronicleEventType.MEMBER_KICKED,
        actorId,
        targetId,
      );
      return [
        {
          to: targetId,
          body: `Deine Mitgliedschaft in der Allianz ${alliance.name} wurde beendet`,
        },
      ];
    });
    await this.send(messages);
  }

  async dissolve(actorId: number, allianceId: number): Promise<void> {
    await this.mutateDiplomacy(async (tx) => {
      const alliance = await this.lockedAllianceRight(
        tx,
        actorId,
        allianceId,
        P.FOUNDER,
      );
      const members = await tx.listMemberships(allianceId);
      return this.dissolveAlliance(tx, alliance, members, actorId);
    });
    await this.tryBannerDeletion();
  }

  /**
   * After a dissolution commit the queued banner file deletion runs at once
   * instead of waiting for the periodic retry. Failures never reach the
   * caller: the committed dissolution stays successful and the task stays
   * queued.
   */
  private async tryBannerDeletion(): Promise<void> {
    try {
      await this.banners?.retryAssetDeletions();
    } catch (error) {
      this.logger.error(
        'Failed to delete banner assets after alliance dissolution',
        error instanceof Error ? error.stack : error,
      );
    }
  }

  /**
   * The single dissolution procedure shared by every path that ends an
   * alliance. Runs inside the caller's transaction: relational cleanup happens
   * through the store, and the returned system messages (remaining members
   * except the trigger) are persisted as durable intents by `mutateDiplomacy`
   * and delivered only after the commit.
   */
  private async dissolveAlliance(
    tx: AllianceStore,
    alliance: AllianceRecord,
    members: MembershipRecord[],
    triggerUserId: number,
  ): Promise<OutgoingMessage[]> {
    await this.contextCleanup?.allianceDissolved(
      {
        allianceId: alliance.id,
        memberUserIds: members.map((m) => m.userId),
      },
      { transaction: tx.transactionHandle() },
    );
    // Persist the file deletion as a task in this very transaction; the
    // banner service executes it after the commit and retries on failure.
    if (alliance.bannerKey) await tx.enqueueAssetDeletion(alliance.bannerKey);
    await tx.deleteAlliance(alliance.id);
    return members
      .filter((m) => m.userId !== triggerUserId)
      .map((m) => ({
        to: m.userId,
        body: `Die Allianz ${alliance.name} wurde aufgelöst`,
      }));
  }

  /**
   * Party change: a player who founds or joins an alliance no longer has a
   * personal diplomacy party. In the caller's transaction, every active
   * relationship (including war), proposal in both directions and pending
   * change of the player party ends. The chronicle keeps the ended
   * relationships (type, names, end reason, no contract); dropped proposals
   * leave no public trace. Returns notices for the counterparties only.
   */
  private async endPlayerPartyDiplomacy(
    tx: AllianceStore,
    player: { id: number; name: string },
    allianceName: string,
  ): Promise<OutgoingMessage[]> {
    const ended = await tx.endPlayerPartyDiplomacy(player.id);
    const self = playerParty(player.id);
    const notices = new Map<string, OutgoingMessage>();
    const notify = async (counterparty: PartyRef, text: string) => {
      const recipients = isAllianceParty(counterparty)
        ? (await tx.listMemberships(counterparty.id)).map((m) => m.userId)
        : [counterparty.id];
      for (const to of recipients) {
        if (to === player.id) continue;
        notices.set(`${to}:${text}`, { to, body: text });
      }
    };
    const nameOf = async (party: PartyRef): Promise<string> =>
      isAllianceParty(party)
        ? ((await tx.findAlliance(party.id))?.name ?? UNKNOWN_NAME)
        : ((await tx.findPlayer(party.id))?.name ?? UNKNOWN_NAME);
    const reason = `Der Siedler ${player.name} ist der Allianz ${allianceName} beigetreten`;
    for (const relationship of ended.relationships) {
      const names = new Map<string, string>();
      for (const party of [relationship.firstParty, relationship.secondParty]) {
        names.set(
          `${party.type}:${party.id}`,
          samePartyRef(party, self) ? player.name : await nameOf(party),
        );
      }
      const name = (party: PartyRef) => names.get(`${party.type}:${party.id}`)!;
      await tx.appendDiplomacyChronicleEntry({
        eventType: AllianceDiplomacyChronicleEventType.RELATIONSHIP_ENDED,
        actorUserId: player.id,
        actorName: player.name,
        firstParty: relationship.firstParty,
        firstPartyName: name(relationship.firstParty),
        secondParty: relationship.secondParty,
        secondPartyName: name(relationship.secondParty),
        relationshipType: relationship.type,
        lordParty: relationship.lordParty,
        vassalParty: relationship.vassalParty,
        endReason: AllianceDiplomacyChronicleEndReason.PARTY_JOINED_ALLIANCE,
      });
      await notify(
        otherParty(relationship, self),
        `${reason}. Eure Beziehung (${RELATIONSHIP_TYPE_LABEL[relationship.type]}) wurde dadurch beendet`,
      );
    }
    for (const proposal of ended.proposals) {
      await notify(
        otherParty(proposal, self),
        `${reason}. Ein offener Beziehungsvorschlag (${RELATIONSHIP_TYPE_LABEL[proposal.type]}) ist dadurch entfallen`,
      );
    }
    return [...notices.values()];
  }

  /** Deletes the membership and lets cleanup consumers drop the member's context. */
  private async endMembership(
    tx: AllianceStore,
    allianceId: number,
    userId: number,
  ): Promise<void> {
    await tx.deleteMembership(allianceId, userId);
    await this.contextCleanup?.memberRemoved(
      { allianceId, userId },
      { transaction: tx.transactionHandle() },
    );
  }

  /** Ends a non-president membership: chronicle entry and notice to the leaders. */
  private async memberLeaves(
    tx: AllianceStore,
    alliance: AllianceRecord,
    members: MembershipRecord[],
    userId: number,
    name: string | undefined,
  ): Promise<OutgoingMessage[]> {
    await this.endMembership(tx, alliance.id, userId);
    await this.appendAllianceChronicle(
      tx,
      alliance.id,
      AllianceChronicleEventType.MEMBER_LEFT,
      userId,
      userId,
    );
    return members
      .filter((m) => hasPermission(m, P.ALLIANCE_LEADERSHIP))
      .filter((m) => m.userId !== userId)
      .map((m) => ({
        to: m.userId,
        body: `Der Siedler ${name ?? UNKNOWN_NAME} hat die Allianz verlassen`,
      }));
  }

  /**
   * Alliance-side entry point for an account that is being removed (the
   * deletion executor itself does not exist yet). Ends the membership and
   * pending applications; a president is replaced by the succession rule or,
   * without candidates, the alliance is dissolved. Idempotent: a player
   * without membership is a no-op.
   */
  async removeAccount(userId: number): Promise<void> {
    const membership = await this.store.findMembership(userId);
    if (!membership) {
      await this.mutate((tx) => this.deleteApplicationsOf(tx, userId));
      return;
    }

    let dissolved = false;
    await this.mutateDiplomacy(async (tx) => {
      dissolved = false;
      const alliance = await tx.lockAlliance(membership.allianceId);
      if (!alliance) return [];
      const members = await tx.listMemberships(alliance.id);
      const own = members.find((m) => m.userId === userId);
      // A concurrent departure already ended this membership.
      if (!own) return [];
      const player = await tx.findPlayer(userId);
      await this.deleteApplicationsOf(tx, userId);

      if (!isFounder(own)) {
        return this.memberLeaves(tx, alliance, members, userId, player?.name);
      }
      const messages = await this.succeedPresident(
        tx,
        alliance,
        members,
        userId,
        player?.name,
      );
      dissolved = !(await tx.findAlliance(alliance.id));
      return messages;
    });
    if (dissolved) await this.tryBannerDeletion();
  }

  private async deleteApplicationsOf(
    tx: AllianceStore,
    userId: number,
  ): Promise<void> {
    await tx.deleteApplications(
      (await tx.listApplicationsOfPlayer(userId)).map((a) => a.id),
    );
  }

  /**
   * The president is gone without a manual handover: the successor rule picks
   * the new one, or the alliance is dissolved when nobody remains.
   */
  private async succeedPresident(
    tx: AllianceStore,
    alliance: AllianceRecord,
    members: MembershipRecord[],
    presidentId: number,
    presidentName: string | undefined,
  ): Promise<OutgoingMessage[]> {
    const remaining = members.filter((m) => m.userId !== presidentId);
    const players = await tx.findPlayers(remaining.map((m) => m.userId));
    const activity = new Map(players.map((p) => [p.id, p.lastActiveAt]));
    const successorId = chooseSuccessor(
      remaining.map((m) => ({
        userId: m.userId,
        permissions: heldPermissions(m),
        lastActiveAt: activity.get(m.userId) ?? null,
        joinedAt: m.joinedAt,
      })),
    );
    if (successorId === null) {
      return this.dissolveAlliance(tx, alliance, members, presidentId);
    }

    // Ending the membership frees the founder role; the successor keeps its
    // other roles (STU keeps them as well).
    const founderRole = await this.founderRole(tx, alliance.id);
    await this.endMembership(tx, alliance.id, presidentId);
    await tx.assignRole(
      remaining.find((m) => m.userId === successorId)!.id,
      founderRole.id,
    );
    const successorName =
      players.find((p) => p.id === successorId)?.name ?? UNKNOWN_NAME;
    const previousName = presidentName ?? UNKNOWN_NAME;
    await this.appendAllianceChronicle(
      tx,
      alliance.id,
      AllianceChronicleEventType.AUTOMATIC_SUCCESSION,
      null,
      successorId,
      { previousPresidentId: presidentId, previousPresidentName: previousName },
    );
    return remaining.map((m) => ({
      to: m.userId,
      body: `Der ${founderRole.title} ${previousName} ist ausgeschieden. ${successorName} ist neuer ${founderRole.title} der Allianz ${alliance.name}`,
    }));
  }

  // --- Roles ---

  async listRoles(
    viewerId: number,
    allianceId: number,
  ): Promise<AllianceRoleDto[]> {
    await this.requireAlliance(allianceId);
    const own = await this.ownMembership(this.store, viewerId, allianceId);
    const [roles, memberships] = await Promise.all([
      this.store.listRoles(allianceId),
      this.store.listMemberships(allianceId),
    ]);
    return roles.map((role) => this.roleDto(own, role, memberships));
  }

  async createRole(
    actorId: number,
    allianceId: number,
    request: CreateAllianceRoleRequest,
  ): Promise<{ id: number }> {
    const title = this.validateRoleTitle(request?.title);
    const permissions = this.validateRolePermissions(request?.permissions);
    return this.mutate(async (tx) => {
      const { actor } = await this.lockedRoleRight(tx, actorId, allianceId);
      if (!mayHandleRole(actor, { permissions })) {
        throw new ForbiddenException(ERR.roleRights);
      }
      const roles = await tx.listRoles(allianceId);
      const sort = Math.max(0, ...roles.map((r) => r.sort)) + 1;
      const role = await tx.insertRole({
        allianceId,
        title,
        sort,
        permissions,
      });
      return { id: role.id };
    });
  }

  async updateRole(
    actorId: number,
    allianceId: number,
    roleId: number,
    request: UpdateAllianceRoleRequest,
  ): Promise<void> {
    const patch: Parameters<AllianceStore['updateRole']>[1] = {};
    if (request?.title !== undefined) {
      patch.title = this.validateRoleTitle(request.title);
    }
    if (request?.permissions !== undefined) {
      patch.permissions = this.validateRolePermissions(request.permissions);
    }
    if (request?.sort !== undefined) {
      if (!Number.isInteger(request.sort) || Math.abs(request.sort) > 1e6) {
        throw new BadRequestException(ERR.invalidRole);
      }
      patch.sort = request.sort;
    }
    await this.mutate(async (tx) => {
      const { actor } = await this.lockedRoleRight(tx, actorId, allianceId);
      const role = await this.requireRole(tx, allianceId, roleId);
      if (patch.sort !== undefined) {
        // The founder role stays first; standard roles are found by sort.
        const founder = await this.founderRole(tx, allianceId);
        if (isFounderRole(role) || patch.sort <= founder.sort) {
          throw new BadRequestException(ERR.founderRoleFirst);
        }
      }
      // The founder role is fixed (STU `isEditable`), except for its name.
      const changesRights = patch.permissions !== undefined;
      // Sorting is display only (STU `SaveJobs`): MANAGE_JOBS suffices.
      const sortOnly = patch.title === undefined && !changesRights;
      const allowed = isFounderRole(role)
        ? !changesRights && isFounder(actor)
        : sortOnly ||
          (mayHandleRole(actor, role) &&
            mayHandleRole(actor, { permissions: patch.permissions ?? [] }) &&
            (!changesRights ||
              mayChangeRoleHolders(
                actor,
                roleId,
                await tx.listMemberships(allianceId),
              )));
      if (!allowed) throw new ForbiddenException(ERR.roleRights);
      await tx.updateRole(roleId, patch);
      return [];
    });
  }

  async deleteRole(
    actorId: number,
    allianceId: number,
    roleId: number,
  ): Promise<void> {
    await this.mutate(async (tx) => {
      const { actor } = await this.lockedRoleRight(tx, actorId, allianceId);
      const role = await this.requireRole(tx, allianceId, roleId);
      if (
        isFounderRole(role) ||
        !mayHandleRole(actor, role) ||
        !mayChangeRoleHolders(
          actor,
          roleId,
          await tx.listMemberships(allianceId),
        )
      ) {
        throw new ForbiddenException(ERR.roleRights);
      }
      await tx.deleteRole(roleId);
      return [];
    });
  }

  async assignRole(
    actorId: number,
    allianceId: number,
    targetId: number,
    roleId: number,
  ): Promise<void> {
    await this.changeMemberRole(actorId, allianceId, targetId, roleId, true);
  }

  async unassignRole(
    actorId: number,
    allianceId: number,
    targetId: number,
    roleId: number,
  ): Promise<void> {
    await this.changeMemberRole(actorId, allianceId, targetId, roleId, false);
  }

  /**
   * STU `PromotePlayer`: the member drops all roles and gets exactly this one;
   * the founder role hands over the presidency. Protection rule of ADR 0001.
   */
  async promote(
    actorId: number,
    allianceId: number,
    targetId: number,
    roleId: number,
  ): Promise<void> {
    if (actorId === targetId) {
      throw new BadRequestException(
        'Du kannst Deine eigenen Rollen nicht ändern',
      );
    }
    const role = await this.store.findRole(roleId);
    if (role?.allianceId === allianceId && isFounderRole(role)) {
      return this.transferPresidency(actorId, allianceId, targetId);
    }
    const messages = await this.mutate(async (tx) => {
      const { alliance, actor, target } = await this.lockedMemberRight(
        tx,
        actorId,
        allianceId,
        targetId,
      );
      const role = await this.requireRole(tx, allianceId, roleId);
      if (!mayHandleRole(actor, role)) {
        throw new ForbiddenException(ERR.roleRights);
      }
      if (target.roles.length === 1 && target.roles[0].id === roleId) return [];
      await this.dropMemberRoles(tx, actorId, target, roleId);
      if (!target.roles.some((r) => r.id === roleId)) {
        await tx.assignRole(target.id, roleId);
        await this.appendAllianceChronicle(
          tx,
          allianceId,
          AllianceChronicleEventType.ROLE_CHANGED,
          actorId,
          targetId,
          { roleTitle: role.title, assigned: true },
        );
      }
      return [
        {
          to: targetId,
          body: `Du wurdest zum ${role.title} der Allianz ${alliance.name} ernannt`,
        },
      ];
    });
    await this.send(messages);
  }

  /** STU `DemotePlayer`: the member loses all roles. */
  async demote(
    actorId: number,
    allianceId: number,
    targetId: number,
  ): Promise<void> {
    if (actorId === targetId) {
      throw new BadRequestException(
        'Du kannst Deine eigenen Rollen nicht ändern',
      );
    }
    const messages = await this.mutate(async (tx) => {
      const { alliance, target } = await this.lockedMemberRight(
        tx,
        actorId,
        allianceId,
        targetId,
      );
      if (target.roles.length === 0) return [];
      await this.dropMemberRoles(tx, actorId, target);
      return [
        {
          to: targetId,
          body: `Du wurdest von Deinem Posten in der Allianz ${alliance.name} entbunden`,
        },
      ];
    });
    await this.send(messages);
  }

  /** Removes the member's roles but `keepRoleId`, one chronicle entry each. */
  private async dropMemberRoles(
    tx: AllianceStore,
    actorId: number,
    target: MembershipRecord,
    keepRoleId?: number,
  ): Promise<void> {
    for (const role of target.roles) {
      if (role.id === keepRoleId) continue;
      await tx.unassignRole(target.id, role.id);
      await this.appendAllianceChronicle(
        tx,
        target.allianceId,
        AllianceChronicleEventType.ROLE_CHANGED,
        actorId,
        target.userId,
        { roleTitle: role.title, assigned: false },
      );
    }
  }

  /** Protection rule of ADR 0001 applies to the member and the role alike. */
  private async changeMemberRole(
    actorId: number,
    allianceId: number,
    targetId: number,
    roleId: number,
    assigned: boolean,
  ): Promise<void> {
    if (actorId === targetId) {
      throw new BadRequestException(
        'Du kannst Deine eigenen Rollen nicht ändern',
      );
    }
    const messages = await this.mutate(async (tx) => {
      const { alliance, actor, target } = await this.lockedMemberRight(
        tx,
        actorId,
        allianceId,
        targetId,
      );
      const role = await this.requireRole(tx, allianceId, roleId);
      if (!mayHandleRole(actor, role)) {
        throw new ForbiddenException(ERR.roleRights);
      }
      const holds = target.roles.some((r) => r.id === roleId);
      if (holds === assigned) return [];
      if (assigned) {
        await tx.assignRole(target.id, roleId);
      } else {
        await tx.unassignRole(target.id, roleId);
      }
      await this.appendAllianceChronicle(
        tx,
        allianceId,
        AllianceChronicleEventType.ROLE_CHANGED,
        actorId,
        targetId,
        { roleTitle: role.title, assigned },
      );
      return [
        {
          to: targetId,
          body: assigned
            ? `Du wurdest zum ${role.title} der Allianz ${alliance.name} ernannt`
            : `Du wurdest von der Rolle ${role.title} in der Allianz ${alliance.name} entbunden`,
        },
      ];
    });
    await this.send(messages);
  }

  async transferPresidency(
    actorId: number,
    allianceId: number,
    targetId: number,
  ): Promise<void> {
    if (actorId === targetId) {
      throw new BadRequestException('Du bist bereits Präsident');
    }
    const messages = await this.mutate(async (tx) => {
      const alliance = await this.lockedAlliance(tx, allianceId);
      const actor = await this.ownMembership(tx, actorId, allianceId);
      const target = await tx.findMembership(targetId);
      if (!target || target.allianceId !== allianceId) {
        throw new NotFoundException(ERR.memberNotFound);
      }
      if (!isFounder(actor)) throw new ForbiddenException(ERR.forbidden);
      const founderRole = await this.founderRole(tx, allianceId);
      // Release first: the partial unique index allows one holder only.
      await tx.unassignRole(actor.id, founderRole.id);
      // STU `PromotePlayer`: the new president drops all other roles.
      for (const role of target.roles) {
        await tx.unassignRole(target.id, role.id);
      }
      await tx.assignRole(target.id, founderRole.id);
      await this.appendAllianceChronicle(
        tx,
        allianceId,
        AllianceChronicleEventType.PRESIDENCY_TRANSFERRED,
        actorId,
        targetId,
        { previousRoles: target.roles.map((r) => r.title) },
      );
      return [
        {
          to: targetId,
          body: `Du wurdest zum ${founderRole.title} der Allianz ${alliance.name} ernannt`,
        },
      ];
    });
    await this.send(messages);
  }

  // --- Details ---

  async update(
    actorId: number,
    allianceId: number,
    request: UpdateAllianceRequest,
  ): Promise<void> {
    // Validate everything before writing anything (STU bug §11.7).
    const patch: AlliancePatch = {};
    if (request.name !== undefined) {
      patch.name = this.validateName(request.name);
    }
    if (request.description !== undefined) {
      patch.description = this.validateDescription(request.description);
    }
    if (request.homepage !== undefined) {
      patch.homepage = this.validateHomepage(request.homepage);
    }
    if (request.color !== undefined) {
      patch.color = this.validateColor(request.color);
    }
    if (request.acceptsApplications !== undefined) {
      patch.acceptsApplications = request.acceptsApplications === true;
    }

    const messages = await this.mutate(async (tx) => {
      const alliance = await this.lockedAllianceRight(
        tx,
        actorId,
        allianceId,
        P.EDIT_ALLIANCE,
      );
      if (
        patch.name !== undefined &&
        (await tx.isNameTaken(patch.name, allianceId))
      ) {
        throw new BadRequestException(ERR.nameTaken);
      }
      await tx.updateAlliance(allianceId, patch);
      const changed = this.changedDetailFields(alliance, patch);
      if (changed.length > 0) {
        await this.appendAllianceChronicle(
          tx,
          allianceId,
          AllianceChronicleEventType.DETAILS_CHANGED,
          actorId,
          null,
          {
            fields: changed,
            ...(changed.includes('name')
              ? { previousName: alliance.name, newName: patch.name }
              : {}),
          },
        );
      }
      if (patch.acceptsApplications !== false) return [];
      const open = await tx.listApplicationsForAlliance(allianceId);
      await tx.deleteApplications(open.map((a) => a.id));
      const name = patch.name ?? alliance.name;
      return open.map((a) => this.declinedMessage(a.userId, { name }));
    });
    await this.send(messages);
  }

  // --- Helpers ---

  /**
   * Runs a write in one transaction, translating constraint violations into
   * domain errors. Returns the system messages to send after the commit.
   */
  private async mutate<T>(work: (tx: AllianceStore) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await this.store.transaction(work);
      } catch (error) {
        if (error instanceof AllianceConstraintViolation) {
          throw new BadRequestException(CONSTRAINT_ERRORS[error.constraint]);
        }
        const isDeadlock =
          error instanceof Error &&
          (error as Error & { driverError?: { code?: string } }).driverError
            ?.code === '40P01';
        if (!isDeadlock || attempt === 2) throw error;
      }
    }
  }

  /**
   * Persists diplomacy notification intents in the same transaction as the
   * transition, then attempts delivery only after that transaction committed.
   */
  private async mutateDiplomacy<T>(
    work: (tx: AllianceStore) => Promise<T>,
    messagesOf: (result: T) => OutgoingMessage[] = (result) =>
      result as OutgoingMessage[],
  ): Promise<T> {
    const result = await this.mutate(async (tx) => {
      const value = await work(tx);
      await tx.enqueueDiplomacyNotifications(
        messagesOf(value).map((message) => ({
          recipientUserId: message.to,
          body: message.body,
        })),
      );
      return value;
    });
    await this.tryDiplomacyNotificationDelivery();
    return result;
  }

  /**
   * A committed diplomatic result remains successful when delivery is
   * temporarily unavailable; the durable intent is retried by the dispatcher.
   */
  private async tryDiplomacyNotificationDelivery(): Promise<void> {
    try {
      await this.retryDiplomacyNotifications();
    } catch (error) {
      this.logger.error(
        'Failed to deliver committed alliance diplomacy notifications',
        error instanceof Error ? error.stack : error,
      );
    }
  }

  /** Replays exclusively claimed committed notification intents. */
  async retryDiplomacyNotifications(): Promise<void> {
    const notifications = await this.store.claimDiplomacyNotifications(100);
    // One failing recipient must not keep the other claimed intents leased.
    let firstError: unknown;
    let failed = false;
    for (const notification of notifications) {
      if (!notification.leaseToken) continue;
      try {
        await this.messaging.sendSystem(
          notification.recipientUserId,
          notification.body,
          notification.deliveryKey,
        );
        await this.store.markDiplomacyNotificationDelivered(
          notification.id,
          notification.leaseToken,
        );
      } catch (error) {
        try {
          await this.store.releaseDiplomacyNotificationClaim(
            notification.id,
            notification.leaseToken,
          );
        } catch (releaseError) {
          this.logger.error(
            'Failed to release alliance diplomacy notification lease',
            releaseError instanceof Error ? releaseError.stack : releaseError,
          );
        }
        if (!failed) firstError = error;
        failed = true;
      }
    }
    if (failed) throw firstError;
  }

  private async relationshipSummaries(
    allianceId: number | PartyRef,
    relationships: AllianceRelationshipRecord[],
  ): Promise<AllianceRelationshipSummaryDto[]> {
    const viewerParty =
      typeof allianceId === 'number' ? allianceParty(allianceId) : allianceId;
    const counterparties = await Promise.all(
      relationships.map(async (relationship) => {
        const counterparty = otherParty(relationship, viewerParty);
        if (isAllianceParty(counterparty)) {
          const alliance = await this.store.findAlliance(counterparty.id);
          return alliance
            ? {
                ref: counterparty,
                id: alliance.id,
                name: alliance.name,
                color: alliance.color,
              }
            : null;
        }
        const player = await this.store.findPlayer(counterparty.id);
        return player
          ? { ref: counterparty, id: player.id, name: player.name, color: null }
          : null;
      }),
    );

    return relationships.flatMap((relationship, index) => {
      const counterparty = counterparties[index];
      if (!counterparty) return [];
      return [
        {
          id: relationship.id,
          counterparty: {
            id: counterparty.id,
            name: counterparty.name,
            color: counterparty.color,
          },
          counterpartyType: counterparty.ref.type,
          type: relationship.type,
          startedAt: relationship.startedAt.toISOString(),
          permissions: {
            treatAsFriend: relationship.treatAsFriend,
            shareLivePositions: relationship.shareLivePositions,
          },
          vassalage:
            relationship.type === AllianceRelationshipType.VASSALAGE &&
            relationship.lordParty !== null &&
            relationship.vassalParty !== null
              ? {
                  lordAllianceId: relationship.lordParty.id,
                  vassalAllianceId: relationship.vassalParty.id,
                  lordPartyType: relationship.lordParty.type,
                  vassalPartyType: relationship.vassalParty.type,
                }
              : null,
          hasContract: relationship.contract.length > 0,
        },
      ];
    });
  }

  private toChangeProposalDto(
    proposal: AllianceRelationshipChangeProposalRecord,
  ): AllianceRelationshipChangeProposalDto {
    return {
      id: proposal.id,
      relationshipId: proposal.relationshipId,
      senderAllianceId: proposal.senderParty.id,
      recipientAllianceId: proposal.recipientParty.id,
      senderPartyType: proposal.senderParty.type,
      recipientPartyType: proposal.recipientParty.type,
      contract: proposal.contract,
      permissions: {
        treatAsFriend: proposal.treatAsFriend,
        shareLivePositions: proposal.shareLivePositions,
      },
      createdAt: proposal.createdAt.toISOString(),
    };
  }

  private toProposalDto(
    proposal: AllianceRelationshipProposalRecord,
  ): AllianceRelationshipProposalDto {
    return {
      id: proposal.id,
      senderAllianceId: proposal.senderParty.id,
      recipientAllianceId: proposal.recipientParty.id,
      senderPartyType: proposal.senderParty.type,
      recipientPartyType: proposal.recipientParty.type,
      type: proposal.type,
      contract: proposal.contract,
      permissions: {
        treatAsFriend: proposal.treatAsFriend,
        shareLivePositions: proposal.shareLivePositions,
      },
      createdAt: proposal.createdAt.toISOString(),
    };
  }

  private diplomacyCapabilities(
    type: AllianceRelationshipType,
    direction: 'SENT' | 'RECEIVED' | null,
    active: boolean,
  ): AllianceDiplomacyCapabilitiesDto {
    if (!active) {
      return {
        create: false,
        declareWar: false,
        offerPeace: false,
        accept: direction === 'RECEIVED',
        decline: direction === 'RECEIVED',
        withdraw: direction === 'SENT',
        change: false,
        end: false,
      };
    }
    const isWar = type === AllianceRelationshipType.WAR;
    const isPeace = type === AllianceRelationshipType.PEACE;
    return {
      create: false,
      declareWar: true,
      offerPeace: isWar,
      accept: direction === 'RECEIVED',
      decline: direction === 'RECEIVED',
      withdraw: direction === 'SENT',
      change: !isWar && !isPeace,
      end: !isWar && !isPeace,
    };
  }

  /** Peace only out of war; every ordinary type only while not at war. */
  private assertProposableType(
    type: AllianceRelationshipType,
    active: AllianceRelationshipRecord | undefined,
  ): void {
    const isOrdinaryType = [
      AllianceRelationshipType.FRIENDSHIP,
      AllianceRelationshipType.ALLIANCE,
      AllianceRelationshipType.TRADE_AGREEMENT,
      AllianceRelationshipType.VASSALAGE,
    ].includes(type);
    const isWar = active?.type === AllianceRelationshipType.WAR;
    if (
      (type === AllianceRelationshipType.PEACE && !isWar) ||
      (isOrdinaryType && isWar) ||
      (!isOrdinaryType && type !== AllianceRelationshipType.PEACE)
    ) {
      throw new BadRequestException(ERR.invalidRelationshipProposal);
    }
  }

  /**
   * The side of `pair` the requester may act for: their alliance with the
   * office right, or themselves as an alliance-less player. Anyone else is
   * refused, so foreign settlers, members of other alliances and the opposing
   * faction never reach a pair they are not part of.
   */
  private async representedParty(
    tx: AllianceStore,
    actorId: number,
    pair: { firstParty: PartyRef; secondParty: PartyRef },
    action: AlliancePermission,
  ): Promise<PartyContext> {
    const membership = await tx.findMembership(actorId);
    const own = membership
      ? allianceParty(membership.allianceId)
      : playerParty(actorId);
    if (!this.isPartyOf(pair, own)) throw new ForbiddenException(ERR.forbidden);
    return this.actingParty(tx, actorId, own, action);
  }

  private validateRelationshipContract(contract: unknown): string {
    if (contract !== undefined && typeof contract !== 'string') {
      throw new BadRequestException(ERR.invalidRelationshipProposal);
    }
    const normalized = (contract ?? '').trim();
    if (Array.from(normalized).length > 20_000) {
      throw new BadRequestException(ERR.invalidRelationshipProposal);
    }
    return normalized;
  }

  private validateRelationshipPermissions(
    type: AllianceRelationshipType,
    permissions: unknown,
  ): { treatAsFriend: boolean; shareLivePositions: boolean } {
    if (
      permissions !== undefined &&
      (permissions === null || typeof permissions !== 'object')
    ) {
      throw new BadRequestException(ERR.invalidRelationshipProposal);
    }
    const values = permissions as
      { treatAsFriend?: unknown; shareLivePositions?: unknown } | undefined;
    const treatAsFriend = values?.treatAsFriend ?? false;
    const shareLivePositions = values?.shareLivePositions ?? false;
    if (
      typeof treatAsFriend !== 'boolean' ||
      typeof shareLivePositions !== 'boolean'
    ) {
      throw new BadRequestException(ERR.invalidRelationshipProposal);
    }
    if (
      treatAsFriend &&
      ![
        AllianceRelationshipType.FRIENDSHIP,
        AllianceRelationshipType.ALLIANCE,
        AllianceRelationshipType.TRADE_AGREEMENT,
        AllianceRelationshipType.VASSALAGE,
      ].includes(type)
    ) {
      throw new BadRequestException(ERR.invalidRelationshipProposal);
    }
    if (shareLivePositions && type !== AllianceRelationshipType.ALLIANCE) {
      throw new BadRequestException(ERR.invalidRelationshipProposal);
    }
    return { treatAsFriend, shareLivePositions };
  }

  private async requireRelationshipChangeProposal(
    tx: AllianceStore,
    id: number,
  ): Promise<AllianceRelationshipChangeProposalRecord> {
    const proposal = await tx.findRelationshipChangeProposal(id);
    if (!proposal)
      throw new NotFoundException(ERR.relationshipChangeProposalNotFound);
    return proposal;
  }

  private async requireRelationshipProposal(
    tx: AllianceStore,
    id: number,
  ): Promise<AllianceRelationshipProposalRecord> {
    const proposal = await tx.findRelationshipProposal(id);
    if (!proposal)
      throw new NotFoundException(ERR.relationshipProposalNotFound);
    return proposal;
  }

  private async requireAlliance(id: number): Promise<AllianceRecord> {
    const alliance = await this.store.findAlliance(id);
    if (!alliance) throw new NotFoundException(ERR.allianceNotFound);
    return alliance;
  }

  private async requireApplication(id: number): Promise<ApplicationRecord> {
    const application = await this.store.findApplication(id);
    if (!application) throw new NotFoundException(ERR.applicationNotFound);
    return application;
  }

  /** Locks the alliance for the rest of the transaction. */
  private async lockedAlliance(
    tx: AllianceStore,
    allianceId: number,
  ): Promise<AllianceRecord> {
    const alliance = await tx.lockAlliance(allianceId);
    if (!alliance) throw new NotFoundException(ERR.allianceNotFound);
    return alliance;
  }

  private async ownMembership(
    tx: AllianceStore,
    actorId: number,
    allianceId: number,
  ): Promise<MembershipRecord> {
    const membership = await tx.findMembership(actorId);
    if (!membership || membership.allianceId !== allianceId) {
      throw new ForbiddenException(ERR.forbidden);
    }
    return membership;
  }

  private async lockedAllianceRight(
    tx: AllianceStore,
    actorId: number,
    allianceId: number,
    permission: AlliancePermission,
  ): Promise<AllianceRecord> {
    const alliance = await this.lockedAlliance(tx, allianceId);
    const membership = await this.ownMembership(tx, actorId, allianceId);
    if (!hasPermission(membership, permission)) {
      throw new ForbiddenException(ERR.forbidden);
    }
    return alliance;
  }

  /** Kick and role changes: MANAGE_JOBS plus the protection rule. */
  private async lockedMemberRight(
    tx: AllianceStore,
    actorId: number,
    allianceId: number,
    targetId: number,
  ): Promise<{
    alliance: AllianceRecord;
    actor: MembershipRecord;
    target: MembershipRecord;
  }> {
    const alliance = await this.lockedAlliance(tx, allianceId);
    const actor = await this.ownMembership(tx, actorId, allianceId);
    const target = await tx.findMembership(targetId);
    if (!target || target.allianceId !== allianceId) {
      throw new NotFoundException(ERR.memberNotFound);
    }
    if (!mayManageMember(actor, target)) {
      throw new ForbiddenException(ERR.forbidden);
    }
    return { alliance, actor, target };
  }

  private async lockedRoleRight(
    tx: AllianceStore,
    actorId: number,
    allianceId: number,
  ): Promise<{ alliance: AllianceRecord; actor: MembershipRecord }> {
    const alliance = await this.lockedAllianceRight(
      tx,
      actorId,
      allianceId,
      P.MANAGE_JOBS,
    );
    return {
      alliance,
      actor: await this.ownMembership(tx, actorId, allianceId),
    };
  }

  private async requireRole(
    tx: AllianceStore,
    allianceId: number,
    roleId: number,
  ): Promise<AllianceRoleRecord> {
    const role = await tx.findRole(roleId);
    if (!role || role.allianceId !== allianceId) {
      throw new NotFoundException(ERR.roleNotFound);
    }
    return role;
  }

  private async founderRole(
    tx: AllianceStore,
    allianceId: number,
  ): Promise<AllianceRoleRecord> {
    const role = (await tx.listRoles(allianceId)).find(isFounderRole);
    if (!role) throw new Error(`Alliance ${allianceId} has no founder role`);
    return role;
  }

  /** Viewing the diplomacy area needs either diplomatic right. */
  private mayViewDiplomacy(membership: MembershipRecord): boolean {
    return (
      hasPermission(membership, P.CREATE_AGREEMENTS) ||
      hasPermission(membership, P.EDIT_DIPLOMATIC_DOCUMENTS)
    );
  }

  private async playersById(ids: number[]): Promise<Map<number, PlayerRecord>> {
    const players = await this.store.findPlayers(ids);
    return new Map(players.map((player) => [player.id, player]));
  }

  private playerFaction(
    player: PlayerRecord | undefined,
    factions: FactionRecord[],
  ) {
    return (
      factions.find((item) => item.id === player?.factionId)?.key ??
      player?.faction ??
      null
    );
  }

  /** Alliance leadership (ALLIANCE_LEADERSHIP): recipients of applications and departures. */
  private async leaderIds(
    allianceId: number,
    store: AllianceStore = this.store,
  ): Promise<number[]> {
    const members = await store.listMemberships(allianceId);
    return members
      .filter((m) => hasPermission(m, P.ALLIANCE_LEADERSHIP))
      .map((m) => m.userId);
  }

  private memberActions(
    viewer: MembershipRecord | null,
    target: MembershipRecord,
  ): AllianceMemberActionsDto {
    const manage = !!viewer && mayManageMember(viewer, target);
    return {
      kick: manage,
      editRoles: manage,
      transferPresidency:
        !!viewer && viewer.userId !== target.userId && isFounder(viewer),
    };
  }

  private memberRoles(member: MembershipRecord): AllianceMemberRoleDto[] {
    return member.roles.map(({ id, title, sort }) => ({ id, title, sort }));
  }

  private roleDto(
    viewer: MembershipRecord | null,
    role: AllianceRoleRecord,
    memberships: MembershipRecord[],
  ): AllianceRoleDto {
    const assign = !!viewer && mayHandleRole(viewer, role);
    const change = assign && mayChangeRoleHolders(viewer, role.id, memberships);
    return {
      id: role.id,
      title: role.title,
      sort: role.sort,
      // Outsiders only see what the public leadership grouping reveals.
      permissions: viewer
        ? [...role.permissions]
        : role.permissions.filter((p) => PUBLIC_ROLE_PERMISSIONS.has(p)),
      founder: isFounderRole(role),
      actions: {
        edit: isFounderRole(role) ? isFounder(viewer) : change,
        delete: change,
        assign,
      },
    };
  }

  private declinedMessage(
    userId: number,
    alliance: Pick<AllianceRecord, 'name'>,
  ): OutgoingMessage {
    return {
      to: userId,
      body: `Deine Bewerbung bei der Allianz ${alliance.name} wurde abgelehnt`,
    };
  }

  private async send(messages: OutgoingMessage[]): Promise<void> {
    for (const message of messages) {
      await this.messaging.sendSystem(message.to, message.body);
    }
  }

  private toSummary(
    alliance: AllianceRecord,
    memberCount: number,
    factions: FactionRecord[],
    members: MembershipRecord[] = [],
    playersById: Map<number, PlayerRecord> = new Map(),
  ): AllianceSummaryDto {
    const faction = factions.find((f) => f.id === alliance.factionId);
    return {
      id: alliance.id,
      name: alliance.name,
      color: alliance.color,
      faction: faction?.key as AllianceSummaryDto['faction'],
      factionName: faction?.name ?? UNKNOWN_NAME,
      memberCount,
      members: members.map((member) => {
        const player = playersById.get(member.userId);
        return {
          userId: member.userId,
          name: player?.name ?? UNKNOWN_NAME,
          avatar: player?.avatar ?? null,
          faction: this.playerFaction(player, factions),
        };
      }),
      acceptsApplications: alliance.acceptsApplications,
      banner: this.bannerDto(alliance),
      foundedAt: alliance.foundedAt.toISOString(),
    };
  }

  private parseChronicleCursor(
    cursor?: string,
  ): { occurredAt: Date; id: number } | null {
    if (!cursor) return null;
    try {
      const decoded = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      ) as {
        occurredAt?: unknown;
        id?: unknown;
      };
      const occurredAt = new Date(String(decoded.occurredAt));
      if (
        typeof decoded.id !== 'number' ||
        !Number.isInteger(decoded.id) ||
        Number.isNaN(occurredAt.getTime())
      ) {
        throw new Error('invalid cursor');
      }
      return { occurredAt, id: decoded.id };
    } catch {
      throw new BadRequestException('Ungültiger Chronik-Cursor');
    }
  }

  private encodeChronicleCursor(entry: {
    occurredAt: Date;
    id: number;
  }): string {
    return Buffer.from(
      JSON.stringify({
        occurredAt: entry.occurredAt.toISOString(),
        id: entry.id,
      }),
    ).toString('base64url');
  }

  private toChronicleEntry(
    entry: AllianceDiplomacyChronicleEntryRecord,
  ): AllianceDiplomacyChronicleEntryDto {
    return {
      id: entry.id,
      type: entry.eventType,
      actor:
        entry.actorUserId === null || entry.actorName === null
          ? null
          : { userId: entry.actorUserId, name: entry.actorName },
      firstAlliance: {
        id: entry.firstParty.id,
        name: entry.firstPartyName,
      },
      secondAlliance: {
        id: entry.secondParty.id,
        name: entry.secondPartyName,
      },
      firstPartyType: entry.firstParty.type,
      secondPartyType: entry.secondParty.type,
      endReason: entry.endReason,
      relationship: {
        type: entry.relationshipType,
        vassalage:
          entry.lordParty === null || entry.vassalParty === null
            ? null
            : {
                lordAllianceId: entry.lordParty.id,
                vassalAllianceId: entry.vassalParty.id,
                lordPartyType: entry.lordParty.type,
                vassalPartyType: entry.vassalParty.type,
              },
      },
      occurredAt: entry.occurredAt.toISOString(),
    };
  }

  private toAllianceChronicleEntry(
    entry: AllianceChronicleEntryRecord,
  ): AllianceChronicleEntryDto {
    return {
      id: entry.id,
      type: entry.eventType,
      actor:
        entry.actorName === null
          ? null
          : { userId: entry.actorUserId, name: entry.actorName },
      subject:
        entry.subjectName === null
          ? null
          : { userId: entry.subjectUserId, name: entry.subjectName },
      metadata: entry.metadata,
      occurredAt: entry.occurredAt.toISOString(),
    };
  }

  /** Names of the detail fields a patch actually changes. */
  private changedDetailFields(
    alliance: AllianceRecord,
    patch: AlliancePatch,
  ): string[] {
    const differs = (keys: Array<keyof AlliancePatch>) =>
      keys.some((k) => patch[k] !== undefined && patch[k] !== alliance[k]);
    const fields: Array<[string, Array<keyof AlliancePatch>]> = [
      ['name', ['name']],
      ['description', ['description']],
      ['homepage', ['homepage']],
      ['color', ['color']],
      ['acceptsApplications', ['acceptsApplications']],
    ];
    return fields.filter(([, keys]) => differs(keys)).map(([name]) => name);
  }

  /** Writes an internal chronicle entry inside the caller's transaction. */
  private async appendAllianceChronicle(
    tx: AllianceStore,
    allianceId: number,
    eventType: AllianceChronicleEventType,
    actorId: number | null,
    subjectId: number | null,
    metadata: Record<string, unknown> | null = null,
  ): Promise<void> {
    const [actor, subject] = await Promise.all([
      actorId === null ? null : tx.findPlayer(actorId),
      subjectId === null ? null : tx.findPlayer(subjectId),
    ]);
    await tx.appendAllianceChronicleEntry({
      allianceId,
      eventType,
      actorUserId: actor?.id ?? null,
      actorName: actor?.name ?? null,
      subjectUserId: subject?.id ?? null,
      subjectName: subject?.name ?? null,
      metadata,
    });
  }

  /** Loads the party behind `ref`, locking an alliance for the transaction. */
  private async loadParty(
    tx: AllianceStore,
    ref: PartyRef,
  ): Promise<PartyContext> {
    if (isAllianceParty(ref)) {
      const alliance = await this.lockedAlliance(tx, ref.id);
      const members = await tx.listMemberships(alliance.id);
      return {
        ref,
        name: alliance.name,
        factionId: alliance.factionId,
        recipientIds: members.map((member) => member.userId),
      };
    }
    const player = await tx.findPlayer(ref.id);
    if (!player) throw new NotFoundException(ERR.invalidSettlerTarget);
    return {
      ref,
      name: player.name,
      factionId: player.factionId,
      recipientIds: [player.id],
    };
  }

  /**
   * The party the requester may act for. An alliance party needs the office
   * right; a player party is only ever the requester themselves, and never
   * while they are an alliance member (members act for their alliance only).
   */
  private async actingParty(
    tx: AllianceStore,
    actorId: number,
    ref: PartyRef,
    action: AlliancePermission,
  ): Promise<PartyContext> {
    if (isAllianceParty(ref)) {
      await this.lockedAllianceRight(tx, actorId, ref.id, action);
    } else if (ref.id !== actorId || (await tx.findMembership(actorId))) {
      throw new ForbiddenException(ERR.forbidden);
    }
    return this.loadParty(tx, ref);
  }

  private partyOf(ref: PartyRef, candidates: PartyContext[]): PartyContext {
    const party = candidates.find((candidate) =>
      samePartyRef(candidate.ref, ref),
    );
    if (!party) throw new Error('Diplomacy party was not loaded');
    return party;
  }

  /** "Name hat im Namen der Allianz X <verb>" or, for a settler, "Name hat <verb>". */
  private actedText(
    actorName: string | undefined,
    party: PartyContext,
    verb: string,
  ): string {
    const name = actorName ?? UNKNOWN_NAME;
    return isAllianceParty(party.ref)
      ? `${name} hat im Namen der Allianz ${party.name} ${verb}`
      : `${name} hat ${verb}`;
  }

  /** Message intents for everyone informed about `to`, naming the acting party. */
  private async partyMessages(
    tx: AllianceStore,
    actorId: number,
    from: PartyContext,
    to: PartyContext,
    verb: string,
  ): Promise<OutgoingMessage[]> {
    const actor = await tx.findPlayer(actorId);
    const body = this.actedText(actor?.name, from, verb);
    return to.recipientIds.map((recipientId) => ({ to: recipientId, body }));
  }

  private async appendPartyChronicleEntry(
    tx: AllianceStore,
    eventType: AllianceDiplomacyChronicleEventType,
    actorId: number | null,
    relationship: AllianceRelationshipRecord,
    first: PartyContext,
    second: PartyContext,
  ): Promise<void> {
    const actor = actorId === null ? null : await tx.findPlayer(actorId);
    await tx.appendDiplomacyChronicleEntry({
      eventType,
      actorUserId: actor?.id ?? null,
      actorName: actor?.name ?? null,
      firstParty: first.ref,
      firstPartyName: first.name,
      secondParty: second.ref,
      secondPartyName: second.name,
      relationshipType: relationship.type,
      lordParty: relationship.lordParty,
      vassalParty: relationship.vassalParty,
    });
    const action = {
      [AllianceDiplomacyChronicleEventType.WAR_DECLARED]: 'erklärt',
      [AllianceDiplomacyChronicleEventType.RELATIONSHIP_STARTED]: 'begonnen',
      [AllianceDiplomacyChronicleEventType.RELATIONSHIP_CHANGED]: 'geändert',
      [AllianceDiplomacyChronicleEventType.RELATIONSHIP_ENDED]: 'beendet',
    }[eventType];
    const text = `${first.name} und ${second.name}: ${RELATIONSHIP_TYPE_LABEL[relationship.type]} ${action}`;
    // The production module provides the writer; isolated in-memory tests omit it.
    if (this.gameEvents) {
      await this.gameEvents.recordAlliance(
        text,
        tx.transactionHandle() as EntityManager,
      );
    }
  }

  private isSentBy(sender: PartyRef, allianceId: number): boolean {
    return samePartyRef(sender, allianceParty(allianceId));
  }

  private isPartyOf(
    pair: { firstParty: PartyRef; secondParty: PartyRef },
    party: PartyRef,
  ): boolean {
    return (
      samePartyRef(pair.firstParty, party) ||
      samePartyRef(pair.secondParty, party)
    );
  }

  private bannerDto(alliance: AllianceRecord): AllianceBannerDto | null {
    if (!alliance.bannerKey || !alliance.bannerUpdatedAt) return null;
    return {
      url: allianceBannerUrl(alliance.id, alliance.bannerUpdatedAt.getTime()),
      updatedAt: alliance.bannerUpdatedAt.toISOString(),
    };
  }

  /** STU §9.3: placeholders are replaced on read; unknown ones are removed. */
  private renderDescription(
    alliance: AllianceRecord,
    members: MembershipRecord[],
    playersById: Map<number, PlayerRecord>,
    relationships: AllianceRelationshipSummaryDto[],
  ): string {
    // STU: the first holder of a role carrying that parent right as stored.
    const holder = (permission: AlliancePermission) => {
      const member = [...members]
        .sort(byRoleRank)
        .find((m) => heldPermissions(m).includes(permission));
      return member
        ? (playersById.get(member.userId)?.name ?? UNKNOWN_NAME)
        : 'Unbesetzt';
    };
    const banner = this.bannerDto(alliance);
    const values: Record<string, string> = {
      $ALLIANCE_BANNER: banner ? `[img]${banner.url}[/img]` : '',
      $ALLIANCE_PRESIDENT: holder(P.FOUNDER),
      $ALLIANCE_VICEPRESIDENT: holder(P.SUCCESSOR),
      $ALLIANCE_FOREIGNMINISTER: holder(P.DIPLOMATIC),
      $ALLIANCE_HOMEPAGE_LINK: alliance.homepage
        ? `[url=${alliance.homepage}]Zur Allianz-Homepage[/url]`
        : '',
      $ALLIANCE_DIPLOMATIC_RELATIONS: this.renderDiplomaticRelations(
        alliance.id,
        relationships,
      ),
    };
    return alliance.description.replace(
      /\$ALLIANCE_[A-Z_]+/g,
      (token) => values[token] ?? '',
    );
  }

  private renderDiplomaticRelations(
    allianceId: number,
    relationships: AllianceRelationshipSummaryDto[],
  ): string {
    return relationships
      .map((relationship) => {
        const direction = relationship.vassalage
          ? relationship.vassalage.lordAllianceId === allianceId
            ? ' (Lehnsherr)'
            : ' (Vasall)'
          : '';
        return `${this.relationshipTypeLabel(relationship.type)}: ${this.escapeBbcodeText(relationship.counterparty.name)}${direction}`;
      })
      .join('\n');
  }

  private relationshipTypeLabel(type: AllianceRelationshipType): string {
    switch (type) {
      case AllianceRelationshipType.WAR:
        return 'Krieg';
      case AllianceRelationshipType.PEACE:
        return 'Frieden';
      case AllianceRelationshipType.FRIENDSHIP:
        return 'Freundschaft';
      case AllianceRelationshipType.ALLIANCE:
        return 'Bündnis';
      case AllianceRelationshipType.TRADE_AGREEMENT:
        return 'Handelsabkommen';
      case AllianceRelationshipType.VASSALAGE:
        return 'Vasallenschaft';
    }
  }

  private escapeBbcodeText(value: string): string {
    return value.replace(/[[\]]/g, (character) => `\\${character}`);
  }

  private validateName(raw: unknown): string {
    const name = typeof raw === 'string' ? raw.trim() : '';
    if (name.length < ALLIANCE_NAME_MIN) {
      throw new BadRequestException(
        `Der Name muss aus mindestens ${ALLIANCE_NAME_MIN} Zeichen bestehen`,
      );
    }
    if (name.length > ALLIANCE_NAME_MAX) {
      throw new BadRequestException(
        `Der Name darf höchstens ${ALLIANCE_NAME_MAX} Zeichen lang sein`,
      );
    }
    return name;
  }

  private validateDescription(raw: unknown): string {
    const description = typeof raw === 'string' ? raw : '';
    if (description.length > ALLIANCE_DESCRIPTION_MAX) {
      throw new BadRequestException(
        'Die Beschreibung darf höchstens 10.000 Zeichen lang sein',
      );
    }
    return description;
  }

  private validateHomepage(raw: unknown): string {
    const homepage = typeof raw === 'string' ? raw.trim() : '';
    if (!homepage) return '';
    if (
      !/^https?:\/\/[^\s[\]]+$/i.test(homepage) ||
      homepage.length > ALLIANCE_HOMEPAGE_MAX
    ) {
      throw new BadRequestException('Diese Homepage-Adresse ist nicht gültig');
    }
    return homepage;
  }

  private validateColor(raw: unknown): string | null {
    const color = typeof raw === 'string' ? raw.trim() : '';
    if (!color) return null;
    if (!/^#[0-9a-f]{6}$/i.test(color)) {
      throw new BadRequestException(
        'Der RGB-Code ist ungültig, erwartet wird z. B. #11ff67',
      );
    }
    return color;
  }

  private validateRoleTitle(raw: unknown): string {
    const title = typeof raw === 'string' ? raw.trim() : '';
    if (
      title.length < ALLIANCE_TITLE_MIN ||
      title.length > ALLIANCE_TITLE_MAX
    ) {
      throw new BadRequestException(
        `Der Rollentitel muss ${ALLIANCE_TITLE_MIN} bis ${ALLIANCE_TITLE_MAX} Zeichen lang sein`,
      );
    }
    return title;
  }

  private validateRolePermissions(raw: unknown): AlliancePermission[] {
    if (
      !Array.isArray(raw) ||
      raw.some((p) => !ASSIGNABLE_PERMISSIONS.has(p as AlliancePermission))
    ) {
      throw new BadRequestException(ERR.invalidRole);
    }
    return [...new Set(raw as AlliancePermission[])];
  }
}
