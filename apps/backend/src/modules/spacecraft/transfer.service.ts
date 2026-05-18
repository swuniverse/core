import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Spacecraft, SpacecraftStatus } from './entities/spacecraft.entity';
import { CargoItem } from './entities/cargo-item.entity';
import { Colony } from '../colony/entities/colony.entity';
import { ColonyStorage } from '../colony/entities/colony-storage.entity';

@Injectable()
export class TransferService {
  constructor(
    @InjectRepository(Spacecraft)
    private readonly shipRepo: Repository<Spacecraft>,
    @InjectRepository(CargoItem)
    private readonly cargoRepo: Repository<CargoItem>,
    @InjectRepository(Colony)
    private readonly colonyRepo: Repository<Colony>,
    @InjectRepository(ColonyStorage)
    private readonly storageRepo: Repository<ColonyStorage>,
  ) {}

  async loadCargo(
    shipId: number,
    userId: number,
    colonyId: number,
    commodityId: number,
    amount: number,
  ): Promise<CargoItem> {
    if (amount <= 0)
      throw new BadRequestException('Amount must be positive');

    const ship = await this.shipRepo.findOne({
      where: { id: shipId, userId },
    });
    if (!ship) throw new NotFoundException('Ship not found');

    if (ship.status !== SpacecraftStatus.DOCKED)
      throw new BadRequestException('Ship must be idle');

    const colony = await this.colonyRepo.findOne({
      where: { id: colonyId, userId },
    });
    if (!colony) throw new NotFoundException('Colony not found');

    if (ship.starSystemId !== colony.starSystemId)
      throw new BadRequestException('Ship must be in same system as colony');

    const storage = await this.storageRepo.findOne({
      where: { colonyId, commodityId },
    });
    if (!storage || storage.amount < amount)
      throw new BadRequestException('Not enough resources in colony');

    const currentCargo = await this.getCargoUsed(shipId);
    if (currentCargo + amount > ship.cargoMax)
      throw new BadRequestException('Not enough cargo space');

    storage.amount -= amount;
    await this.storageRepo.save(storage);

    let cargoItem = await this.cargoRepo.findOne({
      where: { spacecraftId: shipId, commodityId },
    });
    if (cargoItem) {
      cargoItem.amount += amount;
    } else {
      cargoItem = this.cargoRepo.create({
        spacecraftId: shipId,
        commodityId,
        amount,
      });
    }
    await this.cargoRepo.save(cargoItem);

    ship.cargoUsed = currentCargo + amount;
    await this.shipRepo.save(ship);

    return cargoItem;
  }

  async unloadCargo(
    shipId: number,
    userId: number,
    colonyId: number,
    commodityId: number,
    amount: number,
  ): Promise<void> {
    if (amount <= 0)
      throw new BadRequestException('Amount must be positive');

    const ship = await this.shipRepo.findOne({
      where: { id: shipId, userId },
    });
    if (!ship) throw new NotFoundException('Ship not found');

    if (ship.status !== SpacecraftStatus.DOCKED)
      throw new BadRequestException('Ship must be idle');

    const colony = await this.colonyRepo.findOne({
      where: { id: colonyId, userId },
    });
    if (!colony) throw new NotFoundException('Colony not found');

    if (ship.starSystemId !== colony.starSystemId)
      throw new BadRequestException('Ship must be in same system as colony');

    const cargoItem = await this.cargoRepo.findOne({
      where: { spacecraftId: shipId, commodityId },
    });
    if (!cargoItem || cargoItem.amount < amount)
      throw new BadRequestException('Not enough cargo on ship');

    cargoItem.amount -= amount;
    if (cargoItem.amount === 0) {
      await this.cargoRepo.remove(cargoItem);
    } else {
      await this.cargoRepo.save(cargoItem);
    }

    let storage = await this.storageRepo.findOne({
      where: { colonyId, commodityId },
    });
    if (storage) {
      storage.amount += amount;
    } else {
      storage = this.storageRepo.create({ colonyId, commodityId, amount });
    }
    await this.storageRepo.save(storage);

    ship.cargoUsed = await this.getCargoUsed(shipId);
    await this.shipRepo.save(ship);
  }

  async getShipCargo(shipId: number): Promise<CargoItem[]> {
    return this.cargoRepo.find({
      where: { spacecraftId: shipId },
      order: { commodityId: 'ASC' },
    });
  }

  private async getCargoUsed(shipId: number): Promise<number> {
    const result = await this.cargoRepo
      .createQueryBuilder('c')
      .select('COALESCE(SUM(c.amount), 0)', 'total')
      .where('c.spacecraftId = :shipId', { shipId })
      .getRawOne();
    return parseInt(result?.total || '0', 10);
  }
}
