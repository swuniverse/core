import type { Faction } from '../auth/index.js';
import type { SpaceLocationDto } from '../starmap/index.js';

/** Freund, Feind or Neutral between two players (see CONTEXT.md). */
export type Stance = 'FRIEND' | 'NEUTRAL' | 'ENEMY';

/** Fixed offices inside an alliance (ADR 0001). NONE = member without office. */
export enum AllianceRole {
  NONE = 'NONE',
  PRESIDENT = 'PRESIDENT',
  VICE = 'VICE',
  DIPLOMAT = 'DIPLOMAT',
}

export interface AllianceRefDto {
  id: number;
  name: string;
  color: string | null;
}

export interface AllianceTitlesDto {
  president: string;
  vice: string;
  diplomat: string;
}

export interface AllianceSummaryDto {
  id: number;
  name: string;
  color: string | null;
  faction: Faction;
  factionName: string;
  memberCount: number;
  acceptsApplications: boolean;
  foundedAt: string;
}

/** Actions the viewer may perform on one member; computed by the server. */
export interface AllianceMemberActionsDto {
  kick: boolean;
  appointVice: boolean;
  appointDiplomat: boolean;
  dismiss: boolean;
  transferPresidency: boolean;
}

export interface AllianceMemberDto {
  userId: number;
  name: string;
  role: AllianceRole;
  roleTitle: string | null;
  joinedAt: string;
  actions: AllianceMemberActionsDto;
  /** Only present when the viewer is a member of the same alliance. */
  online?: boolean;
}

export type AllianceWarTargetDto = AllianceRefDto;

/** Actions the viewer may perform on the alliance; computed by the server. */
export interface AllianceViewerActionsDto {
  apply: boolean;
  withdrawApplication: boolean;
  leave: boolean;
  editDetails: boolean;
  manageApplications: boolean;
  dissolve: boolean;
  declareWar: boolean;
  warTargets: AllianceWarTargetDto[];
  manageDiplomacy: boolean;
  /** Mitgliederübersicht öffnen (Präsident und Vize). */
  viewMemberOperations: boolean;
}

export enum AllianceRelationshipType {
  WAR = 'WAR',
  PEACE = 'PEACE',
  FRIENDSHIP = 'FRIENDSHIP',
  ALLIANCE = 'ALLIANCE',
  TRADE_AGREEMENT = 'TRADE_AGREEMENT',
  VASSALAGE = 'VASSALAGE',
}

/** Negotiated diplomatic state; it has no gameplay effect yet. */
export interface AllianceRelationshipPermissionsDto {
  treatAsFriend: boolean;
  shareLivePositions: boolean;
}

/** Present only for the directional Vassalage relationship type. */
export interface AllianceVassalageDto {
  lordAllianceId: number;
  vassalAllianceId: number;
}

/** Public projection of an active relationship. Contract text is fetched separately. */
export interface AllianceRelationshipSummaryDto {
  id: number;
  counterparty: AllianceRefDto;
  type: AllianceRelationshipType;
  startedAt: string;
  permissions: AllianceRelationshipPermissionsDto;
  vassalage: AllianceVassalageDto | null;
  hasContract: boolean;
}

export interface AllianceRelationshipContractDto {
  relationshipId: number;
  contract: string;
}

/** Confidential proposal, available only to diplomatic officers of a party. */
export interface AllianceRelationshipProposalDto {
  id: number;
  senderAllianceId: number;
  recipientAllianceId: number;
  type: AllianceRelationshipType;
  contract: string;
  permissions: AllianceRelationshipPermissionsDto;
  createdAt: string;
}

/** Confidential replacement state for an active relationship. */
export interface AllianceRelationshipChangeProposalDto {
  id: number;
  relationshipId: number;
  senderAllianceId: number;
  recipientAllianceId: number;
  contract: string;
  permissions: AllianceRelationshipPermissionsDto;
  createdAt: string;
}

export interface AllianceDiplomacyDto {
  proposals: AllianceRelationshipProposalDto[];
  changes: AllianceRelationshipChangeProposalDto[];
}

/** Direction of a confidential diplomatic proposal from the viewer's alliance. */
export type AllianceDiplomacyDirection = 'SENT' | 'RECEIVED';

/** Actions are authoritative server decisions, not frontend role inference. */
export interface AllianceDiplomacyCapabilitiesDto {
  create: boolean;
  declareWar: boolean;
  offerPeace: boolean;
  accept: boolean;
  decline: boolean;
  withdraw: boolean;
  change: boolean;
  end: boolean;
}

/** Active relationship with its independent pending replacement, if any. */
export interface AllianceDiplomacyRelationshipDto {
  relationship: AllianceRelationshipSummaryDto & { contract: string };
  change:
    | (AllianceRelationshipChangeProposalDto & {
        direction: AllianceDiplomacyDirection;
      })
    | null;
  capabilities: AllianceDiplomacyCapabilitiesDto;
}

