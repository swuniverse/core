import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Layer } from './entities/layer.entity';
import { LayerKnowledge } from './entities/layer-knowledge.entity';
import { StarSystem } from './entities/star-system.entity';
import { MapRegion } from './entities/map-region.entity';

export type LayerReader = { sub: number; isAdmin?: boolean; permissions?: string[] };

@Injectable()
export class LayerAccessService {
  constructor(
    @InjectRepository(Layer) private readonly layerRepo: Repository<Layer>,
    @InjectRepository(LayerKnowledge) private readonly knowledgeRepo: Repository<LayerKnowledge>,
    @InjectRepository(StarSystem) private readonly systemRepo: Repository<StarSystem>,
    @InjectRepository(MapRegion) private readonly regionRepo: Repository<MapRegion>,
  ) {}

  bypass(user: LayerReader): boolean {
    return !!user.isAdmin || (user.permissions ?? []).includes('MAP_EDITOR');
  }

  async getLayers(user: LayerReader): Promise<Layer[]> {
    const known = this.bypass(user) ? null : await this.knowledgeRepo.find({ where: { userId: user.sub } });
    return this.layerRepo.find({
      where: { isHidden: false, ...(known ? { id: In(known.map((entry) => entry.layerId)) } : {}) },
      order: { id: 'ASC' },
    });
  }

  async assertSystemAccess(user: LayerReader, systemId: number): Promise<void> {
    const system = await this.systemRepo.findOneBy({ id: systemId });
    if (!system) throw new NotFoundException('System not found');
    await this.assertAccess(user, system.layerId);
  }

  async assertRegionAccess(user: LayerReader, regionId: number): Promise<void> {
    const region = await this.regionRepo.findOneBy({ id: regionId });
    if (!region) throw new NotFoundException('Region not found');
    await this.assertAccess(user, region.layerId);
  }

  async assertAccess(user: LayerReader, layerId: number): Promise<void> {
    if (this.bypass(user)) return;
    const layer = await this.layerRepo.findOneBy({ id: layerId });
    if (!layer) throw new NotFoundException('Layer not found');
    if (layer.isHidden || !await this.knowledgeRepo.existsBy({ userId: user.sub, layerId })) {
      throw new ForbiddenException('Layer not known');
    }
  }
}
