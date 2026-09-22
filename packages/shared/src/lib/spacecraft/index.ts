import type { SpaceLocationDto } from '../starmap/index.js';

export const SPACECRAFT_RUNTIME_SYSTEM_KEYS = [
  'SHIELDS',
  'REACTOR',
  'EPS',
  'WARPDRIVE',
  'SUBLIGHT_DRIVE',
  'LONG_RANGE_SENSORS',
  'SHORT_RANGE_SENSORS',
  'COMPUTER',
  'WEAPONS',
  'TORPEDO_BANK',
  'SPECIAL',
  'LIFE_SUPPORT',
] as const;

export type SpacecraftRuntimeSystemKey =
  (typeof SPACECRAFT_RUNTIME_SYSTEM_KEYS)[number];

export interface SpacecraftRuntimeSystemStateDto {
  active: boolean;
  cooldown: number;
  integrity: number;
  current?: number;
  max?: number;
}

export type SpacecraftRuntimeSystemsDto = Partial<
  Record<SpacecraftRuntimeSystemKey, SpacecraftRuntimeSystemStateDto>
>;

export type SpacecraftOperatingMode = 'NORMAL' | 'STANDBY';
export type SpacecraftAlertState = 'GREEN' | 'YELLOW' | 'RED';
export type SpacecraftLssMode =
  'DISABLED' | 'TERRITORY' | 'IMPASSABLE' | 'CARTOGRAPHY';

export interface SpacecraftActionAvailabilityDto {
  available: boolean;
  reason: string | null;
}

export interface SpacecraftCrewMemberDto {
  id: number;
  name: string;
  position: string;
  rank: string;
}

export interface SpacecraftEffectiveStatsDto {
  hullMax: number;
  shieldsMax: number;
  energyMax: number;
  warpdriveMax: number;
  batteryMax: number;
  reactorOutput: number;
  sensorRange: number;
  cargoMax: number;
  crewMin: number;
  crewMax: number;
  evadeChance: number;
}

export interface SpacecraftDetailDto {
  id: number;
  name: string;
  shipClassId: number;
  shipClassName?: string;
  shipClassKey?: string | null;
  status: string;
  alertState: SpacecraftAlertState;
  operatingMode: SpacecraftOperatingMode;
  lssMode?: SpacecraftLssMode;
  hull: number;
  hullMax: number;
  shields: number;
  shieldsMax: number;
  energy: number;
  energyMax: number;
  epsMax: number;
  reactorOutput: number;
  warpdrive: number;
  warpdriveMax: number;
  warpSpeed: number;
  warpCooldown: number;
  battery: number;
  batteryMax: number;
  reactorFuel: number;
  reactorFuelMax: number;
  evadeChance: number;
  crew: number;
  crewRequired?: number;
  crewMax: number;
  cargoUsed?: number;
  cargoMax?: number;
  reactorWarpSplit: number;
  runtimeSystems: SpacecraftRuntimeSystemsDto;
  location: SpaceLocationDto;
  navigationBounds?: { minX: number; maxX: number; minY: number; maxY: number };
  arrivalAt: string | null;
  locationLabel?: string;
  moduleCount?: number;
  moduleCategories?: string[];
  fleetName?: string | null;
  starSystem?: { id: number; name: string } | null;
  celestialObject?: { id: number; name: string | null } | null;
  isColonizer?: boolean;
  colonizerTier?: number | null;
  colonizationBuildingId?: number | null;
  crewRoster?: SpacecraftCrewMemberDto[];
  effectiveStats?: SpacecraftEffectiveStatsDto;
  actions?: Record<string, SpacecraftActionAvailabilityDto>;
}

export interface SpacecraftEnergyFlowRowDto {
  systemKey: SpacecraftRuntimeSystemKey;
  label: string;
  active: boolean;
  epsPerTick: number;
}

export interface SpacecraftEnergyFlowDto {
  energy: { current: number; max: number };
  warpdrive: { current: number; max: number };
  battery: { current: number; max: number };
  reactorFuel: { current: number; max: number; commodityId: number };
  reactorOutput: number;
  reactorWarpSplit: number;
  flightCost: number;
  epsProduction: number;
  warpProduction: number;
  totalSystemConsumption: number;
  netEps: number;
  systems: SpacecraftEnergyFlowRowDto[];
}

export interface SpacecraftAlertMutationResultDto {
  applied: boolean;
  alertState: SpacecraftAlertState;
  operatingMode: SpacecraftOperatingMode;
  systems: SpacecraftRuntimeSystemsDto;
  rejections: Array<{
    systemKey: SpacecraftRuntimeSystemKey;
    reason: string;
  }>;
}

export interface SpacecraftOperatingModeResultDto {
  operatingMode: SpacecraftOperatingMode;
  systems: SpacecraftRuntimeSystemsDto;
}

export interface SpacecraftScanResultDto {
  id: number;
  type: 'SECTOR' | 'SYSTEM_FIELD';
  spacecraftId: number;
  createdAt: string;
  energyCost: number;
  cooldown: number;
  layerId: number | null;
  starSystemId: number | null;
  locationId: number | null;
  location: SpaceLocationDto | null;
  x: number;
  y: number;
  result: unknown;
}

