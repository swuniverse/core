import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Colony } from './entities/colony.entity';
import { ColonyStorage } from './entities/colony-storage.entity';

@Injectable()
export class ColonyStorageService {
  constructor(
    @InjectRepository(ColonyStorage)
    private readonly storageRepo: Repository<ColonyStorage>,
  ) {}

  async getStorageUsed(colonyId: number): Promise<number> {
    const totalStored = await this.storageRepo
      .createQueryBuilder('s')
      .select('SUM(s.amount)', 'total')
      .where('s.colonyId = :id', { id: colonyId })
      .getRawOne();
    return Number(totalStored?.total || 0);
  }

  async getFreeStorage(colony: Colony, maxStorage: number): Promise<number> {
    return Math.max(0, maxStorage - (await this.getStorageUsed(colony.id)));
  }

  capToMax(amount: number, freeStorage: number): number {
    return Math.max(0, Math.min(amount, freeStorage));
  }

  async upperStorage(
    colony: Colony,
    commodityId: number,
    amount: number,
    maxStorage: number,
  ): Promise<number> {
    if (amount <= 0) return 0;
    const freeStorage = await this.getFreeStorage(colony, maxStorage);
    const storedAmount = this.capToMax(amount, freeStorage);
    if (storedAmount <= 0) return 0;

    let storage = await this.storageRepo.findOne({
      where: { colonyId: colony.id, commodityId },
    });
    if (storage) {
      storage.amount += storedAmount;
    } else {
      storage = this.storageRepo.create({
        colonyId: colony.id,
        commodityId,
        amount: storedAmount,
      });
    }
    await this.storageRepo.save(storage);
    return storedAmount;
  }

  async lowerStorage(
    colony: Colony,
    commodityId: number,
    amount: number,
  ): Promise<number> {
    if (amount <= 0) return 0;
    const storage = await this.storageRepo.findOne({
      where: { colonyId: colony.id, commodityId },
    });
    if (!storage || storage.amount < amount) {
      throw new BadRequestException('Not enough resources in colony storage');
    }
    storage.amount -= amount;
    await this.storageRepo.save(storage);
    return amount;
  }
}
