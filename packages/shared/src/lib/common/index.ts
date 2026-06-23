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
}
