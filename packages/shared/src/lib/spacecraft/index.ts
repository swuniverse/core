import type { Stance } from '../alliance/index.js';
import type { AnomalyViewDto, SpaceLocationDto } from '../starmap/index.js';
import type { ShipModuleSelection } from '../colony/index.js';

export interface StationShipBuildRequestDto {
  shipClassId?: number;
  buildPlanId?: number;
  buildPlanName?: string;
  name: string;
  moduleSelections?: ShipModuleSelection[];
}

export interface ShipBuildplanDto {
  id: number;
  shipClassId: number;
  name: string;
  signature: string;
  moduleSelections: ShipModuleSelection[];
  moduleCommodityIds: number[];
  moduleTypes: string[];
}

export type ShipyardModuleCategory =
  | 'HULL'
  | 'SHIELDS'
  | 'COMPUTER'
  | 'SUBLIGHT_DRIVE'
  | 'SENSORS'
  | 'HYPERDRIVE'
  | 'REACTOR'
  | 'EPS'
  | 'ENERGY_WEAPON'
  | 'TORPEDO_BANK'
  | 'SPECIAL';

export interface ShipDesignerLayoutDto {
  shipClassId: number;
  imageKey: string;
  layoutKey: string;
  stuRumpId?: number | null;
  fixedModuleCommodityIds?: number[] | null;
  fixedBuildCosts?: Array<{ commodityId: number; amount: number }> | null;
  baseStats: {
    moduleLevel: number;
    baseCrew: number;
    baseEvadeChance: number;
    baseHull: number;
    baseShield: number;
    baseDamage: number;
    baseSensorRange: number;
    baseWarpdrive: number;
    baseEps: number;
    baseReactor: number;
    epsCost?: number;
  } | null;
  slots: Array<{
    slotId: string;
    moduleCategory: ShipyardModuleCategory;
    label: string;
    anchorX: number;
    anchorY: number;
    calloutSide: 'left' | 'right' | 'top' | 'bottom';
    order: number;
    required?: boolean;
  }>;
}

export interface ShipDesignerModuleDto {
  commodityId: number;
  commodityName: string;
  amount: number;
  moduleType: string;
  moduleCategory: string;
  shipyardGroup: 'CORE_SYSTEMS' | 'DEFENSE_SYSTEMS' | 'OFFENSE_SYSTEMS';
  shipyardType: ShipyardModuleCategory;
  moduleLevel: number;
  moduleClass: number;
  researchRequired: string | null;
  faction: 'REBEL_ALLIANCE' | 'GALACTIC_EMPIRE' | null;
  displayName: string;
  crewRequired: number;
  effects: string[];
  shipyardModuleStats: {
    level: number;
    upgradeFactor: number;
    downgradeFactor: number;
    crew: number;
    energyCost: number;
    defaultFactor: number;
  } | null;
  compatibleShipClassIds?: number[];
}

export interface StationShipyardOverviewDto {
  stationId: number;
  role: string;
  options: Array<{
    id: number;
    key: string;
    name: string;
    buildTimeTicks: number;
    crewMax: number;
    buildCosts: Array<{ commodityId: number; amount: number; stored: number }>;
    layout: ShipDesignerLayoutDto;
  }>;
  availableModules: ShipDesignerModuleDto[];
  buildplans: ShipBuildplanDto[];
  queues: Array<{
    id: number;
    name: string;
    buildPlanName?: string | null;
    finishesAt: string;
  }>;
}

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
  'CLOAK',
  'TRACTOR_BEAM',
  'REACTOR_CHARGE_TRANSFER',
  'HYPERDRIVE_BOOSTER',
  'SUBSPACE_SCANNER',
  'TACHYON_SCANNER',
  'MATRIX_SCANNER',
  'TRACKER',
  'HYPERSPACE_COIL',
  'RESOURCE_COLLECTOR',
  'RESOURCE_CONVERTER',
  'SHUTTLE_RAMP',
  'LIFE_SUPPORT',
  'DEFLECTOR',
  'BEAM_BLOCKER',
  'UPLINK',
] as const;

export type SpacecraftRuntimeSystemKey =
  (typeof SPACECRAFT_RUNTIME_SYSTEM_KEYS)[number];

