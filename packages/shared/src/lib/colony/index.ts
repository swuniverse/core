export * from './asteroid.js';

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

export interface ColonyEnvironmentScanDto {
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  fields: Array<{
    x: number;
    y: number;
    fieldTypeId: number;
    fieldTypeName: string;
    celestialObject: {
      id: number;
      name: string | null;
      objectType: number;
      classId: number | null;
    } | null;
  }>;
  signatures: Array<{ x: number; y: number; visibleCount: number }>;
  fadedSignatures: { uncloaked: number; cloaked: number };
  colonyShields: Array<{
    colonyId: number;
    x: number;
    y: number;
    shielded: boolean;
  }>;
  anomalies: Array<{ x: number; y: number; type: string }>;
}

export interface CommodityLocationsDto {
  commodityId: number;
  commodityName: string;
  colonies: Array<{
    colonyId: number;
    colonyName: string;
    colonyClassId: number;
    amount: number;
  }>;
  spacecraft: Array<{
    spacecraftId: number;
    spacecraftName: string;
    shipClassId: number;
    shipClassKey: string | null;
    entityType: 'SHIP' | 'STATION';
    amount: number;
  }>;
}
