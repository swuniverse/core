import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { Layer } from './entities/layer.entity';
import { GalaxyField } from './entities/galaxy-field.entity';
import { SystemField } from './entities/system-field.entity';
import { StarSystem } from './entities/star-system.entity';
import { HyperspaceRoute } from './entities/hyperspace-route.entity';
import { HyperspaceRouteSegment } from './entities/hyperspace-route-segment.entity';
import { Colony } from '../colony/entities/colony.entity';
import type { ExplorationService } from './exploration.service';
import { ExplorationLevel } from './entities/exploration-state.entity';
import { SYSTEM_TYPE_BY_ID } from './starmap-system-types';
import type {
  StarmapCelestialObjectDto,
  StarmapExploredGalaxyFieldDto,
  StarmapExploredSectorDto,
  HyperspaceRouteDto,
  StarmapFieldTypeDto,
  StarmapGalaxyFieldDto,
  StarmapSectorDto,
  StarmapSystemFieldDto,
  StarmapSystemGridDto,
  StarmapSystemListItemDto,
} from '@swuniverse/shared';

@Injectable()
export class StarmapQueryService {
  constructor(
    @InjectRepository(Layer)
    private readonly layerRepo: Repository<Layer>,
    @InjectRepository(GalaxyField)
    private readonly galaxyFieldRepo: Repository<GalaxyField>,
    @InjectRepository(SystemField)
    private readonly systemFieldRepo: Repository<SystemField>,
    @InjectRepository(StarSystem)
    private readonly systemRepo: Repository<StarSystem>,
    @InjectRepository(HyperspaceRoute)
    private readonly hyperspaceRouteRepo: Repository<HyperspaceRoute>,
    @InjectRepository(HyperspaceRouteSegment)
    private readonly hyperspaceRouteSegmentRepo: Repository<HyperspaceRouteSegment>,
    @InjectRepository(Colony)
    private readonly colonyRepo: Repository<Colony>,
  ) {}

  async getGalaxySectors(layerId: number): Promise<StarmapSectorDto[]> {
    const layer = await this.layerRepo.findOneBy({ id: layerId });
    if (!layer) throw new NotFoundException('Layer not found');

    const sectorColumns = Math.ceil(layer.width / layer.sectorSize);
    const sectorRows = Math.ceil(layer.height / layer.sectorSize);
    const sectors: StarmapSectorDto[] = [];

    for (let sectorY = 0; sectorY < sectorRows; sectorY++) {
      for (let sectorX = 0; sectorX < sectorColumns; sectorX++) {
        const minX = sectorX * layer.sectorSize + 1;
        const maxX = Math.min((sectorX + 1) * layer.sectorSize, layer.width);
        const minY = sectorY * layer.sectorSize + 1;
        const maxY = Math.min((sectorY + 1) * layer.sectorSize, layer.height);

        const fields = await this.galaxyFieldRepo
          .createQueryBuilder('field')
          .where('field.layerId = :layerId', { layerId })
          .andWhere('field.cx BETWEEN :minX AND :maxX', { minX, maxX })
          .andWhere('field.cy BETWEEN :minY AND :maxY', { minY, maxY })
          .getMany();

        sectors.push({
          layerId,
          sectorX,
          sectorY,
          minX,
          minY,
          maxX,
          maxY,
          fieldCount: fields.length,
          systemCount: fields.filter((field) => field.starSystemId !== null)
            .length,
        });
      }
    }

    return sectors;
  }