export interface SpacecraftRuntimeSystemStateDto {
  active: boolean;
  cooldown: number;
  integrity: number;
  current?: number;
  max?: number;
  targetId?: number;
  ticksRemaining?: number;
  resourceCommodityId?: number;
  resourceLocationId?: number;
  lastScanAt?: number;
  lastScanLocationId?: number;
  /** SHIELDS: epoch-ms timer for regeneration, reset on every shield hit. */
  regenerationStartedAt?: number;
}

export interface SpacecraftTrackerDto {
  targetId: number;
  targetName: string;
  ticksRemaining: number;
  location: {
    scope: 'SYSTEM' | 'GALAXY';
    x: number;
    y: number;
    fieldId: number;
  } | null;
}

export type SpacecraftRuntimeSystemsDto = Partial<
  Record<SpacecraftRuntimeSystemKey, SpacecraftRuntimeSystemStateDto>
>;

export type SpacecraftOperatingMode = 'NORMAL' | 'STANDBY';
export type SpacecraftAlertState = 'GREEN' | 'YELLOW' | 'RED';

export type SpacecraftRepairTargetType = 'HULL' | 'MODULE';
export type SpacecraftRepairPartsType =
  'SPARE_PARTS' | 'SYSTEM_COMPONENTS' | 'BOTH';

export interface SpacecraftRepairOptionsDto {
  targets: Array<{
    type: SpacecraftRepairTargetType;
    moduleId: number | null;
    label: string;
    integrity: number;
  }>;
  engineers: number;
  cost: number;
  durationSeconds: number;
  activeRepair: {
    targetType: SpacecraftRepairTargetType;
    moduleId: number | null;
    completesAt: string;
  } | null;
}

export interface SpacecraftSelfRepairDto {
  targetType: SpacecraftRepairTargetType;
  moduleId: number | null;
  partsType: SpacecraftRepairPartsType;
  instant: boolean;
}
export type SpacecraftLssMode =
  'DISABLED' | 'TERRITORY' | 'IMPASSABLE' | 'CARTOGRAPHY';

export interface SpacecraftActionAvailabilityDto {
  available: boolean;
  reason: string | null;
}

export interface SpacecraftTakeoverDto {
  attackerId: number;
  targetId: number;
  ticksRemaining: number;
  totalTicks: number;
  prestigeCost: number;
  completed: boolean;
}

export interface SpacecraftBoardingResultDto {
  attackerId: number;
  targetId: number;
  outcome: 'ATTACKER_VICTORY' | 'DEFENDER_VICTORY';
  attackerCrewBefore: number;
  attackerCrewLost: number;
  attackerCrewAfter: number;
  defenderCrewBefore: number;
  defenderCrewLost: number;
  defenderCrewAfter: number;
  prestigeCost: number;
  message: string;
}

export interface SpacecraftCrewMemberDto {
  id: number;
  name: string;
  position: string;
  rank: string;
}

export const SPACECRAFT_CREW_POSITIONS = [
  'CAPTAIN',
  'COMMAND',
  'SECURITY',
  'SCIENCE',
  'TECHNICAL',
  'NAVIGATION',
  'CREWMAN',
] as const;
export type SpacecraftCrewPosition = (typeof SPACECRAFT_CREW_POSITIONS)[number];

export interface SpacecraftCrewManagementMemberDto {
  id: number;
  name: string;
  type: SpacecraftCrewPosition;
  gender: 'MALE' | 'FEMALE' | 'DIVERSE';
  originColony: { id: number; name: string } | null;
  position: SpacecraftCrewPosition | null;
  rank: string;
  rankLabel: string;
  expertise: Array<{ position: SpacecraftCrewPosition; amount: number }>;
  promotion: { rank: string; label: string } | null;
}

export interface SpacecraftCrewManagementDto {
  foreignCrew?: Array<{ id: number; name: string; ownerId: number }>;
  positions: Array<{
    slot: SpacecraftCrewPosition;
    target: number | null;
    crew: SpacecraftCrewManagementMemberDto[];
  }>;
  unassignedCrew: SpacecraftCrewManagementMemberDto[];
}

