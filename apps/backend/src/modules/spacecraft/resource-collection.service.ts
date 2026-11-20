import type { SpacecraftRuntimeSystemsDto } from '@swuniverse/shared';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  FieldMiningResourceDto,
  ResourceCollectionDto,
} from '@swuniverse/shared';
import { DataSource, EntityManager, In, QueryFailedError } from 'typeorm';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { GameDataService } from '../game-data/game-data.service';
import {
  MessagingService,
  type TransactionalNotifications,
} from '../messaging/messaging.service';
import { MessageFolder } from '../messaging/message-folder';
import { GalaxyFieldType } from '../starmap/entities/galaxy-field-type.entity';
import { Spacecraft } from './entities/spacecraft.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import { CargoItem } from './entities/cargo-item.entity';
import { LocationMining } from './entities/location-mining.entity';
import { resolveSpaceLocation } from './spacecraft-field';
import type {
  FlightConsequence,
  FlightConsequenceField,
} from './flight-consequence-pipeline';
import {
  getRuntimeSystemsForModule,
  initializeSpacecraftRuntimeSystems,
} from './spacecraft-runtime-state.service';
import {
  collectAmount,
  collectionBlockReason,
  COLLECTOR_ACTIVATION_EPS,
  COLLECTOR_EPS_PER_TICK,
  DEFAULT_FIELD_STOCK,
  stopCollection,
} from './resource-collection-state';

@Injectable()
export class ResourceCollectionService implements FlightConsequence {
  constructor(
    private readonly dataSource: DataSource,
    private readonly gameData: GameDataService,
    private readonly messaging: MessagingService,
  ) {}

  async get(shipId: number, userId: number): Promise<ResourceCollectionDto> {
    const ship = await this.load(this.dataSource.manager, shipId, userId);
    return this.describe(this.dataSource.manager, ship);
  }

  async select(
    shipId: number,
    userId: number,
    commodityId: number | null,
  ): Promise<ResourceCollectionDto> {
    return this.transaction(async (transaction) => {
      const ship = await this.load(transaction.manager, shipId, userId, true);
      if (commodityId == null) {
        if (stopCollection(ship))
          await this.notify(
            ship,
            'Es werden keine Ressourcen mehr gesammelt.',
            transaction,
          );
      } else {
        const reason = collectionBlockReason(ship, true);
        if (reason) throw new BadRequestException(reason);
        if (
          await transaction.manager.existsBy(Spacecraft, {
            tractoredShipId: ship.id,
          })
        )
          throw new BadRequestException(
            'Schiff wird von einem Traktorstrahl gehalten',
          );
        const crew = await transaction.manager.countBy(CrewAssignment, {
          spacecraftId: ship.id,
        });
        if (crew < Math.max(0, ship.crewRequired))
          throw new BadRequestException('Nicht genug Besatzung');
        const options = await this.resources(transaction.manager, ship, true);
        if (!options.some((resource) => resource.commodityId === commodityId))
          throw new BadRequestException(
            'Diese Ressource ist am aktuellen Feld nicht abbaubar',
          );
        const stock = (
          await this.stocks(transaction.manager, ship.locationId, [commodityId])
        ).get(commodityId);
        if (stock?.actualAmount === 0)
          throw new BadRequestException(this.depletedText(ship, commodityId));
        const cargo = await this.cargo(transaction.manager, ship, true);
        if (cargo.used >= ship.cargoMax)
          throw new BadRequestException('Lager ist voll');
        const collector = (ship.runtimeSystems as SpacecraftRuntimeSystemsDto)
          .RESOURCE_COLLECTOR!;
        if (!collector.active) ship.energy -= COLLECTOR_ACTIVATION_EPS;
        collector.active = true;
        collector.resourceCommodityId = commodityId;
        collector.resourceLocationId = ship.locationId;
        initializeSpacecraftRuntimeSystems(ship);
      }
      await transaction.manager.save(ship);
      return this.describe(transaction.manager, ship);
    });
  }

