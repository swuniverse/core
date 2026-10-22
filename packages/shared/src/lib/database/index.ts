export type CommodityLocationType = 'COLONY' | 'SPACECRAFT' | 'TORPEDO_STORAGE';

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
