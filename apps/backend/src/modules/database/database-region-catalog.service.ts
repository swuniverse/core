import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { DatabaseRegionEntryDto } from '@swuniverse/shared';
import { In, Repository } from 'typeorm';
import { MapRegion } from '../starmap/entities/map-region.entity';
import { RegionDiscovery } from '../starmap/entities/region-discovery.entity';

/**
 * Database category "Regionen" (STU `DatabaseCategoryTypeEnum::REGION`): a
 * region entry exists only through a completed region cartography (tmw-K8b2).
 */
@Injectable()
export class DatabaseRegionCatalogService {
  constructor(
    @InjectRepository(MapRegion)
    private readonly regionRepo: Repository<MapRegion>,
    @InjectRepository(RegionDiscovery)
    private readonly discoveryRepo: Repository<RegionDiscovery>,
  ) {}

  async getRegions(userId: number, layerIds: number[]) {
    const [regions, discoveries] = await Promise.all([
      layerIds.length
        ? this.regionRepo.find({
            where: { layerId: In(layerIds) },
            relations: ['layer'],
            order: { layerId: 'ASC', name: 'ASC', id: 'ASC' },
          })
        : Promise.resolve([]),
      this.discoveryRepo.find({ where: { userId } }),
    ]);
    const discoveredAt = new Map(
      discoveries.map((discovery) => [discovery.mapRegionId, discovery.discoveredAt]),
    );
    const entries = regions.map((region): DatabaseRegionEntryDto => {
      const at = discoveredAt.get(region.id);
      return at
        ? {
            regionId: region.id,
            discovered: true,
            name: region.name,
            description: region.description,
            layerId: region.layerId,
            layerName: region.layer?.name ?? null,
            discoveredAt: at.toISOString(),
          }
        : {
            regionId: region.id,
            discovered: false,
            name: null,
            description: null,
            layerId: null,
            layerName: null,
            discoveredAt: null,
          };
    });
    return {
      discovered: entries.filter((entry) => entry.discovered).length,
      total: entries.length,
      entries,
    };
  }
}