  async getExploredGalaxySectors(
    userId: number,
    layerId: number,
    explorationService: ExplorationService,
  ): Promise<StarmapSectorDto[]> {
    const sectors = await this.getGalaxySectors(layerId);
    const exploredFields = await explorationService.getExploredFields(
      userId,
      layerId,
    );
    const explored = new Set(
      exploredFields.map((field) => `${field.cx},${field.cy}`),
    );

    return sectors.map((sector) => {
      let exploredCount = 0;
      for (let cy = sector.minY; cy <= sector.maxY; cy++) {
        for (let cx = sector.minX; cx <= sector.maxX; cx++) {
          if (explored.has(`${cx},${cy}`)) exploredCount++;
        }
      }
      const totalCount = sector.maxX - sector.minX + 1;
      const totalFields = totalCount * (sector.maxY - sector.minY + 1);
      return {
        ...sector,
        systemCount: 0,
        exploredCount,
        totalCount: totalFields,
        explorationPercent:
          totalFields > 0 ? Math.round((exploredCount / totalFields) * 100) : 0,
        isDiscovered: exploredCount > 0,
      };
    });
  }

  async getAllLayerFields(layerId: number): Promise<StarmapGalaxyFieldDto[]> {
    const layer = await this.layerRepo.findOneBy({ id: layerId });
    if (!layer) throw new NotFoundException('Layer not found');

    const fields = await this.galaxyFieldRepo.find({
      where: { layerId },
      relations: ['fieldType', 'starSystem'],
      order: { cy: 'ASC', cx: 'ASC' },
    });

    return fields.map((field) => ({
      id: field.id,
      cx: field.cx,
      cy: field.cy,
      fieldTypeId: field.fieldTypeId,
      systemTypeId: field.systemTypeId,
      factionZone: field.factionZone,
      adminRegionKey: field.adminRegionKey,
      starSystemId: field.starSystemId,
      regionId: field.regionId,
      borderTypeId: field.borderTypeId,
      effects: field.effects,
      passableOverride: field.passableOverride,
      fieldType: this.toFieldTypeDTO(field.fieldType),
      starSystem: field.starSystem
        ? this.toSystemListItemDTO(field.starSystem)
        : null,
    }));
  }

  async getGalaxySectorFields(
    layerId: number,
    sectorX: number,
    sectorY: number,
  ): Promise<StarmapGalaxyFieldDto[]> {
    const layer = await this.layerRepo.findOneBy({ id: layerId });
    if (!layer) throw new NotFoundException('Layer not found');

    const minX = sectorX * layer.sectorSize + 1;
    const maxX = Math.min((sectorX + 1) * layer.sectorSize, layer.width);
    const minY = sectorY * layer.sectorSize + 1;
    const maxY = Math.min((sectorY + 1) * layer.sectorSize, layer.height);

    const fields = await this.galaxyFieldRepo.find({
      where: {
        layerId,
        cx: Between(minX, maxX),
        cy: Between(minY, maxY),
      },
      relations: ['fieldType', 'starSystem'],
      order: { cy: 'ASC', cx: 'ASC' },
    });

    return fields.map((field) => ({
      id: field.id,
      cx: field.cx,
      cy: field.cy,
      fieldTypeId: field.fieldTypeId,
      systemTypeId: field.systemTypeId,
      factionZone: field.factionZone,
      adminRegionKey: field.adminRegionKey,
      starSystemId: field.starSystemId,
      regionId: field.regionId,
      borderTypeId: field.borderTypeId,
      effects: field.effects,
      passableOverride: field.passableOverride,
      fieldType: this.toFieldTypeDTO(field.fieldType),
      starSystem: field.starSystem
        ? this.toSystemListItemDTO(field.starSystem)
        : null,
    }));
  }

  async getVisibleHyperspaceRoutes(
    userId: number,
    layerId: number,
    explorationService: ExplorationService,
  ): Promise<HyperspaceRouteDto[]> {
    const routes = await this.getHyperspaceRoutes(layerId);
    const exploredFields = await explorationService.getExploredFields(
      userId,
      layerId,
    );
    const visible = new Set(
      exploredFields.map((field) => `${field.cx},${field.cy}`),
    );
    return routes
      .map((route) => ({
        ...route,
        segments: route.segments.filter(
          (segment) =>
            visible.has(`${segment.fromSystem.cx},${segment.fromSystem.cy}`) &&
            visible.has(`${segment.toSystem.cx},${segment.toSystem.cy}`),
        ),
      }))
      .filter((route) => route.segments.length > 0);
  }

