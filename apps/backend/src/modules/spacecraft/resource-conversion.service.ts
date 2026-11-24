import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  ResourceConversionDto,
  SpacecraftRuntimeSystemsDto,
} from '@swuniverse/shared';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';
import { GameDataService } from '../game-data/game-data.service';
import { Research, ResearchStatus } from '../research/entities/research.entity';
import {
  MessagingService,
  type TransactionalNotifications,
} from '../messaging/messaging.service';
import { MessageFolder } from '../messaging/message-folder';
import { Spacecraft } from './entities/spacecraft.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import { CargoItem } from './entities/cargo-item.entity';
import {
  initializeSpacecraftRuntimeSystems,
  getRuntimeSystemsForModule,
  isCoolingDown,
} from './spacecraft-runtime-state.service';

// STU CommodityTypeConstants::COMMODITY_CONVERSIONS, unchanged batch sizes.
export const RESOURCE_CONVERSIONS = [
  [63, 5, 100, 10, 1],
  [64, 6, 150, 3, 1],
  [65, 7, 150, 2, 1],
  [66, 32, 1000, 1, 1],
  [67, 19, 300, 3, 1],
  [68, 16, 100, 8, 2],
  [69, 13, 100, 8, 1],
  [70, 14, 100, 8, 2],
  [71, 12, 100, 8, 2],
  [72, 15, 100, 8, 2],
] as const;

