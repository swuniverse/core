import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CommodityLocationDto } from '@swuniverse/shared';
import { MoreThan, Repository } from 'typeorm';
import { ColonyStorage } from '../colony/entities/colony-storage.entity';
import { CargoItem } from '../spacecraft/entities/cargo-item.entity';
import { SpacecraftTorpedoStorage } from '../spacecraft/entities/spacecraft-torpedo-storage.entity';
import type { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import { resolveSpacecraftLocation } from '../spacecraft/spacecraft-field';
import type { CommodityLocationSource } from './commodity-location-source';

@Injectable()
export class OwnedStorageCommodityLocationSource implements CommodityLocationSource {
  constructor(
    @InjectRepository(ColonyStorage)
    private readonly storageRepo: Repository<ColonyStorage>,
    @InjectRepository(CargoItem)
    private readonly cargoRepo: Repository<CargoItem>,
    @InjectRepository(SpacecraftTorpedoStorage)
    private readonly torpedoRepo: Repository<SpacecraftTorpedoStorage>,
  ) {}

  async findLocations(
    userId: number,
    commodityId: number,
  ): Promise<CommodityLocationDto[]> {
    const [storage, cargo, torpedoes] = await Promise.all([
      this.storageRepo.find({
        where: { commodityId, amount: MoreThan(0), colony: { userId } },
        relations: ['colony', 'colony.starSystem'],
      }),
      this.cargoRepo.find({
        where: { commodityId, amount: MoreThan(0), spacecraft: { userId } },
        relations: [
          'spacecraft',
          'spacecraft.location',
          'spacecraft.location.galaxyField',
          'spacecraft.location.systemField',
        ],
      }),
      this.torpedoRepo.find({
        where: { commodityId, amount: MoreThan(0), spacecraft: { userId } },
        relations: [
          'spacecraft',
          'spacecraft.location',
          'spacecraft.location.galaxyField',
          'spacecraft.location.systemField',
        ],
      }),
    ]);

    return [
      ...storage
        .filter((item) => item.amount > 0 && item.colony.userId === userId)
        .map((item) => ({
          type: 'COLONY' as const,
          id: item.colony.id,
          name: item.colony.name,
          location: item.colony.starSystem?.name ?? null,
          amount: item.amount,
        })),
      ...cargo
        .filter((item) => item.amount > 0 && item.spacecraft.userId === userId)
        .map((item) => ({
          type: 'SPACECRAFT' as const,
          id: item.spacecraft.id,
          name: item.spacecraft.name,
          location: this.spacecraftLocation(item.spacecraft),
          amount: item.amount,
        })),
      ...torpedoes
        .filter((item) => item.amount > 0 && item.spacecraft.userId === userId)
        .map((item) => ({
          type: 'TORPEDO_STORAGE' as const,
          id: item.spacecraft.id,
          name: item.spacecraft.name,
          location: this.spacecraftLocation(item.spacecraft),
          amount: item.amount,
        })),
    ];
  }

  private spacecraftLocation(spacecraft: Spacecraft): string | null {
    const location = resolveSpacecraftLocation(spacecraft);
    if (location?.scope === 'SYSTEM') {
      return `System ${location.systemId} · ${location.x}:${location.y}`;
    }
    if (location?.scope === 'GALAXY') {
      return `${location.layerId} · ${location.x}:${location.y}`;
    }
    return null;
  }
}
