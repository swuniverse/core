import type { StarmapLayerDto } from '../starmap/index.js';

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
