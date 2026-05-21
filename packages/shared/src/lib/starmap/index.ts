export * from './planet-classes.js';

export interface StarmapLayerDto {
  id: number;
  name: string;
  width: number;
  height: number;
  sectorSize: number;
  isDefault: boolean;
  isFinished: boolean;
  isHidden: boolean;
}

export interface StarmapSystemListItemDto {
  id: number;
  name: string;
  cx: number;
  cy: number;
  maxX: number;
  maxY: number;
  systemTypeId: number;
  systemTypeName?: string;
  isLandmark?: boolean;
  isMapOnly?: boolean;
  landmarkKey?: string | null;
  landmarkCategory?: string | null;
}

export interface StarmapSectorDto {
  layerId: number;
  sectorX: number;
  sectorY: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  fieldCount: number;
  systemCount: number;
  exploredCount?: number;
  totalCount?: number;
  explorationPercent?: number;
  isDiscovered?: boolean;
}

export interface StarmapFieldTypeDto {
  id: number;
  key: string;
  name: string;
  passable: boolean;
  energyCost: number;
  damage: number;
  isSystem: boolean;
  colorKey: string | null;
}

export type StarmapFactionZone =
  | 'REBEL'
  | 'EMPIRE'
  | 'CONTESTED'
  | 'UNKNOWN'
  | 'NEUTRAL';

export interface StarmapGalaxyFieldDto {
  id: number;
  cx: number;
  cy: number;
  fieldTypeId: number;
  systemTypeId: number | null;
  factionZone: StarmapFactionZone;
  adminRegionKey: string | null;
  starSystemId: number | null;
  regionId: number | null;
  borderTypeId: number | null;
  effects: string[] | null;
  passableOverride: boolean | null;
  fieldType: StarmapFieldTypeDto;
  starSystem: StarmapSystemListItemDto | null;
}

export interface StarmapSystemFieldDto {
  id: number;
  sx: number;
  sy: number;
  fieldTypeId: number;
  celestialObjectId: number | null;
  isPassable: boolean;
  energyCost: number;
  damage: number;
  effects: string[];
  regionKey: string | null;
  adminRegionKey: string | null;
  influenceAreaId: number | null;
  borderMask: string | null;
  fieldType: StarmapFieldTypeDto;
  celestialObject?: StarmapCelestialObjectDto | null;
}

export interface StarmapSystemGridDto {
  system: StarmapSystemListItemDto;
  fields: StarmapSystemFieldDto[];
  celestialObjects?: StarmapCelestialObjectDto[];
}

export interface StarmapCelestialObjectDto {
  id: number;
  objectType: number;
  name: string | null;
  posX: number;
  posY: number;
  classId: number | null;
  isColonizable: boolean;
}

export interface StarmapSystemDetailDto {
  id: number;
  name: string;
  cx: number;
  cy: number;
  systemTypeId: number;
  systemTypeName?: string;
  maxX: number;
  maxY: number;
  isLandmark?: boolean;
  isMapOnly?: boolean;
  landmarkKey?: string | null;
  landmarkCategory?: string | null;
  celestialObjects: StarmapCelestialObjectDto[];
}

export interface HyperspaceRouteSegmentDto {
  id: number;
  routeId: number;
  sortOrder: number;
  fromSystem: StarmapSystemListItemDto;
  toSystem: StarmapSystemListItemDto;
  controlPoints: Array<{ x: number; y: number }> | null;
}

export interface HyperspaceRouteDto {
  id: number;
  layerId: number;
  key: string;
  name: string;
  color: string;
  sortOrder: number;
  segments: HyperspaceRouteSegmentDto[];
}

export type StarWarsPresetModeDto = 'landmarks' | 'curated' | 'full';

export interface ApplyStarWarsPresetOptionsDto {
  mode?: StarWarsPresetModeDto;
  recreateRoutes?: boolean;
  overwriteExisting?: boolean;
  fullLimit?: number;
  fullOffset?: number;
  regionFilter?: string;
}

export interface ApplyStarWarsPresetResultDto extends StarmapOperationResultDto {
  createdLandmarks: number;
  updatedLandmarks: number;
  createdRoutes: number;
  conflicts: string[];
}

export interface StarmapFieldContextDto {
  layerId: number;
  cx: number;
  cy: number;
  sectorX: number;
  sectorY: number;
  factionZone?: string | null;
  adminRegionKey?: string | null;
  regionName?: string | null;
  nearestSystem?: StarmapSystemListItemDto | null;
}

export interface StarmapSystemTypeOptionDto {
  id: number;
  key: string;
  name: string;
}

export interface StarmapCreateLayerDto {
  name: string;
  width: number;
  height: number;
  sectorSize?: number;
  isDefault?: boolean;
  isFinished?: boolean;
  isHidden?: boolean;
}

export interface StarmapInitializeGridDto {
  defaultFieldTypeId: number;
}

export interface StarmapOperationResultDto {
  created?: number;
  updated?: number;
  deleted?: boolean;
  generated?: number;
}

export interface StarmapFillSectorDto {
  layerId: number;
  sectorX: number;
  sectorY: number;
  fieldTypeId?: number;
  systemTypeId?: number | null;
  factionZone?: StarmapFactionZone;
  adminRegionKey?: string | null;
}

export interface StarmapCreateSystemDto {
  layerId: number;
  name: string;
  cx: number;
  cy: number;
  systemTypeId: number;
  maxX?: number;
  maxY?: number;
  seed?: string;
}

