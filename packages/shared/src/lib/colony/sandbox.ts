export interface ColonySandboxNameDto {
  name: string;
}

export interface ColonySandboxFieldDto {
  id: number;
  fieldIndex: number;
  fieldType: number;
  terrainTileId: string | null;
  layer: 'ORBIT' | 'SURFACE' | 'UNDERGROUND' | null;
  bonusMarker: string | null;
  buildingId: number | null;
  isBuilding: boolean;
  buildProgress: number;
  buildFinishesAt: string | null;
  isActive: boolean;
  integrity: number;
  maxIntegrity: number;
  activateAfterBuild: boolean;
  reactivateAfterUpgrade: number | null;
  terraformingId: string | null;
  terraformingFinishesAt: string | null;
  locked?: boolean;
}

/** Independent planning inputs, never a tickable colony or inventory. */
export interface ColonySandboxSnapshotDto {
  sourceColonyName: string;
  /** Optional for snapshots created before planning actions were introduced. */
  energy?: number;
  celestialObject?: {
    classId: number | null;
    name: string | null;
    objectType: number;
    swuRotation?: 'rotating' | 'tidal-locked' | null;
    swuRing?: boolean;
  } | null;
  colonyClassId: number;
  surfaceWidth: number | null;
  surfaceMask: string | null;
  solarOutputTJ: number | null;
  rotationFactor: number | null;
  swuZoneSlot: number | null;
  population: number;
  populationMax: number;
  energyMax: number;
  storageMax: number;
  workers: number;
  fields: ColonySandboxFieldDto[];
}

export interface ColonySandboxSummaryDto {
  id: number;
  name: string;
  sourceColonyId: number | null;
  sourceColonyName: string;
  createdAt: string;
}

export interface ColonySandboxDto extends ColonySandboxSummaryDto {
  snapshot: ColonySandboxSnapshotDto;
}

export interface ColonySandboxListDto {
  limit: number;
  sandboxes: ColonySandboxSummaryDto[];
}

export type ColonySandboxActionDto =
  | {
      action: 'build';
      fieldIndex: number;
      buildingId: number;
      activate?: boolean;
    }
  | { action: 'upgrade'; fieldIndex: number; upgradeId: number }
  | { action: 'terraform'; fieldIndex: number; terraformingId: string }
  | { action: 'demolish' | 'toggle'; fieldIndex: number }
  | {
      action: 'mass-toggle';
      mode: number;
      fieldIndexes?: number[];
      commodityId?: number;
      activate: boolean;
    };

export interface ColonySandboxOptionsDto {
  buildingIds: number[];
  upgrades: Array<{
    id: number;
    fromBuildingId: number;
    toBuildingId: number;
    description: string;
    energyCost: number;
    costs: Array<{ commodityId: number; amount: number }>;
  }>;
  terraformingIds: string[];
}
