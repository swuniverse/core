import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Colony } from '../colony/entities/colony.entity';
import { ColonyStorageService } from '../colony/colony-storage.service';
import {
  GameDataService,
  TorpedoTypeDef,
} from '../game-data/game-data.service';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { Spacecraft, SpacecraftStatus } from './entities/spacecraft.entity';
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

  getStorage(spacecraftId: number) {
    return this.torpedoRepo.find({
      where: { spacecraftId },
      order: { torpedoTypeId: 'ASC' },
    });
  }

  private assertUsableShip(ship: Spacecraft): void {
    if (ship.status === SpacecraftStatus.DESTROYED)
      throw new BadRequestException('Wreck torpedo inventory is inaccessible');
  }

  private async getShipClass(ship: Spacecraft): Promise<ShipClassDef> {
    const shipClass = await this.shipClassRepo.findOneBy({
      id: ship.shipClassId,
    });
    if (!shipClass)
      throw new BadRequestException('Schiffsklasse nicht gefunden');
    return shipClass;
  }

  async getCapacity(ship: Spacecraft): Promise<number> {
    return (await this.getShipClass(ship)).torpedoStorageBase;
  }

  async getCompatibleTorpedoTypes(ship: Spacecraft): Promise<TorpedoTypeDef[]> {
    const shipClass = await this.getShipClass(ship);
    if (shipClass.torpedoStorageBase <= 0) return [];
    return this.gameData
      .getAllTorpedoTypes()
      .filter((type) =>
        type.compatibleShipCategories?.includes(shipClass.category),
      );
  }

  private async assertCompatible(
    ship: Spacecraft,
    type: TorpedoTypeDef,
  ): Promise<void> {
    if (
      !(await this.getCompatibleTorpedoTypes(ship)).some(
        (entry) => entry.id === type.id,
      )
    ) {
      throw new BadRequestException(
        'Dieser Torpedotyp ist mit der Schiffsklasse nicht kompatibel',
      );
    }
  }

  async loadFromColony(
    colony: Colony,
    ship: Spacecraft,
    torpedoTypeId: number,
    amount: number,
  ) {
    this.assertUsableShip(ship);
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    const type = this.requireTorpedoType(torpedoTypeId);
    await this.assertCompatible(ship, type);
    const storages = await this.getStorage(ship.id);
    const capacity = await this.getCapacity(ship);
    if (
      storages.reduce((sum, storage) => sum + storage.amount, 0) + amount >
      capacity
    ) {
      throw new BadRequestException('Not enough torpedo capacity');
    }
    await this.colonyStorageService.lowerStorage(
      colony,
      type.commodityId,
      amount,
    );
    let storage = storages.find((entry) => entry.torpedoTypeId === type.id);
    if (!storage)
      storage = this.torpedoRepo.create({
        spacecraftId: ship.id,
        torpedoTypeId: type.id,
        commodityId: type.commodityId,
        amount: 0,
        isActive: !storages.some((entry) => entry.isActive),
      });
    storage.amount += amount;
    return this.torpedoRepo.save(storage);
  }

  async unloadToColony(
    colony: Colony,
    ship: Spacecraft,
    torpedoTypeId?: number,
    amount?: number,
    maxStorage?: number,
  ) {
    this.assertUsableShip(ship);
    const storages = await this.getStorage(ship.id);
    const storage =
      torpedoTypeId == null
        ? (storages.find((entry) => entry.isActive) ?? storages[0])
        : storages.find((entry) => entry.torpedoTypeId === torpedoTypeId);
    if (!storage || storage.amount <= 0) return storage ?? null;
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
    if (storage.amount === 0) storage.isActive = false;
    return this.torpedoRepo.save(storage);
  }

  async loadFullForSpawn(
    manager: EntityManager,
    ship: Spacecraft,
    torpedoTypeId: number,
  ): Promise<SpacecraftTorpedoStorage> {
    this.assertUsableShip(ship);
    const type = this.requireTorpedoType(torpedoTypeId);
    await this.assertCompatible(ship, type);
    const capacity = await this.getCapacity(ship);
    if (capacity <= 0) {
      throw new BadRequestException('Dieses Schiff kann keine Torpedos tragen');
    }
    return manager.getRepository(SpacecraftTorpedoStorage).save(
      manager.getRepository(SpacecraftTorpedoStorage).create({
        spacecraftId: ship.id,
        torpedoTypeId: type.id,
        commodityId: type.commodityId,
        amount: capacity,
        isActive: true,
      }),
    );
  }

  async setActive(ship: Spacecraft, torpedoTypeId: number): Promise<void> {
    const storages = await this.getStorage(ship.id);
    const selected = storages.find(
      (entry) => entry.torpedoTypeId === torpedoTypeId && entry.amount > 0,
    );
    if (!selected) throw new BadRequestException('Torpedo nicht geladen');
    await this.assertCompatible(ship, this.requireTorpedoType(torpedoTypeId));
    for (const storage of storages)
      storage.isActive = storage.id === selected.id;
    await this.torpedoRepo.save(storages);
  }

  async consumeForAttack(
    ship: Spacecraft,
    amount = 1,
  ): Promise<TorpedoTypeDef | null> {
    this.assertUsableShip(ship);
    const storage = (await this.getStorage(ship.id)).find(
      (entry) => entry.isActive && entry.amount >= amount,
    );
    if (!storage) return null;
    const type = this.gameData.getTorpedoType(storage.torpedoTypeId);
    if (!type) return null;
    try {
      await this.assertCompatible(ship, type);
    } catch {
      return null;
    }
    storage.amount -= amount;
    if (!storage.amount) storage.isActive = false;
    await this.torpedoRepo.save(storage);
    return type;
  }

  requireTorpedoType(torpedoTypeId: number): TorpedoTypeDef {
    const type = this.gameData.getTorpedoType(torpedoTypeId);
    if (!type) throw new BadRequestException('Unknown torpedo type');
    return type;
  }
}
