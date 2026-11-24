export type NebulaTarget = 'GALAXY' | 'SYSTEMS' | 'BOTH';
export type NebulaDensity = 'SUBTLE' | 'BALANCED' | 'RICH';

export interface NebulaSettingsDto {
  seed: string;
  target: NebulaTarget;
  density: NebulaDensity;
}

export interface NebulaPreviewFieldDto {
  id: number;
  x: number;
  y: number;
  fieldTypeId: number;
  label: string;
  objectClassId: number | null;
  systemTypeId: number | null;
}

export interface NebulaChangeDto {
  fieldId: number;
  x: number;
  y: number;
  fieldTypeId: number;
}

export interface NebulaPreviewMapDto {
  scope: 'GALAXY' | 'SYSTEM';
  id: number;
  name: string;
  width: number;
  height: number;
  systemTypeId?: number;
  fields: NebulaPreviewFieldDto[];
  changes: NebulaChangeDto[];
}

export interface NebulaPreviewDto {
  layerId: number;
  settings: NebulaSettingsDto;
  fingerprint: string;
  maps: NebulaPreviewMapDto[];
  summary: {
    changedFields: number;
    protectedFields: number;
    byFieldType: {
      id: number;
      name: string;
      count: number;
      energyCost: number;
      damage: number;
      specialDamage: number;
      effects: string[];
      miningResources: { commodityId: number; rate: number }[];
    }[];
  };
}

export interface NebulaApplyDto extends NebulaSettingsDto {
  fingerprint: string;
}

export interface NebulaApplyResultDto {
  changedFields: number;
}
