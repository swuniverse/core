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
  AllianceDiplomacyChronicleEventType,
  AllianceDetailDto,
  AllianceDiplomacyManagementDto,
  AllianceDiplomacyCapabilitiesDto,
  AllianceMemberActionsDto,
  AllianceRelationshipChangeProposalDto,
  AllianceRelationshipContractDto,
  AllianceRelationshipProposalDto,
  AllianceRelationshipSummaryDto,
  AllianceRefDto,
  AllianceRelationshipType,
  AllianceRole,
  type MyAllianceDto,
  type ProposeSettlerRelationshipRequest,
  type SettlerCounterpartyPageDto,
  type SettlerDiplomacyManagementDto,
  AllianceSummaryDto,
  AllianceTitlesDto,
  FoundAllianceRequest,
  LeaveAllianceResponse,
  ProposeAllianceRelationshipChangeRequest,
  ProposeAllianceRelationshipRequest,
  UpdateAllianceRequest,
} from '@swuniverse/shared';
import { chooseSuccessor } from './presidential-succession';
import { MessagingService } from '../messaging/messaging.service';
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
  ALLIANCE_MEMBER_ACTIONS,
  AllianceAction,
  AllianceMemberAction,
  mayActOnAlliance,
  mayActOnMember,
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
  AllianceRelationshipChangeProposalRecord,
  AllianceRelationshipProposalRecord,
  AllianceRelationshipRecord,
  AllianceStore,
  ApplicationRecord,
  FactionRecord,
  MembershipRecord,
} from './alliance.store';

const { NONE, PRESIDENT, VICE, DIPLOMAT } = AllianceRole;

const ROLE_ORDER: Record<AllianceRole, number> = {
  [PRESIDENT]: 0,
  [VICE]: 1,
  [DIPLOMAT]: 2,
  [NONE]: 3,
};

/** Office changes a member may receive via setRole, with the action they need. */
const ROLE_CHANGE_ACTION = {
  [VICE]: 'appointVice',
  [DIPLOMAT]: 'appointDiplomat',
  [NONE]: 'dismiss',
} as const satisfies Partial<Record<AllianceRole, AllianceMemberAction>>;

const MESSAGE_SUBJECT = 'Allianz';
const UNKNOWN_NAME = 'Unbekannt';

