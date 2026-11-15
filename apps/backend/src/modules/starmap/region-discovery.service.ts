import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import {
  RegionDiscovery,
  RegionDiscoverySource,
} from './entities/region-discovery.entity';

/**
 * Completion contract of region cartography (tmw-K8b2) and the region
 * database category (tmw-D4): one discovery per player and region.
 */
@Injectable()
export class RegionDiscoveryService {
  constructor(
    @InjectRepository(RegionDiscovery)
    private readonly repository: Repository<RegionDiscovery>,
  ) {}

  /** Records the discovery once; `created` is false when it already existed. */
  async record(
    userId: number,
    mapRegionId: number,
    source = RegionDiscoverySource.CARTOGRAPHY,
    manager?: EntityManager,
  ): Promise<{ discovery: RegionDiscovery; created: boolean }> {
    const repository = manager?.getRepository(RegionDiscovery) ?? this.repository;
    const result = await repository
      .createQueryBuilder()
      .insert()
      .values({ userId, mapRegionId, source })
      .orIgnore()
      .execute();
    const discovery = await repository.findOneByOrFail({ userId, mapRegionId });
    return { discovery, created: (result.raw as unknown[]).length > 0 };
  }

  async has(userId: number, mapRegionId: number, manager?: EntityManager): Promise<boolean> {
    const repository = manager?.getRepository(RegionDiscovery) ?? this.repository;
    return repository.existsBy({ userId, mapRegionId });
  }

  async list(userId: number): Promise<RegionDiscovery[]> {
    return this.repository.find({ where: { userId }, order: { discoveredAt: 'ASC', id: 'ASC' } });
  }
}
