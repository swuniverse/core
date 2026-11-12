import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, MoreThan, type EntityManager } from 'typeorm';
import type {
  SpacecraftRuntimeSystemsDto,
  TradeAccountTransferDirection,
  TradeAccountTransferLineDto,
  TradeAccountTransferResultDto,
  TradeMenuDto,
} from '@swuniverse/shared';
import { GameDataService } from '../game-data/game-data.service';
import { CargoItem } from '../spacecraft/entities/cargo-item.entity';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import { TradeAccountStorage } from './entities/trade-account-storage.entity';
import { TradeLicense } from './entities/trade-license.entity';
import { TradePost } from './entities/trade-post.entity';
import { TradePostPresencePolicy } from './trade-post-presence.policy';
import { TradeStorageService } from './trade-storage.service';

/**
 * STU `TransferToAccount`/`TransferFromAccount` at a trade post: field
 * co-presence, a valid license and per-line truncation to stock and space.
 * Like STU it costs no energy. Everything is booked in one transaction.
 */
@Injectable()
export class TradeAccountTransferService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly presence: TradePostPresencePolicy,
    private readonly storage: TradeStorageService,
    private readonly gameData: GameDataService,
  ) {}

  async getMenu(shipId: number, userId: number, tradePostId: number, now = new Date()): Promise<TradeMenuDto> {
    const manager = this.dataSource.manager;
    const { ship, post } = await this.load(manager, shipId, userId, tradePostId);
    const reason = this.presence.reason(this.presenceShip(ship), post, userId);
    const hasLicense = await this.hasLicense(manager, post.id, userId, now);
    const [cargo, account, capacity] = await Promise.all([
      manager.find(CargoItem, { where: { spacecraftId: ship.id, amount: MoreThan(0) }, order: { commodityId: 'ASC' } }),
      manager.find(TradeAccountStorage, { where: { tradePostId: post.id, userId, amount: MoreThan(0) }, order: { commodityId: 'ASC' } }),
      this.storage.capacityIn(manager, post.id, userId, post),
    ]);
    return {
      tradePostId: post.id,
      tradePostName: post.name,
      reason,
      hasLicense,
      cargo: cargo.map((item) => ({
        commodityId: item.commodityId,
        commodityName: this.commodityName(item.commodityId),
        amount: item.amount,
        transferable: this.gameData.getCommodity(item.commodityId)?.isTradeable === true,
      })),
      cargoUsed: cargo.reduce((sum, item) => sum + item.amount, 0),
      cargoMax: ship.cargoMax,
      account: account.map((item) => ({
        commodityId: item.commodityId,
        commodityName: this.commodityName(item.commodityId),
        amount: item.amount,
        transferable: this.gameData.getCommodity(item.commodityId)?.isBeamable === true,
      })),
      accountUsed: capacity.occupied,
      accountCapacity: capacity.capacity,
    };
  }

  async transfer(
    shipId: number,
    userId: number,
    tradePostId: number,
    direction: TradeAccountTransferDirection,
    lines: TradeAccountTransferLineDto[],
  ): Promise<TradeAccountTransferResultDto> {
    this.validate(lines);
    return this.dataSource.transaction(async (manager) => {
      const post = await manager.findOne(TradePost, { where: { id: tradePostId }, lock: { mode: 'pessimistic_write' } });
      if (!post) throw new NotFoundException('Handelsposten nicht gefunden');
      const ship = await manager.findOne(Spacecraft, { where: { id: shipId, userId }, lock: { mode: 'pessimistic_write' } });
      if (!ship) throw new NotFoundException('Schiff nicht gefunden');
      const reason = this.presence.reason(this.presenceShip(ship), post, userId);
      if (reason) throw new BadRequestException(reason);
      if (!(await this.hasLicense(manager, post.id, userId, new Date()))) {
        throw new BadRequestException('Du benötigst eine gültige Lizenz für diesen Handelsposten');
      }
      const result = direction === 'TO_ACCOUNT'
        ? await this.toAccount(manager, ship, post, lines)
        : await this.fromAccount(manager, ship, post, lines);
      ship.cargoUsed = await this.cargoUsed(manager, ship.id);
      await manager.update(Spacecraft, ship.id, { cargoUsed: ship.cargoUsed });
      return { direction, ...result };
    });
  }

  private async toAccount(manager: EntityManager, ship: Spacecraft, post: TradePost, lines: TradeAccountTransferLineDto[]) {
    const capacity = await this.storage.capacityIn(manager, post.id, ship.userId, post);
    let free = capacity.free;
    if (free <= 0) throw new BadRequestException('Dein Warenkonto an diesem Posten ist voll');
    if (!(await this.cargoUsed(manager, ship.id))) {
      throw new BadRequestException('Keine Waren zum Transferieren vorhanden');
    }
    const transferred: TradeAccountTransferResultDto['transferred'] = [];
    const messages: string[] = [];
    for (const line of lines) {
      const name = this.commodityName(line.commodityId);
      if (this.gameData.getCommodity(line.commodityId)?.isTradeable !== true) {
        messages.push(`${name} ist nicht handelbar`);
        continue;
      }
      const cargo = await manager.findOne(CargoItem, {
        where: { spacecraftId: ship.id, commodityId: line.commodityId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!cargo || cargo.amount <= 0) {
        messages.push(`${name} ist nicht im Frachtraum`);
        continue;
      }
      const amount = this.truncate(line.amount, cargo.amount, free, name, messages, 'Warenkonto');
      if (amount <= 0) continue;
      cargo.amount -= amount;
      if (cargo.amount === 0) await manager.remove(cargo);
      else await manager.save(cargo);
      await this.addToAccount(manager, post.id, ship.userId, line.commodityId, amount);
      free -= amount;
      transferred.push({ commodityId: line.commodityId, commodityName: name, amount });
    }
    return { transferred, messages };
  }

  private async fromAccount(manager: EntityManager, ship: Spacecraft, post: TradePost, lines: TradeAccountTransferLineDto[]) {
    let free = Math.max(0, ship.cargoMax - (await this.cargoUsed(manager, ship.id)));
    if (free <= 0) throw new BadRequestException('Der Frachtraum ist voll');
    const transferred: TradeAccountTransferResultDto['transferred'] = [];
    const messages: string[] = [];
    for (const line of lines) {
      const name = this.commodityName(line.commodityId);
      if (this.gameData.getCommodity(line.commodityId)?.isBeamable !== true) {
        messages.push(`${name} ist nicht beambar`);
        continue;
      }
      const stock = await manager.findOne(TradeAccountStorage, {
        where: { tradePostId: post.id, userId: ship.userId, commodityId: line.commodityId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!stock || stock.amount <= 0) {
        messages.push(`${name} ist nicht im Warenkonto`);
        continue;
      }
      const amount = this.truncate(line.amount, stock.amount, free, name, messages, 'Frachtraum');
      if (amount <= 0) continue;
      stock.amount -= amount;
      if (stock.amount === 0) await manager.remove(stock);
      else await manager.save(stock);
      await this.addToCargo(manager, ship.id, line.commodityId, amount);
      free -= amount;
      transferred.push({ commodityId: line.commodityId, commodityName: name, amount });
    }
    return { transferred, messages };
  }

  /** STU: min(wish, stock, free space) with a note when space cut the line. */
  private truncate(
    wanted: number,
    stock: number,
    free: number,
    name: string,
    messages: string[],
    target: string,
  ): number {
    const amount = Math.min(wanted, stock, free);
    if (amount === wanted || amount === stock) return amount;
    messages.push(amount > 0 ? `${name}: gekürzt auf ${amount}, ${target} ist voll` : `${name}: ${target} ist voll`);
    return amount;
  }

  private async addToAccount(manager: EntityManager, tradePostId: number, userId: number, commodityId: number, amount: number) {
    const row =
      (await manager.findOne(TradeAccountStorage, {
        where: { tradePostId, userId, commodityId },
        lock: { mode: 'pessimistic_write' },
      })) ?? manager.create(TradeAccountStorage, { tradePostId, userId, commodityId, amount: 0 });
    row.amount += amount;
    await manager.save(row);
  }

  private async addToCargo(manager: EntityManager, spacecraftId: number, commodityId: number, amount: number) {
    const row =
      (await manager.findOne(CargoItem, {
        where: { spacecraftId, commodityId },
        lock: { mode: 'pessimistic_write' },
      })) ?? manager.create(CargoItem, { spacecraftId, commodityId, amount: 0 });
    row.amount += amount;
    await manager.save(row);
  }

  private async cargoUsed(manager: EntityManager, spacecraftId: number): Promise<number> {
    const result = await manager
      .getRepository(CargoItem)
      .createQueryBuilder('cargo')
      .select('COALESCE(SUM(cargo.amount), 0)', 'total')
      .where('cargo.spacecraftId = :spacecraftId', { spacecraftId })
      .getRawOne<{ total: string }>();
    return Number(result?.total ?? 0);
  }

  private async load(manager: EntityManager, shipId: number, userId: number, tradePostId: number) {
    const [ship, post] = await Promise.all([
      manager.findOneBy(Spacecraft, { id: shipId, userId }),
      manager.findOneBy(TradePost, { id: tradePostId }),
    ]);
    if (!ship) throw new NotFoundException('Schiff nicht gefunden');
    if (!post) throw new NotFoundException('Handelsposten nicht gefunden');
    return { ship, post };
  }

  private async hasLicense(manager: EntityManager, tradePostId: number, userId: number, now: Date): Promise<boolean> {
    return manager.exists(TradeLicense, { where: { tradePostId, userId, expiresAt: MoreThan(now) } });
  }

  private presenceShip(ship: Spacecraft) {
    return { ...ship, runtimeSystems: ship.runtimeSystems as SpacecraftRuntimeSystemsDto };
  }

  private commodityName(id: number): string {
    return this.gameData.getCommodity(id)?.name ?? `Ware #${id}`;
  }

  private validate(lines: TradeAccountTransferLineDto[]): void {
    if (!Array.isArray(lines) || lines.length === 0) {
      throw new BadRequestException('Es wurden keine Waren zum Transferieren ausgewählt');
    }
    for (const line of lines) {
      if (!Number.isSafeInteger(line?.commodityId) || line.commodityId < 1 || !Number.isSafeInteger(line.amount) || line.amount < 1) {
        throw new BadRequestException('Ware und Menge müssen positive Ganzzahlen sein');
      }
    }
  }
}