  /** Runs after ordinary energy-flow persistence; the runtime brownout switch is authoritative. */
  async processTick(shipId: number): Promise<void> {
    await this.transaction(async (transaction) => {
      const raw = await transaction.manager.findOne(Spacecraft, {
        where: { id: shipId },
        lock: { mode: 'pessimistic_write', onLocked: 'nowait' },
      });
      if (!raw) return;
      const selection = (raw.runtimeSystems as SpacecraftRuntimeSystemsDto)
        ?.RESOURCE_COLLECTOR?.resourceCommodityId;
      if (selection == null) return;
      const ship = await this.load(
        transaction.manager,
        shipId,
        raw.userId,
        true,
      );
      const collector = (ship.runtimeSystems as SpacecraftRuntimeSystemsDto)
        .RESOURCE_COLLECTOR;
      let reason = collectionBlockReason(ship);
      if (!collector?.active) reason ??= 'Kollektor wurde abgeschaltet';
      if (collector?.resourceLocationId !== ship.locationId)
        reason = 'Schiff hat das Sammelfeld verlassen';
      if (
        await transaction.manager.existsBy(Spacecraft, {
          tractoredShipId: ship.id,
        })
      )
        reason = 'Schiff wird von einem Traktorstrahl gehalten';
      if (
        (await transaction.manager.countBy(CrewAssignment, {
          spacecraftId: ship.id,
        })) < Math.max(0, ship.crewRequired)
      )
        reason = 'Nicht genug Besatzung';
      const resource = (
        await this.resources(transaction.manager, ship, true)
      ).find((option) => option.commodityId === selection);
      if (!resource) reason ??= 'Ressource ist am Feld nicht mehr verfügbar';
      if (reason) {
        stopCollection(ship);
        await transaction.manager.save(ship);
        await this.notify(ship, `Sammeln beendet: ${reason}.`, transaction);
        return;
      }
      const { rows, used } = await this.cargo(transaction.manager, ship, true);
      const stock = await this.lockStock(
        transaction.manager,
        ship.locationId,
        selection,
      );
      const before = stock.actualAmount;
      const amount = collectAmount(
        this.hasFactionCollector(ship),
        before,
        ship.cargoMax - used,
      );
      stock.actualAmount -= amount;
      if (amount > 0) stock.depletedAt = null;
      if (before > 0 && stock.actualAmount === 0) stock.depletedAt = new Date();
      await transaction.manager.save(stock);
      if (amount > 0) {
        let row = rows.find((item) => item.commodityId === selection);
        if (!row)
          row = transaction.manager.create(CargoItem, {
            spacecraftId: ship.id,
            commodityId: selection,
            amount: 0,
          });
        row.amount += amount;
        await transaction.manager.save(row);
      }
      ship.cargoUsed = used + amount;
      if (stock.actualAmount === 0) {
        stopCollection(ship);
        await this.notify(
          ship,
          `${this.depletedText(ship, selection)} Sammeln beendet.`,
          transaction,
        );
      }
      if (ship.cargoUsed >= ship.cargoMax) {
        stopCollection(ship);
        await this.notify(
          ship,
          'Der Lagerraum wurde beim Ressourcensammeln voll. Sammeln beendet.',
          transaction,
        );
      }
      await transaction.manager.save(ship);
    });
  }

  async onEnterField(
    ship: Spacecraft,
    _field: FlightConsequenceField,
    messages: string[],
    transaction?: TransactionalNotifications,
  ): Promise<void> {
    const collector = (ship.runtimeSystems as SpacecraftRuntimeSystemsDto)
      ?.RESOURCE_COLLECTOR;
    if (
      collector?.resourceCommodityId != null &&
      collector.resourceLocationId !== ship.locationId &&
      stopCollection(ship)
    ) {
      const text = 'Ressourcensammeln wegen Flug abgebrochen.';
      messages.push(text);
      await this.notify(ship, text, transaction);
    }
  }
  onTick(): void {
    /* Tick collection follows the ship's energy-flow update. */
  }