export interface StationUplinkDto {
  system: SpacecraftRuntimeSystemStateDto;
  ownCrew: number;
  crewRequired: number;
  capacity: number;
  activationEps: number;
  epsPerTick: number;
  activationReason: string | null;
  guests: Array<{ id: number; name: string; ownerId: number; ownerName: string }>;
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
  'PLANNED' | 'MEASURED' | 'FINISHING' | 'DONE';

export type CartographyState = 'NONE' | 'PLANNABLE' | CartographyPlanStatus;

export type CartographyCompletionOutcome = 'SUCCESS' | 'INVALIDATED' | null;

export interface CartographyActionAvailabilityDto {
  available: boolean;
  reason: string | null;
}

export type CartographyTargetType = 'SYSTEM' | 'REGION';

export interface CartographyPlanDto {
  id: number | null;
  /** Chart target; `null` while no plan exists. */
  targetType: CartographyTargetType | null;
  starSystemId: number | null;
  mapRegionId: number | null;
  status: CartographyState;
  remainingFieldIds: number[];
  remainingCoordinates: Array<{ x: number; y: number }>;
  finalizationStartedAt: string | null;
  finalizationTick: number | null;
  finalizingSpacecraftId: number | null;
  completedAt: string | null;
  completionOutcome: CartographyCompletionOutcome;
  actions: {
    plan: CartographyActionAvailabilityDto;
    finalize: CartographyActionAvailabilityDto;
  };
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

export interface SpacecraftListSystemDto {
  present: boolean;
  active: boolean;
  damaged: boolean;
}

export interface SpacecraftListDto {
  hasLastCombatReport?: boolean;
  id: number;
  name: string;
  shipClassId: number;
  shipClassName?: string;
  shipClassKey?: string | null;
  isShuttle?: boolean;
  kind: 'SHIP' | 'STATION';
  stationRole: string | null;
  dockCapacity: number;
  dockedShips: number;
  dockedAtId: number | null;
  dockedAtName: string | null;
  status: string;
  specialStatus: 'STANDBY' | 'CARTOGRAPHY_FINALIZATION' | null;
  alertState: SpacecraftAlertState;
  layer: { id: number; name: string };
  location: SpaceLocationDto & {
    layerId: number;
    galaxyX?: number;
    galaxyY?: number;
  };
  hull: number;
  hullMax: number;
  shields: number;
  shieldsMax: number;
  shieldActive: boolean;
  shieldRegeneration: number;
  energy: number;
  energyMax: number;
  energyGain: number;
  energyConsumption: number;
  reactorUsage: number;
  warpdrive: number;
  warpdriveMax: number;
  warpdriveGain: number;
  reactorFuel: number;
  reactorFuelMax: number;
  battery: number;
  batteryMax: number;
  crew: number;
  crewRequired: number;
  crewMax: number;
  cargoMax: number;
  fleetId: number | null;
  fleetName: string | null;
  fleetLeaderId: number | null;
  fleetSort?: number;
  fleetIsHidden?: boolean;
  systems: Record<
    'SHORT_RANGE_SENSORS' | 'LONG_RANGE_SENSORS' | 'WEAPONS' | 'TORPEDO_BANK',
    SpacecraftListSystemDto
  > & { CLOAK?: SpacecraftListSystemDto };
}

export interface StationRepairJobDto {
  shipId: number;
  name: string;
  hull: number;
  hullMax: number;
  status: 'ACTIVE' | 'WAITING' | 'STOPPED';
  finishesAt: string | null;
  steps: number;
}

export interface StationRepairDto {
  canRepairShips: boolean;
  queue: StationRepairJobDto[];
  repairable: Array<{
    shipId: number;
    name: string;
    hull: number;
    hullMax: number;
    steps: number;
  }>;
  selfRepair: {
    needed: boolean;
    active: boolean;
    workbees: { docked: number; required: number };
  };
}

export interface StationExpansionOptionDto {
  classKey: string;
  name: string;
  role: string;
  buildTimeTicks: number;
  workbees: { docked: number; required: number; sufficient: boolean };
  location: {
    rule: 'EVERYWHERE' | 'OVER_SYSTEM' | 'INSIDE_SYSTEM' | 'OUTSIDE_SYSTEM';
    allowed: boolean;
  };
  limit: { maximum: number | null; current: number; reached: boolean };
  modules: Array<{
    commodityId: number;
    name: string;
    level: number | null;
    stored: number;
    required: number;
    sufficient: boolean;
  }>;
  canStart: boolean;
}

export interface SpacecraftDetailDto {
  /** Current free shield gain when regeneration is eligible and due. */
  shieldRegeneration?: number;
  hasLastCombatReport?: boolean;
  id: number;
  name: string;
  shipClassId: number;
  shipClassName?: string;
  shipClassKey?: string | null;
  isShuttle?: boolean;
  kind?: 'SHIP' | 'STATION';
  stationRole?: string | null;
  dockCapacity?: number;
  /** Station switch: the tick reloads the backup battery from produced EPS. */
  reloadBattery?: boolean;
  dockedAtId?: number | null;
  dockedAtName?: string | null;
  dockedShips?: Array<{
    id: number;
    name: string;
    shipClassId: number;
    shipClassName?: string;
    hull: number;
    hullMax: number;
  }>;
  constructionTicksRemaining?: number;
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
  tractor?: {
    heldBy: { id: number; name: string } | null;
    /** The ship this spacecraft holds with its own tractor beam. */
    holding: { id: number; name: string } | null;
    canEscape: boolean;
  };
  location: SpaceLocationDto;
  region?: {
    id: number;
    name: string;
    description: string | null;
  } | null;
  adminRegion?: { key: string; name: string } | null;
  navigationBounds?: { minX: number; maxX: number; minY: number; maxY: number };
  locationLabel?: string;
  moduleCount?: number;
  moduleCategories?: string[];
  fleetId?: number | null;
  fleetName?: string | null;
  fleetLeaderId?: number | null;
  fleetMembers?: Array<{ id: number; name: string }>;
  /** Class key of the fleet's flagship; drives the map cursor of all members. */
  fleetFlagshipClassKey?: string | null;
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
  /** Operational long-range sensor radius; omitted without map-sharing permission. */
  sensorRange?: number;
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
  buoys?: SpacecraftBuoyDto[];
}

export interface SpacecraftBuoyDto {
  id: number;
  text: string;
  ownerId: number;
  ownerName: string;
  createdAt: string;
}

/** Own buoy in the buoy list; `sector` follows STU `getSectorString`. */
export interface SpacecraftOwnBuoyDto extends SpacecraftBuoyDto {
  sector: string;
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
  /** STU `getBySpacecraftIdUntil`: non-private entries up to the scan. */
  logbook: SpacecraftLogbookEntryDto[];
  /** STU `scancrew`: read-only crew by position. */
  crewPositions: Array<{
    slot: SpacecraftCrewPosition;
    target: number | null;
    crew: Array<{ id: number; name: string; rankLabel: string; ownerName: string | null }>;
  }>;
}

export interface SpacecraftLogbookEntryDto {
  id: number;
  body: string;
  createdAt: string;
  editedAt: string | null;
}

/** STU `getGroupedLogbooksForProfile`: one group per spacecraft. */
export interface ProfileLogbookDto {
  spacecraftId: number;
  name: string;
  shipClassName: string | null;
  /** Null on the own profile; otherwise the visitor's scan time. */
  scannedAt: string | null;
  entries: SpacecraftLogbookEntryDto[];
}

export interface SpacecraftNearbyTargetDto {
  /** Still cloaked, but this contact is visible to its owner or a fresh scan. */
  cloaked?: boolean;
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
  fleetId?: number | null;
  isFleetLeader?: boolean;
  kind?: 'SHIP' | 'STATION';
  /** STU hasLogBook: the target has readable logbook entries. */
  hasLogBook?: boolean;
  /** STU getRPGModuleState: an RPG transponder is assigned. */
  rpgActive?: boolean;
  /** The ship is held by a tractor beam (and cannot fly on its own). */
  tractored?: boolean;
  takeover?: SpacecraftTakeoverDto | null;
  actions: {
    dock?: boolean;
    attack: boolean;
    attackReason?: string | null;
    scan: boolean;
    intercept: boolean;
    contact: boolean;
    transfer: boolean;
    energyTransfer: boolean;
    tractor: boolean;
    boarding: boolean;
    takeover?: boolean;
  };
}

/** One fleet ship in a ship-by-ship (un)docking run, as in STU's per-ship messages. */
export interface SpacecraftDockShipResultDto {
  shipId: number;
  name: string;
  /** `aborted`: missing EPS or full slots stopped the run at this ship. */
  status: 'docked' | 'undocked' | 'skipped' | 'aborted';
  reason: string | null;
}

export interface SpacecraftDockResultDto {
  message: string;
  /** Ships whose docking state changed. */
  shipIds: number[];
  /** Fleet actions only: result per ship in fleet order. */
  ships?: SpacecraftDockShipResultDto[];
}

export type DockingPrivilegeTargetType = 'USER' | 'ALLIANCE' | 'FACTION' | 'SHIP';
export type DockingPrivilegeMode = 'ALLOW' | 'DENY';

export interface DockingPrivilegeDto {
  id: number;
  targetType: DockingPrivilegeTargetType;
  targetId: number;
  targetName: string;
  mode: DockingPrivilegeMode;
}

export interface DockingPrivilegesDto {
  privileges: DockingPrivilegeDto[];
  /** Notices about foreign docking arrive already read. */
  autoRead: boolean;
}

export const WORMHOLE_RESTRICTION_TARGET_TYPES = ['USER', 'ALLIANCE', 'FACTION', 'SHIP'] as const;
export const WORMHOLE_RESTRICTION_MODES = ['ALLOW', 'DENY'] as const;
export type WormholeRestrictionTargetType = DockingPrivilegeTargetType;
export type WormholeRestrictionMode = DockingPrivilegeMode;

export interface CreateWormholeRestrictionDto {
  wormholeId: number;
  targetType: WormholeRestrictionTargetType;
  targetId: number;
  mode: WormholeRestrictionMode;
}

export interface WormholeRestrictionDto extends Omit<CreateWormholeRestrictionDto, 'wormholeId'> {
  id: number;
}

export interface StationWormholeRestrictionsDto {
  wormholes: Array<{ id: number; name: string | null; restrictions: WormholeRestrictionDto[] }>;
}

export interface SpacecraftWormholePassageOptionDto {
  id: number;
  name: string | null;
  targetLayer: { id: number; name: string };
}

export interface SpacecraftWormholePassageResultDto {
  wormholeId: number;
  direction: 'ENTRY' | 'EXIT';
  shipIds: number[];
  locationId: number;
}

/** STU `GameEnum::CREW_PER_FLEET`: summed buildplan crew of all members. */
export const CREW_PER_FLEET = 100;

/** Systems the fleet leader can switch for every member (STU `isfleet`). */
export const FLEET_SWITCHABLE_SYSTEM_KEYS = [
  'SHORT_RANGE_SENSORS',
  'SHIELDS',
  'WEAPONS',
  'TORPEDO_BANK',
  'CLOAK',
  'WARPDRIVE',
] as const satisfies readonly SpacecraftRuntimeSystemKey[];

export type FleetSwitchableSystemKey =
  (typeof FLEET_SWITCHABLE_SYSTEM_KEYS)[number];

/** Per-ship outcome of a fleet system command; one ship never blocks another. */
export interface FleetSystemToggleResultDto {
  systemKey: FleetSwitchableSystemKey;
  active: boolean;
  applied: Array<{ shipId: number; shipName: string }>;
  failed: Array<{ shipId: number; shipName: string; reason: string }>;
}

/** Fleet-wide colony orbit order (STU defend/block colony). */
export type SpacecraftOrbitOrderMode = 'DEFEND' | 'BLOCKADE';

export interface SpacecraftOrbitOrderDto {
  colonyId: number;
  fleetId: number;
  mode: SpacecraftOrbitOrderMode;
}

/** Server-computed availability of one orbit order action with its reason. */
export interface SpacecraftOrbitOrderActionDto {
  available: boolean;
  reason: string | null;
}

/** Fleet-wide orbit order as seen from one ship, with its allowed actions. */
export interface SpacecraftOrbitOrderViewDto {
  /** Current order of the ship's fleet, at any colony. */
  order: (SpacecraftOrbitOrderDto & { colonyName: string }) | null;
  defend: SpacecraftOrbitOrderActionDto;
  blockade: SpacecraftOrbitOrderActionDto;
  stop: SpacecraftOrbitOrderActionDto;
}

export interface SpacecraftOrbitOrderResultDto {
  order: SpacecraftOrbitOrderDto;
  message: string;
}

export interface SpacecraftOrbitOrderStopResultDto {
  cleared: boolean;
  order: SpacecraftOrbitOrderDto | null;
  message: string;
}

export interface SpacecraftFieldContextDto {
  coordinates: { x: number; y: number };
  wormholePassages: SpacecraftWormholePassageOptionDto[];
  region?: {
    id: number;
    name: string;
    description: string | null;
  } | null;
  adminRegion?: { key: string; name: string } | null;
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
    classId?: number | null;
    isOwn: boolean;
    canLand: boolean;
    canSurfaceScan: boolean;
    canAttack?: boolean;
    attackReason?: string | null;
  } | null;
  runtimeSystems?: SpacecraftRuntimeSystemsDto;
  /** Set in a colony orbit or while the fleet holds an orbit order. */
  orbitOrder?: SpacecraftOrbitOrderViewDto | null;
  construction?: {
    station: { id: number; name: string; isOwn: boolean } | null;
    canBuild: boolean;
  };
  buoys?: SpacecraftBuoyDto[];
  anomalies?: AnomalyViewDto[];
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
      isColonizable: boolean;
      isAbandoned: boolean;
    } | null;
  };
}

