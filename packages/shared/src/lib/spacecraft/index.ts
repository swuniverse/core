import type { Stance } from '../alliance/index.js';
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
  'ASTROMETRY_LAB',
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
  | 'DISABLED'
  | 'TERRITORY'
  | 'IMPASSABLE'
  | 'CARTOGRAPHY';

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

export type CartographyPlanStatus =
  | 'PLANNED'
  | 'MEASURED'
  | 'FINISHING'
  | 'DONE';

export interface CartographyPlanDto {
  id: number;
  starSystemId: number;
  status: CartographyPlanStatus;
  remainingFieldIds: number[];
  finalizationStartedAt: string | null;
  finalizationTick: number | null;
  finalizingSpacecraftId: number | null;
  completedAt: string | null;
}

export interface ColonyScanDepositDto {
  commodityId: number;
  commodityName: string;
  minAmount: number;
  maxAmount: number;
}

export interface ColonyScanSurfaceFieldDto {
  fieldIndex: number;
  fieldType: number;
  terrainTileId: string | null;
  buildingId: number | null;
  buildingName: string | null;
  hasBuilding: boolean;
  isConstruction: boolean;
  isActive: boolean;
  integrityPercent: number | null;
}

export interface ColonyScanProjectionDto {
  id: number;
  colonyId: number;
  scanner: { id: number; username: string | null };
  provenance: 'OWN' | 'ALLIANCE';
  canDelete: boolean;
  systemId: number | null;
  snapshot: {
    colonyName: string | null;
    owner: { id: number | null; username: string | null };
    scannedAt: string;
    system: { id: number | null; celestialObjectId: number | null };
    colonyClassId: number | null;
    surface: {
      width: number | null;
      height: number | null;
      deposits: ColonyScanDepositDto[];
      fields: ColonyScanSurfaceFieldDto[];
    };
  };
  current: {
    colony: {
      id: number;
      name: string;
      owner: { id: number; username: string | null } | null;
      isAbandoned: boolean;
      posX: number;
      posY: number;
      celestialObjectId: number | null;
    } | null;
  };
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
  reactorAutoCarryOver: boolean;
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

export interface SharedLivePositionDto {
  spacecraftId: number;
  spacecraftName: string;
  shipClassId: number;
  ownerId: number;
  ownerName: string | null;
  location: SpaceLocationDto;
}

/**
 * Why a ship is visible on the viewer's starmap. Reasons are assigned in this
 * priority order; a ship appears at most once, with its highest reason.
 */
export type StarmapContactReason = 'OWN' | 'ALLIANCE' | 'SHARED_LIVE_POSITION';

/** Central stance of the viewer towards a contact's owner. */
export type StarmapContactStance = Stance;

export interface StarmapContactAllianceDto {
  id: number;
  name: string;
  /** Validated hex color, or null when the alliance has none set. */
  color: string | null;
}

/**
 * Management details. Only delivered for the viewer's own ships and, for a
 * president or vice, for alliance ships. Omitted entirely otherwise.
 */
export interface StarmapContactManagementDto {
  status: string;
  alertState: SpacecraftAlertState;
  hull: number;
  hullMax: number;
  crew: number;
  crewMax: number;
}

/** Galaxy cell a contact is drawn at; ships inside a system use the system cell. */
export interface StarmapContactGalaxyCellDto {
  layerId: number;
  x: number;
  y: number;
}

export interface StarmapContactDto {
  spacecraftId: number;
  spacecraftName: string;
  shipClassId: number;
  ownerId: number;
  ownerName: string | null;
  /** Resolved canonical position (galaxy or system coordinates). */
  location: SpaceLocationDto;
  galaxyCell: StarmapContactGalaxyCellDto;
  reason: StarmapContactReason;
  /** Omitted for the viewer's own ships. */
  stance?: StarmapContactStance;
  /** Present for contacts with reason ALLIANCE. */
  alliance?: StarmapContactAllianceDto;
  management?: StarmapContactManagementDto;
}

export interface StarmapContactsDto {
  layerId: number;
  contacts: StarmapContactDto[];
  /**
   * Alliance the viewer currently belongs to; null when the viewer has none
   * or it cannot be resolved.
   */
  viewerAlliance: StarmapContactAllianceDto | null;
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
  reactorAutoCarryOver: boolean;
  flightCost: number;
  epsProduction: number;
  warpProduction: number;
  effectiveEpsProduction: number;
  effectiveWarpProduction: number;
  reactorUsage: number;
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
    canSurfaceScan: boolean;
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
      classId: number | null;
      className: string | null;
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
