import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Colony } from '../colony/entities/colony.entity';
import { ColonyStorageService } from '../colony/colony-storage.service';
import {
  GameDataService,
  TorpedoTypeDef,
} from '../game-data/game-data.service';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { Spacecraft } from './entities/spacecraft.entity';
import { SpacecraftTorpedoStorage } from './entities/spacecraft-torpedo-storage.entity';

@Injectable()
export class SpacecraftTorpedoService {
  constructor(
    @InjectRepository(SpacecraftTorpedoStorage)
    private readonly torpedoRepo: Repository<SpacecraftTorpedoStorage>,
    @InjectRepository(ShipClassDef)
    private readonly shipClassRepo: Repository<ShipClassDef>,
    private readonly gameData: GameDataService,
    private readonly colonyStorageService: ColonyStorageService,
  ) {}

  getStorage(spacecraftId: number): Promise<SpacecraftTorpedoStorage | null> {
    return this.torpedoRepo.findOne({ where: { spacecraftId } });
  }

  async getCapacity(ship: Spacecraft): Promise<number> {
    const shipClass = await this.shipClassRepo.findOneBy({
      id: ship.shipClassId,
    });
    const category = shipClass?.category ?? 'CORVETTE';
    const byCategory: Record<string, number> = {
      FIGHTER: 2,
      CORVETTE: 4,
      FRIGATE: 8,
      CRUISER: 16,
      DESTROYER: 24,
    };
    return byCategory[category] ?? 4;
  }

  async loadFromColony(
    colony: Colony,
    ship: Spacecraft,
    torpedoTypeId: number,
    amount: number,
  ): Promise<SpacecraftTorpedoStorage> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    const torpedoType = this.requireTorpedoType(torpedoTypeId);
    const capacity = await this.getCapacity(ship);
    let storage = await this.getStorage(ship.id);
    const currentAmount = storage?.amount ?? 0;
    if (
      storage &&
      storage.torpedoTypeId !== torpedoTypeId &&
      storage.amount > 0
    ) {
      throw new BadRequestException('Unload current torpedo type first');
    }
    if (currentAmount + amount > capacity) {
      throw new BadRequestException('Not enough torpedo capacity');
    }
    await this.colonyStorageService.lowerStorage(
      colony,
      torpedoType.commodityId,
      amount,
    );
    if (!storage) {
      storage = this.torpedoRepo.create({
        spacecraftId: ship.id,
        torpedoTypeId,
        commodityId: torpedoType.commodityId,
        amount: 0,
      });
    }
    storage.torpedoTypeId = torpedoTypeId;
    storage.commodityId = torpedoType.commodityId;
    storage.amount += amount;
    return this.torpedoRepo.save(storage);
  }

  async unloadToColony(
    colony: Colony,
    ship: Spacecraft,
    amount?: number,
    maxStorage?: number,
  ): Promise<SpacecraftTorpedoStorage | null> {
    const storage = await this.getStorage(ship.id);
    if (!storage || storage.amount <= 0) return storage;
    const unloadAmount = Math.min(amount ?? storage.amount, storage.amount);
    if (unloadAmount <= 0)
      throw new BadRequestException('Amount must be positive');
    await this.colonyStorageService.upperStorage(
      colony,
      storage.commodityId,
      unloadAmount,
      maxStorage ?? colony.storageMax,
    );
    storage.amount -= unloadAmount;
    return this.torpedoRepo.save(storage);
  }

  async consumeForAttack(
    ship: Spacecraft,
    amount = 1,
  ): Promise<TorpedoTypeDef | null> {
    const storage = await this.getStorage(ship.id);
    if (!storage || storage.amount < amount) return null;
    const torpedoType = this.gameData.getTorpedoType(storage.torpedoTypeId);
    if (!torpedoType) return null;
    storage.amount -= amount;
    await this.torpedoRepo.save(storage);
    return torpedoType;
  }

  requireTorpedoType(torpedoTypeId: number): TorpedoTypeDef {
    const torpedoType = this.gameData.getTorpedoType(torpedoTypeId);
    if (!torpedoType) throw new BadRequestException('Unknown torpedo type');
    return torpedoType;
  }
}
