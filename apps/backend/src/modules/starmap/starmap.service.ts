import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Layer } from './entities/layer.entity';
import { StarSystem } from './entities/star-system.entity';
import { CelestialObject } from './entities/celestial-object.entity';
import { GalaxyField } from './entities/galaxy-field.entity';

export interface SectorSummary {
  layerId: number;
  sectorX: number;
  sectorY: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  fieldCount: number;
  systemCount: number;
}

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

  async getLayers(): Promise<Layer[]> {
    return this.layerRepo.find({ where: { isHidden: false } });
  }

  async getSystemsInLayer(layerId: number): Promise<StarSystem[]> {
    return this.systemRepo.find({
      where: { layerId },
      order: { cx: 'ASC', cy: 'ASC' },
    });
  }

  async getSectorsInLayer(layerId: number): Promise<SectorSummary[]> {
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

    const sectors: SectorSummary[] = [];
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

  async getSystemDetail(systemId: number): Promise<StarSystem> {
    const system = await this.systemRepo.findOne({
      where: { id: systemId },
      relations: ['celestialObjects'],
    });
    if (!system) throw new NotFoundException('System not found');
    return system;
  }

  async getObjectsInSystem(systemId: number): Promise<CelestialObject[]> {
    return this.objectRepo.find({
      where: { systemId },
      order: { posX: 'ASC', posY: 'ASC' },
    });
  }
}