/** A proposal is kept separate from active relationships until it is accepted. */
export interface AllianceDiplomacyProposalDto {
  proposal: AllianceRelationshipProposalDto;
  direction: AllianceDiplomacyDirection;
  capabilities: AllianceDiplomacyCapabilitiesDto;
}

/** Complete confidential view for president and diplomat diplomacy administration. */
export interface AllianceDiplomacyManagementDto {
  capabilities: Pick<AllianceDiplomacyCapabilitiesDto, 'create'>;
  targets: AllianceRefDto[];
  relationships: AllianceDiplomacyRelationshipDto[];
  proposals: AllianceDiplomacyProposalDto[];
  permissions: Record<
    AllianceRelationshipType,
    AllianceRelationshipPermissionsDto
  >;
}

export enum AllianceDiplomacyChronicleEventType {
  WAR_DECLARED = 'WAR_DECLARED',
  RELATIONSHIP_STARTED = 'RELATIONSHIP_STARTED',
  RELATIONSHIP_CHANGED = 'RELATIONSHIP_CHANGED',
  RELATIONSHIP_ENDED = 'RELATIONSHIP_ENDED',
}

/** Immutable, public historical snapshot; it never exposes contracts or proposals. */
export interface AllianceDiplomacyChronicleEntryDto {
  id: number;
  type: AllianceDiplomacyChronicleEventType;
  actor: { userId: number; name: string } | null;
  firstAlliance: { id: number; name: string };
  secondAlliance: { id: number; name: string };
  relationship: {
    type: AllianceRelationshipType;
    vassalage: AllianceVassalageDto | null;
  };
  occurredAt: string;
}

export interface AllianceDiplomacyChronicleDto {
  entries: AllianceDiplomacyChronicleEntryDto[];
  /** Opaque cursor for the next page, or null when there are no older entries. */
  nextCursor: string | null;
}

export interface AllianceDetailDto extends AllianceSummaryDto {
  homepage: string;
  /** Raw BBCode description as stored, for the edit form. */
  description: string;
  /** Description with `$ALLIANCE_*` placeholders replaced; still BBCode. */
  renderedDescription: string;
  titles: AllianceTitlesDto;
  members: AllianceMemberDto[];
  /** Active public relationships only, newest first. */
  relationships: AllianceRelationshipSummaryDto[];
  viewer: {
    role: AllianceRole | null;
    actions: AllianceViewerActionsDto;
  };
}

export interface AllianceApplicationDto {
  id: number;
  userId: number;
  name: string;
  createdAt: string;
}

export interface MyAllianceDto {
  alliance: AllianceRefDto | null;
}

export interface FoundAllianceRequest {
  name: string;
  description: string;
}

export interface UpdateAllianceRequest {
  name?: string;
  description?: string;
  homepage?: string;
  color?: string;
  acceptsApplications?: boolean;
  titles?: AllianceTitlesDto;
}

export interface SetAllianceRoleRequest {
  role: AllianceRole.VICE | AllianceRole.DIPLOMAT | AllianceRole.NONE;
}

export interface ProposeAllianceRelationshipRequest {
  recipientAllianceId: number;
  type: AllianceRelationshipType;
  contract?: string;
  permissions?: Partial<AllianceRelationshipPermissionsDto>;
}

export interface ProposeAllianceRelationshipChangeRequest {
  contract?: string;
  permissions?: Partial<AllianceRelationshipPermissionsDto>;
}

export interface LeaveAllianceResponse {
  dissolved: boolean;
}

/** Colony of a member as shown in the member overview (operational data only). */
export interface AllianceMemberColonyDto {
  id: number;
  name: string;
  location: SpaceLocationDto | null;
  energy: number;
  energyMax: number;
  storageUsed: number;
  storageMax: number;
  population: number;
  populationMax: number;
}

export interface AllianceMemberShipDto {
  id: number;
  name: string;
  location: SpaceLocationDto | null;
}

export interface AllianceMemberShipGroupDto {
  shipClassId: number;
  shipClassName: string;
  ships: AllianceMemberShipDto[];
}

export interface AllianceMemberOperationsDto {
  userId: number;
  name: string;
  faction: Faction | null;
  factionName: string | null;
  role: AllianceRole;
  roleTitle: string | null;
  /** ISO timestamp; null when the player has no recorded activity. */
  lastActiveAt: string | null;
  crew: { assigned: number; limit: number };
  colonies: AllianceMemberColonyDto[];
  shipGroups: AllianceMemberShipGroupDto[];
}

export interface AllianceMemberOverviewDto {
  allianceId: number;
  members: AllianceMemberOperationsDto[];
}
