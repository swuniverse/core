import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Layer } from './entities/layer.entity';
import { GalaxyField } from './entities/galaxy-field.entity';
import { SystemField } from './entities/system-field.entity';

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

  async getGalaxySectors(layerId: number) {
    const layer = await this.layerRepo.findOneBy({ id: layerId });
    if (!layer) throw new NotFoundException('Layer not found');

    const sectorColumns = Math.ceil(layer.width / layer.sectorSize);
    const sectorRows = Math.ceil(layer.height / layer.sectorSize);
    const sectors = [] as Array<{
      layerId: number;
      sectorX: number;
      sectorY: number;
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
      fieldCount: number;
      systemCount: number;
    }>;

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
  ) {
    const layer = await this.layerRepo.findOneBy({ id: layerId });
    if (!layer) throw new NotFoundException('Layer not found');

    const minX = sectorX * layer.sectorSize + 1;
    const maxX = Math.min((sectorX + 1) * layer.sectorSize, layer.width);
    const minY = sectorY * layer.sectorSize + 1;
    const maxY = Math.min((sectorY + 1) * layer.sectorSize, layer.height);

    return this.galaxyFieldRepo.find({
      where: {
        layerId,
        cx: Between(minX, maxX),
        cy: Between(minY, maxY),
      },
      relations: ['fieldType', 'starSystem'],
      order: { cy: 'ASC', cx: 'ASC' },
    });
  }

  async getSystemGrid(systemId: number) {
    return this.systemFieldRepo.find({
      where: { starSystemId: systemId },
      relations: ['fieldType', 'celestialObject'],
      order: { sy: 'ASC', sx: 'ASC' },
    });
  }
}
