import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ColonyStorage } from '../colony/entities/colony-storage.entity';
import { GameDataService } from '../game-data/game-data.service';
import { ColonyCrewService } from '../colony/colony-crew.service';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { CargoItem } from './entities/cargo-item.entity';
import { Spacecraft, SpacecraftStatus } from './entities/spacecraft.entity';
import { SpacecraftWreck } from './entities/spacecraft-wreck.entity';
import { SpacecraftTorpedoStorage } from './entities/spacecraft-torpedo-storage.entity';
import { ShipColonyContextService } from './ship-colony-context.service';
import { SpacecraftTorpedoService } from './spacecraft-torpedo.service';
import { sameSpacecraftLocation } from './spacecraft-field';

@Injectable()
export class TransferService {
  constructor(
    @InjectRepository(CargoItem)
    private readonly cargoRepo: Repository<CargoItem>,
    private readonly contextService: ShipColonyContextService,
    private readonly dataSource: DataSource,
    private readonly torpedoService: SpacecraftTorpedoService,
    private readonly crewService: ColonyCrewService,
    private readonly gameData: GameDataService,
  ) {}

  async loadCargo(
    shipId: number,
    userId: number,
    colonyId: number,
    commodityId: number,
    amount: number,
  ): Promise<CargoItem> {
    return this.dataSource.transaction(async (manager) => {
      const { ship } = await this.contextService.requireContext(
        shipId,
        userId,
        colonyId,
        manager,
      );
      this.contextService.chargeEnergy(ship, amount);
      const storage = await manager.findOne(ColonyStorage, {
        where: { colonyId, commodityId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!storage || storage.amount < amount) {
        throw new BadRequestException('Not enough resources in colony');
      }
      const cargoRepo = manager.getRepository(CargoItem);
      const currentCargo = await this.getCargoUsed(shipId, cargoRepo);
      if (currentCargo + amount > ship.cargoMax) {
        throw new BadRequestException('Not enough cargo space');
      }
      storage.amount -= amount;
      await manager.save(storage);
      let cargoItem = await cargoRepo.findOne({
        where: { spacecraftId: shipId, commodityId },
      });
      cargoItem ??= cargoRepo.create({
        spacecraftId: ship.id,
        commodityId,
        amount: 0,
      });
      cargoItem.amount += amount;
      await cargoRepo.save(cargoItem);
      ship.cargoUsed = currentCargo + amount;
      await manager.save(ship);
      return cargoItem;
    });
  }

  async loadCrew(
    shipId: number,
    userId: number,
    colonyId: number,
    amount: number,
  ): Promise<void> {
    const { ship, colony } = await this.contextService.requireContext(
      shipId,
      userId,
      colonyId,
    );
    this.contextService.chargeEnergy(ship, amount);
    await this.crewService.transferCrewFromColonyToShip(colony, ship, amount);
  }

  async unloadCrew(
    shipId: number,
    userId: number,
    colonyId: number,
    amount: number,
  ): Promise<void> {
    const { ship, colony } = await this.contextService.requireContext(
      shipId,
      userId,
      colonyId,
    );
    this.contextService.chargeEnergy(ship, amount);
    await this.crewService.transferCrewFromShipToColony(colony, ship, amount);
  }

  async unloadCargo(
    shipId: number,
    userId: number,
    colonyId: number,
    commodityId: number,
    amount: number,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const { ship, colony } = await this.contextService.requireContext(
        shipId,
        userId,
        colonyId,
        manager,
      );
      this.contextService.chargeEnergy(ship, amount);
      const cargoRepo = manager.getRepository(CargoItem);
      const cargoItem = await cargoRepo.findOne({
        where: { spacecraftId: shipId, commodityId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!cargoItem || cargoItem.amount < amount) {
        throw new BadRequestException('Not enough cargo on ship');
      }
      const storageRepo = manager.getRepository(ColonyStorage);
      let storage = await storageRepo.findOne({
        where: { colonyId, commodityId },
        lock: { mode: 'pessimistic_write' },
      });
      const totalStorage = await storageRepo
        .createQueryBuilder('storage')
        .select('COALESCE(SUM(storage.amount), 0)', 'total')
        .where('storage.colonyId = :colonyId', { colonyId })
        .getRawOne<{ total: string }>();
      if (Number(totalStorage?.total ?? 0) + amount > colony.storageMax) {
        throw new BadRequestException('Not enough colony storage capacity');
      }
      cargoItem.amount -= amount;
      if (cargoItem.amount === 0) await cargoRepo.remove(cargoItem);
      else await cargoRepo.save(cargoItem);
      storage ??= storageRepo.create({ colonyId, commodityId, amount: 0 });
      storage.amount += amount;
      await storageRepo.save(storage);
      ship.cargoUsed = await this.getCargoUsed(shipId, cargoRepo);
      await manager.save(ship);
    });
  }

  async getShipTransferQuote(
    shipId: number,
    userId: number,
    targetShipId: number,
  ): Promise<{
    available: boolean;
    reason: string | null;
    sourceCargo: Array<CargoItem & { commodityName: string }>;
    targetCargo: Array<CargoItem & { commodityName: string }>;
    sourceUsed: number;
    sourceMax: number;
    targetUsed: number;
    targetMax: number;
    sourceCrew: number;
    sourceCrewMax: number;
    targetCrew: number;
    targetCrewMax: number;
    crewTransferAvailable: boolean;
    crewTransferReason: string | null;
    sourceTorpedoes: SpacecraftTorpedoStorage | null;
    targetTorpedoes: SpacecraftTorpedoStorage | null;
    torpedoTransferAvailable: boolean;
    torpedoTransferReason: string | null;
  }> {
    const sourceShip = await this.dataSource.getRepository(Spacecraft).findOne({
      where: { id: shipId, userId },
      relations: { location: { galaxyField: true, systemField: true } },
    });
    const targetShip = await this.dataSource.getRepository(Spacecraft).findOne({
      where: { id: targetShipId },
      relations: { location: { galaxyField: true, systemField: true } },
    });
    if (!sourceShip || !targetShip)
      throw new BadRequestException('Schiff nicht gefunden');
    const sameField = sameSpacecraftLocation(sourceShip, targetShip);
    const systems = (ship: Spacecraft) =>
      ship.runtimeSystems as Record<string, { active?: boolean }>;
    const reason =
      sourceShip.status !== SpacecraftStatus.IDLE ||
      targetShip.status !== SpacecraftStatus.IDLE
        ? 'Beide Schiffe müssen im Raum stehen'
        : !sameField
          ? 'Schiffe müssen sich auf demselben Feld befinden'
          : systems(sourceShip).WARPDRIVE?.active ||
              systems(targetShip).WARPDRIVE?.active
            ? 'Hyperantrieb muss deaktiviert sein'
            : systems(sourceShip).SHIELDS?.active ||
                systems(targetShip).SHIELDS?.active
              ? 'Schilde müssen deaktiviert sein'
              : null;
    const [
      sourceCargo,
      targetCargo,
      sourceUsed,
      targetUsed,
      sourceCrew,
      targetCrew,
      sourceTorpedoes,
      targetTorpedoes,
    ] = await Promise.all([
      this.cargoRepo.find({
        where: { spacecraftId: sourceShip.id },
        order: { commodityId: 'ASC' },
      }),
      this.cargoRepo.find({
        where: { spacecraftId: targetShip.id },
        order: { commodityId: 'ASC' },
      }),
      this.getCargoUsed(sourceShip.id),
      this.getCargoUsed(targetShip.id),
      this.dataSource
        .getRepository(CrewAssignment)
        .count({ where: { spacecraftId: sourceShip.id } }),
      this.dataSource
        .getRepository(CrewAssignment)
        .count({ where: { spacecraftId: targetShip.id } }),
      this.dataSource
        .getRepository(SpacecraftTorpedoStorage)
        .findOneBy({ spacecraftId: sourceShip.id }),
      this.dataSource
        .getRepository(SpacecraftTorpedoStorage)
        .findOneBy({ spacecraftId: targetShip.id }),
    ]);
    return {
      available: reason === null,
      reason,
      sourceCargo: this.withCommodityNames(sourceCargo),
      targetCargo: this.withCommodityNames(targetCargo),
      sourceUsed,
      sourceMax: sourceShip.cargoMax,
      targetUsed,
      targetMax: targetShip.cargoMax,
      sourceCrew,
      sourceCrewMax: sourceShip.crewMax,
      targetCrew,
      targetCrewMax: targetShip.crewMax,
      crewTransferAvailable: reason === null,
      crewTransferReason: reason,
      sourceTorpedoes,
      targetTorpedoes,
      // ponytail: alliances do not exist in SWU yet; same owner is the available STU-friend equivalent.
      torpedoTransferAvailable:
        reason === null && sourceShip.userId === targetShip.userId,
      torpedoTransferReason:
        reason ??
        (sourceShip.userId === targetShip.userId
          ? null
          : 'Torpedotransfer nur zu eigenen Schiffen, bis Allianzen verfügbar sind'),
    };
  }

  async transferShipCrew(
    shipId: number,
    userId: number,
    targetShipId: number,
    amount: number,
    direction: 'TO_TARGET' | 'FROM_TARGET',
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const ships = await manager.getRepository(Spacecraft).find({
        where: [{ id: shipId, userId }, { id: targetShipId }],
        relations: { location: { galaxyField: true, systemField: true } },
        lock: { mode: 'pessimistic_write' },
      });
      const sourceShip = ships.find((ship) => ship.id === shipId);
      const targetShip = ships.find((ship) => ship.id === targetShipId);
      if (!sourceShip || !targetShip)
        throw new BadRequestException('Schiff nicht gefunden');
      const sameField = sameSpacecraftLocation(sourceShip, targetShip);
      const systems = (ship: Spacecraft) =>
        ship.runtimeSystems as Record<string, { active?: boolean }>;
      if (
        !sameField ||
        sourceShip.status !== SpacecraftStatus.IDLE ||
        targetShip.status !== SpacecraftStatus.IDLE
      )
        throw new BadRequestException(
          'Schiffe müssen sich auf demselben Feld befinden',
        );
      if (
        systems(sourceShip).WARPDRIVE?.active ||
        systems(targetShip).WARPDRIVE?.active
      )
        throw new BadRequestException('Hyperantrieb muss deaktiviert sein');
      if (
        systems(sourceShip).SHIELDS?.active ||
        systems(targetShip).SHIELDS?.active
      )
        throw new BadRequestException('Schilde müssen deaktiviert sein');
      const from = direction === 'TO_TARGET' ? sourceShip : targetShip;
      const to = direction === 'TO_TARGET' ? targetShip : sourceShip;
      if (direction === 'TO_TARGET')
        this.contextService.chargeEnergy(sourceShip, amount);
      const crewRepo = manager.getRepository(CrewAssignment);
      const crew = await crewRepo.find({
        where: { spacecraftId: from.id },
        order: { crewId: 'ASC' },
        lock: { mode: 'pessimistic_write' },
      });
      const targetCrew = await crewRepo.count({
        where: { spacecraftId: to.id },
      });
      if (crew.length < amount)
        throw new BadRequestException('Nicht genug Crew an Bord');
      if (targetCrew + amount > to.crewMax)
        throw new BadRequestException('Nicht genug Crewkapazität');
      for (const assignment of crew.slice(0, amount))
        assignment.spacecraftId = to.id;
      await crewRepo.save(crew.slice(0, amount));
      from.crew = crew.length - amount;
      to.crew = targetCrew + amount;
      await manager.save([from, to]);
    });
  }

