import { isRpgHidden } from './rpg-visibility';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { isVacationEffective } from '@swuniverse/shared';
import { User } from '../auth/user.entity';
import { RelationshipResolverService } from '../alliance/relationship-resolver.service';
import { MessagingService } from '../messaging/messaging.service';
import { MessageFolder } from '../messaging/message-folder';
import { isCloaked } from './spacecraft-cloak';
import { InjectRepository } from '@nestjs/typeorm';
import type { SpacecraftTransferQuoteDto } from '@swuniverse/shared';
import { EntityManager, Repository } from 'typeorm';
import { Colony } from '../colony/entities/colony.entity';
import { ColonyChangeable } from '../colony/entities/colony-changeable.entity';
import { ColonyStorage } from '../colony/entities/colony-storage.entity';
import { ColonyStorageService } from '../colony/colony-storage.service';
import { CargoItem } from './entities/cargo-item.entity';
import { GameDataService } from '../game-data/game-data.service';
import { getColonyChangeable } from '../colony/colony-stats.service';
import { SETTLERS_COMMODITY_ID, settlersLimits } from './settlers';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { SpacecraftCrewService } from './spacecraft-crew.service';
import { Spacecraft, SpacecraftStatus } from './entities/spacecraft.entity';
import {
  calculateTransferEnergyCost,
  TRANSFER_CAPACITY_PER_EPS,
} from './transfer-cost';
import { matchesColonyOrbit } from './spacecraft-field';
import {
  ColonyStatsService,
  deductColonyEnergy,
} from '../colony/colony-stats.service';

export type TransferInitiator = 'SHIP' | 'COLONY';
export type ColonyTransferDirection = 'TO_SHIP' | 'TO_COLONY';

@Injectable()
export class ShipColonyContextService {
  constructor(
    @InjectRepository(Spacecraft)
    private readonly shipRepo: Repository<Spacecraft>,
    @InjectRepository(Colony)
    private readonly colonyRepo: Repository<Colony>,
    @InjectRepository(CrewAssignment)
    private readonly crewRepo: Repository<CrewAssignment>,
    @InjectRepository(ColonyStorage)
    private readonly colonyStorageRepo: Repository<ColonyStorage>,
    @InjectRepository(CargoItem)
    private readonly cargoRepo: Repository<CargoItem>,
    private readonly storageService: ColonyStorageService,
    private readonly crewService: SpacecraftCrewService,
    private readonly gameData: GameDataService,
    private readonly statsService: ColonyStatsService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly relationships: RelationshipResolverService,
    @Optional() private readonly messaging?: MessagingService,
  ) {}

  /** Storage capacity including building bonuses, as shown in the colony inventory. */
  getEffectiveStorageMax(colony: Colony): number {
    return this.statsService.calculateSummary(colony).effectiveStorageMax;
  }

  async requireContext(
    shipId: number,
    userId: number,
    colonyId: number,
    manager?: EntityManager,
    initiator: TransferInitiator = 'SHIP',
  ) {
    const shipRepo = manager?.getRepository(Spacecraft) ?? this.shipRepo;
    const colonyRepo = manager?.getRepository(Colony) ?? this.colonyRepo;
    // Lock only the base tables: Postgres rejects FOR UPDATE on the nullable
    // side of the LEFT JOINs that TypeORM adds for relations.
    const lockFor = (table: string) =>
      manager
        ? { mode: 'pessimistic_write' as const, tables: [table] }
        : undefined;
    const [ship, colony] = await Promise.all([
      shipRepo.findOne({
        // A colony may beam with foreign ships in its orbit (STU Transfer).
        where: initiator === 'COLONY' ? { id: shipId } : { id: shipId, userId },
        relations: ['location', 'location.systemField', 'shipClass'],
        lock: lockFor('spacecraft'),
      }),
      colonyRepo.findOne({
        where: { id: colonyId, userId },
        relations: ['systemField', 'fields'],
        lock: lockFor('colonies'),
      }),
    ]);
    if (
      !ship ||
      isRpgHidden(ship) ||
      (ship.userId !== userId && isCloaked(ship))
    )
      throw new NotFoundException('Ship not found');
    if (!colony) throw new NotFoundException('Colony not found');
    const changeable = await (
      manager?.getRepository(ColonyChangeable) ??
      this.colonyRepo.manager.getRepository(ColonyChangeable)
    ).findOne({
      where: { colonyId: colony.id },
      lock: lockFor('colony_changeable'),
    });
    if (changeable) colony.changeable = changeable;
    if (ship.status !== SpacecraftStatus.IDLE) {
      throw new BadRequestException('Ship must be idle');
    }
    if (!matchesColonyOrbit(ship, colony)) {
      throw new BadRequestException('Ship must be in colony orbit');
    }
    return { ship, colony };
  }

