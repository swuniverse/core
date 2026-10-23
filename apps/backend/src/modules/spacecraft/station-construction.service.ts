import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Faction } from '@swuniverse/shared';
import { DataSource, EntityManager } from 'typeorm';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { CargoItem } from './entities/cargo-item.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import {
  AlertState,
  Spacecraft,
  SpacecraftKind,
  SpacecraftOperatingMode,
  SpacecraftStatus,
  StationRole,
} from './entities/spacecraft.entity';

const BUILDING_MATERIALS_ID = 2;
const DURANIUM_ID = 21;
const WORKBEE_COMMODITY_IDS = [20061, 20062, 20063, 20064, 20065];
const WORKBEE_COUNT = 5;
const CONSTRUCTION_LIMIT = 2;

@Injectable()
export class StationConstructionService {
  constructor(private readonly dataSource: DataSource) {}

  async build(shipId: number, userId: number) {
    return this.dataSource.transaction(async (manager) => {
      const shipRepo = manager.getRepository(Spacecraft);
      const ship = await shipRepo.findOne({
        where: { id: shipId, userId },
        relations: ['location', 'location.systemField', 'location.systemField.starSystem', 'location.galaxyField', 'user'],
        lock: { mode: 'pessimistic_write', tables: ['spacecraft'] },
      });
      if (!ship) throw new NotFoundException('Spacecraft not found');
      this.assertShipCanBuild(ship);
      if (this.isWormhole(ship)) {
        throw new BadRequestException('In Wurmlöchern können keine Stationen errichtet werden');
      }
      if (this.fieldBlocksConstruction(ship)) {
        throw new BadRequestException('In diesem Sektor kann keine Station errichtet werden');
      }
      const stations = await shipRepo.find({
        where: { locationId: ship.locationId, kind: SpacecraftKind.STATION },
      });
      if (stations.length > 0) {
        throw new BadRequestException('Hier ist bereits eine Station errichtet');
      }
      if (
        (await shipRepo.countBy({
          userId,
          kind: SpacecraftKind.STATION,
          stationRole: StationRole.CONSTRUCTION,
        })) >= CONSTRUCTION_LIMIT
      ) {
        throw new BadRequestException('Es können nur 2 Konstrukte errichtet werden');
      }

      const classRepo = manager.getRepository(ShipClassDef);
      const factionPrefix = ship.user?.faction === Faction.GALACTIC_EMPIRE ? 'EMPIRE' : 'REBEL';
      const workbeeClass = await classRepo.findOneBy({ key: `${factionPrefix}_WORKBEE_DROID` });
      const constructionClass = await classRepo.findOneBy({ key: `${factionPrefix}_CONSTRUCTION` });
      if (!workbeeClass || !constructionClass) {
        throw new BadRequestException('Stationsklassen sind nicht verfügbar');
      }

      const cargoRepo = manager.getRepository(CargoItem);
      const cargo = await cargoRepo.find({ where: { spacecraftId: ship.id } });
      const workbeeCargo = cargo.filter((item) => WORKBEE_COMMODITY_IDS.includes(item.commodityId));
      if (workbeeCargo.reduce((sum, item) => sum + item.amount, 0) < WORKBEE_COUNT) {
        throw new BadRequestException('Es werden 5 Workbees im Lager benötigt');
      }
      this.requireCargo(cargo, BUILDING_MATERIALS_ID, 100, '100 Doonium werden benötigt');
      this.requireCargo(cargo, DURANIUM_ID, 50, '50 Durastahl-Legierung werden benötigt');
      const energyCost = workbeeClass.epsBase * WORKBEE_COUNT;
      if (ship.energy < energyCost) {
        throw new BadRequestException(`Es wird insgesamt ${energyCost} Energie für den Start der 5 Workbees benötigt`);
      }
      const requiredCrew = workbeeClass.crewMin * WORKBEE_COUNT;
      const assignedCrew = await manager.getRepository(CrewAssignment).find({
        where: { spacecraftId: ship.id },
      });
      const excessCrew = Math.max(0, assignedCrew.length - ship.crewRequired);
      if (excessCrew < requiredCrew) {
        throw new BadRequestException(`Nicht genügend Crew für den Start der 5 Workbees vorhanden, benötigt wird ${requiredCrew}`);
      }

      ship.energy -= energyCost;
      await shipRepo.save(ship);
      this.consumeCargo(cargo, BUILDING_MATERIALS_ID, 100);
      this.consumeCargo(cargo, DURANIUM_ID, 50);
      this.consumeWorkbees(workbeeCargo, WORKBEE_COUNT);
      await cargoRepo.save(cargo.filter((item) => item.amount >= 0));

      const station = await shipRepo.save(
        shipRepo.create({
          name: 'Konstrukt',
          shipClassId: constructionClass.id,
          userId,
          locationId: ship.locationId,
          location: ship.location,
          kind: SpacecraftKind.STATION,
          stationRole: StationRole.CONSTRUCTION,
          dockCapacity: 50,
          status: SpacecraftStatus.IDLE,
          alertState: AlertState.GREEN,
          operatingMode: SpacecraftOperatingMode.NORMAL,
          hull: constructionClass.hullBase,
          hullMax: constructionClass.hullBase,
          shields: 0,
          shieldsMax: constructionClass.shieldBase,
          energy: 0,
          energyMax: constructionClass.epsBase,
          crew: 0,
          crewMax: constructionClass.crewMax,
          cargoUsed: 0,
          cargoMax: constructionClass.cargoCapacity,
          battery: 0,
          batteryMax: constructionClass.batteryBase,
          reactorFuel: 0,
          reactorFuelMax: constructionClass.reactorBase * 10,
          warpSpeed: 0,
          warpdrive: 0,
          warpdriveMax: 0,
          runtimeSystems: {},
        }),
      );

      const workbees: Spacecraft[] = [];
      for (let index = 0; index < WORKBEE_COUNT; index++) {
        workbees.push(
          await shipRepo.save(
            shipRepo.create({
              name: `${workbeeClass.name} ${index + 1}`,
              shipClassId: workbeeClass.id,
              userId,
              locationId: ship.locationId,
              location: ship.location,
              kind: SpacecraftKind.SHIP,
              stationRole: null,
              dockedAtId: station.id,
              dockCapacity: 0,
              status: SpacecraftStatus.IDLE,
              alertState: AlertState.GREEN,
              operatingMode: SpacecraftOperatingMode.NORMAL,
              hull: workbeeClass.hullBase,
              hullMax: workbeeClass.hullBase,
              shields: 0,
              shieldsMax: workbeeClass.shieldBase,
              energy: workbeeClass.epsBase,
              energyMax: workbeeClass.epsBase,
              crew: workbeeClass.crewMin,
              crewMax: workbeeClass.crewMax,
              cargoUsed: 0,
              cargoMax: workbeeClass.cargoCapacity,
              battery: workbeeClass.batteryBase,
              batteryMax: workbeeClass.batteryBase,
              reactorFuel: workbeeClass.reactorBase * 10,
              reactorFuelMax: workbeeClass.reactorBase * 10,
              warpSpeed: 0,
              warpdrive: 0,
              warpdriveMax: 0,
              runtimeSystems: {},
            }),
          ),
        );
      }
      await this.transferCrew(manager, assignedCrew, workbees, requiredCrew);
      return { station, workbees };
    });
  }

