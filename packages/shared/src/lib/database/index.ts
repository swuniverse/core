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

export type DatabaseSystemTypesDto = DatabaseTypeCatalogDto<DatabaseSystemTypeEntryDto>;
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
