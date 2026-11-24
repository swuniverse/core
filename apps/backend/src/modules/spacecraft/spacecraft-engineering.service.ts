import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  SpacecraftEngineeringAmount,
  SpacecraftEngineeringResultDto,
  SpacecraftReactorTransferResultDto,
  SpacecraftReactorTransferTargetDto,
} from '@swuniverse/shared';
import { DataSource, EntityManager, In } from 'typeorm';
import { MessageFolder } from '../messaging/message-folder';
import { MessagingService } from '../messaging/messaging.service';
import { CargoItem } from './entities/cargo-item.entity';
import { Spacecraft, SpacecraftStatus } from './entities/spacecraft.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import { reactorFuelProfile } from './reactor-fuel-profile';
import { resolveSpacecraftLocation } from './spacecraft-field';
import { initializeSpacecraftRuntimeSystems } from './spacecraft-runtime-state.service';

const REACTOR_TRANSFER_MODULE = 'Hypermaterie-Transferkoppler';

@Injectable()
export class SpacecraftEngineeringService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly messaging: MessagingService,
  ) {}

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

  async reactorTransferTargets(
    shipId: number,
    userId: number,
  ): Promise<SpacecraftReactorTransferTargetDto[]> {
    const source = await this.dataSource.manager.findOne(Spacecraft, {
      where: { id: shipId, userId },
      relations: { modules: true, location: { galaxyField: true, systemField: true } },
    });
    if (!source) throw new NotFoundException('Spacecraft not found');
    this.assertReactorTransferAvailable(source);
    const location = resolveSpacecraftLocation(source);
    if (!location) return [];
    const ships = await this.dataSource.manager.find(Spacecraft, {
      relations: { modules: true, location: { galaxyField: true, systemField: true } },
    });
    return ships
      .filter(
        (target) =>
          target.id !== source.id &&
          target.status !== SpacecraftStatus.DESTROYED &&
          this.samePosition(source, target) &&
          !initializeSpacecraftRuntimeSystems(target).CLOAK?.active,
      )
      .map((target) => ({
        shipId: target.id,
        name: target.name,
        reactorFuel: target.reactorFuel,
        reactorFuelMax: target.reactorFuelMax,
      }));
  }

  async transferReactorCharge(
    shipId: number,
    userId: number,
    transfers: Array<{ targetShipId: number; amount: number }>,
  ): Promise<SpacecraftReactorTransferResultDto> {
    if (!Array.isArray(transfers) || transfers.length === 0) {
      throw new BadRequestException('Es wurden keine Schiffe ausgewählt');
    }
    const requestedIds = [...new Set(transfers.map((item) => item.targetShipId))];
    if (
      requestedIds.includes(shipId) ||
      requestedIds.length !== transfers.length ||
      transfers.some(
        (item) =>
          !Number.isInteger(item.targetShipId) ||
          !Number.isInteger(item.amount) ||
          item.amount < 1,
      )
    ) {
      throw new BadRequestException('Ungültige Transferauswahl');
    }
    const outcome = await this.dataSource.transaction(async (manager) => {
      const ships = await manager.find(Spacecraft, {
        where: [{ id: shipId }, ...requestedIds.map((id) => ({ id }))],
        relations: { modules: true, location: { galaxyField: true, systemField: true } },
        lock: { mode: 'pessimistic_write', tables: ['spacecraft'] },
      });
      const source = ships.find((ship) => ship.id === shipId && ship.userId === userId);
      if (!source) throw new NotFoundException('Spacecraft not found');
      this.assertReactorTransferAvailable(source);
      let transferred = 0;
      const notices: Array<{ userId: number; targetName: string }> = [];
      for (const request of transfers) {
        const target = ships.find((ship) => ship.id === request.targetShipId);
        if (
          !target ||
          target.status === SpacecraftStatus.DESTROYED ||
          !this.samePosition(source, target) ||
          initializeSpacecraftRuntimeSystems(target).CLOAK?.active
        ) {
          continue;
        }
        const amount = Math.min(
          request.amount,
          source.reactorFuel,
          Math.max(0, target.reactorFuelMax - target.reactorFuel),
        );
        if (amount < 1) continue;
        source.reactorFuel -= amount;
        target.reactorFuel += amount;
        transferred += amount;
        if (target.userId !== source.userId) {
          notices.push({ userId: target.userId, targetName: target.name });
        }
      }
      if (transferred < 1) {
        throw new BadRequestException('Keine Reaktorladung übertragen');
      }
      await manager.save(ships);
      const location = resolveSpacecraftLocation(source);
      return { source, transferred, notices, location };
    });
    for (const notice of outcome.notices) {
      await this.messaging.sendSystem(
        notice.userId,
        `Die ${outcome.source.name} hat in Sektor ${outcome.location ? `${outcome.location.x}|${outcome.location.y}` : '?'} den Reaktor der ${notice.targetName} aufgeladen`,
        undefined,
        MessageFolder.TRADE,
      );
    }
    return {
      transferred: outcome.transferred,
      reactorFuel: outcome.source.reactorFuel,
      message: `${outcome.transferred} Reaktorladung übertragen`,
    };
  }

  async boostHyperdrive(
    shipId: number,
    userId: number,
  ): Promise<SpacecraftEngineeringResultDto> {
    return this.dataSource.transaction(async (manager) => {
      const ship = await this.lockOwnedShip(manager, shipId, userId);
      const modules = await manager.find(SpacecraftModule, {
        where: { spacecraftId: ship.id },
      });
      const booster = modules.find(
        (module) =>
          module.moduleType.toLowerCase() === 'hyperantriebs-notladegerät' &&
          module.isActive &&
          module.integrity > 0,
      );
      if (!booster) {
        throw new BadRequestException(
          'Hyperantriebs-Notladegerät ist nicht verfügbar',
        );
      }
      const systems = initializeSpacecraftRuntimeSystems(ship);
      const runtime = systems.HYPERDRIVE_BOOSTER;
      if (!runtime) {
        throw new BadRequestException(
          'Hyperantriebs-Notladegerät ist nicht verfügbar',
        );
      }
      if (runtime.cooldown && runtime.cooldown > Date.now()) {
        throw new BadRequestException(
          'Hyperantriebs-Notladegerät ist noch nicht bereit',
        );
      }
      if (!runtime.active) {
        throw new BadRequestException(
          'Hyperantriebs-Notladegerät ist nicht verfügbar',
        );
      }
      if (ship.energy < 100) {
        throw new BadRequestException('Not enough EPS capacity');
      }
      const amount = Math.min(
        Math.round(ship.warpdriveMax / 3),
        Math.max(0, ship.warpdriveMax - ship.warpdrive),
      );
      ship.energy -= 100;
      ship.warpdrive += amount;
      runtime.active = false;
      runtime.cooldown = Date.now() + 24 * 60 * 60 * 1000;
      ship.runtimeSystems = systems;
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

  private assertReactorTransferAvailable(ship: Spacecraft): void {
    const hyperdriveActive =
      (ship.runtimeSystems?.WARPDRIVE as { active?: boolean } | undefined)
        ?.active === true;
    const shieldsActive =
      (ship.runtimeSystems?.SHIELDS as { active?: boolean } | undefined)
        ?.active === true;
    const systems = initializeSpacecraftRuntimeSystems(ship);
    const transfer = systems.REACTOR_CHARGE_TRANSFER;
    const module = ship.modules?.find(
      (candidate) => candidate.moduleType === REACTOR_TRANSFER_MODULE,
    );
    if (!module || !module.isActive || module.integrity <= 0 || !transfer?.active) {
      throw new BadRequestException(
        'Dieses Schiff verfügt über keinen einsatzbereiten Hypermaterie-Transferkoppler',
      );
    }
    if (
      hyperdriveActive ||
      shieldsActive ||
      systems.WARPDRIVE?.active ||
      systems.SHIELDS?.active
    ) {
      throw new BadRequestException(
        'Hyperantrieb und Schilde müssen deaktiviert sein',
      );
    }
    if (ship.reactorFuel <= 0) {
      throw new BadRequestException('Keine Reaktorladung vorhanden');
    }
  }

  private samePosition(source: Spacecraft, target: Spacecraft): boolean {
    const sourceLocation = resolveSpacecraftLocation(source);
    const targetLocation = resolveSpacecraftLocation(target);
    return (
      sourceLocation != null &&
      targetLocation != null &&
      sourceLocation.scope === targetLocation.scope &&
      sourceLocation.x === targetLocation.x &&
      sourceLocation.y === targetLocation.y &&
      ('systemId' in sourceLocation
        ? 'systemId' in targetLocation &&
          sourceLocation.systemId === targetLocation.systemId
        : true)
    );
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
