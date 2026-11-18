import { InteractionContextService } from './interaction-context.service';
import { checkInteraction, InteractionRule } from './interaction-policy';
import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  SpacecraftCargoDisposeRequestDto,
  SpacecraftCargoDisposeResultDto,
} from '@swuniverse/shared';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ColonyStorage } from '../colony/entities/colony-storage.entity';
import { GameDataService } from '../game-data/game-data.service';
import { getColonyChangeable } from '../colony/colony-stats.service';
import { ColonyCrewService } from '../colony/colony-crew.service';
import { StationUplinkService, hasStationUplink } from './station-uplink.service';
import { CrewType } from '../colony/entities/crew.entity';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import {
  RelationshipResolverService,
  type ResolvedStance,
} from '../alliance/relationship-resolver.service';
import { CargoItem } from './entities/cargo-item.entity';
import { Spacecraft, SpacecraftStatus } from './entities/spacecraft.entity';
import { SpacecraftWreck } from './entities/spacecraft-wreck.entity';
import { SpacecraftTorpedoStorage } from './entities/spacecraft-torpedo-storage.entity';
import {
  ShipColonyContextService,
  type TransferInitiator,
} from './ship-colony-context.service';
import { SpacecraftTorpedoService } from './spacecraft-torpedo.service';
import {
  buildNearbyInteractionContext,
  decideNearbyInteraction,
} from './nearby-interaction';
import { sameSpacecraftLocation } from './spacecraft-field';
import type { SpacecraftRuntimeSystems } from './spacecraft-runtime-state.service';

type ShipTransferDirection = 'TO_TARGET' | 'FROM_TARGET';

