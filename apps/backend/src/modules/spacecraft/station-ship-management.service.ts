import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { MessageFolder } from '../messaging/message-folder';
import { MessagingService } from '../messaging/messaging.service';
import { CargoItem } from './entities/cargo-item.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { SpacecraftTorpedoStorage } from './entities/spacecraft-torpedo-storage.entity';
import {
  Spacecraft,
  SpacecraftKind,
  StationRole,
} from './entities/spacecraft.entity';
import { reactorFuelProfile } from './reactor-fuel-profile';
import {
  ShipManagementRequest,
  ShipManagementResult,
  ShipManagementService,
  ShipManagementSource,
} from './ship-management.service';

const MANAGING_ROLES: Array<StationRole | null> = [StationRole.OUTPOST, StationRole.BASE];

/** Supplies ships docked at a station from the station's EPS, cargo and crew (STU `ManagerProviderStation`). */
@Injectable()
export class StationShipManagementService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly management: ShipManagementService,
    private readonly messaging: MessagingService,
  ) {}

  async getManagement(stationId: number, userId: number) {
    const manager = this.dataSource.manager;
    const station = await this.ownedStation(manager, stationId, userId);
    const docked = await manager.find(Spacecraft, {
      where: { dockedAtId: station.id },
      relations: { modules: true },
      order: { id: 'ASC' },
    });
    const ships = docked.filter((ship) => !this.isCloaked(ship));
    const ids = ships.map((ship) => ship.id);
    const [cargo, torpedoes, classes] = ids.length
      ? await Promise.all([
          manager.find(CargoItem, { where: { spacecraftId: In(ids) } }),
          manager.find(SpacecraftTorpedoStorage, { where: { spacecraftId: In(ids) } }),
          manager.find(ShipClassDef, {
            where: { id: In([...new Set(ships.map((ship) => ship.shipClassId))]) },
          }),
        ])
      : [[], [], []];
    const stationCargo = await manager.find(CargoItem, { where: { spacecraftId: station.id } });
    const crewMin = new Map(classes.map((shipClass) => [shipClass.id, shipClass.crewMin]));
    const classKey = new Map(classes.map((shipClass) => [shipClass.id, shipClass.key]));
    const stationStock = (commodityId: number) =>
      stationCargo.find((item) => item.commodityId === commodityId)?.amount ?? 0;
    const possibleTorpedoTypes = await Promise.all(
      ships.map((ship) =>
        this.management.possibleTorpedoTypes(
          ship,
          stationStock,
          ship.userId === station.userId
            ? torpedoes.find((entry) => entry.spacecraftId === ship.id)?.torpedoTypeId
            : null,
        ),
      ),
    );
    return {
      station: {
        id: station.id,
        name: station.name,
        energy: station.energy,
        energyMax: station.epsMax || station.energyMax,
        reloadBattery: station.reloadBattery,
        crewAvailable: Math.max(0, station.crew - station.crewRequired),
        storage: stationCargo
          .filter((item) => item.amount > 0)
          .map((item) => ({ commodityId: item.commodityId, amount: item.amount })),
      },
      ships: ships.map((ship, index) => ({
        id: ship.id,
        name: ship.name,
        shipClassId: ship.shipClassId,
        shipClassKey: classKey.get(ship.shipClassId) ?? null,
        foreign: ship.userId !== station.userId,
        crew: { current: ship.crew, max: ship.crewMax, minimum: crewMin.get(ship.shipClassId) ?? 0 },
        battery: { current: ship.battery, max: ship.batteryMax },
        reactor: {
          fuel: { current: ship.reactorFuel, max: ship.reactorFuelMax },
          profile: reactorFuelProfile(ship.modules ?? []),
        },
        torpedoes: torpedoes.find((entry) => entry.spacecraftId === ship.id) ?? null,
        possibleTorpedoTypes: possibleTorpedoTypes[index],
        cargo: {
          used: cargo
            .filter((item) => item.spacecraftId === ship.id)
            .reduce((sum, item) => sum + item.amount, 0),
          max: ship.cargoMax,
        },
        shieldsActive: this.shieldsActive(ship),
      })),
    };
  }

  async execute(stationId: number, userId: number, requests: ShipManagementRequest[]) {
    const results: ShipManagementResult[] = [];
    const notices: Array<{ ownerId: number; text: string }> = [];
    await this.dataSource.transaction(async (manager) => {
      const station = await this.ownedStation(manager, stationId, userId, true);
      const source = await this.source(manager, station);
      for (const request of requests ?? []) {
        const ship = await manager.findOne(Spacecraft, {
          where: { id: request.shipId, dockedAtId: station.id },
          relations: { modules: true },
          lock: { mode: 'pessimistic_write', tables: ['spacecraft'] },
        });
        if (!ship || this.isCloaked(ship)) {
          results.push({
            shipId: request.shipId,
            applied: [],
            rejected: ['Schiff ist nicht an der Station angedockt'],
          });
          continue;
        }
        const foreign = ship.userId !== station.userId;
        const result = await this.management.manage(manager, source, ship, request, foreign);
        results.push(result);
        if (foreign && result.applied.length > 0) {
          notices.push({
            ownerId: ship.userId,
            text: `Die Station ${station.name} versorgt die ${ship.name}: ${result.applied.join(', ')}`,
          });
        }
      }
      await manager.save(station);
    });
    for (const notice of notices) {
      await this.messaging.sendSystem(
        notice.ownerId,
        notice.text,
        undefined,
        MessageFolder.STATION,
      );
    }
    return { results };
  }

  async setBatteryReload(stationId: number, userId: number, enabled: boolean) {
    const station = await this.ownedStation(this.dataSource.manager, stationId, userId);
    station.reloadBattery = enabled;
    await this.dataSource.manager.save(station);
    return {
      reloadBattery: enabled,
      message: `Die automatische Ladung der Ersatzbatterie ist nun ${enabled ? 'aktiv' : 'inaktiv'}`,
    };
  }

  private async ownedStation(
    manager: EntityManager,
    stationId: number,
    userId: number,
    lock = false,
  ): Promise<Spacecraft> {
    const station = await manager.findOne(Spacecraft, {
      where: { id: stationId, userId, kind: SpacecraftKind.STATION },
      ...(lock ? { lock: { mode: 'pessimistic_write' as const, tables: ['spacecraft'] } } : {}),
    });
    if (!station) throw new NotFoundException('Station nicht gefunden');
    return station;
  }

  /** Only outposts and bases with their full crew manage ships (STU `canManageShips`). */
  private assertCanManage(station: Spacecraft) {
    if (!MANAGING_ROLES.includes(station.stationRole)) {
      throw new BadRequestException('Diese Station kann keine Schiffe verwalten');
    }
    if (station.crewRequired > 0 && station.crew < station.crewRequired) {
      throw new BadRequestException('Die Station hat nicht genug Crew');
    }
  }

  private async source(manager: EntityManager, station: Spacecraft): Promise<ShipManagementSource> {
    this.assertCanManage(station);
    const crewRepo = manager.getRepository(CrewAssignment);
    const cargoRepo = manager.getRepository(CargoItem);
    const stock = new Map(
      (await cargoRepo.find({ where: { spacecraftId: station.id } })).map((item) => [
        item.commodityId,
        item,
      ]),
    );
    return {
      getEps: () => station.energy,
      lowerEps: async (amount) => {
        station.energy -= amount;
      },
      availableCrew: async () => Math.max(0, station.crew - station.crewRequired),
      freeCrewQuarters: async () => Math.max(0, station.crewMax - station.crew),
      moveCrewToShip: async (shipId, amount) => {
        const members = await crewRepo.find({
          where: { spacecraftId: station.id },
          order: { crewId: 'ASC' },
          take: amount,
        });
        for (const member of members) {
          member.spacecraftId = shipId;
          member.slot = null;
        }
        await crewRepo.save(members);
        station.crew -= amount;
      },
      moveCrewFromShip: async (shipId, amount) => {
        const members = await crewRepo.find({
          where: { spacecraftId: shipId, userId: station.userId },
          order: { crewId: 'ASC' },
          take: amount,
        });
        for (const member of members) {
          member.spacecraftId = station.id;
          member.slot = null;
        }
        await crewRepo.save(members);
        station.crew += members.length;
      },
      getStock: (commodityId) => stock.get(commodityId)?.amount ?? 0,
      lowerStock: async (commodityId, amount) => {
        const item = stock.get(commodityId);
        if (!item || item.amount < amount) {
          throw new BadRequestException('Nicht genug Waren im Stationslager');
        }
        item.amount -= amount;
        station.cargoUsed = Math.max(0, station.cargoUsed - amount);
        if (item.amount === 0) {
          await cargoRepo.remove(item);
          stock.delete(commodityId);
        } else {
          await cargoRepo.save(item);
        }
      },
    };
  }

  private shieldsActive(ship: Spacecraft): boolean {
    return (ship.runtimeSystems as Record<string, { active?: boolean }>)?.SHIELDS?.active === true;
  }

  private isCloaked(ship: Spacecraft): boolean {
    return (ship.runtimeSystems as Record<string, { active?: boolean }>)?.CLOAK?.active === true;
  }
}