  miningCommodities(): Array<{ id: number; name: string }> {
    return this.gameData
      .getAllCommodities()
      .filter((commodity) => commodity.isBeamable)
      .map(({ id, name }) => ({ id, name }));
  }

  async configureFieldType(
    id: number,
    resources: FieldMiningResourceDto[],
  ): Promise<FieldMiningResourceDto[]> {
    if (
      !Array.isArray(resources) ||
      resources.length > 16 ||
      new Set(resources.map((resource) => resource.commodityId)).size !==
        resources.length
    )
      throw new BadRequestException('Ungültige oder doppelte Feldressourcen');
    for (const resource of resources) {
      const commodity = this.gameData.getCommodity(resource.commodityId);
      if (
        !commodity?.isBeamable ||
        !Number.isInteger(resource.rate) ||
        resource.rate < 1 ||
        resource.rate > 1000
      )
        throw new BadRequestException(
          'Unbekannte Ware oder ungültige Förderrate',
        );
    }
    const result = await this.dataSource.manager.update(GalaxyFieldType, id, {
      miningResources: resources,
    });
    if (!result.affected) throw new NotFoundException('Feldtyp nicht gefunden');
    return resources;
  }

  private async load(
    manager: EntityManager,
    id: number,
    userId: number,
    locked = false,
  ): Promise<Spacecraft> {
    const ship = await manager.findOne(Spacecraft, {
      where: { id, userId },
      ...(locked
        ? {
            lock: {
              mode: 'pessimistic_write' as const,
              onLocked: 'nowait' as const,
            },
          }
        : {}),
    });
    if (!ship) throw new NotFoundException('Schiff nicht gefunden');
    ship.modules = await manager.find(SpacecraftModule, {
      where: { spacecraftId: id },
      order: { id: 'ASC' },
      ...(locked
        ? {
            lock: {
              mode: 'pessimistic_read' as const,
              onLocked: 'nowait' as const,
            },
          }
        : {}),
    });
    const hydrated = await manager.findOneOrFail(Spacecraft, {
      where: { id },
      relations: ['location', 'location.galaxyField', 'location.systemField'],
    });
    ship.location = hydrated.location;
    initializeSpacecraftRuntimeSystems(ship);
    return ship;
  }

  private async resources(
    manager: EntityManager,
    ship: Spacecraft,
    locked = false,
  ): Promise<FieldMiningResourceDto[]> {
    const field = ship.location?.galaxyField ?? ship.location?.systemField;
    if (!field) return [];
    const type = await manager.findOne(GalaxyFieldType, {
      where: { id: field.fieldTypeId },
      ...(locked
        ? {
            lock: {
              mode: 'pessimistic_read' as const,
              onLocked: 'nowait' as const,
            },
          }
        : {}),
    });
    return (type?.miningResources ?? []).filter(
      (resource) =>
        Number.isInteger(resource.rate) &&
        resource.rate > 0 &&
        resource.rate <= 1000 &&
        this.gameData.getCommodity(resource.commodityId)?.isBeamable,
    );
  }

  private async cargo(
    manager: EntityManager,
    ship: Spacecraft,
    locked = false,
  ) {
    const rows = await manager.find(CargoItem, {
      where: { spacecraftId: ship.id },
      order: { id: 'ASC' },
      ...(locked
        ? {
            lock: {
              mode: 'pessimistic_write' as const,
              onLocked: 'nowait' as const,
            },
          }
        : {}),
    });
    return {
      rows,
      used: rows.reduce((total, row) => total + Math.max(0, row.amount), 0),
    };
  }