export interface SpacecraftScanPageDto {
  data: SpacecraftScanResultDto[];
  total: number;
  page: number;
  limit: number;
}

export interface SpacecraftCartographyDto {
  systemId: number | null;
  explored: boolean;
  progress: number;
  surveyedFields: number;
  totalFields: number;
}

export interface ShipCentredMapFieldDto {
  id: number;
  x: number;
  y: number;
  name: string;
  fieldTypeKey: string;
  fieldTypeId: number;
  systemTypeId?: number | null;
  factionZone: string | null;
  passable: boolean;
  effects: string[];
  systemName: string | null;
  tooltip: string;
}

export interface ShipCentredMapDto {
  layerId: number;
  origin: { x: number; y: number };
  center: { x: number; y: number };
  section: { x: number; y: number; size: number };
  navigation: {
    north: boolean;
    east: boolean;
    south: boolean;
    west: boolean;
    returnToShip: { x: number; y: number };
  };
  overlays: { territory: boolean; impassability: boolean; effects: boolean };
  fields: ShipCentredMapFieldDto[];
}

export interface SpacecraftTargetScanDto {
  id: number;
  name: string;
  shipClassId: number;
  username: string | null;
  hull: number;
  hullMax: number;
  shields: number;
  shieldsMax: number;
  crew: number;
  crewMax: number;
  energy: number;
  battery: number;
  reactorFuel: number;
  reactorFuelMax: number;
  alertState: SpacecraftAlertState;
  modules: Array<{
    moduleType: string;
    category: string;
    integrity: number;
    isActive: boolean;
  }>;
  runtimeSystems: SpacecraftRuntimeSystemsDto;
  discovery?: {
    discovered: boolean;
    prestigeAwarded: number;
    name: string;
  };
}

export interface SpacecraftNearbyTargetDto {
  id: number;
  name: string;
  shipClassId: number;
  username: string | null;
  hull: number;
  hullMax: number;
  shields: number;
  shieldsActive: boolean;
  hyperdriveActive: boolean;
  isOwn: boolean;
  inHyperspace: boolean;
  actions: {
    attack: boolean;
    scan: boolean;
    intercept: boolean;
    contact: boolean;
    transfer: boolean;
    energyTransfer: boolean;
    tractor: boolean;
    boarding: boolean;
  };
}

export interface SpacecraftFieldContextDto {
  coordinates: { x: number; y: number };
  starSystem: {
    id: number;
    name: string;
    canLeave: boolean;
    leaveReason: string | null;
  } | null;
  colony: {
    id: number;
    name: string;
    planetName: string;
    isOwn: boolean;
    canLand: boolean;
  } | null;
  information: {
    canSectorScan: boolean;
    cartographyKnown: boolean;
    entrySystem?: {
      id: number;
      name: string;
      x: number;
      y: number;
      systemTypeId: number | null;
    } | null;
    colonizationTarget?: {
      celestialObjectId: number;
      name: string | null;
      isAbandoned: boolean;
    } | null;
  };
}

export interface SpacecraftNearbyDto {
  actionsAvailable: boolean;
  hyperdriveActive: boolean;
  ships: SpacecraftNearbyTargetDto[];
  wrecks: Array<{
    id: number;
    hull: number;
    cargo: Array<{ commodityId: number; amount: number }>;
  }>;
}

export interface SpacecraftTransferQuoteDto {
  available: boolean;
  reason: string | null;
  colonyId: number;
  cargo: { shipUsed: number; shipMax: number; colonyFree: number };
  shipCargo: Array<{
    commodityId: number;
    commodityName: string;
    amount: number;
  }>;
  colonyCargo: Array<{
    commodityId: number;
    commodityName: string;
    amount: number;
  }>;
  crew: {
    shipCurrent: number;
    shipMinimum: number;
    shipMax: number;
    colonyAvailable: number;
    maxLoad: number;
    maxUnload: number;
  };
  energyPerCapacity: number;
}

export interface SpacecraftCommunicationLogDto {
  id: number;
  spacecraftId: number;
  authorId: number;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface SpacecraftCommunicationLogPageDto {
  data: SpacecraftCommunicationLogDto[];
  total: number;
  page: number;
  limit: number;
}

export interface SpacecraftColonyMessageDto {
  colonyId: number;
  colonyName: string;
  message: string | null;
}

export interface SpacecraftCommunicationRecipientDto {
  userId: number;
  username: string;
  source: 'COLONY' | 'STATION' | 'SPACECRAFT';
}

export type SpacecraftEngineeringAmount = number | 'MAX';

export interface SpacecraftEngineeringResultDto {
  transferred: number;
  energy: number;
  energyMax: number;
  battery: number;
  batteryMax: number;
  reactorFuel: number;
  reactorFuelMax: number;
}

export interface SpacecraftSelfDestructResultDto {
  spacecraftId: number;
  status: 'DESTROYED';
  alreadyDestroyed: boolean;
}

export interface SpacecraftDistressSignalDto {
  id: number;
  spacecraftId: number;
  shipName: string;
  ownerId: number;
  message: string;
  active: boolean;
  startedAt: string;
  stoppedAt: string | null;
  locationLabel: string;
}
      classId: number | null;
      className: string | null;
