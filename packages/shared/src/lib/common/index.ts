export interface SendMessageDto {
  recipientId: number;
  subject: string;
  body: string;
}

export interface MessageCorrespondenceDto {
  id: number;
  subject: string;
  body: string;
  isRead: boolean;
  isSystem: false;
  createdAt: string;
  senderId: number;
  recipientId: number;
  sender: { username: string };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

export const TICK_RUN_TYPES = [
  'MAIN',
  'BUILDING_COMPLETION',
  'MAINTENANCE',
] as const;
export type TickRunType = (typeof TICK_RUN_TYPES)[number];
export type TickRunStatus = 'STARTED' | 'COMPLETED' | 'FAILED';

export interface TickRunDto {
  type: TickRunType;
  tickNumber: number;
  scheduledFor: string;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  status: TickRunStatus;
  error: string | null;
}

export interface WebSocketEvent<T = unknown> {
  type: string;
  payload: T;
}

export enum WsEventType {
  TICK = 'TICK',
  AWARD_GRANTED = 'AWARD_GRANTED',
  COLONY_UPDATED = 'COLONY_UPDATED',
  COLONY_TICK_REPORT = 'COLONY_TICK_REPORT',
  RESEARCH_COMPLETED = 'RESEARCH_COMPLETED',
  SHIP_MOVED = 'SHIP_MOVED',
  COMBAT_STARTED = 'COMBAT_STARTED',
  RESOURCE_UPDATED = 'RESOURCE_UPDATED',
  SPACECRAFT_EVENT = 'SPACECRAFT_EVENT',
  DISTRESS_CHANGED = 'DISTRESS_CHANGED',
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
}

export interface ShipMovedPayload {
  shipId: number;
  locationId: number | null;
  location: SpaceLocationDto | null;
}

export const GAME_EVENT_TYPES = [
  'SHIP',
  'STATION',
  'COLONY',
  'ALLIANCE',
  'OTHER',
] as const;

export enum GameEventType {
  SHIP = 'SHIP',
  STATION = 'STATION',
  COLONY = 'COLONY',
  ALLIANCE = 'ALLIANCE',
  OTHER = 'OTHER',
}

export interface GameEventDto {
  id: number;
  type: GameEventType;
  text: string;
  scope: 'GALAXY' | 'SYSTEM' | null;
  layerId: number | null;
  systemId: number | null;
  x: number | null;
  y: number | null;
  locationId: number | null;
  location: SpaceLocationDto | null;
  createdAt: string;
}

export interface SpacecraftEventPayload {
  shipId: number;
  type:
    | 'SYSTEM_TOGGLED'
    | 'RECHARGE'
    | 'REACTOR_ADJUSTED'
    | 'BROWNOUT'
    | 'NAVIGATION'
    | 'ENGINEERING_TRANSFER'
    | 'FIELD_EFFECT'
    | 'DESTROYED';
  severity?: 'INFO' | 'WARNING' | 'SUCCESS';
  detail: string;
}

export interface GlobalHeaderStatusDto {
  user: {
    id: number;
    name: string;
    faction: string | null;
    prestige: number;
    avatar: string | null;
  };
  alliance: AllianceRefDto | null;
  notifications: {
    messages: number;
    system: number;
  };
  research: {
    techId: number;
    imageId: number;
    name: string;
    commodityId: number | null;
    progress: number;
    pointsRequired: number;
    productionPerTick: number;
    queuedCount: number;
    nextQueuedName: string | null;
    blockedReason: string | null;
  } | null;
  colonies: Array<{
    id: number;
    name: string;
    energy: number;
    energyMax: number;
    storageUsed: number;
    storageMax: number;
    colonyClassId: number;
    systemPosition: { x: number; y: number };
    starSystem: { name: string; x: number; y: number };
    celestialObject: {
      classId: number | null;
      name: string | null;
      objectType: number;
    } | null;
  }>;
}
import type { SpaceLocationDto } from '../starmap/index.js';
import type { AllianceRefDto } from '../alliance/index.js';