  async getHyperspaceRoutes(layerId: number): Promise<HyperspaceRouteDto[]> {
    const routes = await this.hyperspaceRouteRepo.find({
      where: { layerId },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    if (routes.length === 0) return [];

    const segments = await this.hyperspaceRouteSegmentRepo.find({
      where: { routeId: In(routes.map((route) => route.id)) },
      relations: ['fromSystem', 'toSystem'],
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    const segmentsByRoute = new Map<number, HyperspaceRouteSegment[]>();
    for (const segment of segments) {
      const list = segmentsByRoute.get(segment.routeId) ?? [];
      list.push(segment);
      segmentsByRoute.set(segment.routeId, list);
    }

    return routes.map((route) =>
      this.toHyperspaceRouteDTO(route, segmentsByRoute.get(route.id) ?? []),
    );
  }

  async getSystemGrid(systemId: number): Promise<StarmapSystemGridDto> {
    const targetSystem = await this.systemRepo.findOneBy({ id: systemId });
    if (!targetSystem) throw new NotFoundException('System not found');
    if (targetSystem.landmarkKey?.startsWith('atlas:')) {
      throw new BadRequestException('Map-only systems cannot be entered');
    }

    const fields = await this.systemFieldRepo.find({
      where: { starSystemId: systemId },
      relations: ['fieldType', 'celestialObject', 'starSystem'],
      order: { sy: 'ASC', sx: 'ASC' },
    });

    const system = fields[0]?.starSystem;
    if (!system) {
      throw new NotFoundException('System not found');
    }

    const colonyShields = await this.getColonyShields(systemId);

    return {
      system: this.toSystemListItemDTO(system),
      fields: fields.map((field) => this.toSystemFieldDTO(field)),
      celestialObjects: fields
        .map((field) => field.celestialObject)
        .filter(
          (object): object is NonNullable<typeof object> => object !== null,
        )
        .filter(
          (object, index, items) =>
            items.findIndex((entry) => entry.id === object.id) === index,
        )
        .map((object) => this.toCelestialObjectDTO(object)),
      colonyShields,
    };
  }

  private async getColonyShields(systemId: number) {
    const colonies = await this.colonyRepo.find({
      where: { starSystemId: systemId, isAbandoned: false },
      relations: ['changeable'],
      order: { id: 'ASC' },
    });
    return colonies
      .filter((colony) => (colony.changeable?.shields ?? 0) > 0)
      .map((colony) => ({
        colonyId: colony.id,
        systemId,
        posX: colony.posX,
        posY: colony.posY,
        shielded: true,
      }));
  }

  async getExploredLayerFields(
    userId: number,
    layerId: number,
    explorationService: ExplorationService,
  ): Promise<StarmapGalaxyFieldDto[]> {
    const [allFields, exploredStates] = await Promise.all([
      this.galaxyFieldRepo.find({
        where: { layerId },
        relations: ['fieldType', 'starSystem'],
        order: { cy: 'ASC', cx: 'ASC' },
      }),
      explorationService.getExploredFields(userId, layerId),
    ]);

    const exploredMap = new Map(
      exploredStates.map((s) => [`${s.cx},${s.cy}`, s.explorationLevel]),
    );

    return allFields
      .filter((field) => exploredMap.has(`${field.cx},${field.cy}`))
      .map((field) => {
        const level = exploredMap.get(`${field.cx},${field.cy}`)!;
        if (level === ExplorationLevel.TERRAIN) {
          return {
            id: field.id,
            cx: field.cx,
            cy: field.cy,
            fieldTypeId: field.fieldTypeId,
            systemTypeId: null,
            factionZone: field.factionZone,
            adminRegionKey: null,
            starSystemId: null,
            regionId: field.regionId,
            borderTypeId: null,
            effects: null,
            passableOverride: null,
            fieldType: this.toFieldTypeDTO(field.fieldType),
            starSystem: null,
          };
        }
        return {
          id: field.id,
          cx: field.cx,
          cy: field.cy,
          fieldTypeId: field.fieldTypeId,
          systemTypeId: field.systemTypeId,
          factionZone: field.factionZone,
          adminRegionKey: field.adminRegionKey,
          starSystemId: field.starSystemId,
          regionId: field.regionId,
          borderTypeId: field.borderTypeId,
          effects: field.effects,
          passableOverride: field.passableOverride,
          fieldType: this.toFieldTypeDTO(field.fieldType),
          starSystem: field.starSystem
            ? this.toSystemListItemDTO(field.starSystem)
            : null,
        };
      });
  }

  async getExploredSectorFields(
    userId: number,
    layerId: number,
    sectorX: number,
    sectorY: number,
    explorationService: ExplorationService,
  ): Promise<StarmapExploredSectorDto> {
    const layer = await this.layerRepo.findOneBy({ id: layerId });
    if (!layer) throw new NotFoundException('Layer not found');

    const minX = sectorX * layer.sectorSize + 1;
    const maxX = Math.min((sectorX + 1) * layer.sectorSize, layer.width);
    const minY = sectorY * layer.sectorSize + 1;
    const maxY = Math.min((sectorY + 1) * layer.sectorSize, layer.height);

    const [allFields, exploredStates] = await Promise.all([
      this.galaxyFieldRepo.find({
        where: { layerId, cx: Between(minX, maxX), cy: Between(minY, maxY) },
        relations: ['fieldType', 'starSystem'],
        order: { cy: 'ASC', cx: 'ASC' },
      }),
      explorationService.getExploredFieldsInSector(
        userId,
        layerId,
        minX,
        maxX,
        minY,
        maxY,
      ),
    ]);

    const exploredMap = new Map(
      exploredStates.map((s) => [`${s.cx},${s.cy}`, s.explorationLevel]),
    );

    const fields: StarmapExploredGalaxyFieldDto[] = [];
    let hiddenCount = 0;

    for (const field of allFields) {
      const level = exploredMap.get(`${field.cx},${field.cy}`);
      if (!level) {
        hiddenCount++;
        fields.push({
          id: field.id,
          cx: field.cx,
          cy: field.cy,
          fieldTypeId: 0,
          systemTypeId: null,
          factionZone: 'UNKNOWN',
          adminRegionKey: null,
          starSystemId: null,
          regionId: null,
          borderTypeId: null,
          effects: null,
          passableOverride: null,
          explorationLevel: 'UNKNOWN',
          fieldType: {
            id: 0,
            key: 'UNKNOWN',
            name: 'Unbekannt',
            passable: false,
            energyCost: 0,
            damage: 0,
            isSystem: false,
            colorKey: null,
            category: 'UNKNOWN',
          },
          starSystem: null,
        });
        continue;
      }

      if (level === ExplorationLevel.TERRAIN) {
        fields.push({
          id: field.id,
          cx: field.cx,
          cy: field.cy,
          fieldTypeId: field.fieldTypeId,
          systemTypeId: null,
          factionZone: field.factionZone,
          adminRegionKey: null,
          starSystemId: null,
          regionId: field.regionId,
          borderTypeId: null,
          effects: null,
          passableOverride: null,
          explorationLevel: 'TERRAIN',
          fieldType: this.toFieldTypeDTO(field.fieldType),
          starSystem: null,
        });
      } else {
        fields.push({
          id: field.id,
          cx: field.cx,
          cy: field.cy,
          fieldTypeId: field.fieldTypeId,
          systemTypeId: field.systemTypeId,
          factionZone: field.factionZone,
          adminRegionKey: field.adminRegionKey,
          starSystemId: field.starSystemId,
          regionId: field.regionId,
          borderTypeId: field.borderTypeId,
          effects: field.effects,
          passableOverride: field.passableOverride,
          explorationLevel: 'FULL',
          fieldType: this.toFieldTypeDTO(field.fieldType),
          starSystem: field.starSystem
            ? this.toSystemListItemDTO(field.starSystem)
            : null,
        });
      }
    }

    return { fields, hiddenCount };
  }

  private toHyperspaceRouteDTO(
    route: HyperspaceRoute,
    segments: HyperspaceRouteSegment[],
  ): HyperspaceRouteDto {
    return {
      id: route.id,
      layerId: route.layerId,
      key: route.key,
      name: route.name,
      color: route.color,
      sortOrder: route.sortOrder,
      segments: [...segments]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((segment) => ({
          id: segment.id,
          routeId: segment.routeId,
          sortOrder: segment.sortOrder,
          fromSystem: this.toSystemListItemDTO(segment.fromSystem),
          toSystem: this.toSystemListItemDTO(segment.toSystem),
          controlPoints: segment.controlPointJson,
        })),
    };
  }

  private toFieldTypeDTO(fieldType: {
    id: number;
    key: string;
    name: string;
    passable: boolean;
    energyCost: number;
    damage: number;
    isSystem: boolean;
    colorKey: string | null;
    category?: string | null;
  }): StarmapFieldTypeDto {
    return {
      id: fieldType.id,
      key: fieldType.key,
      name: fieldType.name,
      passable: fieldType.passable,
      energyCost: fieldType.energyCost,
      damage: fieldType.damage,
      isSystem: fieldType.isSystem,
      colorKey: fieldType.colorKey,
      category: fieldType.category ?? null,
    };
  }

  private toSystemListItemDTO(system: {
    id: number;
    name: string;
    cx: number;
    cy: number;
    maxX: number;
    maxY: number;
    systemTypeId: number;
    isLandmark?: boolean;
    landmarkKey?: string | null;
    landmarkCategory?: string | null;
  }): StarmapSystemListItemDto {
    const landmarkKey = system.landmarkKey ?? null;
    return {
      id: system.id,
      name: system.name,
      cx: system.cx,
      cy: system.cy,
      maxX: system.maxX,
      maxY: system.maxY,
      systemTypeId: system.systemTypeId,
      systemTypeName: this.getSystemTypeName(system.systemTypeId),
      isLandmark: system.isLandmark ?? false,
      isMapOnly: landmarkKey?.startsWith('atlas:') ?? false,
      landmarkKey,
      landmarkCategory: system.landmarkCategory ?? null,
    };
  }

  private getSystemTypeName(systemTypeId: number): string {
    return SYSTEM_TYPE_BY_ID[systemTypeId]?.name ?? `Typ ${systemTypeId}`;
  }

  private toSystemFieldDTO(field: SystemField): StarmapSystemFieldDto {
    return {
      id: field.id,
      sx: field.sx,
      sy: field.sy,
      fieldTypeId: field.fieldTypeId,
      celestialObjectId: field.celestialObjectId,
      isPassable: field.isPassable,
      energyCost: field.energyCost,
      damage: field.damage,
      effects: field.effects ?? [],
      regionKey: field.regionKey,
      adminRegionKey: field.adminRegionKey,
      influenceAreaId: field.influenceAreaId,
      borderMask: field.borderMask,
      fieldType: this.toFieldTypeDTO(field.fieldType),
      celestialObject: field.celestialObject
        ? this.toCelestialObjectDTO(field.celestialObject)
        : null,
    };
  }

  private toCelestialObjectDTO(object: {
    id: number;
    objectType: number;
    name: string | null;
    posX: number;
    posY: number;
    classId: number | null;
    isColonizable: boolean;
  }): StarmapCelestialObjectDto {
    return {
      id: object.id,
      objectType: object.objectType,
      name: object.name,
      posX: object.posX,
      posY: object.posY,
      classId: object.classId,
      isColonizable: object.isColonizable,
    };
  }
}