export interface StarmapUpdateGalaxyFieldDto {
  fieldTypeId?: number;
  systemTypeId?: number | null;
  factionZone?: StarmapFactionZone;
  adminRegionKey?: string | null;
  starSystemId?: number | null;
  regionId?: number | null;
  borderTypeId?: number | null;
  effects?: string[] | null;
  passableOverride?: boolean | null;
}

export interface StarmapUpdateSystemFieldDto {
  fieldTypeId?: number;
  celestialObjectId?: number | null;
  regionKey?: string | null;
  adminRegionKey?: string | null;
  influenceAreaId?: number | null;
  borderMask?: string | null;
}

export interface StarmapGenerateSystemsDto {
  layerId?: number;
  limit?: number;
}

export interface StarmapRegenerateSystemDto {
  systemTypeId?: number;
  seed?: string;
}

// --- Phase 2: Regions, Borders, Bulk Edit ---

export interface StarmapMapRegionDto {
  id: number;
  layerId: number;
  name: string;
  description: string | null;
  colorKey: string;
}

export interface StarmapCreateMapRegionDto {
  layerId: number;
  name: string;
  description?: string | null;
  colorKey?: string;
}

export interface StarmapUpdateMapRegionDto {
  name?: string;
  description?: string | null;
  colorKey?: string;
}

export interface StarmapBorderTypeDto {
  id: number;
  name: string;
  colorKey: string;
  style: string;
}

export interface StarmapCreateBorderTypeDto {
  name: string;
  colorKey?: string;
  style?: string;
}

export interface StarmapUpdateBorderTypeDto {
  name?: string;
  colorKey?: string;
  style?: string;
}

export interface StarmapBulkEditFieldsDto {
  fieldIds: number[];
  fieldTypeId?: number;
  factionZone?: StarmapFactionZone;
  regionId?: number | null;
  borderTypeId?: number | null;
  adminRegionKey?: string | null;
  systemTypeId?: number | null;
  effects?: string[] | null;
  passableOverride?: boolean | null;
}

export interface StarmapUpdateFieldEffectsDto {
  effects: string[] | null;
}

export interface StarmapUpdateFieldPassableDto {
  passableOverride: boolean | null;
}

export interface StarmapLayerOverviewDto {
  layerId: number;
  sectors: StarmapSectorOverviewEntry[];
}

export interface StarmapSectorOverviewEntry {
  sectorX: number;
  sectorY: number;
  fieldCount: number;
  systemCount: number;
  dominantFactionZone: StarmapFactionZone;
  dominantRegionId: number | null;
  dominantRegionName: string | null;
}

// --- Phase 4: Exploration / Fog of War ---

export type StarmapExplorationLevel = 'UNKNOWN' | 'TERRAIN' | 'FULL';

export interface StarmapExplorationStateDto {
  cx: number;
  cy: number;
  explorationLevel: StarmapExplorationLevel;
}

export interface StarmapDiscoverFieldDto {
  layerId: number;
  cx: number;
  cy: number;
  radius?: number;
  level?: StarmapExplorationLevel;
  source?: string;
}

export interface StarmapDiscoverSystemDto {
  starSystemId: number;
  source?: string;
}

export interface StarmapExploredGalaxyFieldDto extends StarmapGalaxyFieldDto {
  explorationLevel: StarmapExplorationLevel;
}

export interface StarmapExploredSectorDto {
  fields: StarmapExploredGalaxyFieldDto[];
  hiddenCount: number;
}

// --- Phase 5: Planet Surfaces ---

export type StarmapPlanetFieldLayer = 'ORBIT' | 'SURFACE' | 'UNDERGROUND';

export interface StarmapPlanetFieldDto {
  id: number;
  celestialObjectId: number;
  fieldLayer: StarmapPlanetFieldLayer;
  px: number;
  py: number;
  terrainType: string;
  buildingId: number | null;
  isBuildable: boolean;
  resourceModifier: number;
}

export interface StarmapPlanetSurfaceDto {
  celestialObject: StarmapCelestialObjectDto & {
    planetClass: string | null;
    surfaceWidth: number | null;
    surfaceHeight: number | null;
  };
  orbit: StarmapPlanetFieldDto[];
  surface: StarmapPlanetFieldDto[];
  underground: StarmapPlanetFieldDto[];
}

export interface StarmapGeneratePlanetDto {
  celestialObjectId: number;
  planetClass: string;
  terrainSeed?: string;
}

// --- Phase 6: Influence Areas & Wormholes ---

export type StarmapInfluenceSourceType = 'STATION' | 'ALLIANCE' | 'FACTION';

export interface StarmapInfluenceAreaDto {
  cx: number;
  cy: number;
  sourceType: StarmapInfluenceSourceType;
  sourceId: number;
  strength: number;
}

export interface StarmapWormholeDto {
  id: number;
  entryLayerId: number;
  entryCx: number;
  entryCy: number;
  exitLayerId: number;
  exitCx: number;
  exitCy: number;
  isBidirectional: boolean;
  isRandomExit: boolean;
  name: string | null;
  isActive: boolean;
}

export interface StarmapCreateWormholeDto {
  entryLayerId: number;
  entryCx: number;
  entryCy: number;
  exitLayerId: number;
  exitCx: number;
  exitCy: number;
  isBidirectional?: boolean;
  isRandomExit?: boolean;
  name?: string;
}
