import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CommodityLocationsDto } from '@swuniverse/shared';
import { In, MoreThan, Repository } from 'typeorm';
import { GameDataService } from '../game-data/game-data.service';
import { CargoItem } from '../spacecraft/entities/cargo-item.entity';
import { ShipClassDef } from '../spacecraft/entities/ship-class-def.entity';
import { ColonyOwnershipService } from './colony-ownership.service';
import { ColonyStorage } from './entities/colony-storage.entity';

@Injectable()
export class ColonyCommodityLocationsService {
  constructor(
    private readonly ownership: ColonyOwnershipService,
    @InjectRepository(ColonyStorage)
    private readonly storageRepo: Repository<ColonyStorage>,
    @InjectRepository(CargoItem)
    private readonly cargoRepo: Repository<CargoItem>,
    @InjectRepository(ShipClassDef)
    private readonly shipClassRepo: Repository<ShipClassDef>,
    private readonly gameData: GameDataService,
  ) {}

  async getLocations(
    colonyId: number,
    commodityId: number,
    userId: number,
  ): Promise<CommodityLocationsDto> {
    await this.ownership.findOwnedColony(colonyId, userId);

    const [storage, cargo] = await Promise.all([
      this.storageRepo.find({
        where: {
          commodityId,
          amount: MoreThan(0),
          colony: { userId },
        },
        relations: ['colony'],
      }),
      this.cargoRepo.find({
        where: {
          commodityId,
          amount: MoreThan(0),
          spacecraft: { userId },
        },
        relations: ['spacecraft'],
      }),
    ]);
    const ownCargo = cargo.filter(
      (item) => item.amount > 0 && item.spacecraft.userId === userId,
    );
    const shipClassIds = [
      ...new Set(ownCargo.map((item) => item.spacecraft.shipClassId)),
    ];
    const shipClasses = shipClassIds.length
      ? await this.shipClassRepo.findBy({ id: In(shipClassIds) })
      : [];
    const shipClassById = new Map(shipClasses.map((item) => [item.id, item]));
    const collator = new Intl.Collator('de');

    return {
      commodityId,
      commodityName:
        this.gameData.getCommodity(commodityId)?.name ?? `Ware #${commodityId}`,
      colonies: storage
        .filter((item) => item.amount > 0 && item.colony.userId === userId)
        .map((item) => ({
          colonyId: item.colony.id,
          colonyName: item.colony.name,
          colonyClassId: item.colony.colonyClassId,
          amount: item.amount,
        }))
        .sort(
          (a, b) =>
            collator.compare(a.colonyName, b.colonyName) ||
            a.colonyId - b.colonyId,
        ),
      spacecraft: ownCargo
        .map((item) => ({
          spacecraftId: item.spacecraft.id,
          spacecraftName: item.spacecraft.name,
          shipClassId: item.spacecraft.shipClassId,
          shipClassKey:
            shipClassById.get(item.spacecraft.shipClassId)?.key ?? null,
          entityType: 'SHIP' as const,
          amount: item.amount,
        }))
        .sort(
          (a, b) =>
            collator.compare(a.spacecraftName, b.spacecraftName) ||
            a.spacecraftId - b.spacecraftId,
        ),
    };
  }
}
