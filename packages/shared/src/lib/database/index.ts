import type { AllianceRefDto } from '../alliance/index.js';
import type { Faction } from '../auth/index.js';
import type { SpaceLocationDto, StarmapLayerDto } from '../starmap/index.js';

export type DatabaseLayerChoiceDto = Pick<StarmapLayerDto, 'id' | 'name'>;

export interface DatabaseTypeCatalogDto<Entry> {
  layers: DatabaseLayerChoiceDto[];
  discovered: number;
  total: number;
  entries: Entry[];
}

export interface DatabaseSystemTypeEntryDto {
  systemTypeId: number;
  discovered: boolean;
  name: string | null;
  rarity: string | null;
  discoveredAt: string | null;
}

export interface DatabasePlanetTypeEntryDto {
  key: string;
  classId: number;
  objectTypeId: number;
  imageName: string;
  discovered: boolean;
  name: string | null;
  description: string | null;
  objectType: string | null;
  discoveredAt: string | null;
}

/** STU `regioninfo`: undiscovered regions stay masked as `???`. */
export interface DatabaseRegionEntryDto {
  regionId: number;
  discovered: boolean;
  name: string | null;
  description: string | null;
  layerId: number | null;
  layerName: string | null;
  discoveredAt: string | null;
}

export type DatabaseSystemTypesDto = DatabaseTypeCatalogDto<DatabaseSystemTypeEntryDto>;
export type DatabaseRegionsDto = DatabaseTypeCatalogDto<DatabaseRegionEntryDto>;
export type DatabasePlanetTypesDto = DatabaseTypeCatalogDto<DatabasePlanetTypeEntryDto>;

export interface ProfileFriendDto {
  id: number;
  name: string;
  avatar: string | null;
}

export type CommodityLocationType =
  | 'COLONY'
  | 'SPACECRAFT'
  | 'TORPEDO_STORAGE'
  | 'TRADE_ACCOUNT'
  | 'TRADE_OFFER';

export interface CommodityLocationDto {
  type: CommodityLocationType;
  id: number;
  name: string;
  location: string | null;
  amount: number;
}

export interface CommodityLocationsOverviewDto {
  commodityId: number;
  commodityName: string;
  total: number;
  locations: CommodityLocationDto[];
}

export interface CommodityOverviewEntryDto {
  commodityId: number;
  commodityName: string;
  total: number;
}

/** Database categories whose completion grants an award (regions follow later). */
export const DATABASE_AWARD_CATEGORIES = [
  'SHIP_HULLS',
  'PLANET_TYPES',
  'SYSTEM_TYPES',
  'SYSTEMS',
] as const;
export type DatabaseAwardCategory = (typeof DATABASE_AWARD_CATEGORIES)[number];

/** Progress of one category (per layer for star systems) towards its award. */
export interface DatabaseCategoryProgressDto {
  category: DatabaseAwardCategory;
  layerId: number | null;
  layerName: string | null;
  discovered: number;
  total: number;
  completed: boolean;
  awardKey: string | null;
  awarded: boolean;
}

/** Payload of `WsEventType.AWARD_GRANTED`. */
export interface AwardGrantedEventDto {
  awardKey: string;
  description: string;
}

/** Payload of `WsEventType.DATABASE_ENTRY_DISCOVERED` (STU achievement notice). */
export interface DatabaseEntryDiscoveredEventDto {
  category: DatabaseAwardCategory;
  name: string;
  prestige: number;
  /** "Neuer Datenbankeintrag: <Name> (+x Prestige)" */
  text: string;
}

/** One entry of the ship or station hull catalogue; undiscovered hulls stay anonymous (STU `???`). */
export interface DatabaseHullEntryDto {
  id: number;
  key: string;
  discovered: boolean;
  name: string | null;
  discoveredAt: string | null;
}

export interface DatabaseHullCatalogDto {
  discovered: number;
  total: number;
  entries: DatabaseHullEntryDto[];
}

export interface DatabaseHullModuleRangeDto {
  /** Shipyard module type, e.g. `HULL`, `ENERGY_WEAPON`. */
  type: string;
  minLevel: number;
  maxLevel: number;
  mandatory: boolean;
}

/**
 * STU `shiprump.twig` as far as SWU knows the values. Not modelled in SWU and therefore
 * absent: beam factor, tractor mass, tractor payload, phaser volleys, torpedo level and volleys.
 */
