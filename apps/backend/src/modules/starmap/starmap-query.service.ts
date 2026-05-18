import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Layer } from './entities/layer.entity';
import { GalaxyField } from './entities/galaxy-field.entity';
import { SystemField } from './entities/system-field.entity';
import type { ExplorationService } from './exploration.service';
import { ExplorationLevel } from './entities/exploration-state.entity';
import type {
  StarmapCelestialObjectDto,
  StarmapExploredGalaxyFieldDto,
  StarmapExploredSectorDto,
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

  async getSystemGrid(systemId: number): Promise<StarmapSystemGridDto> {
    const fields = await this.systemFieldRepo.find({
      where: { starSystemId: systemId },
      relations: ['fieldType', 'celestialObject', 'starSystem'],
      order: { sy: 'ASC', sx: 'ASC' },
    });

    const system = fields[0]?.starSystem;
    if (!system) {
      throw new NotFoundException('System not found');
    }

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
    };
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
      explorationService.getExploredFieldsInSector(userId, layerId, minX, maxX, minY, maxY),
    ]);

    const exploredMap = new Map(
      exploredStates.map(s => [`${s.cx},${s.cy}`, s.explorationLevel]),
    );

    const fields: StarmapExploredGalaxyFieldDto[] = [];
    let hiddenCount = 0;

    for (const field of allFields) {
      const level = exploredMap.get(`${field.cx},${field.cy}`);
      if (!level) {
        hiddenCount++;
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
          starSystemId: null,
          regionId: field.regionId,
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
          starSystemId: field.starSystemId,
          regionId: field.regionId,
          explorationLevel: 'FULL',
          fieldType: this.toFieldTypeDTO(field.fieldType),
          starSystem: field.starSystem ? this.toSystemListItemDTO(field.starSystem) : null,
        });
      }
    }

    return { fields, hiddenCount };
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
  }): StarmapSystemListItemDto {
    return {
      id: system.id,
      name: system.name,
      cx: system.cx,
      cy: system.cy,
      maxX: system.maxX,
      maxY: system.maxY,
      systemTypeId: system.systemTypeId,
    };
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