/** Supplying a foreign ship whose shields are up; only friends may do this. */
function isProtectedProvisioning(
  sourceShip: Spacecraft,
  targetShip: Spacecraft,
  direction: ShipTransferDirection,
): boolean {
  const targetSystems = targetShip.runtimeSystems as Record<
    string,
    { active?: boolean }
  >;
  return (
    direction === 'TO_TARGET' &&
    sourceShip.userId !== targetShip.userId &&
    targetSystems.SHIELDS?.active === true
  );
}

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
    private readonly relationshipResolver: RelationshipResolverService,
    private readonly interactionContext: InteractionContextService,
  ) {}

  async getUplinkOverview(id: number, userId: number) {
    return new StationUplinkService(this.dataSource).getOverview(id, userId);
  }

  private assertCommodityBeamable(
    commodityId: number,
    sourceUserId: number,
    targetUserId: number,
  ): void {
    const commodity = this.gameData.getCommodity(commodityId);
    if (
      !commodity?.isBeamable ||
      (commodity.bound && sourceUserId !== targetUserId)
    ) {
      throw new BadRequestException('Diese Ware kann nicht gebeamt werden');
    }
  }

  async loadCargo(
    shipId: number,
    userId: number,
    colonyId: number,
    commodityId: number,
    amount: number,
    initiator: TransferInitiator = 'SHIP',
  ): Promise<CargoItem> {
    return this.dataSource.transaction(async (manager) => {
      const { ship, colony } = await this.contextService.requireContext(
        shipId,
        userId,
        colonyId,
        manager,
      );
      this.assertCommodityBeamable(
        commodityId,
        colony.userId ?? userId,
        ship.userId ?? userId,
      );
      this.contextService.chargeTransferEnergy(ship, colony, amount, initiator);
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
      if (initiator === 'COLONY') {
        await manager.save(getColonyChangeable(colony));
      }
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
    await this.crewService.transferCrewFromShipToColony(colony, ship, amount);
  }

  async unloadCargo(
    shipId: number,
    userId: number,
    colonyId: number,
    commodityId: number,
    amount: number,
    initiator: TransferInitiator = 'SHIP',
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const { ship, colony } = await this.contextService.requireContext(
        shipId,
        userId,
        colonyId,
        manager,
      );
      this.assertCommodityBeamable(
        commodityId,
        colony.userId ?? userId,
        ship.userId ?? userId,
      );
      this.contextService.chargeTransferEnergy(ship, colony, amount, initiator);
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
      if (Number(totalStorage?.total ?? 0) + amount > this.contextService.getEffectiveStorageMax(colony)) {
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
      if (initiator === 'COLONY') {
        await manager.save(getColonyChangeable(colony));
      }
    });
  }

  async getShipTransferQuote(
    shipId: number,
    userId: number,
    targetShipId: number,
    direction: ShipTransferDirection = 'TO_TARGET',
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
    crewTransferMaximum: number;
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
    const reason = await this.shipTransferBlockReason(
      sourceShip,
      targetShip,
      direction,
    );
    const crewDirectionReason = await this.shipTransferBlockReason(sourceShip, targetShip, direction, true);
    const from = direction === 'TO_TARGET' ? sourceShip : targetShip;
    const to = direction === 'TO_TARGET' ? targetShip : sourceShip;
    const crewLimit = hasStationUplink(from) || hasStationUplink(to) ? await new StationUplinkService(this.dataSource).transferLimit(this.dataSource.manager, from, to, userId) : null;
    const crewReason = crewDirectionReason ?? crewLimit?.reason ?? null;
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
      targetCargo: reason === null ? this.withCommodityNames(targetCargo) : [],
      sourceUsed,
      sourceMax: sourceShip.cargoMax,
      targetUsed,
      targetMax: targetShip.cargoMax,
      sourceCrew,
      sourceCrewMax: sourceShip.crewMax,
      targetCrew,
      targetCrewMax: targetShip.crewMax,
      crewTransferAvailable: crewReason === null,
      crewTransferReason: crewReason,
      crewTransferMaximum: crewReason === null ? (crewLimit?.maximum ?? Math.min(direction === 'TO_TARGET' ? sourceCrew : targetCrew, direction === 'TO_TARGET' ? Math.max(0, targetShip.crewMax - targetCrew) : Math.max(0, sourceShip.crewMax - sourceCrew))) : 0,
      sourceTorpedoes,
      targetTorpedoes,
      torpedoTransferAvailable: reason === null,
      torpedoTransferReason: reason,
    };
  }

  async transferShipCrew(
    shipId: number,
    userId: number,
    targetShipId: number,
    amount: number,
    direction: ShipTransferDirection,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const ships = await manager.getRepository(Spacecraft).find({
        where: [{ id: shipId, userId }, { id: targetShipId }],
        order: { id: 'ASC' },
        relations: { location: { galaxyField: true, systemField: true } },
        lock: { mode: 'pessimistic_write', tables: ['spacecraft'] },
      });
      if (!ships.some((ship) => ship.id === shipId && ship.userId === userId) || shipId === targetShipId) throw new BadRequestException('Schiff nicht gefunden');
      const { sourceShip, targetShip } = await this.assertShipTransferAllowed(
        ships,
        shipId,
        targetShipId,
        direction,
        true,
      );
      const from = direction === 'TO_TARGET' ? sourceShip : targetShip;
      const to = direction === 'TO_TARGET' ? targetShip : sourceShip;
      const crewRepo = manager.getRepository(CrewAssignment);
      const crew = await crewRepo.find({
        where: { spacecraftId: from.id, userId },
        order: { crewId: 'ASC' },
        lock: { mode: 'pessimistic_write' },
      });
      const targetCrew = await crewRepo.count({
        where: { spacecraftId: to.id },
      });
      const stationTransfer = hasStationUplink(from) || hasStationUplink(to);
      if (stationTransfer) {
        const limit = await new StationUplinkService(this.dataSource).transferLimit(manager, from, to, userId);
        if (limit.reason || amount > limit.maximum) throw new BadRequestException(limit.reason ?? `Höchstens ${limit.maximum} eigene Crewmitglieder können transferiert werden`);
      }
      if (crew.length < amount)
        throw new BadRequestException('Nicht genug Crew an Bord');
      if (targetCrew + amount > to.crewMax)
        throw new BadRequestException('Nicht genug Crewkapazität');
      for (const assignment of crew.slice(0, amount)) {
        assignment.spacecraftId = to.id;
        assignment.slot = to.userId === userId ? assignment.slot : CrewType.CREWMAN;
      }
      await crewRepo.save(crew.slice(0, amount));
      from.crew = stationTransfer ? await crewRepo.count({ where: { spacecraftId: from.id } }) : crew.length - amount;
      to.crew = targetCrew + amount;
      if (stationTransfer) {
        await manager.update(Spacecraft, from.id, { crew: from.crew });
        await manager.update(Spacecraft, to.id, { crew: to.crew });
      } else await manager.save([from, to]);
    });
  }

  async transferShipTorpedoes(
    shipId: number,
    userId: number,
    targetShipId: number,
    amount: number,
    direction: ShipTransferDirection,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const ships = await manager.getRepository(Spacecraft).find({
        where: [{ id: shipId, userId }, { id: targetShipId }],
        relations: { location: { galaxyField: true, systemField: true } },
        lock: { mode: 'pessimistic_write', tables: ['spacecraft'] },
      });
      const { sourceShip, targetShip } = await this.assertShipTransferAllowed(
        ships,
        shipId,
        targetShipId,
        direction,
      );
      const from = direction === 'TO_TARGET' ? sourceShip : targetShip;
      const to = direction === 'TO_TARGET' ? targetShip : sourceShip;
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
    direction: ShipTransferDirection,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const ships = await manager.getRepository(Spacecraft).find({
        where: [{ id: shipId, userId }, { id: targetShipId }],
        relations: { location: { galaxyField: true, systemField: true } },
        lock: { mode: 'pessimistic_write', tables: ['spacecraft'] },
      });
      const { sourceShip, targetShip } = await this.assertShipTransferAllowed(
        ships,
        shipId,
        targetShipId,
        direction,
      );
      const from = direction === 'TO_TARGET' ? sourceShip : targetShip;
      const to = direction === 'TO_TARGET' ? targetShip : sourceShip;
      this.assertCommodityBeamable(commodityId, from.userId, to.userId);
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
        lock: { mode: 'pessimistic_write', tables: ['spacecraft'] },
      });
      const wreck = await manager.findOne(SpacecraftWreck, {
        where: { id: wreckId },
        relations: {
          location: { galaxyField: true, systemField: true },
        },
        lock: { mode: 'pessimistic_write', tables: ['spacecraft_wrecks'] },
      });
      if (!ship || !wreck)
        throw new BadRequestException('Ship or wreck not found');
      const context = buildNearbyInteractionContext(
        ship,
        (ship.runtimeSystems ?? {}) as SpacecraftRuntimeSystems,
        wreck,
        {},
      );
      const decision = decideNearbyInteraction('SALVAGE', context);
      if (!decision.allowed) {
        throw new BadRequestException(
          !context.samePosition
            ? 'Wreck must be on the same field'
            : context.sourceInHyperspace
              ? 'Hyperantrieb muss deaktiviert sein'
              : context.sourceShieldsActive
                ? 'Schilde müssen deaktiviert sein'
                : (decision.reason ?? 'Bergung nicht möglich'),
        );
      }
      const entry = [...wreck.cargo, ...wreck.modules].find(
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
      wreck.modules = wreck.modules.filter((item) => item.amount > 0);
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
        wreck.modules.length === 0 &&
        wreck.torpedoes.length === 0 &&
        wreck.crewCount === 0
      ) {
        await manager.remove(wreck);
      }
    });
  }

  private withCommodityNames(items: CargoItem[]) {
    return items
      .map((item) => ({
        item,
        commodity: this.gameData.getCommodity(item.commodityId),
      }))
      .filter(
        ({ commodity }) =>
          commodity?.visible !== false && commodity?.type !== 2,
      )
      .sort(
        (a, b) =>
          (a.commodity?.sort ?? a.item.commodityId) -
          (b.commodity?.sort ?? b.item.commodityId),
      )
      .map(({ item, commodity }) => ({
        ...item,
        commodityName: commodity?.name ?? `Ware #${item.commodityId}`,
        commoditySort: commodity?.sort ?? item.commodityId,
      }));
  }

  async disposeCargo(
    shipId: number,
    userId: number,
    items: SpacecraftCargoDisposeRequestDto['items'],
  ): Promise<SpacecraftCargoDisposeResultDto> {
    if (
      !Array.isArray(items) ||
      items.length > 1000 ||
      items.some(
        (item) =>
          !item ||
          !Number.isSafeInteger(item.commodityId) ||
          item.commodityId < 1 ||
          !Number.isSafeInteger(item.amount) ||
          item.amount < 0,
      )
    ) {
      throw new BadRequestException('Ungültige Waren oder Mengen');
    }
    return this.dataSource.transaction(async (manager) => {
      const ship = await manager.getRepository(Spacecraft).findOne({
        where: { id: shipId, userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!ship) throw new BadRequestException('Schiff nicht gefunden');
      if (ship.status === SpacecraftStatus.DESTROYED) {
        throw new BadRequestException('Wracklager ist nicht zugänglich');
      }
      if (
        (ship.runtimeSystems as SpacecraftRuntimeSystems)?.WARPDRIVE?.active
      ) {
        throw new BadRequestException(
          'Im Hyperraum können keine Waren entsorgt werden',
        );
      }
      const repo = manager.getRepository(CargoItem);
      const cargo = await repo.find({
        where: { spacecraftId: shipId },
        order: { commodityId: 'ASC' },
        lock: { mode: 'pessimistic_write' },
      });
      const requested = new Map<number, number>();
      for (const item of items) {
        requested.set(
          item.commodityId,
          Math.min(
            Number.MAX_SAFE_INTEGER,
            (requested.get(item.commodityId) ?? 0) + item.amount,
          ),
        );
      }
      const messages: string[] = [];
      for (const item of cargo) {
        const amount = Math.min(
          item.amount,
          requested.get(item.commodityId) ?? 0,
        );
        if (amount <= 0) continue;
        item.amount -= amount;
        if (item.amount === 0) await repo.remove(item);
        else await repo.save(item);
        const name =
          this.gameData.getCommodity(item.commodityId)?.name ??
          `Ware #${item.commodityId}`;
        messages.push(`${amount} ${name} entsorgt.`);
      }
      ship.cargoUsed = await this.getCargoUsed(shipId, repo);
      await manager.save(ship);
      return {
        messages: messages.length
          ? messages
          : ['Es wurden keine Waren entsorgt.'],
        cargo: this.withCommodityNames(cargo.filter((item) => item.amount > 0)),
        cargoUsed: ship.cargoUsed,
      };
    });
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

  /**
   * The one rule set every ship-to-ship transfer action checks; the quote
   * mirrors it via shipTransferBlockReason so both always agree.
   */
  private async assertShipTransferAllowed(
    ships: Spacecraft[],
    shipId: number,
    targetShipId: number,
    direction: ShipTransferDirection,
    crewTransfer = false,
  ): Promise<{ sourceShip: Spacecraft; targetShip: Spacecraft }> {
    const sourceShip = ships.find((ship) => ship.id === shipId);
    const targetShip = ships.find((ship) => ship.id === targetShipId);
    if (!sourceShip || !targetShip)
      throw new BadRequestException('Schiff nicht gefunden');
    const reason = await this.shipTransferBlockReason(
      sourceShip,
      targetShip,
      direction,
      crewTransfer,
    );
    if (reason) throw new BadRequestException(reason);
    return { sourceShip, targetShip };
  }

  private async shipTransferBlockReason(
    sourceShip: Spacecraft,
    targetShip: Spacecraft,
    direction: ShipTransferDirection,
    crewTransfer = false,
  ): Promise<string | null> {
    const systems = (ship: Spacecraft) =>
      ship.runtimeSystems as Record<string, { active?: boolean }>;
    const cloakDecision = checkInteraction(
      await this.interactionContext.load(sourceShip.id, targetShip.id, [
        'sourceCloaked',
        'targetCloaked',
      ]),
      [InteractionRule.SOURCE_UNCLOAKED, InteractionRule.TARGET_UNCLOAKED],
    );
    if (!cloakDecision.allowed) return cloakDecision.reason;
    if (sourceShip.userId !== targetShip.userId) {
      const decision = checkInteraction(
        await this.interactionContext.load(sourceShip.id, targetShip.id, [
          'targetOnVacation',
        ]),
        [InteractionRule.TARGET_VACATION],
      );
      if (!decision.allowed) return decision.reason;
    }
    const provisionsProtectedTarget = isProtectedProvisioning(
      sourceShip,
      targetShip,
      direction,
    );
    const capabilities = await this.shipTransferCapabilities(
      sourceShip,
      targetShip,
    );
    const stationCrewTransfer = crewTransfer && (hasStationUplink(sourceShip) || hasStationUplink(targetShip));
    if (
      !stationCrewTransfer && !(provisionsProtectedTarget
        ? capabilities.mayProvisionProtectedShip
        : capabilities.mayTransferSafely)
    )
      return 'Transfer nur zwischen Freunden erlaubt';
    if (
      sourceShip.status !== SpacecraftStatus.IDLE ||
      targetShip.status !== SpacecraftStatus.IDLE
    )
      return 'Beide Schiffe müssen im Raum stehen';
    if (!sameSpacecraftLocation(sourceShip, targetShip))
      return 'Schiffe müssen sich auf demselben Feld befinden';
    if (
      systems(sourceShip).WARPDRIVE?.active ||
      systems(targetShip).WARPDRIVE?.active
    )
      return 'Hyperantrieb muss deaktiviert sein';
    if (
      systems(sourceShip).SHIELDS?.active ||
      (systems(targetShip).SHIELDS?.active && !provisionsProtectedTarget)
    )
      return 'Schilde müssen deaktiviert sein';
    return null;
  }

  private async shipTransferCapabilities(
    sourceShip: Spacecraft,
    targetShip: Spacecraft,
  ): Promise<
    Pick<ResolvedStance, 'mayTransferSafely' | 'mayProvisionProtectedShip'>
  > {
    if (sourceShip.userId === targetShip.userId) {
      return { mayTransferSafely: true, mayProvisionProtectedShip: true };
    }
    // STU `TransferInformationFactory`: the target owner decides whom they
    // treat as a friend, so a one-sided contact by the sender grants nothing.
    return this.relationshipResolver.resolve(
      targetShip.userId,
      sourceShip.userId,
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