export interface DatabaseHullDetailDto {
  id: number;
  key: string;
  kind: 'SHIP' | 'STATION';
  name: string;
  factionName: string | null;
  category: string;
  role: string;
  moduleLevel: number | null;
  modules: DatabaseHullModuleRangeDto[];
  flightEnergyCost: number;
  cargoCapacity: number;
  sensorRange: number;
  torpedoCapacity: number;
  crewMin: number;
  crewMax: number;
  epsCapacity: number;
  hull: number;
  shield: number;
  /** Station hulls only. */
  requiredWorkbees: number | null;
  buildEnergyCost: number | null;
  buildCosts: Array<{ commodityId: number; commodityName: string; amount: number }>;
  buildTimeSeconds: number;
}

/** STU `planettype.twig`: a discovered planet type with example surfaces per landing zone. */
export interface DatabasePlanetTypeDetailDto {
  key: string;
  classId: number;
  objectTypeId: number;
  imageName: string;
  name: string;
  description: string | null;
  objectType: string;
  /** Example colony surfaces (tile codes, row by row) for each colonizable landing zone. */
  zones: Array<{ label: string; surface: string[][] }>;
}

/** STU `databaseEntry.twig` for star system types; SWU has no description text, only catalogue values. */
export interface DatabaseSystemTypeDetailDto {
  systemTypeId: number;
  name: string;
  rarity: string;
  isBinary: boolean;
  gridSize: { min: number; max: number };
  planets: { min: number; max: number };
  asteroids: { min: number; max: number };
  moonChance: number;
}

export interface DatabaseRegionMapFieldDto {
  cx: number;
  cy: number;
  inRegion: boolean;
  fieldTypeId: number;
  fieldTypeName: string;
  effectTexts: string[];
  starSystemName: string | null;
}

/** STU `regioninfo.twig`: map of a discovered region (ADR-0009) with one field of margin. */
export interface DatabaseRegionDetailDto {
  regionId: number;
  name: string;
  description: string | null;
  layerName: string | null;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  /** Region fields, plus margin fields the viewer explored; hidden cells are omitted. */
  fields: DatabaseRegionMapFieldDto[];
}

/** STU `UserList` sort fields. */
export const DATABASE_SETTLER_SORT_FIELDS = ['id', 'faction', 'alliance'] as const;
export type DatabaseSettlerSortField = (typeof DATABASE_SETTLER_SORT_FIELDS)[number];
export type DatabaseSettlerSortOrder = 'asc' | 'desc';

/** STU `LIST_LIMIT`. */
export const DATABASE_SETTLER_PAGE_SIZE = 25;

export interface DatabaseSettlerListEntryDto {
  id: number;
  username: string;
  displayName: string | null;
  avatar: string | null;
  faction: Faction | null;
  factionName: string;
  alliance: AllianceRefDto | null;
}

/** STU `userList.twig`: one page, or every hit of a search. */
export interface DatabaseSettlerListDto {
  entries: DatabaseSettlerListEntryDto[];
  page: number;
  pageCount: number;
  total: number;
}

/** STU `crewManagement.twig`: where a crew member of the player serves. */
export type DatabaseCrewLocationType =
  | 'SHIP'
  | 'STATION'
  | 'COLONY'
  | 'TRADE_POST'
  | 'ESCAPE_POD';

export interface DatabaseCrewLocationDto {
  type: DatabaseCrewLocationType;
  /** Spacecraft, colony, trade post or escape pod id. */
  id: number;
  name: string;
  /** The player owns the ship, station or colony; foreign hosts are not linkable. */
  own: boolean;
  shipClassId: number | null;
  shipClassKey: string | null;
  /** Sector of ships, stations, trade posts and pods; null on colonies. */
  sector: SpaceLocationDto | null;
}

export interface DatabaseCrewMemberDto {
  id: number;
  name: string;
  rank: string;
  rankLabel: string;
  /** Expertise the rank needs, for sorting by rank. */
  rankExpertise: number;
  highestExpertise: number;
  skills: Array<{ position: string; positionLabel: string; expertise: number }>;
  /** Only on ships and stations; never in pods. */
  position: string | null;
  positionLabel: string | null;
  location: DatabaseCrewLocationDto | null;
  inEscapePod: boolean;
  onForeignStation: boolean;
  /** Foreign station without a post: trade post crew or no position. */
  onForeignStationInactive: boolean;
}

export interface DatabaseCrewDto {
  members: DatabaseCrewMemberDto[];
  ranks: Array<{ rank: string; label: string; expertise: number }>;
  positions: Array<{ position: string; label: string }>;
}

export interface DatabaseCrewDismissResultDto {
  dismissed: number;
  /** Requested ids that are not the player's crew (foreign or unknown). */
  skippedIds: number[];
  removedEscapePods: number;
}