const ERR = {
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
  ) {}

  // --- Queries ---

  async list(): Promise<AllianceSummaryDto[]> {
    const [alliances, counts, factions] = await Promise.all([
      this.store.listAlliances(),
      this.store.countMembers(),
      this.store.listFactions(),
    ]);
    return alliances.map((alliance) =>
      this.toSummary(alliance, counts.get(alliance.id) ?? 0, factions),
    );
  }

  async listDiplomacyChronicle(
    viewerId: number,
    allianceId: number,
    cursor?: string,
    limit?: number,
  ): Promise<AllianceDiplomacyChronicleDto> {
    await this.requireAlliance(allianceId);
    await this.store.findPlayer(viewerId);
    return this.diplomacyChronicleOf(allianceParty(allianceId), cursor, limit);
  }

  /** Public diplomacy chronicle of an alliance-less player. */
  async listSettlerDiplomacyChronicle(
    viewerId: number,
    playerId: number,
    cursor?: string,
    limit?: number,
  ): Promise<AllianceDiplomacyChronicleDto> {
    if (!(await this.store.findPlayer(playerId))) {
      throw new NotFoundException(ERR.invalidSettlerTarget);
    }
    await this.store.findPlayer(viewerId);
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

  /** Internal chronicle: current members of the alliance only, else Not Found. */
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
      alliances,
    ] = await Promise.all([
      this.store.listMemberships(allianceId),
      this.store.listFactions(),
      this.store.findPlayer(viewerId),
      this.store.findMembership(viewerId),
      this.store.findApplicationOf(allianceId, viewerId),
      this.store.listActiveRelationships(allianceId),
      this.store.listAlliances(),
    ]);
    const nameOf = await this.namesOf(memberships.map((m) => m.userId));
    const titles = this.titlesOf(alliance);
    const relationshipSummaries = await this.relationshipSummaries(
      allianceId,
      relationships,
    );
    const ownRole =
      viewerMembership?.allianceId === allianceId
        ? viewerMembership.role
        : null;

    // Online status is internal: only members of this very alliance see it.
    const onlineIds =
      ownRole !== null
        ? new Set(this.onlinePlayers?.onlineUserIds() ?? [])
        : null;

    const members = [...memberships]
      .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role])
      .map((m) => ({
        userId: m.userId,
        name: nameOf(m.userId),
        role: m.role,
        roleTitle: this.roleTitle(titles, m.role),
        joinedAt: m.joinedAt.toISOString(),
        actions: this.memberActions(ownRole, viewerId, m),
        ...(onlineIds ? { online: onlineIds.has(m.userId) } : {}),
      }));

    const may = (action: AllianceAction) =>
      ownRole !== null && mayActOnAlliance(ownRole, action);

    return {
      ...this.toSummary(alliance, memberships.length, factions),
      banner: this.bannerDto(alliance),
      homepage: alliance.homepage,
      description: alliance.description,
      renderedDescription: this.renderDescription(
        alliance,
        members,
        relationshipSummaries,
      ),
      titles,
      members,
      relationships: relationshipSummaries,
      viewer: {
        role: ownRole,
        actions: {
          apply:
            !viewerMembership &&
            !application &&
            alliance.acceptsApplications &&
            viewer?.factionId === alliance.factionId,
          withdrawApplication: !!application,
          leave:
            ownRole !== null &&
            (ownRole !== PRESIDENT || memberships.length === 1),
          editDetails: may('editDetails'),
          manageApplications: may('manageApplications'),
          dissolve: may('dissolve'),
          declareWar: may('declareWar'),
          manageDiplomacy: may('manageDiplomacy'),
          readForum: ownRole !== null,
          viewMemberOperations: may('viewMemberOperations'),
          viewChronicle: ownRole !== null,
          manageBanner: may('manageBanner'),
          warTargets: may('declareWar')
            ? alliances
                .filter(
                  (candidate) =>
                    candidate.id !== allianceId &&
                    candidate.factionId === alliance.factionId,
                )
                .map(({ id, name, color }) => ({ id, name, color }))
            : [],
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
  ): Promise<PartyContext> {
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

  /** A valid counterparty: another alliance-less player of the same faction. */
  private async requireSettlerCounterparty(
    tx: AllianceStore,
    actor: PartyContext,
    targetId: unknown,
  ): Promise<PartyContext> {
    if (!Number.isInteger(targetId) || targetId === actor.ref.id) {
      throw new BadRequestException(ERR.invalidSettlerTarget);
    }
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
      return this.partyMessages(
        tx,
        actorId,
        actor,
        target,
        'den Krieg erklärt',
      );
    });
  }

  async proposeSettlerRelationship(
    actorId: number,
    request: ProposeSettlerRelationshipRequest,
  ): Promise<{ id: number }> {
    await this.rateLimiter?.check(actorId, 'proposal');
    const result = await this.mutateDiplomacy(
      async (tx) => {
        const sender = await this.requireSettler(tx, actorId);
        const recipient = await this.requireSettlerCounterparty(
          tx,
          sender,
          request?.recipientPlayerId,
        );
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
      },
      (result) => result.messages,
    );
    return { id: result.id };
  }

  /** Confidential diplomacy view of an alliance-less player. */
  async getSettlerDiplomacy(
    actorId: number,
  ): Promise<SettlerDiplomacyManagementDto> {
    const actor = await this.requireSettler(this.store, actorId);
    const [relationships, proposals, changes] = await Promise.all([
      this.store.listActiveRelationships(actor.ref),
      this.store.listRelationshipProposals(actor.ref),
      this.store.listRelationshipChangeProposals(actor.ref),
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
    const actor = await this.requireSettler(this.store, actorId);
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
      factionId: actor.factionId as number,
      excludeUserId: actorId,
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
        'declareWar',
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
      await this.appendChronicleEntry(
        tx,
        AllianceDiplomacyChronicleEventType.WAR_DECLARED,
        actorId,
        relationship,
        this.allianceForParty(relationship.firstParty, [alliance, target]),
        this.allianceForParty(relationship.secondParty, [alliance, target]),
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
    if (!mayActOnAlliance(membership.role, 'manageDiplomacy')) {
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
    if (!mayActOnAlliance(membership.role, 'manageDiplomacy')) {
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
    if (!mayActOnAlliance(membership.role, 'manageDiplomacy')) {
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
          'manageDiplomacy',
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
        'manageDiplomacy',
      );
      const relationship =
        await tx.acceptRelationshipChangeProposal(proposalId);
      if (!relationship) {
        throw new NotFoundException(ERR.relationshipChangeProposalNotFound);
      }
      const other = await this.loadParty(tx, proposal.senderParty);
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
        'manageDiplomacy',
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
        'manageDiplomacy',
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
    const messages = await this.mutateDiplomacy(
      async (tx) => {
        const sender = await this.lockedAllianceRight(
          tx,
          actorId,
          allianceId,
          'manageDiplomacy',
        );
        const recipientAllianceId = request?.recipientAllianceId;
        if (
          !Number.isInteger(recipientAllianceId) ||
          recipientAllianceId === allianceId
        ) {
          throw new BadRequestException(ERR.invalidRelationshipProposal);
        }
        const recipient = await this.lockedAlliance(tx, recipientAllianceId);
        if (sender.factionId !== recipient.factionId) {
          throw new BadRequestException(ERR.invalidRelationshipProposal);
        }
        const type = request?.type;
        const activeRelationship = (
          await tx.listActiveRelationships(allianceId)
        ).find((relationship) =>
          isPair(
            relationship.firstParty,
            relationship.secondParty,
            allianceParty(allianceId),
            allianceParty(recipientAllianceId),
          ),
        );
        this.assertProposableType(type, activeRelationship);
        const contract = this.validateRelationshipContract(request?.contract);
        const permissions =
          type === AllianceRelationshipType.PEACE
            ? { treatAsFriend: false, shareLivePositions: false }
            : this.validateRelationshipPermissions(type, request?.permissions);
        const proposal = await tx.insertRelationshipProposal({
          senderParty: allianceParty(allianceId),
          recipientParty: allianceParty(recipientAllianceId),
          type,
          contract,
          ...permissions,
        });
        const actor = await tx.findPlayer(actorId);
        const recipients = await tx.listMemberships(recipientAllianceId);
        return {
          id: proposal.id,
          messages: recipients.map((member) => ({
            to: member.userId,
            body: `${actor?.name ?? UNKNOWN_NAME} hat im Namen der Allianz ${sender.name} einen Beziehungsvorschlag gesendet`,
          })),
        };
      },
      (result) => result.messages,
    );
    return { id: messages.id };
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
        'manageDiplomacy',
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
        'manageDiplomacy',
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
        'manageDiplomacy',
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
        'manageDiplomacy',
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
    if (!mayActOnAlliance(membership.role, 'manageApplications')) {
      throw new ForbiddenException(ERR.forbidden);
    }
    const applications =
      await this.store.listApplicationsForAlliance(allianceId);
    const nameOf = await this.namesOf(applications.map((a) => a.userId));
    return applications.map((a) => ({
      id: a.id,
      userId: a.userId,
      name: nameOf(a.userId),
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

    try {
      const alliance = await this.store.transaction(async (tx) => {
        if (await tx.findMembership(userId)) {
          throw new BadRequestException(ERR.alreadyMember);
        }
        if (await tx.isNameTaken(name)) {
          throw new BadRequestException(ERR.nameTaken);
        }
        const created = await tx.insertAlliance({
          name,
          description,
          factionId,
        });
        await tx.insertMembership({
          allianceId: created.id,
          userId,
          role: PRESIDENT,
        });
        await this.appendAllianceChronicle(
          tx,
          created.id,
          AllianceChronicleEventType.FOUNDED,
          userId,
          null,
        );
        const own = await tx.listApplicationsOfPlayer(userId);
        await tx.deleteApplications(own.map((a) => a.id));
        return created;
      });
      return { id: alliance.id };
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

    const messages = await this.mutate(async (tx) => {
      const alliance = await this.lockedAllianceRight(
        tx,
        actorId,
        application.allianceId,
        'manageApplications',
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
        role: NONE,
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
    await this.send(messages);
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
        'manageApplications',
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

      if (own.role === PRESIDENT) {
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
      const alliance = await this.lockedMemberRight(
        tx,
        actorId,
        allianceId,
        targetId,
        'kick',
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
        'dissolve',
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
      .filter((m) => m.role === PRESIDENT || m.role === VICE)
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

      if (own.role !== PRESIDENT) {
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
        role: m.role,
        lastActiveAt: activity.get(m.userId) ?? null,
        joinedAt: m.joinedAt,
      })),
    );
    if (successorId === null) {
      return this.dissolveAlliance(tx, alliance, members, presidentId);
    }

    // Release the single-president slot first, then the successor takes it
    // and drops its former office.
    await this.endMembership(tx, alliance.id, presidentId);
    await tx.setRole(alliance.id, successorId, PRESIDENT);
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
      body: `Der ${alliance.presidentTitle} ${previousName} ist ausgeschieden. ${successorName} ist neuer ${alliance.presidentTitle} der Allianz ${alliance.name}`,
    }));
  }

  // --- Offices ---

  async setRole(
    actorId: number,
    allianceId: number,
    targetId: number,
    role: AllianceRole,
  ): Promise<void> {
    const action = ROLE_CHANGE_ACTION[role as keyof typeof ROLE_CHANGE_ACTION];
    if (!action) {
      throw new BadRequestException(
        'Das Präsidentenamt kann nur übergeben werden',
      );
    }
    if (actorId === targetId) {
      throw new BadRequestException('Du kannst Dein eigenes Amt nicht ändern');
    }
    const messages = await this.mutate(async (tx) => {
      const alliance = await this.lockedMemberRight(
        tx,
        actorId,
        allianceId,
        targetId,
        action,
      );
      const previous = await tx.findMembership(targetId);
      await tx.setRole(allianceId, targetId, role);
      await this.appendAllianceChronicle(
        tx,
        allianceId,
        AllianceChronicleEventType.ROLE_CHANGED,
        actorId,
        targetId,
        {
          previousRole: previous?.role ?? NONE,
          newRole: role,
        },
      );
      return [
        {
          to: targetId,
          body:
            role === NONE
              ? `Du wurdest von Deinem Amt in der Allianz ${alliance.name} entbunden`
              : `Du wurdest zum ${this.roleTitle(this.titlesOf(alliance), role)} der Allianz ${alliance.name} ernannt`,
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
      const alliance = await this.lockedMemberRight(
        tx,
        actorId,
        allianceId,
        targetId,
        'transferPresidency',
      );
      const previous = await tx.findMembership(targetId);
      // Demote first: the partial unique index allows one president only.
      await tx.setRole(allianceId, actorId, NONE);
      await tx.setRole(allianceId, targetId, PRESIDENT);
      await this.appendAllianceChronicle(
        tx,
        allianceId,
        AllianceChronicleEventType.PRESIDENCY_TRANSFERRED,
        actorId,
        targetId,
        { previousRole: previous?.role ?? NONE },
      );
      return [
        {
          to: targetId,
          body: `Du wurdest zum ${alliance.presidentTitle} der Allianz ${alliance.name} ernannt`,
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
    if (request.titles !== undefined) {
      const titles = this.validateTitles(request.titles);
      patch.presidentTitle = titles.president;
      patch.viceTitle = titles.vice;
      patch.diplomatTitle = titles.diplomat;
    }
    if (request.acceptsApplications !== undefined) {
      patch.acceptsApplications = request.acceptsApplications === true;
    }

    const messages = await this.mutate(async (tx) => {
      const alliance = await this.lockedAllianceRight(
        tx,
        actorId,
        allianceId,
        'editDetails',
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
          MESSAGE_SUBJECT,
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
    action: AllianceAction,
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
      | { treatAsFriend?: unknown; shareLivePositions?: unknown }
      | undefined;
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
    action: AllianceAction,
  ): Promise<AllianceRecord> {
    const alliance = await this.lockedAlliance(tx, allianceId);
    const membership = await this.ownMembership(tx, actorId, allianceId);
    if (!mayActOnAlliance(membership.role, action)) {
      throw new ForbiddenException(ERR.forbidden);
    }
    return alliance;
  }

  private async lockedMemberRight(
    tx: AllianceStore,
    actorId: number,
    allianceId: number,
    targetId: number,
    action: AllianceMemberAction,
  ): Promise<AllianceRecord> {
    const alliance = await this.lockedAlliance(tx, allianceId);
    const actor = await this.ownMembership(tx, actorId, allianceId);
    const target = await tx.findMembership(targetId);
    if (!target || target.allianceId !== allianceId) {
      throw new NotFoundException(ERR.memberNotFound);
    }
    if (!mayActOnMember(actor.role, action, target.role)) {
      throw new ForbiddenException(ERR.forbidden);
    }
    return alliance;
  }

  private async namesOf(ids: number[]): Promise<(id: number) => string> {
    const players = await this.store.findPlayers(ids);
    const names = new Map(players.map((p) => [p.id, p.name]));
    return (id) => names.get(id) ?? UNKNOWN_NAME;
  }

  /** President and all vices: recipients of applications and departures. */
  private async leaderIds(
    allianceId: number,
    store: AllianceStore = this.store,
  ): Promise<number[]> {
    const members = await store.listMemberships(allianceId);
    return members
      .filter((m) => m.role === PRESIDENT || m.role === VICE)
      .map((m) => m.userId);
  }

  private memberActions(
    viewerRole: AllianceRole | null,
    viewerId: number,
    target: MembershipRecord,
  ): AllianceMemberActionsDto {
    const allowed = (action: AllianceMemberAction) =>
      viewerRole !== null &&
      target.userId !== viewerId &&
      mayActOnMember(viewerRole, action, target.role);
    return Object.fromEntries(
      ALLIANCE_MEMBER_ACTIONS.map((action) => [action, allowed(action)]),
    ) as unknown as AllianceMemberActionsDto;
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
      await this.messaging.sendSystem(
        message.to,
        MESSAGE_SUBJECT,
        message.body,
      );
    }
  }

  private toSummary(
    alliance: AllianceRecord,
    memberCount: number,
    factions: FactionRecord[],
  ): AllianceSummaryDto {
    const faction = factions.find((f) => f.id === alliance.factionId);
    return {
      id: alliance.id,
      name: alliance.name,
      color: alliance.color,
      faction: faction?.key as AllianceSummaryDto['faction'],
      factionName: faction?.name ?? UNKNOWN_NAME,
      memberCount,
      acceptsApplications: alliance.acceptsApplications,
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
      ['titles', ['presidentTitle', 'viceTitle', 'diplomatTitle']],
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

  private async appendChronicleEntry(
    tx: AllianceStore,
    eventType: AllianceDiplomacyChronicleEventType,
    actorId: number | null,
    relationship: AllianceRelationshipRecord,
    firstAlliance: AllianceRecord,
    secondAlliance: AllianceRecord,
  ): Promise<void> {
    const actor = actorId === null ? null : await tx.findPlayer(actorId);
    await tx.appendDiplomacyChronicleEntry({
      eventType,
      actorUserId: actor?.id ?? null,
      actorName: actor?.name ?? null,
      firstParty: allianceParty(firstAlliance.id),
      firstPartyName: firstAlliance.name,
      secondParty: allianceParty(secondAlliance.id),
      secondPartyName: secondAlliance.name,
      relationshipType: relationship.type,
      lordParty: relationship.lordParty,
      vassalParty: relationship.vassalParty,
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
    action: AllianceAction,
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
  }

  /** The alliance ID of an alliance party; settler parties arrive with later stages. */
  private allianceIdOfParty(party: PartyRef): number {
    if (!isAllianceParty(party)) {
      throw new Error('Player diplomacy parties are not supported here yet');
    }
    return party.id;
  }

  /** The loaded alliance that stands behind `party`. */
  private allianceForParty(
    party: PartyRef,
    candidates: AllianceRecord[],
  ): AllianceRecord {
    const allianceId = this.allianceIdOfParty(party);
    const alliance = candidates.find(
      (candidate) => candidate.id === allianceId,
    );
    if (!alliance) throw new Error('Diplomacy party alliance was not loaded');
    return alliance;
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

  private titlesOf(alliance: AllianceRecord): AllianceTitlesDto {
    return {
      president: alliance.presidentTitle,
      vice: alliance.viceTitle,
      diplomat: alliance.diplomatTitle,
    };
  }

  private roleTitle(
    titles: AllianceTitlesDto,
    role: AllianceRole,
  ): string | null {
    switch (role) {
      case PRESIDENT:
        return titles.president;
      case VICE:
        return titles.vice;
      case DIPLOMAT:
        return titles.diplomat;
      default:
        return null;
    }
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
    members: Array<{ name: string; role: AllianceRole }>,
    relationships: AllianceRelationshipSummaryDto[],
  ): string {
    const holder = (role: AllianceRole) =>
      members.find((m) => m.role === role)?.name ?? 'Unbesetzt';
    const banner = this.bannerDto(alliance);
    const values: Record<string, string> = {
      $ALLIANCE_BANNER: banner ? `[img]${banner.url}[/img]` : '',
      $ALLIANCE_PRESIDENT: holder(PRESIDENT),
      $ALLIANCE_VICEPRESIDENT: holder(VICE),
      $ALLIANCE_FOREIGNMINISTER: holder(DIPLOMAT),
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

  private validateTitles(raw: AllianceTitlesDto): AllianceTitlesDto {
    const titles = {
      president: typeof raw?.president === 'string' ? raw.president.trim() : '',
      vice: typeof raw?.vice === 'string' ? raw.vice.trim() : '',
      diplomat: typeof raw?.diplomat === 'string' ? raw.diplomat.trim() : '',
    };
    if (
      Object.values(titles).some(
        (t) => t.length < ALLIANCE_TITLE_MIN || t.length > ALLIANCE_TITLE_MAX,
      )
    ) {
      throw new BadRequestException(
        `Alle Amtstitel müssen ${ALLIANCE_TITLE_MIN} bis ${ALLIANCE_TITLE_MAX} Zeichen lang sein`,
      );
    }
    return titles;
  }
}