  async remove(stationId: number, userId: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Spacecraft);
      const station = await repository.findOne({
        where: { id: stationId, userId },
        lock: { mode: 'pessimistic_write', tables: ['spacecraft'] },
      });
      if (!station || station.kind !== SpacecraftKind.STATION || station.stationRole !== StationRole.CONSTRUCTION) {
        throw new NotFoundException('Konstrukt nicht gefunden');
      }
      const workbees = await repository.find({ where: { dockedAtId: station.id } });
      for (const workbee of workbees) workbee.dockedAtId = null;
      if (workbees.length > 0) await repository.save(workbees);
      await repository.remove(station);
    });
  }

  private assertShipCanBuild(ship: Spacecraft): void {
    if (ship.kind === SpacecraftKind.STATION || ship.status !== SpacecraftStatus.IDLE) {
      throw new BadRequestException('Schiff muss betriebsbereit sein');
    }
    const shuttleRamp = ship.runtimeSystems?.SHUTTLE_RAMP as { integrity?: number } | undefined;
    if (!shuttleRamp || (shuttleRamp.integrity ?? 0) <= 0) throw new BadRequestException('Die Shuttle-Rampe ist zerstört');
    if (ship.shields > 0) throw new BadRequestException('Die Schilde sind aktiviert');
    const cloak = ship.runtimeSystems?.CLOAK as { active?: boolean } | undefined;
    if (cloak?.active) throw new BadRequestException('Die Tarnung ist aktiviert');
  }

  private fieldBlocksConstruction(ship: Spacecraft): boolean {
    const effects = ship.location?.systemField?.effects ?? ship.location?.galaxyField?.effects ?? [];
    return effects.includes('NO_STATION_CONSTRUCTION');
  }

  private isWormhole(ship: Spacecraft): boolean {
    return Boolean((ship.location?.systemField?.starSystem as { isWormhole?: boolean } | undefined)?.isWormhole);
  }

  private requireCargo(cargo: CargoItem[], commodityId: number, amount: number, message: string): void {
    if ((cargo.find((item) => item.commodityId === commodityId)?.amount ?? 0) < amount) throw new BadRequestException(message);
  }

  private consumeCargo(cargo: CargoItem[], commodityId: number, amount: number): void {
    const item = cargo.find((entry) => entry.commodityId === commodityId)!;
    item.amount -= amount;
  }

  private consumeWorkbees(cargo: CargoItem[], amount: number): void {
    let remaining = amount;
    for (const item of cargo) {
      const used = Math.min(item.amount, remaining);
      item.amount -= used;
      remaining -= used;
      if (remaining === 0) return;
    }
  }

  private async transferCrew(manager: EntityManager, crew: CrewAssignment[], workbees: Spacecraft[], amount: number): Promise<void> {
    if (amount === 0) return;
    const assignments = crew.slice(-amount);
    assignments.forEach((assignment, index) => {
      assignment.spacecraftId = workbees[index].id;
      assignment.slot = null;
    });
    await manager.getRepository(CrewAssignment).save(assignments);
  }
}