  async transferShipTorpedoes(
    shipId: number,
    userId: number,
    targetShipId: number,
    amount: number,
    direction: 'TO_TARGET' | 'FROM_TARGET',
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const ships = await manager.getRepository(Spacecraft).find({
        where: [{ id: shipId, userId }, { id: targetShipId }],
        relations: { location: { galaxyField: true, systemField: true } },
        lock: { mode: 'pessimistic_write' },
      });
      const sourceShip = ships.find((ship) => ship.id === shipId);
      const targetShip = ships.find((ship) => ship.id === targetShipId);
      if (!sourceShip || !targetShip)
        throw new BadRequestException('Schiff nicht gefunden');
      if (sourceShip.userId !== targetShip.userId)
        throw new BadRequestException(
          'Torpedotransfer nur zu eigenen Schiffen, bis Allianzen verfügbar sind',
        );
      const sameField = sameSpacecraftLocation(sourceShip, targetShip);
      const systems = (ship: Spacecraft) =>
        ship.runtimeSystems as Record<string, { active?: boolean }>;
      if (
        !sameField ||
        sourceShip.status !== SpacecraftStatus.IDLE ||
        targetShip.status !== SpacecraftStatus.IDLE
      )
        throw new BadRequestException(
          'Schiffe müssen sich auf demselben Feld befinden',
        );
      if (
        systems(sourceShip).WARPDRIVE?.active ||
        systems(targetShip).WARPDRIVE?.active
      )
        throw new BadRequestException('Hyperantrieb muss deaktiviert sein');
      if (
        systems(sourceShip).SHIELDS?.active ||
        systems(targetShip).SHIELDS?.active
      )
        throw new BadRequestException('Schilde müssen deaktiviert sein');
      const from = direction === 'TO_TARGET' ? sourceShip : targetShip;
      const to = direction === 'TO_TARGET' ? targetShip : sourceShip;
      if (direction === 'TO_TARGET')
        this.contextService.chargeEnergy(sourceShip, amount);
      const repo = manager.getRepository(SpacecraftTorpedoStorage);
      const fromStorage = await repo.findOne({
        where: { spacecraftId: from.id, isActive: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!fromStorage || fromStorage.amount < amount)
        throw new BadRequestException('Nicht genug Torpedos geladen');
      let toStorage = await repo.findOne({
        where: {
          spacecraftId: to.id,
          torpedoTypeId: fromStorage.torpedoTypeId,
        },
        lock: { mode: 'pessimistic_write' },
      });
      const capacity = await this.torpedoService.getCapacity(to);
      const currentAmount = (
        await repo.find({ where: { spacecraftId: to.id } })
      ).reduce((sum, storage) => sum + storage.amount, 0);
      if (currentAmount + amount > capacity)
        throw new BadRequestException('Nicht genug Torpedokapazität');
      toStorage ??= repo.create({
        spacecraftId: to.id,
        torpedoTypeId: fromStorage.torpedoTypeId,
        commodityId: fromStorage.commodityId,
        amount: 0,
        isActive: false,
      });
      toStorage.torpedoTypeId = fromStorage.torpedoTypeId;
      toStorage.commodityId = fromStorage.commodityId;
      fromStorage.amount -= amount;
      toStorage.amount += amount;
      await repo.save([fromStorage, toStorage]);
    });
  }

