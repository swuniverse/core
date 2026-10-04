import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Colony } from './entities/colony.entity';
import { ColonyStorage } from './entities/colony-storage.entity';

@Injectable()
export class ColonyStorageService {
  constructor(
    @InjectRepository(ColonyStorage)
    private readonly storageRepo: Repository<ColonyStorage>,
  ) {}

  async getStorageUsed(
    colonyId: number,
    manager?: EntityManager,
  ): Promise<number> {
    const totalStored = await (
      manager?.getRepository(ColonyStorage) ?? this.storageRepo
    )
      .createQueryBuilder('s')
      .select('SUM(s.amount)', 'total')
      .where('s.colonyId = :id', { id: colonyId })
      .getRawOne();
    return Number(totalStored?.total || 0);
  }

  async getFreeStorage(
    colony: Colony,
    maxStorage: number,
    manager?: EntityManager,
  ): Promise<number> {
    return Math.max(
      0,
      maxStorage - (await this.getStorageUsed(colony.id, manager)),
    );
  }

  capToMax(amount: number, freeStorage: number): number {
    return Math.max(0, Math.min(amount, freeStorage));
  }

  async upperStorage(
    colony: Colony,
    commodityId: number,
    amount: number,
    maxStorage: number,
    manager?: EntityManager,
  ): Promise<number> {
    if (amount <= 0) return 0;
    const repository =
      manager?.getRepository(ColonyStorage) ?? this.storageRepo;
    const freeStorage = await this.getFreeStorage(colony, maxStorage, manager);
    const storedAmount = this.capToMax(amount, freeStorage);
    if (storedAmount <= 0) return 0;

    let storage = await repository.findOne({
      where: { colonyId: colony.id, commodityId },
    });
    if (storage) {
      storage.amount += storedAmount;
    } else {
      storage = repository.create({
        colonyId: colony.id,
        commodityId,
        amount: storedAmount,
      });
    }
    await repository.save(storage);
    await this.syncColonyStorageState(colony, storage, storedAmount, manager);
    return storedAmount;
  }

  async lowerStorage(
    colony: Colony,
    commodityId: number,
    amount: number,
    manager?: EntityManager,
  ): Promise<number> {
    if (amount <= 0) return 0;
    const repository =
      manager?.getRepository(ColonyStorage) ?? this.storageRepo;
    const storage = await repository.findOne({
      where: { colonyId: colony.id, commodityId },
    });
    if (!storage || storage.amount < amount) {
      throw new BadRequestException('Not enough resources in colony storage');
    }
    storage.amount -= amount;
    await repository.save(storage);
    await this.syncColonyStorageState(colony, storage, -amount, manager);
    return amount;
  }

  private async syncColonyStorageState(
    colony: Colony,
    storage: ColonyStorage,
    _delta: number,
    manager?: EntityManager,
  ): Promise<void> {
    const loadedStorage = colony.storage?.find(
      (item) => item.commodityId === storage.commodityId,
    );
    if (loadedStorage) {
      loadedStorage.amount = storage.amount;
    } else if (colony.storage && storage.amount > 0) {
      colony.storage.push(storage);
    }

    colony.storageUsed = await this.getStorageUsed(colony.id, manager);
    const entityManager = manager ?? this.storageRepo.manager;
    await entityManager
      ?.getRepository(Colony)
      .update({ id: colony.id }, { storageUsed: colony.storageUsed });
  }
}