  /**
   * STU `Transfer` checks for a foreign target ship: no vacation, shields down.
   * SWU keeps the orbital-management exception that a friend (target owner's
   * view) may still supply a shielded ship.
   */
  async foreignShipBlockReason(
    ship: Spacecraft,
    userId: number,
    direction: ColonyTransferDirection,
  ): Promise<string | null> {
    if (ship.userId === userId) return null;
    const owner = await this.userRepo.findOneBy({ id: ship.userId });
    if (owner && isVacationEffective(owner))
      return 'Aktion nicht möglich, der Spieler befindet sich im Urlaubsmodus!';
    const systems = ship.runtimeSystems as Record<string, { active?: boolean }>;
    if (systems?.SHIELDS?.active !== true) return null;
    if (
      direction === 'TO_SHIP' &&
      (await this.relationships.resolve(ship.userId, userId))
        .mayProvisionProtectedShip
    )
      return null;
    return 'Schilde müssen deaktiviert sein';
  }

  /** STU sends the target owner a trade message about the beamed goods. */
  async notifyForeignOwner(
    ship: Spacecraft,
    colony: Colony,
    commodityId: number,
    amount: number,
    direction: ColonyTransferDirection,
  ): Promise<void> {
    if (ship.userId === colony.userId) return;
    const commodity =
      this.gameData.getCommodity(commodityId)?.name ?? `Ware #${commodityId}`;
    await this.messaging?.sendSystem(
      ship.userId,
      `Die Kolonie ${colony.name} hat folgende Waren ${direction === 'TO_SHIP' ? 'zur' : 'von der'} ${ship.name} gebeamt: ${amount} ${commodity}`,
      undefined,
      MessageFolder.TRADE,
    );
  }

  chargeEnergy(ship: Spacecraft, amount: number): number {
    const cost = calculateTransferEnergyCost(amount);
    if (ship.energy < cost) {
      throw new BadRequestException(`${cost} ship energy required`);
    }
    ship.energy -= cost;
    return cost;
  }

  /** Charges the ship or the colony, depending on who started the transfer. */
  chargeTransferEnergy(
    ship: Spacecraft,
    colony: Colony,
    amount: number,
    initiator: TransferInitiator = 'SHIP',
  ): number {
    if (initiator === 'SHIP') return this.chargeEnergy(ship, amount);
    const cost = calculateTransferEnergyCost(amount);
    deductColonyEnergy(colony, cost, `${cost} colony energy required`);
    return cost;
  }

  async getQuote(
    shipId: number,
    userId: number,
    colonyId: number,
    initiator: TransferInitiator = 'SHIP',
    direction: ColonyTransferDirection = 'TO_SHIP',
  ): Promise<SpacecraftTransferQuoteDto> {
    try {
      const { ship, colony } = await this.requireContext(
        shipId,
        userId,
        colonyId,
        undefined,
        initiator,
      );
      const blockReason = await this.foreignShipBlockReason(
        ship,
        userId,
        direction,
      );
      if (blockReason) throw new BadRequestException(blockReason);
      if (ship.userId !== userId) {
        return this.foreignQuote(ship, colony, colonyId, direction);
      }
      const [colonyFree, colonyCrew, assignedCrew, colonyStorage, shipCargo] =
        await Promise.all([
          this.storageService.getFreeStorage(
            colony,
            this.getEffectiveStorageMax(colony),
          ),
          this.crewRepo.count({ where: { colonyId: colony.id } }),
          this.crewService.getAssignedCrewCount(ship.id),
          this.colonyStorageRepo.find({
            where: { colonyId: colony.id },
            order: { commodityId: 'ASC' },
          }),
          this.cargoRepo.find({
            where: { spacecraftId: ship.id },
            order: { commodityId: 'ASC' },
          }),
        ]);
      const shipMinimum = await this.crewService.getRequiredCrew(ship);
      return {
        available: true,
        reason: null,
        colonyId,
        cargo: {
          shipUsed: ship.cargoUsed,
          shipMax: ship.cargoMax,
          colonyFree,
        },
        shipCargo: shipCargo.map((item) => ({
          commodityId: item.commodityId,
          commodityName:
            this.gameData.getCommodity(item.commodityId)?.name ??
            `Ware #${item.commodityId}`,
          amount: item.amount,
        })),
        colonyCargo: colonyStorage
          .filter((item) => item.amount > 0)
          .map((item) => ({
            commodityId: item.commodityId,
            commodityName:
              this.gameData.getCommodity(item.commodityId)?.name ??
              `Ware #${item.commodityId}`,
            amount: item.amount,
          })),
        crew: {
          shipCurrent: assignedCrew,
          shipMinimum,
          shipMax: ship.crewMax,
          colonyAvailable: colonyCrew,
          maxLoad: Math.max(
            0,
            Math.min(colonyCrew, ship.crewMax - assignedCrew),
          ),
          maxUnload: Math.max(0, assignedCrew - shipMinimum),
        },
        settlers: this.settlersQuote(ship, colony, shipCargo),
        energyPerCapacity: TRANSFER_CAPACITY_PER_EPS,
      };
    } catch (error) {
      return {
        ...this.emptyQuote(colonyId),
        available: false,
        reason: error instanceof Error ? error.message : 'Transfer unavailable',
      };
    }
  }

