import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { StationScrappingDto } from '@swuniverse/shared';
import { DataSource, EntityManager } from 'typeorm';
import { GameDataService } from '../game-data/game-data.service';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import {
  MessagingService,
  type TransactionalNotifications,
} from '../messaging/messaging.service';
import { MessageFolder } from '../messaging/message-folder';
import { PlayerTradePostService } from '../trade/player-trade-post.service';
import {
  Spacecraft,
  SpacecraftKind,
  SpacecraftStatus,
  StationRole,
} from './entities/spacecraft.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import { StationScrapping } from './entities/station-scrapping.entity';
import { CargoItem } from './entities/cargo-item.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import {
  prepareScrappingModules,
  recycleScrappingModules,
  scrappingCode,
} from './station-scrapping-rules';

@Injectable()
export class StationScrappingService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly gameData: GameDataService,
    private readonly messaging: MessagingService,
    private readonly tradePosts: PlayerTradePostService,
  ) {}

  async get(id: number, userId: number): Promise<StationScrappingDto> {
    const manager = this.dataSource.manager;
    const station = await this.load(manager, id, userId);
    const progress = await manager.findOneBy(StationScrapping, {
      stationId: id,
    });
    const crew = await manager.countBy(CrewAssignment, { spacecraftId: id });
    const workbees = await this.workbees(manager, id);
    const hull = await manager.findOneByOrFail(ShipClassDef, {
      id: station.shipClassId,
    });
    return {
      confirmationCode: scrappingCode(station.name),
      active: station.status === SpacecraftStatus.UNDER_SCRAPPING,
      immediate: station.stationRole === StationRole.CONSTRUCTION,
      remainingTicks:
        progress?.remainingTicks ??
        Math.max(1, Math.ceil(hull.buildTimeTicks / 2)),
      requiredWorkbees: this.requiredWorkbees(station, hull),
      dockedWorkbees: workbees.length,
      blockReason:
        crew > 0
          ? 'Zum Demontieren muss die Station unbemannt sein'
          : ![
                SpacecraftStatus.IDLE,
                SpacecraftStatus.UNDER_CONSTRUCTION,
                SpacecraftStatus.UNDER_SCRAPPING,
              ].includes(station.status)
            ? 'Station ist nicht bereit'
            : null,
    };
  }

  async start(
    id: number,
    userId: number,
    code: string,
  ): Promise<{ removed: boolean }> {
    return this.transaction(async (transaction) => {
      const manager = transaction.manager;
      const station = await this.load(manager, id, userId, true);
      if (code.trim() !== scrappingCode(station.name))
        throw new BadRequestException('Der Bestätigungscode war fehlerhaft');
      if (station.status === SpacecraftStatus.UNDER_SCRAPPING)
        return { removed: false };
      if (
        ![SpacecraftStatus.IDLE, SpacecraftStatus.UNDER_CONSTRUCTION].includes(
          station.status,
        )
      )
        throw new BadRequestException('Station ist nicht bereit');
      const crew = await manager.find(CrewAssignment, {
        where: { spacecraftId: id },
        lock: { mode: 'pessimistic_write' },
      });
      if (crew.length)
        throw new BadRequestException(
          'Zum Demontieren muss die Station unbemannt sein',
        );
      if (station.stationRole === StationRole.CONSTRUCTION) {
        await this.remove(manager, station, transaction);
        await this.notify(station, 'Konstrukt wurde entfernt.', transaction);
        return { removed: true };
      }
      const hull = await manager.findOneByOrFail(ShipClassDef, {
        id: station.shipClassId,
      });
      const modules = await manager.find(SpacecraftModule, {
        where: { spacecraftId: id },
        order: { id: 'ASC' },
        lock: { mode: 'pessimistic_write' },
      });
      const items = this.gameData.getAllFabricationItems();
      const recoverable = modules.flatMap((module) => {
        const item = items.find(
          (item) =>
            item.moduleType === module.moduleType &&
            (item.shipyardType ?? item.moduleCategory) === module.category &&
            (item.moduleLevel ?? 1) === module.level,
        );
        return item
          ? [
              {
                commodityId: item.outputCommodityId,
                integrity: module.integrity,
              },
            ]
          : [];
      });
      await manager.save(
        manager.create(StationScrapping, {
          stationId: id,
          remainingTicks: Math.max(1, Math.ceil(hull.buildTimeTicks / 2)),
          modules: prepareScrappingModules(recoverable),
        }),
      );
      await manager.delete(SpacecraftModule, { spacecraftId: id });
      await this.tradePosts.destroyForStation(manager, station, transaction);
      station.status = SpacecraftStatus.UNDER_SCRAPPING;
      station.runtimeSystems = {};
      station.shields = 0;
      station.shieldsMax = 0;
      station.passiveRepair = false;
      station.crew = 0;
      station.tractoredShipId = null;
      station.dockCapacity = 50;
      await manager.save(station);
      await this.notify(
        station,
        'Die Demontage hat begonnen und kann nicht abgebrochen werden.',
        transaction,
      );
      return { removed: false };
    });
  }

  /** Returns true when this tick belongs to the scrapping lifecycle. */
  async processTick(id: number): Promise<boolean> {
    return this.transaction(async (transaction) => {
      const manager = transaction.manager;
      const station = await manager.findOne(Spacecraft, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        !station ||
        station.kind !== SpacecraftKind.STATION ||
        station.status !== SpacecraftStatus.UNDER_SCRAPPING
      )
        return false;
      const progress = await manager.findOneByOrFail(StationScrapping, {
        stationId: id,
      });
      const hull = await manager.findOneByOrFail(ShipClassDef, {
        id: station.shipClassId,
      });
      const docked = await manager.find(Spacecraft, {
        where: { dockedAtId: id },
        order: { id: 'ASC' },
        lock: { mode: 'pessimistic_write', onLocked: 'nowait' },
      });
      const workbees = await this.workbees(manager, id, docked);
      const required = this.requiredWorkbees(station, hull);
      const crew = await manager.countBy(CrewAssignment, { spacecraftId: id });
      if (crew > 0 || workbees.length < required) {
        await this.notify(
          station,
          crew > 0
            ? 'Demontage pausiert: Station ist bemannt.'
            : `Demontage pausiert: ${workbees.length}/${required} einsatzfähige Workbees angedockt.`,
          transaction,
        );
        return true;
      }
      if (progress.remainingTicks > 1) {
        progress.remainingTicks--;
        await manager.save(progress);
        return true;
      }
      const recycled = recycleScrappingModules(progress.modules);
      const target = docked.find(
        (ship) =>
          ship.userId === station.userId &&
          ship.kind === SpacecraftKind.SHIP &&
          ship.status === SpacecraftStatus.IDLE,
      );
      const returned: Array<{ commodityId: number; amount: number }> = [];
      if (target) {
        const cargo = await manager.find(CargoItem, {
          where: { spacecraftId: target.id },
          lock: { mode: 'pessimistic_write' },
        });
        let used = cargo.reduce((sum, row) => sum + Math.max(0, row.amount), 0);
        for (const item of recycled) {
          const amount = Math.min(
            item.amount,
            Math.max(0, target.cargoMax - used),
          );
          if (!amount) continue;
          let row = cargo.find((row) => row.commodityId === item.commodityId);
          if (!row) {
            row = manager.create(CargoItem, {
              spacecraftId: target.id,
              commodityId: item.commodityId,
              amount: 0,
            });
            cargo.push(row);
          }
          row.amount += amount;
          used += amount;
          returned.push({ commodityId: item.commodityId, amount });
        }
        if (cargo.length) await manager.save(cargo);
        target.cargoUsed = used;
        await manager.save(target);
      }
      await this.remove(manager, station, transaction);
      const summary = returned
        .map(
          (item) =>
            `${item.amount} × ${this.gameData.getCommodity(item.commodityId)?.name ?? item.commodityId}`,
        )
        .join(', ');
      await this.notify(
        station,
        `Demontage abgeschlossen. ${summary ? `Module an ${target!.name}: ${summary}.` : 'Keine Module zurückgegeben.'}`,
        transaction,
      );
      return true;
    });
  }

  private requiredWorkbees(station: Spacecraft, hull: ShipClassDef): number {
    if (station.stationRole === StationRole.CONSTRUCTION) return 0;
    const defaults: Record<string, number> = {
      DEPOT_SMALL: 15,
      DEPOT_LARGE: 20,
      SHIPYARD: 10,
      SENSOR: 5,
      OUTPOST: 30,
      BASE: 40,
    };
    const count =
      this.gameData.getShipClassDefByKey(hull.key)?.station?.requiredWorkbees ??
      defaults[station.stationRole ?? ''] ??
      0;
    return Math.ceil(count / 2);
  }

  private async workbees(
    manager: EntityManager,
    id: number,
    ships?: Spacecraft[],
  ): Promise<Spacecraft[]> {
    const docked =
      ships ?? (await manager.find(Spacecraft, { where: { dockedAtId: id } }));
    const result: Spacecraft[] = [];
    for (const ship of docked) {
      const hull = await manager.findOneBy(ShipClassDef, {
        id: ship.shipClassId,
      });
      if (
        hull?.role !== 'WORKBEE' ||
        ship.status !== SpacecraftStatus.IDLE ||
        ship.hull <= 0
      )
        continue;
      const crew = await manager.countBy(CrewAssignment, {
        spacecraftId: ship.id,
      });
      if (crew >= ship.crewRequired) result.push(ship);
    }
    return result;
  }

  private async load(
    manager: EntityManager,
    id: number,
    userId: number,
    lock = false,
  ): Promise<Spacecraft> {
    const station = await manager.findOne(Spacecraft, {
      where: { id, userId, kind: SpacecraftKind.STATION },
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    if (!station) throw new NotFoundException('Station nicht gefunden');
    return station;
  }

  private async remove(
    manager: EntityManager,
    station: Spacecraft,
    transaction: TransactionalNotifications,
  ): Promise<void> {
    await manager.find(Spacecraft, {
      where: { dockedAtId: station.id },
      order: { id: 'ASC' },
      lock: { mode: 'pessimistic_write', onLocked: 'nowait' },
    });
    await this.tradePosts.destroyForStation(manager, station, transaction);
    await manager.update(
      Spacecraft,
      { dockedAtId: station.id },
      { dockedAtId: null },
    );
    // Station-bound data (including future alliance-depot assignments) use cascading FKs.
    await manager.delete(Spacecraft, station.id);
  }

  private notify(
    station: Spacecraft,
    text: string,
    transaction: TransactionalNotifications,
  ) {
    return this.messaging.sendSystem(
      station.userId,
      `${station.name}: ${text}`,
      undefined,
      MessageFolder.STATION,
      undefined,
      false,
      transaction,
    );
  }

  private async transaction<T>(
    work: (transaction: TransactionalNotifications) => Promise<T>,
  ): Promise<T> {
    const afterCommit: Array<() => void> = [];
    const result = await this.dataSource.transaction((manager) =>
      work({ manager, afterCommit }),
    );
    for (const callback of afterCommit) callback();
    return result;
  }
}