  private async describe(
    manager: EntityManager,
    ship: Spacecraft,
  ): Promise<ResourceCollectionDto> {
    const collector = (ship.runtimeSystems as SpacecraftRuntimeSystemsDto)
      ?.RESOURCE_COLLECTOR;
    const resources = await this.resources(manager, ship);
    const stocks = await this.stocks(
      manager,
      ship.locationId,
      resources.map((resource) => resource.commodityId),
    );
    const options = resources.map((resource) => {
      const stock = stocks.get(resource.commodityId);
      return {
        ...resource,
        name: this.gameData.getCommodity(resource.commodityId)!.name,
        stock: stock?.actualAmount ?? DEFAULT_FIELD_STOCK,
        maxStock: stock?.maxAmount ?? DEFAULT_FIELD_STOCK,
      };
    });
    const freeCargo = Math.max(
      0,
      ship.cargoMax - (await this.cargo(manager, ship)).used,
    );
    return {
      state:
        collector?.active && collector.resourceCommodityId != null
          ? 'GATHER_RESOURCES'
          : 'IDLE',
      selectedCommodityId: collector?.resourceCommodityId ?? null,
      options,
      freeCargo,
      activationEps: COLLECTOR_ACTIVATION_EPS,
      epsPerTick: COLLECTOR_EPS_PER_TICK,
      blockReason:
        collectionBlockReason(ship, true) ??
        (options.length
          ? freeCargo > 0
            ? null
            : 'Lager ist voll'
          : 'Keine abbaubaren Ressourcen am Feld'),
    };
  }

  private async stocks(
    manager: EntityManager,
    locationId: number,
    commodityIds: number[],
  ): Promise<Map<number, LocationMining>> {
    const rows = commodityIds.length
      ? await manager.findBy(LocationMining, {
          locationId,
          commodityId: In(commodityIds),
        })
      : [];
    return new Map(rows.map((row) => [row.commodityId, row]));
  }

  /** Created on first collection; concurrent collectors at one field serialize on this row. */
  private async lockStock(
    manager: EntityManager,
    locationId: number,
    commodityId: number,
  ): Promise<LocationMining> {
    await manager
      .createQueryBuilder()
      .insert()
      .into(LocationMining)
      .values({
        locationId,
        commodityId,
        actualAmount: DEFAULT_FIELD_STOCK,
        maxAmount: DEFAULT_FIELD_STOCK,
        depletedAt: null,
      })
      .orIgnore()
      .execute();
    return manager.findOneOrFail(LocationMining, {
      where: { locationId, commodityId },
      lock: { mode: 'pessimistic_write' },
    });
  }

  /** STU: a collector module with a faction gathers twice as much; SWU marks it via `secret.faction`. */
  private hasFactionCollector(ship: Spacecraft): boolean {
    return ship.modules.some(
      (module) =>
        module.integrity > 0 &&
        getRuntimeSystemsForModule(module).includes('RESOURCE_COLLECTOR') &&
        this.gameData
          .getAllModules()
          .find((definition) => definition.name === module.moduleType)?.secret
          ?.faction != null,
    );
  }

  private depletedText(ship: Spacecraft, commodityId: number): string {
    const location = resolveSpaceLocation(ship.location);
    return `Es sind keine ${this.gameData.getCommodity(commodityId)?.name ?? 'Ressourcen'} bei den Koordinaten ${location?.x ?? '?'}|${location?.y ?? '?'} vorhanden!`;
  }

  private notify(
    ship: Spacecraft,
    text: string,
    transaction?: TransactionalNotifications,
  ) {
    return this.messaging.sendSystem(
      ship.userId,
      'Ressourcensammeln',
      `${ship.name}: ${text}`,
      undefined,
      MessageFolder.SHIP,
      undefined,
      false,
      transaction,
    );
  }

  private async transaction<T>(
    work: (transaction: TransactionalNotifications) => Promise<T>,
  ): Promise<T> {
    const afterCommit: Array<() => void> = [];
    const result = await this.dataSource
      .transaction('READ COMMITTED', (manager) =>
        work({ manager, afterCommit }),
      )
      .catch((error: unknown) => {
        if (
          error instanceof QueryFailedError &&
          error.driverError.code === '55P03'
        )
          throw new BadRequestException(
            'Sammelzustand ist gesperrt; bitte erneut versuchen',
          );
        throw error;
      });
    for (const notify of afterCommit) notify();
    return result;
  }
}
