export type ColonyTickEventType =
  | 'BUILDING_DEACTIVATED'
  | 'STORAGE_FULL'
  | 'BUILDING_FINISHED'
  | 'TERRAFORMING_FINISHED'
  | 'CREW_LIMIT_EXCEEDED';

export interface ColonyTickEvent {
  type: ColonyTickEventType;
  fieldIndex?: number;
  buildingId?: number | null;
  buildingName?: string;
  commodityId?: number;
  reason?: string;
  activated?: boolean;
  amount?: number;
}

export interface ColonyTickReportPayload {
  colonyId: number;
  tick: number;
  events: ColonyTickEvent[];
}

export interface ColonyEventDto {
  id: number;
  colonyId?: number;
  userId?: number;
  type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  payload?: Record<string, unknown>;
  tickId?: number | null;
  readAt?: string | null;
  createdAt: string;
}

export interface ShipModuleSelection {
  slotId: string;
  commodityId: number;
}
