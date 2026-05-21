import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Layer } from './entities/layer.entity';
import { StarSystem } from './entities/star-system.entity';
import { CelestialObject } from './entities/celestial-object.entity';
import { GalaxyField } from './entities/galaxy-field.entity';
import { SYSTEM_TYPE_BY_ID } from './starmap-system-types';
import type {
  StarmapCelestialObjectDto,
  StarmapLayerDto,
  StarmapSectorDto,
  StarmapSystemDetailDto,
  StarmapSystemListItemDto,
} from '@swuniverse/shared';

@Injectable()
export class StarmapService {
  constructor(
    @InjectRepository(Layer)
    private readonly layerRepo: Repository<Layer>,
    @InjectRepository(StarSystem)
    private readonly systemRepo: Repository<StarSystem>,
    @InjectRepository(CelestialObject)
    private readonly objectRepo: Repository<CelestialObject>,
    @InjectRepository(GalaxyField)
    private readonly galaxyFieldRepo: Repository<GalaxyField>,
  ) {}

  async getLayers(): Promise<StarmapLayerDto[]> {
    const layers = await this.layerRepo.find({ where: { isHidden: false } });

    return layers.map((layer) => ({
      id: layer.id,
      name: layer.name,
      width: layer.width,
      height: layer.height,
      sectorSize: layer.sectorSize,
      isDefault: layer.isDefault,
      isFinished: layer.isFinished,
      isHidden: layer.isHidden,
    }));
  }

  async getSystemsInLayer(
    layerId: number,
  ): Promise<StarmapSystemListItemDto[]> {
    const systems = await this.systemRepo.find({
      where: { layerId },
      order: { cx: 'ASC', cy: 'ASC' },
    });

    return systems.map((system) => this.toSystemListItemDto(system));
  }

  async getSectorsInLayer(layerId: number): Promise<StarmapSectorDto[]> {
    const layer = await this.layerRepo.findOneBy({ id: layerId });
    if (!layer) throw new NotFoundException('Layer not found');

    const sectorSize = layer.sectorSize;
    const sectorColumns = Math.ceil(layer.width / sectorSize);
    const sectorRows = Math.ceil(layer.height / sectorSize);
    const fieldCounts = await this.galaxyFieldRepo
      .createQueryBuilder('field')
      .select('FLOOR((field.cx - 1) / :sectorSize)', 'sectorX')
      .addSelect('FLOOR((field.cy - 1) / :sectorSize)', 'sectorY')
      .addSelect('COUNT(*)', 'fieldCount')
      .addSelect(
        'COUNT(CASE WHEN field.starSystemId IS NOT NULL THEN 1 END)',
        'systemCount',
      )
      .where('field.layerId = :layerId', { layerId })
      .setParameter('sectorSize', sectorSize)
      .groupBy('FLOOR((field.cx - 1) / :sectorSize)')
      .addGroupBy('FLOOR((field.cy - 1) / :sectorSize)')
      .getRawMany<{
        sectorX: string;
        sectorY: string;
        fieldCount: string;
        systemCount: string;
      }>();

    const countsBySector = new Map(
      fieldCounts.map((row) => [
        `${row.sectorX}:${row.sectorY}`,
        {
          fieldCount: Number(row.fieldCount),
          systemCount: Number(row.systemCount),
        },
      ]),
    );

    const sectors: StarmapSectorDto[] = [];
    for (let sectorY = 0; sectorY < sectorRows; sectorY++) {
      for (let sectorX = 0; sectorX < sectorColumns; sectorX++) {
        const key = `${sectorX}:${sectorY}`;
        const counts = countsBySector.get(key);
        sectors.push({
          layerId,
          sectorX,
          sectorY,
          minX: sectorX * sectorSize + 1,
          minY: sectorY * sectorSize + 1,
          maxX: Math.min((sectorX + 1) * sectorSize, layer.width),
          maxY: Math.min((sectorY + 1) * sectorSize, layer.height),
          fieldCount: counts?.fieldCount ?? 0,
          systemCount: counts?.systemCount ?? 0,
        });
      }
    }

    return sectors;
  }

  async getLayerById(layerId: number): Promise<Layer> {
    const layer = await this.layerRepo.findOneBy({ id: layerId });
    if (!layer) throw new NotFoundException('Layer not found');
    return layer;
  }

  async getSystemDetail(systemId: number): Promise<StarmapSystemDetailDto> {
    const system = await this.systemRepo.findOne({
      where: { id: systemId },
      relations: ['celestialObjects'],
    });
    if (!system) throw new NotFoundException('System not found');
    if (system.landmarkKey?.startsWith('atlas:')) {
      throw new BadRequestException('Map-only systems cannot be entered');
    }

    return {
      id: system.id,
      name: system.name,
      cx: system.cx,
      cy: system.cy,
      systemTypeId: system.systemTypeId,
      systemTypeName: this.getSystemTypeName(system.systemTypeId),
      maxX: system.maxX,
      maxY: system.maxY,
      isLandmark: system.isLandmark,
      isMapOnly: system.landmarkKey?.startsWith('atlas:') ?? false,
      landmarkKey: system.landmarkKey,
      landmarkCategory: system.landmarkCategory,
      celestialObjects: system.celestialObjects.map((object) =>
        this.toCelestialObjectDto(object),
      ),
    };
  }

  async getCelestialObject(id: number): Promise<CelestialObject> {
    const obj = await this.objectRepo.findOneBy({ id });
    if (!obj) throw new NotFoundException('Celestial object not found');
    return obj;
  }

  async saveCelestialObject(obj: CelestialObject): Promise<CelestialObject> {
    return this.objectRepo.save(obj);
  }

  async getObjectsInSystem(systemId: number): Promise<CelestialObject[]> {
    return this.objectRepo.find({
      where: { systemId },
      order: { posX: 'ASC', posY: 'ASC' },
    });
  }

  private toSystemListItemDto(system: StarSystem): StarmapSystemListItemDto {
    return {
      id: system.id,
      name: system.name,
      cx: system.cx,
      cy: system.cy,
      maxX: system.maxX,
      maxY: system.maxY,
      systemTypeId: system.systemTypeId,
      systemTypeName: this.getSystemTypeName(system.systemTypeId),
      isLandmark: system.isLandmark,
      isMapOnly: system.landmarkKey?.startsWith('atlas:') ?? false,
      landmarkKey: system.landmarkKey,
      landmarkCategory: system.landmarkCategory,
    };
  }

  private getSystemTypeName(systemTypeId: number): string {
    return SYSTEM_TYPE_BY_ID[systemTypeId]?.name ?? `Typ ${systemTypeId}`;
  }

  private toCelestialObjectDto(
    object: CelestialObject,
  ): StarmapCelestialObjectDto {
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
