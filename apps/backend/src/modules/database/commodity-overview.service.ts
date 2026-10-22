import { Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import type {
  CommodityLocationDto,
  CommodityLocationsOverviewDto,
  CommodityOverviewEntryDto,
} from '@swuniverse/shared';
import { GameDataService } from '../game-data/game-data.service';
import {
  COMMODITY_LOCATION_SOURCES,
  type CommodityLocationSource,
} from './commodity-location-source';

@Injectable()
export class CommodityOverviewService {
  constructor(
    private readonly gameData: GameDataService,
    @Optional()
    @Inject(COMMODITY_LOCATION_SOURCES)
    private readonly sources: CommodityLocationSource[] = [],
  ) {}

  async getOverview(userId: number): Promise<CommodityOverviewEntryDto[]> {
    const commodities = this.gameData
      .getAllCommodities()
      .filter((commodity) => commodity.visible !== false)
      .sort(
        (a, b) =>
          (a.sort ?? a.id) - (b.sort ?? b.id) ||
          a.name.localeCompare(b.name, 'de'),
      );
    const entries = await Promise.all(
      commodities.map(async (commodity) => {
        const locations = await this.findLocations(userId, commodity.id);
        return {
          commodityId: commodity.id,
          commodityName: commodity.name,
          total: this.total(locations),
        };
      }),
    );
    return entries.filter((entry) => entry.total > 0);
  }

  async getLocations(
    userId: number,
    commodityId: number,
  ): Promise<CommodityLocationsOverviewDto> {
    const commodity = this.gameData.getCommodity(commodityId);
    if (!commodity || commodity.visible === false) {
      throw new NotFoundException('Ware nicht gefunden');
    }
    const locations = (await this.findLocations(userId, commodityId))
      .filter((location) => location.amount > 0)
      .sort(
        (a, b) =>
          a.type.localeCompare(b.type) ||
          a.name.localeCompare(b.name, 'de') ||
          a.id - b.id,
      );
    return {
      commodityId,
      commodityName: commodity.name,
      total: this.total(locations),
      locations,
    };
  }

  private async findLocations(
    userId: number,
    commodityId: number,
  ): Promise<CommodityLocationDto[]> {
    return (
      await Promise.all(
        this.sources.map((source) => source.findLocations(userId, commodityId)),
      )
    ).flat();
  }

  private total(locations: CommodityLocationDto[]): number {
    return locations.reduce(
      (sum, location) => sum + Math.max(0, location.amount),
      0,
    );
  }
}
