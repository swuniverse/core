import type { CommodityLocationDto } from '@swuniverse/shared';

export const COMMODITY_LOCATION_SOURCES = Symbol('COMMODITY_LOCATION_SOURCES');

export interface CommodityLocationSource {
  findLocations(userId: number, commodityId: number): Promise<CommodityLocationDto[]>;
}