@Injectable()
export class ResourceConversionService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly gameData: GameDataService,
    private readonly messaging: MessagingService,
  ) {}

  async get(id: number, userId: number): Promise<ResourceConversionDto> {
    return this.describe(
      this.dataSource.manager,
      await this.load(this.dataSource.manager, id, userId),
    );
  }

  async select(
    id: number,
    userId: number,
    commodityId: number | null,
  ): Promise<ResourceConversionDto> {
    return this.transaction(async (transaction) => {
      const ship = await this.load(transaction.manager, id, userId, true);
      const system = (ship.runtimeSystems as SpacecraftRuntimeSystemsDto)
        .RESOURCE_CONVERTER;
      if (commodityId == null) {
        if (system) {
          system.active = false;
          delete system.resourceCommodityId;
        }
      } else {
        const reason =
          this.blockReason(ship, true) ??
          (await this.crewBlockReason(transaction.manager, ship));
        if (reason) throw new BadRequestException(reason);
        const conversion = RESOURCE_CONVERSIONS.find(
          (row) => row[0] === commodityId,
        );
        if (!conversion) throw new BadRequestException('Unbekannte Umwandlung');
        if (
          !(await this.producible(transaction.manager, userId, true)).has(
            conversion[1],
          )
        )
          throw new BadRequestException(
            'Die Zielware ist noch nicht durch Gebäudeproduktion freigeschaltet',
          );
        if (!system!.active) ship.energy -= 15;
        system!.active = true;
        system!.resourceCommodityId = commodityId;
        initializeSpacecraftRuntimeSystems(ship);
      }
      await transaction.manager.save(ship);
      return this.describe(transaction.manager, ship);
    });
  }

  /** Energy flow has already persisted and may have switched the system off. */
  async processTick(id: number): Promise<void> {
    await this.transaction(async (transaction) => {
      const raw = await transaction.manager.findOne(Spacecraft, {
        where: { id },
        lock: { mode: 'pessimistic_write', onLocked: 'nowait' },
      });
      const source = (raw?.runtimeSystems as SpacecraftRuntimeSystemsDto)
        ?.RESOURCE_CONVERTER?.resourceCommodityId;
      if (!raw || source == null) return;
      const ship = await this.load(transaction.manager, id, raw.userId, true);
      const system = (ship.runtimeSystems as SpacecraftRuntimeSystemsDto)
        .RESOURCE_CONVERTER;
      const conversion = RESOURCE_CONVERSIONS.find((row) => row[0] === source);
      let reason =
        this.blockReason(ship) ??
        (await this.crewBlockReason(transaction.manager, ship));
      if (!system?.active) reason ??= 'Raffinerie wurde abgeschaltet';
      if (!conversion) reason ??= 'Unbekannte Umwandlung';
      if (
        conversion &&
        !(await this.producible(transaction.manager, ship.userId, true)).has(
          conversion[1],
        )
      )
        reason ??= 'Zielware ist nicht durch Gebäudeproduktion freigeschaltet';
      if (reason) {
        if (system) {
          system.active = false;
          delete system.resourceCommodityId;
        }
        await transaction.manager.save(ship);
        await this.notify(ship, `Umwandlung beendet: ${reason}.`, transaction);
        return;
      }
      const [sourceId, targetId, input, output] = conversion!;
      const { rows, used } = await this.cargo(transaction.manager, ship, true);
      const sourceRow = rows.find((row) => row.commodityId === sourceId);
      if (!sourceRow || sourceRow.amount < input) {
        await this.notify(
          ship,
          `Nicht genug ${this.gameData.getCommodity(sourceId)?.name ?? sourceId}: ${input} für eine vollständige Charge erforderlich.`,
          transaction,
        );
        return;
      }
      if (used - input + output > ship.cargoMax) {
        await this.notify(
          ship,
          'Nicht genug Lagerraum für die Zielware.',
          transaction,
        );
        return;
      }
      let targetRow = rows.find((row) => row.commodityId === targetId);
      targetRow ??= transaction.manager.create(CargoItem, {
        spacecraftId: id,
        commodityId: targetId,
        amount: 0,
      });
      sourceRow.amount -= input;
      targetRow.amount += output;
      await transaction.manager.save([sourceRow, targetRow]);
      ship.cargoUsed = used - input + output;
      await transaction.manager.save(ship);
    });
  }

  private async crewBlockReason(
    manager: EntityManager,
    ship: Spacecraft,
  ): Promise<string | null> {
    const crew = await manager.countBy(CrewAssignment, {
      spacecraftId: ship.id,
    });
    return crew < Math.max(0, ship.crewRequired)
      ? 'Nicht genug Besatzung'
      : null;
  }

  private blockReason(ship: Spacecraft, activating = false): string | null {
    const state = (ship.runtimeSystems as SpacecraftRuntimeSystemsDto)
      .RESOURCE_CONVERTER;
    const modules = ship.modules.filter((module) =>
      getRuntimeSystemsForModule(module).includes('RESOURCE_CONVERTER'),
    );
    if (
      !state ||
      state.integrity <= 0 ||
      !modules.some((module) => module.integrity > 0)
    )
      return 'Keine intakte Molekular-Raffinerie';
    if (isCoolingDown(state) || modules.some((module) => isCoolingDown(module)))
      return 'Raffinerie kühlt ab';
    if (ship.status !== 'IDLE' || ship.operatingMode === 'STANDBY')
      return 'Raumschiff ist nicht einsatzbereit';
    if (activating && !state.active && ship.energy < 15)
      return 'Mindestens 15 EPS erforderlich';
    return null;
  }

  /** STU checks unlocked building definitions, not constructed colony fields. */
  private async producible(
    manager: EntityManager,
    userId: number,
    locked = false,
  ): Promise<Set<number>> {
    const research = await manager.find(Research, {
      where: { userId, status: ResearchStatus.COMPLETED },
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
    const completed = new Set(research.map((row) => row.techId));
    return new Set(
      this.gameData
        .getAllBuildings()
        .filter(
          (building) =>
            building.researchId == null || completed.has(building.researchId),
        )
        .flatMap((building) =>
          building.production
            .filter((row) => row.amount > 0)
            .map((row) => row.commodityId),
        ),
    );
  }

  private async describe(
    manager: EntityManager,
    ship: Spacecraft,
  ): Promise<ResourceConversionDto> {
    const system = (ship.runtimeSystems as SpacecraftRuntimeSystemsDto)
      .RESOURCE_CONVERTER;
    const producible = await this.producible(manager, ship.userId);
    return {
      active: system?.active ?? false,
      selectedCommodityId: system?.resourceCommodityId ?? null,
      activationEps: 15,
      epsPerTick: 10,
      blockReason:
        this.blockReason(ship, true) ??
        (await this.crewBlockReason(manager, ship)),
      options: RESOURCE_CONVERSIONS.map(
        ([
          sourceCommodityId,
          targetCommodityId,
          inputAmount,
          outputAmount,
          mode,
        ]) => ({
          sourceCommodityId,
          targetCommodityId,
          inputAmount,
          outputAmount,
          sourceName:
            this.gameData.getCommodity(sourceCommodityId)?.name ??
            String(sourceCommodityId),
          targetName:
            this.gameData.getCommodity(targetCommodityId)?.name ??
            String(targetCommodityId),
          mode: mode === 1 ? 'COMPRESSOR' : 'SUBLIMATOR',
          producible: producible.has(targetCommodityId),
        }),
      ),
    };
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
    initializeSpacecraftRuntimeSystems(ship);
    return ship;
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

  private notify(
    ship: Spacecraft,
    text: string,
    transaction?: TransactionalNotifications,
  ) {
    return this.messaging.sendSystem(
      ship.userId,
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
            'Raffineriezustand ist gesperrt; bitte erneut versuchen',
          );
        throw error;
      });
    for (const notify of afterCommit) notify();
    return result;
  }
}