  async transferShipCargo(
    shipId: number,
    userId: number,
    targetShipId: number,
    commodityId: number,
    amount: number,
    direction: 'TO_TARGET' | 'FROM_TARGET',
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const ships = await manager.getRepository(Spacecraft).find({
        where: [{ id: shipId, userId }, { id: targetShipId }],
        relations: { location: { galaxyField: true, systemField: true } },
        lock: { mode: 'pessimistic_write' },
      });
      const sourceShip = ships.find((ship) => ship.id === shipId);
      const targetShip = ships.find((ship) => ship.id === targetShipId);
      if (!sourceShip || !targetShip)
        throw new BadRequestException('Schiff nicht gefunden');
      if (
        sourceShip.status !== SpacecraftStatus.IDLE ||
        targetShip.status !== SpacecraftStatus.IDLE
      )
        throw new BadRequestException('Beide Schiffe müssen im Raum stehen');
      const sameField = sameSpacecraftLocation(sourceShip, targetShip);
      if (!sameField)
        throw new BadRequestException(
          'Schiffe müssen sich auf demselben Feld befinden',
        );
      const systems = (ship: Spacecraft) =>
        ship.runtimeSystems as Record<string, { active?: boolean }>;
      if (
        systems(sourceShip).WARPDRIVE?.active ||
        systems(targetShip).WARPDRIVE?.active
      )
        throw new BadRequestException('Hyperantrieb muss deaktiviert sein');
      if (
        systems(sourceShip).SHIELDS?.active ||
        systems(targetShip).SHIELDS?.active
      )
        throw new BadRequestException('Schilde müssen deaktiviert sein');
      const from = direction === 'TO_TARGET' ? sourceShip : targetShip;
      const to = direction === 'TO_TARGET' ? targetShip : sourceShip;
      if (direction === 'TO_TARGET')
        this.contextService.chargeEnergy(sourceShip, amount);
      const cargoRepo = manager.getRepository(CargoItem);
      const item = await cargoRepo.findOne({
        where: { spacecraftId: from.id, commodityId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!item || item.amount < amount)
        throw new BadRequestException('Nicht genug Waren im Lagerraum');
      const used = await this.getCargoUsed(to.id, cargoRepo);
      if (used + amount > to.cargoMax)
        throw new BadRequestException('Nicht genug Lagerraum');
      item.amount -= amount;
      if (item.amount === 0) await cargoRepo.remove(item);
      else await cargoRepo.save(item);
      let destination = await cargoRepo.findOne({
        where: { spacecraftId: to.id, commodityId },
        lock: { mode: 'pessimistic_write' },
      });
      destination ??= cargoRepo.create({
        spacecraftId: to.id,
        commodityId,
        amount: 0,
      });
      destination.amount += amount;
      await cargoRepo.save(destination);
      sourceShip.cargoUsed = await this.getCargoUsed(sourceShip.id, cargoRepo);
      targetShip.cargoUsed = await this.getCargoUsed(targetShip.id, cargoRepo);
      await manager.save([sourceShip, targetShip]);
    });
  }

