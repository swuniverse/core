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

export interface WebSocketEvent<T = unknown> {
  type: string;
  payload: T;
}

export enum WsEventType {
  TICK = 'TICK',
  COLONY_UPDATED = 'COLONY_UPDATED',
  COLONY_TICK_REPORT = 'COLONY_TICK_REPORT',
  SHIP_MOVED = 'SHIP_MOVED',
  COMBAT_STARTED = 'COMBAT_STARTED',
  RESOURCE_UPDATED = 'RESOURCE_UPDATED',
  SPACECRAFT_EVENT = 'SPACECRAFT_EVENT',
  DISTRESS_CHANGED = 'DISTRESS_CHANGED',
}

export interface ShipMovedPayload {
  shipId: number;
  locationId: number | null;
  location: SpaceLocationDto | null;
}

export interface GameEventDto {
  id: number;
  type: string;
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
    | 'DESTROYED';
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
  notifications: {
    messages: number;
    system: number;
  };
  research: {
    techId: number;
    name: string;
    progress: number;
    pointsRequired: number;
    blockedReason: string | null;
  } | null;
  colonies: Array<{
    id: number;
    name: string;
    energy: number;
    energyMax: number;
    storageUsed: number;
    storageMax: number;
  }>;
}
import type { SpaceLocationDto } from '../starmap/index.js';
