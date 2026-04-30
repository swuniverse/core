import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Layer } from './entities/layer.entity';
import { StarSystem } from './entities/star-system.entity';
import { CelestialObject } from './entities/celestial-object.entity';

@Injectable()
export class StarmapService {
  constructor(
    @InjectRepository(Layer)
    private readonly layerRepo: Repository<Layer>,
    @InjectRepository(StarSystem)
    private readonly systemRepo: Repository<StarSystem>,
    @InjectRepository(CelestialObject)
    private readonly objectRepo: Repository<CelestialObject>,
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