  async recoverWreckCargo(
    shipId: number,
    userId: number,
    wreckId: number,
    commodityId: number,
    amount: number,
  ): Promise<void> {
    if (!Number.isInteger(amount) || amount < 1) {
      throw new BadRequestException('Invalid recovery amount');
    }
    await this.dataSource.transaction(async (manager) => {
      const ship = await manager.findOne(Spacecraft, {
        where: { id: shipId, userId },
        relations: {
          location: { galaxyField: true, systemField: true },
        },
        lock: { mode: 'pessimistic_write' },
      });
      const wreck = await manager.findOne(SpacecraftWreck, {
        where: { id: wreckId },
        relations: {
          location: { galaxyField: true, systemField: true },
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (!ship || !wreck)
        throw new BadRequestException('Ship or wreck not found');
      if (!sameSpacecraftLocation(ship, wreck))
        throw new BadRequestException('Wreck must be on the same field');
      const systems = ship.runtimeSystems as Record<
        string,
        { active?: boolean }
      >;
      if (systems.WARPDRIVE?.active)
        throw new BadRequestException('Hyperantrieb muss deaktiviert sein');
      if (systems.SHIELDS?.active)
        throw new BadRequestException('Schilde müssen deaktiviert sein');
      const entry = wreck.cargo.find(
        (item) => item.commodityId === commodityId,
      );
      if (!entry || entry.amount < amount)
        throw new BadRequestException('Not enough salvageable cargo');
      const used = await this.getCargoUsed(
        ship.id,
        manager.getRepository(CargoItem),
      );
      if (used + amount > ship.cargoMax)
        throw new BadRequestException('Not enough cargo space');
      entry.amount -= amount;
      wreck.cargo = wreck.cargo.filter((item) => item.amount > 0);
      let cargo = await manager.findOne(CargoItem, {
        where: { spacecraftId: ship.id, commodityId },
      });
      cargo ??= manager.create(CargoItem, {
        spacecraftId: ship.id,
        commodityId,
        amount: 0,
      });
      cargo.amount += amount;
      ship.cargoUsed = used + amount;
      await manager.save([wreck, cargo, ship]);
      if (
        wreck.cargo.length === 0 &&
        wreck.torpedoes.length === 0 &&
        wreck.crewCount === 0
      ) {
        await manager.remove(wreck);
      }
    });
  }

  private withCommodityNames(items: CargoItem[]) {
    return items.map((item) => ({
      ...item,
      commodityName:
        this.gameData.getCommodity(item.commodityId)?.name ??
        `Ware #${item.commodityId}`,
    }));
  }

  async getShipCargo(shipId: number, userId?: number) {
    if (userId != null) {
      const ship = await this.dataSource.getRepository(Spacecraft).findOne({
        where: { id: shipId, userId },
      });
      if (!ship) throw new BadRequestException('Ship not found');
      if (ship.status === SpacecraftStatus.DESTROYED) {
        throw new BadRequestException('Wreck inventory is inaccessible');
      }
    }
    return this.withCommodityNames(
      await this.cargoRepo.find({
        where: { spacecraftId: shipId },
        order: { commodityId: 'ASC' },
      }),
    );
  }

  private async getCargoUsed(
    shipId: number,
    repo: Repository<CargoItem> = this.cargoRepo,
  ): Promise<number> {
    const result = await repo
      .createQueryBuilder('c')
      .select('COALESCE(SUM(c.amount), 0)', 'total')
      .where('c.spacecraftId = :shipId', { shipId })
      .getRawOne<{ total: string }>();
    return Number(result?.total ?? 0);
  }
}