  /**
   * STU shows a foreign ship's storage bar, and its cargo only when beaming
   * from it; crew stays hidden because crew transfer is own-ships only.
   */
  private async foreignQuote(
    ship: Spacecraft,
    colony: Colony,
    colonyId: number,
    direction: ColonyTransferDirection,
  ): Promise<SpacecraftTransferQuoteDto> {
    const [colonyFree, colonyStorage, shipCargo] = await Promise.all([
      this.storageService.getFreeStorage(
        colony,
        this.getEffectiveStorageMax(colony),
      ),
      direction === 'TO_SHIP'
        ? this.colonyStorageRepo.find({
            where: { colonyId: colony.id },
            order: { commodityId: 'ASC' },
          })
        : [],
      direction === 'TO_COLONY'
        ? this.cargoRepo.find({
            where: { spacecraftId: ship.id },
            order: { commodityId: 'ASC' },
          })
        : [],
    ]);
    const named = (items: Array<{ commodityId: number; amount: number }>) =>
      items
        .filter((item) => item.amount > 0)
        .map((item) => ({
          commodityId: item.commodityId,
          commodityName:
            this.gameData.getCommodity(item.commodityId)?.name ??
            `Ware #${item.commodityId}`,
          amount: item.amount,
        }));
    return {
      ...this.emptyQuote(colonyId),
      available: true,
      cargo: { shipUsed: ship.cargoUsed, shipMax: ship.cargoMax, colonyFree },
      shipCargo: named(shipCargo),
      colonyCargo: named(colonyStorage),
    };
  }

  private settlersQuote(
    ship: Spacecraft,
    colony: Colony,
    shipCargo: Array<{ commodityId: number; amount: number }>,
  ): NonNullable<SpacecraftTransferQuoteDto['settlers']> {
    const key = ship.shipClass?.key;
    const enabled = Boolean(
      key && this.gameData.getShipClassDefByKey(key)?.canTransportPopulation,
    );
    const onShip =
      shipCargo.find((item) => item.commodityId === SETTLERS_COMMODITY_ID)
        ?.amount ?? 0;
    const changeable = getColonyChangeable(colony);
    const population = changeable.workers + changeable.workless;
    return {
      enabled,
      onShip,
      colonyWorkless: changeable.workless,
      colonyPopulation: population,
      colonyPopulationMax: changeable.maxPopulation,
      ...(enabled
        ? settlersLimits({
            cargoMax: ship.cargoMax,
            cargoUsed: ship.cargoUsed,
            onShip,
            workless: changeable.workless,
            population,
            populationMax: changeable.maxPopulation,
          })
        : { maxLoad: 0, maxUnload: 0 }),
    };
  }

  private emptyQuote(colonyId: number): SpacecraftTransferQuoteDto {
    return {
        available: false,
        reason: null,
        colonyId,
        cargo: { shipUsed: 0, shipMax: 0, colonyFree: 0 },
        shipCargo: [],
        colonyCargo: [],
        crew: {
          shipCurrent: 0,
          shipMinimum: 0,
          shipMax: 0,
          colonyAvailable: 0,
          maxLoad: 0,
          maxUnload: 0,
        },
        energyPerCapacity: TRANSFER_CAPACITY_PER_EPS,
    };
  }
}
