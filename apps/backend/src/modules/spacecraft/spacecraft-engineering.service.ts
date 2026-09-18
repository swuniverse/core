import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  SpacecraftEngineeringAmount,
  SpacecraftEngineeringResultDto,
} from '@swuniverse/shared';
import { DataSource, EntityManager, In } from 'typeorm';
import { CargoItem } from './entities/cargo-item.entity';
import { Spacecraft, SpacecraftStatus } from './entities/spacecraft.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import { reactorFuelProfile } from './reactor-fuel-profile';

@Injectable()
export class SpacecraftEngineeringService {
  constructor(private readonly dataSource: DataSource) {}

  async loadReactor(
    shipId: number,
    userId: number,
    requested: SpacecraftEngineeringAmount,
  ): Promise<SpacecraftEngineeringResultDto> {
    return this.dataSource.transaction(async (manager) => {
      const ship = await this.lockOwnedShip(manager, shipId, userId);
      const modules = await manager.find(SpacecraftModule, {
        where: { spacecraftId: ship.id },
      });
      const profile = reactorFuelProfile(modules);
      const cargo = await manager.find(CargoItem, {
        where: {
          spacecraftId: ship.id,
          commodityId: In(profile.costs.map((cost) => cost.commodityId)),
        },
        lock: { mode: 'pessimistic_write' },
      });
      const cargoByCommodity = new Map(
        cargo.map((item) => [item.commodityId, item]),
      );
      const capacityUnits = Math.floor(
        Math.max(0, ship.reactorFuelMax - ship.reactorFuel) / profile.loadUnits,
      );
      const resourceUnits = Math.min(
        ...profile.costs.map((cost) =>
          Math.floor(
            (cargoByCommodity.get(cost.commodityId)?.amount ?? 0) / cost.amount,
          ),
        ),
      );
      const maximumUnits = Math.min(capacityUnits, resourceUnits);
      if (
        requested !== 'MAX' &&
        (!Number.isInteger(requested) || requested < 1)
      ) {
        throw new BadRequestException(
          'Amount must be a positive integer or MAX',
        );
      }
      const requestedUnits =
        requested === 'MAX'
          ? maximumUnits
          : Math.ceil(requested / profile.loadUnits);
      if (maximumUnits < 1) {
        throw new BadRequestException(
          'Nicht genug Reaktorladung oder Treibstoff im Lagerraum',
        );
      }
      const units = Math.min(requestedUnits, maximumUnits);
      const amount = units * profile.loadUnits;
      for (const cost of profile.costs) {
        const item = cargoByCommodity.get(cost.commodityId)!;
        item.amount -= cost.amount * units;
        ship.cargoUsed = Math.max(0, ship.cargoUsed - cost.amount * units);
      }
      ship.reactorFuel += amount;
      await Promise.all(
        cargo.map((item) =>
          item.amount === 0 ? manager.remove(item) : manager.save(item),
        ),
      );
      await manager.save(ship);
      return this.result(ship, amount);
    });
  }

  async dischargeBattery(
    shipId: number,
    userId: number,
    requested: SpacecraftEngineeringAmount,
  ): Promise<SpacecraftEngineeringResultDto> {
    return this.dataSource.transaction(async (manager) => {
      const ship = await this.lockOwnedShip(manager, shipId, userId);
      const capacity = Math.max(
        0,
        (ship.epsMax || ship.energyMax) - ship.energy,
      );
      const amount = this.resolveAmount(
        requested,
        Math.min(ship.battery, capacity),
      );
      if (ship.battery < amount) {
        throw new BadRequestException('Not enough battery charge');
      }
      if (capacity < amount) {
        throw new BadRequestException('Not enough EPS capacity');
      }
      ship.battery -= amount;
      ship.energy += amount;
      await manager.save(ship);
      return this.result(ship, amount);
    });
  }

  private resolveAmount(
    requested: SpacecraftEngineeringAmount,
    maximum: number,
  ): number {
    if (requested === 'MAX') {
      if (maximum <= 0) throw new BadRequestException('Nothing to transfer');
      return maximum;
    }
    if (!Number.isInteger(requested) || requested <= 0) {
      throw new BadRequestException('Amount must be a positive integer or MAX');
    }
    return requested;
  }

  private async lockOwnedShip(
    manager: EntityManager,
    shipId: number,
    userId: number,
  ): Promise<Spacecraft> {
    const ship = await manager.findOne(Spacecraft, {
      where: { id: shipId, userId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!ship) throw new NotFoundException('Spacecraft not found');
    if (ship.status === SpacecraftStatus.DESTROYED) {
      throw new BadRequestException('Ship is destroyed');
    }
    return ship;
  }

  private result(
    ship: Spacecraft,
    transferred: number,
  ): SpacecraftEngineeringResultDto {
    return {
      transferred,
      energy: ship.energy,
      energyMax: ship.epsMax || ship.energyMax,
      battery: ship.battery,
      batteryMax: ship.batteryMax,
      reactorFuel: ship.reactorFuel,
      reactorFuelMax: ship.reactorFuelMax,
    };
  }
}