/** Neutral escape pod in the NBS; offers no regular ship actions. */
export interface SpacecraftNearbyEscapePodDto {
  id: number;
  targetType: 'ESCAPE_POD';
  originShipName: string;
  occupantCount: number;
  presentationKey: string;
  displayName: string;
  icon: string | null;
  /** The viewer can salvage own crew from this pod right now. */
  canSalvage?: boolean;
}

/** Fleet header of the grouped NBS (STU FleetNfsItem); counts only visible ships. */
export interface SpacecraftNearbyFleetDto {
  id: number;
  name: string;
  leadShipId: number;
  username: string | null;
  isOwn: boolean;
  visibleShips: number;
  defending: boolean;
  blocking: boolean;
  canJoin: boolean;
  /** STU B_DOCK_FLEET: the viewing spacecraft is an own station and the fleet is own. */
  canDockFleet: boolean;
}

export interface SpacecraftNearbyDto {
  tachyonScanExpiresAt?: number | null;
  /** STU CLOAK_NBS: foreign cloaked ships are present but not revealed. */
  cloakedShipsHint?: boolean;
  /** STU order: sort DESC, id DESC. Ships reference these via `fleetId`. */
  fleets?: SpacecraftNearbyFleetDto[];
  actionsAvailable: boolean;
  hyperdriveActive: boolean;
  ships: SpacecraftNearbyTargetDto[];
  escapePods: SpacecraftNearbyEscapePodDto[];
  wrecks: Array<{
    id: number;
    hull: number;
    cargo: Array<{ commodityId: number; amount: number }>;
    modules: Array<{ commodityId: number; amount: number }>;
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
  isPrivate: boolean;
  editedAt: string | null;
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

export interface SpacecraftSalvagePodsResultDto {
  salvaged: number;
  /** Own crew that stays in the pod because the ship is full. */
  remaining: number;
  /** Foreign crew transferred to accessible trade posts. */
  foreign: number;
  /** Source ship EPS after the action. */
  energy: number;
  message: string;
}

/** One escape pod holding crew of the viewer ("Verschollene Crew"). */
export interface LostCrewPodDto {
  podId: number;
  originShipName: string;
  crewCount: number;
  displayName: string;
  icon: string | null;
  location: {
    scope: 'SYSTEM' | 'GALAXY';
    x: number;
    y: number;
    systemId?: number;
    layerId?: number;
  } | null;
}

export interface LostCrewTradePostDto {
  tradePostId: number;
  name: string;
  crewCount: number;
  location: LostCrewPodDto['location'];
}

export interface LostCrewShipDto {
  crewId: number;
  name: string;
  shipId: number;
  shipName: string;
}

export interface SpacecraftEpsTransferResultDto {
  transferred: number;
  requested: number;
  /** Source ship EPS after the transfer. */
  energy: number;
  message: string;
}

export interface SpacecraftReactorTransferTargetDto {
  shipId: number;
  name: string;
  reactorFuel: number;
  reactorFuelMax: number;
}

export interface SpacecraftReactorTransferRequestDto {
  transfers: Array<{ targetShipId: number; amount: number }>;
}

export interface SpacecraftReactorTransferResultDto {
  transferred: number;
  reactorFuel: number;
  message: string;
}

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
export * from './movement-result.js';

/** Potential disassembly returns before the colony storage limit is applied. */
export interface ShipDisassemblyReturns {
  reactorFuel: Array<{ commodityId: number; amount: number }>;
  torpedoes: Array<{ commodityId: number; amount: number }>;
  /** Cargo destroyed with the ship (STU `SpacecraftRemover`). */
  lostCargo: Array<{ commodityId: number; amount: number }>;
}

export interface SpacecraftCargoDisposeRequestDto {
  items: Array<{ commodityId: number; amount: number }>;
}

export interface SpacecraftCargoDisposeResultDto {
  messages: string[];
  cargo: Array<{
    id: number;
    commodityId: number;
    amount: number;
    commodityName: string;
  }>;
  cargoUsed: number;
}

export interface NavicomputerDestinationDto {
  layerId: number;
  x: number;
  y: number;
}

export interface NavicomputerLayerDto {
  id: number;
  name: string;
  width: number;
  height: number;
}

export interface NavicomputerJumpResultDto {
  shipIds: number[];
  locationId: number;
  cooldownUntil: number;
}

export interface FieldMiningResourceDto {
  commodityId: number;
  rate: number;
}

export interface ResourceCollectionDto {
  state: 'IDLE' | 'GATHER_RESOURCES';
  selectedCommodityId: number | null;
  options: Array<FieldMiningResourceDto & { name: string }>;
  freeCargo: number;
  activationEps: number;
  epsPerTick: number;
  blockReason: string | null;
}

export interface ResourceConversionDto {
  active: boolean;
  selectedCommodityId: number | null;
  options: Array<{
    sourceCommodityId: number;
    targetCommodityId: number;
    sourceName: string;
    targetName: string;
    inputAmount: number;
    outputAmount: number;
    mode: 'COMPRESSOR' | 'SUBLIMATOR';
    producible: boolean;
  }>;
  activationEps: number;
  epsPerTick: number;
  blockReason: string | null;
}

export interface ShuttleManagementDto {
  isShuttle: boolean;
  capacity: number;
  storedCount: number;
  blockReason: string | null;
  stored: Array<{
    commodityId: number;
    name: string;
    amount: number;
    energyCost: number;
    crewRequired: number;
    blockReason: string | null;
  }>;
  nearby: Array<{ id: number; name: string; blockReason: string | null }>;
  colonies: Array<{ id: number; name: string; blockReason: string | null }>;
}

export interface StationScrappingDto {
  confirmationCode: string;
  active: boolean;
  immediate: boolean;
  remainingTicks: number;
  requiredWorkbees: number;
  dockedWorkbees: number;
  blockReason: string | null;
}

export interface SignatureMaskChoiceDto {
  shipClassId: number;
  name: string;
  driveLevel: number;
  epsCost: number;
}
export interface SignatureMaskDto {
  energy: number;
  blockReason: string | null;
  choices: SignatureMaskChoiceDto[];
  active: { shipClassId: number; name: string; expiresAt: string } | null;
}

export interface RpgSceneSpacecraftDto {
  id: number;
  name: string;
  shipClassId: number;
  plotId: number | null;
  plotTitle: string | null;
  hidden: boolean;
  location: SpaceLocationDto | null;
}
export interface RpgScenePlotDto { id: number; title: string; }
export type SpacecraftVisibilityPayload =
  | { type: 'REMOVED'; shipId: number }
  | { type: 'STATE'; shipId: number; state: SharedLivePositionDto };

export { getShieldRegenerationRate, SHIELD_REGENERATION_INTERVAL_MS, type ShieldRegenerationInput } from './shield-regeneration.js';

/** STU `ShowSensorScan`: a sensor array scans one field within its long-range sensor range. */
export interface StationSensorScanDto {
  energyCost: number;
  energy: number;
  field: {
    scope: 'GALAXY' | 'SYSTEM';
    x: number;
    y: number;
    fieldType: { id: number; name: string };
    effects: string[];
    celestialObject: { name: string | null; classId: number | null; objectType: number } | null;
    starSystem: { id: number; name: string } | null;
  };
  ships: Array<{
    id: number;
    name: string;
    shipClassId: number;
    kind: 'SHIP' | 'STATION';
    ownerName: string | null;
    isOwn: boolean;
  }>;
  signatures: Array<{
    id: number;
    shipClassName: string | null;
    spacecraftName: string | null;
    fromDirection: 'NORTH' | 'EAST' | 'SOUTH' | 'WEST' | null;
    toDirection: 'NORTH' | 'EAST' | 'SOUTH' | 'WEST' | null;
    isCloaked: boolean;
    createdAt: string;
  }>;
  fadedSignatures: { uncloaked: number; cloaked: number };
}
