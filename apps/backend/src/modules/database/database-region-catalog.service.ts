import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  fieldEffectDefinition,
  knownFieldEffects,
  LayerKnowledgeStatus,
  type DatabaseRegionDetailDto,
  type DatabaseRegionEntryDto,
} from '@swuniverse/shared';
import { Between, In, Repository } from 'typeorm';
import { ExplorationState } from '../starmap/entities/exploration-state.entity';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { LayerKnowledge } from '../starmap/entities/layer-knowledge.entity';
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
    @InjectRepository(GalaxyField)
    private readonly fieldRepo: Repository<GalaxyField>,
    @InjectRepository(ExplorationState)
    private readonly explorationRepo: Repository<ExplorationState>,
    @InjectRepository(LayerKnowledge)
    private readonly layerKnowledgeRepo: Repository<LayerKnowledge>,
  ) {}

  /**
   * STU `regioninfo.twig`: the region's fields with one field of margin. Region
   * fields are known through the cartography; margin fields only when explored.
   */
  async getRegion(userId: number, regionId: number): Promise<DatabaseRegionDetailDto> {
    const [region, discovered] = await Promise.all([
      this.regionRepo.findOne({ where: { id: regionId }, relations: ['layer'] }),
      this.discoveryRepo.exists({ where: { userId, mapRegionId: regionId } }),
    ]);
    if (!region || !discovered) throw new NotFoundException('Region nicht katalogisiert');

    const regionFields = await this.fieldRepo.find({ where: { regionId }, select: ['cx', 'cy'] });
    if (regionFields.length === 0) {
      return { regionId, name: region.name, description: region.description, layerName: region.layer?.name ?? null, bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 }, fields: [] };
    }
    const xs = regionFields.map((field) => field.cx);
    const ys = regionFields.map((field) => field.cy);
    const bounds = {
      minX: Math.max(1, Math.min(...xs) - 1),
      maxX: Math.min(region.layer?.width ?? Infinity, Math.max(...xs) + 1),
      minY: Math.max(1, Math.min(...ys) - 1),
      maxY: Math.min(region.layer?.height ?? Infinity, Math.max(...ys) + 1),
    };
    const area = {
      layerId: region.layerId,
      cx: Between(bounds.minX, bounds.maxX),
      cy: Between(bounds.minY, bounds.maxY),
    };
    const [fields, explored, fullyExplored] = await Promise.all([
      this.fieldRepo.find({
        where: area,
        relations: ['fieldType', 'starSystem'],
        order: { cy: 'ASC', cx: 'ASC' },
      }),
      this.explorationRepo.find({ where: { userId, ...area }, select: ['cx', 'cy'] }),
      this.layerKnowledgeRepo.exists({
        where: { userId, layerId: region.layerId, status: LayerKnowledgeStatus.EXPLORED },
      }),
    ]);
    const exploredCells = new Set(explored.map((state) => `${state.cx}:${state.cy}`));

    return {
      regionId,
      name: region.name,
      description: region.description,
      layerName: region.layer?.name ?? null,
      bounds,
      fields: fields
        .filter(
          (field) =>
            field.regionId === regionId || fullyExplored || exploredCells.has(`${field.cx}:${field.cy}`),
        )
        .map((field) => ({
          cx: field.cx,
          cy: field.cy,
          inRegion: field.regionId === regionId,
          fieldTypeId: field.fieldTypeId,
          fieldTypeName: field.fieldType?.name ?? '',
          effectTexts: knownFieldEffects([
            ...new Set([...(field.effects ?? []), ...(field.fieldType?.effects ?? [])]),
          ]).map((effect) => fieldEffectDefinition(effect).description),
          starSystemName: field.starSystem?.name ?? null,
        })),
    };
  }

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
