import { BadRequestException, ForbiddenException, Inject, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { randomInt } from 'node:crypto';
import { DataSource, IsNull, Not, type EntityManager } from 'typeorm';
import type { LotteryWinnerBuildplanDto, TradeLotteryDto } from '@swuniverse/shared';
import { User } from '../auth/user.entity';
import { FactionEntity } from '../faction/entities/faction.entity';
import { MessageFolder } from '../messaging/message-folder';
import { MessagingService } from '../messaging/messaging.service';
import { PrestigeService } from '../prestige/prestige.service';
import { AdminShipBuildplan } from '../spacecraft/entities/admin-ship-buildplan.entity';
import { ShipClassDef } from '../spacecraft/entities/ship-class-def.entity';
import { DEFAULT_GAME_TIMEZONE, type MaintenanceHandler } from '../tick/maintenance.service';
import { LotteryTicket } from './entities/lottery-ticket.entity';
import { LotteryWinnerBuildplan } from './entities/lottery-winner-buildplan.entity';
import { TradeAccountStorage } from './entities/trade-account-storage.entity';
import { hasLicense, huttPost } from './trade-deal.service';
import type { TradeDealFulfillment } from './trade-deal-fulfillment.port';

const AURODIUM_COMMODITY_ID = 50;
const DAY_MS = 24 * 60 * 60 * 1000;
const NO_LICENSE = 'Um Lotterielose zu kaufen, wird eine Handelslizenz beim Hutten-Kartell benötigt';
export const TRADE_LOTTERY_CLOCK = Symbol('TRADE_LOTTERY_CLOCK');
export const TRADE_LOTTERY_RANDOM = Symbol('TRADE_LOTTERY_RANDOM');

export interface LotteryRandom {
  /** Inclusive on both ends, like PHP `random_int`. */
  integer(min: number, max: number): number;
}

/** Internal event „Lotterie gezogen“; soc-G2c hangs the `LOTTERY_WINNER` award on it. */
export interface LotteryDrawnEvent {
  period: string;
  winnerUserId: number;
}

export interface LotteryDrawResult extends LotteryDrawnEvent {
  tickets: number;
  jackpot: number;
}

/** STU `ceil(n / 100 * 80)`. */
export function lotteryJackpot(tickets: number): number {
  return Math.ceil((tickets * 80) / 100);
}

/**
 * STU lottery of the Ferengi, run by the Hutt Cartel: tickets for 1 Aurodium
 * at the Hutt post, drawn on the first of each month by the daily maintenance
 * (STU `EndLotteryPeriod`). Periods are calendar months in the game time zone.
 */
@Injectable()
export class TradeLotteryService implements MaintenanceHandler {
  readonly name = 'trade-lottery';
  private readonly logger = new Logger(TradeLotteryService.name);
  private readonly clock: () => Date;
  private readonly random: LotteryRandom;
  private readonly timezone = process.env.GAME_TIMEZONE?.trim() || DEFAULT_GAME_TIMEZONE;
  private ships: TradeDealFulfillment | null = null;
  private readonly listeners: Array<(event: LotteryDrawnEvent) => void | Promise<void>> = [];

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly prestige: PrestigeService,
    private readonly messaging: MessagingService,
    @Optional() @Inject(TRADE_LOTTERY_CLOCK) clock?: () => Date,
    @Optional() @Inject(TRADE_LOTTERY_RANDOM) random?: LotteryRandom,
  ) {
    this.clock = clock ?? (() => new Date());
    this.random = random ?? { integer: (min, max) => randomInt(min, max + 1) };
  }

  registerShipFactory(ships: TradeDealFulfillment): void {
    this.ships = ships;
  }

  onDrawn(listener: (event: LotteryDrawnEvent) => void | Promise<void>): void {
    this.listeners.push(listener);
  }

  async run(now: Date): Promise<string | void> {
    const result = await this.draw(now);
    if (result) return `Lotterie ${result.period}: ${result.tickets} Lose, ${result.jackpot} Aurodium`;
  }

  async overview(userId: number, now = this.clock()): Promise<TradeLotteryDto> {
    const manager = this.dataSource.manager;
    const post = await huttPost(manager);
    const licensed = post ? await hasLicense(manager, post.id, userId, now) : false;
    const period = this.period(now);
    const lastPeriod = this.period(new Date(now.getTime() - this.dayOfMonth(now) * DAY_MS));
    const [tickets, ownTickets, account, lastTickets, ownLastTickets, winnerTicket] = await Promise.all([
      manager.countBy(LotteryTicket, { period }),
      manager.countBy(LotteryTicket, { period, userId }),
      post ? manager.findOneBy(TradeAccountStorage, { tradePostId: post.id, userId, commodityId: AURODIUM_COMMODITY_ID }) : null,
      manager.countBy(LotteryTicket, { period: lastPeriod }),
      manager.countBy(LotteryTicket, { period: lastPeriod, userId }),
      manager.findOneBy(LotteryTicket, { period: lastPeriod, isWinner: true }),
    ]);
    const winner = winnerTicket ? await manager.findOneBy(User, { id: winnerTicket.userId }) : null;
    return {
      hasLicense: licensed,
      notice: licensed ? null : NO_LICENSE,
      tradePostName: post?.name ?? null,
      period,
      tickets,
      ownTickets,
      jackpot: lotteryJackpot(tickets),
      aurodium: account?.amount ?? 0,
      lastDraw: lastTickets
        ? {
            period: lastPeriod,
            tickets: lastTickets,
            jackpot: lotteryJackpot(lastTickets),
            ownTickets: ownLastTickets,
            winner: winner ? { id: winner.id, username: winner.username } : null,
          }
        : null,
    };
  }

  /** STU `BuyLotteryTickets`. */
  async buy(userId: number, amount: number): Promise<{ message: string }> {
    if (!Number.isSafeInteger(amount) || amount < 1) throw new BadRequestException('Anzahl muss eine positive ganze Zahl sein');
    await this.dataSource.transaction(async (manager) => {
      const now = this.clock();
      const post = await huttPost(manager, true);
      if (!post || !(await hasLicense(manager, post.id, userId, now))) throw new ForbiddenException(NO_LICENSE);
      const user = await manager.findOneBy(User, { id: userId });
      if (!user || user.isNpc) throw new ForbiddenException('NPCs können keine Lose kaufen');
      const storage = await manager.findOne(TradeAccountStorage, {
        where: { tradePostId: post.id, userId, commodityId: AURODIUM_COMMODITY_ID },
        lock: { mode: 'pessimistic_write' },
      });
      if (!storage || storage.amount < amount) {
        throw new BadRequestException('Nicht genügend Aurodium auf diesem Handelsposten vorhanden');
      }
      storage.amount -= amount;
      if (storage.amount === 0) await manager.remove(storage);
      else await manager.save(storage);
      const period = this.period(now);
      await manager.insert(LotteryTicket, Array.from({ length: amount }, () => ({ userId, period, isWinner: null })));
    });
    return { message: `${amount} Lotterielos(e) wurde gekauft` };
  }

  /**
   * STU `EndLotteryPeriod`: only on the first of the month, and only once per
   * period (the draw marks every ticket). Returns `null` when nothing was drawn.
   */
  async draw(now = this.clock()): Promise<LotteryDrawResult | null> {
    if (this.dayOfMonth(now) !== 1) return null;
    const period = this.period(new Date(now.getTime() - DAY_MS));
    const afterCommit: Array<() => void> = [];
    const result = await this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`trade-lottery:${period}`]);
      if (await manager.existsBy(LotteryTicket, { period, isWinner: Not(IsNull()) })) return null;
      const tickets = await manager.find(LotteryTicket, { where: { period }, order: { id: 'ASC' } });
      if (!tickets.length) return null;
      const post = await huttPost(manager);
      if (!post) throw new NotFoundException('Der Handelsposten des Hutten-Kartells fehlt');
      const transaction = { manager, afterCommit };

      const jackpot = lotteryJackpot(tickets.length);
      const winnerTicket = tickets[this.random.integer(0, tickets.length - 1)];
      await manager.update(LotteryTicket, { period }, { isWinner: false });
      await manager.update(LotteryTicket, { id: winnerTicket.id }, { isWinner: true });
      const winner = await manager.findOneByOrFail(User, { id: winnerTicket.userId });

      const own = tickets.filter((ticket) => ticket.userId === winner.id).length;
      await this.prestige.change(winner.id, own, `${own} Prestige erhalten für den Erwerb von ${own} Losen in der letzten Lotterieziehung`, manager);
      await creditAurodium(manager, post.id, winner.id, jackpot);
      await this.messaging.sendSystem(
        winner.id,
        'Lotteriegewinn',
        `Du hast ${jackpot} Aurodium in der Lotterie gewonnen.\nEs waren ${tickets.length} Lose im Topf.\nDer Gewinn wartet auf dich am Handelsposten '${post.name}'`,
        undefined, MessageFolder.TRADE, undefined, false, transaction,
      );
      await this.transmitShip(manager, winner, post, now, transaction);

      for (const loserId of new Set(tickets.map((ticket) => ticket.userId))) {
        if (loserId === winner.id) continue;
        await this.messaging.sendSystem(
          loserId,
          'Lotterieziehung',
          `${winner.username} hat ${jackpot} Aurodium in der Lotterie gewonnen.\nEs waren ${tickets.length} Lose im Topf.\nViel Glück beim nächsten Mal!`,
          undefined, MessageFolder.TRADE, undefined, false, transaction,
        );
      }
      await this.handOutFreeTickets(manager, now, transaction);
      return { period, tickets: tickets.length, jackpot, winnerUserId: winner.id };
    });
    for (const notify of afterCommit) notify();
    if (result) {
      for (const listener of this.listeners) {
        try {
          await listener({ period: result.period, winnerUserId: result.winnerUserId });
        } catch (error) {
          this.logger.error(`Lottery listener failed for ${result.period}: ${String(error)}`);
        }
      }
    }
    return result;
  }

  listWinnerBuildplans(): Promise<LotteryWinnerBuildplanDto[]> {
    return this.dataSource.manager
      .find(LotteryWinnerBuildplan, { order: { factionId: 'ASC', id: 'ASC' } })
      .then((plans) => plans.map(({ id, factionId, buildplanId, chance }) => ({ id, factionId, buildplanId, chance })));
  }

  async addWinnerBuildplan(input: Omit<LotteryWinnerBuildplanDto, 'id'>): Promise<LotteryWinnerBuildplanDto> {
    const manager = this.dataSource.manager;
    if (!Number.isSafeInteger(input?.chance) || input.chance < 1) throw new BadRequestException('Chance muss eine positive ganze Zahl sein');
    if (!Number.isSafeInteger(input.factionId) || !(await manager.existsBy(FactionEntity, { id: input.factionId }))) {
      throw new BadRequestException('Fraktion nicht gefunden');
    }
    if (!Number.isSafeInteger(input.buildplanId) || !(await manager.existsBy(AdminShipBuildplan, { id: input.buildplanId }))) {
      throw new BadRequestException('Bauplan nicht gefunden');
    }
    const saved = await manager.save(LotteryWinnerBuildplan, manager.create(LotteryWinnerBuildplan, {
      factionId: input.factionId, buildplanId: input.buildplanId, chance: input.chance,
    }));
    return { id: saved.id, factionId: saved.factionId, buildplanId: saved.buildplanId, chance: saved.chance };
  }

  async removeWinnerBuildplan(id: number): Promise<void> {
    await this.dataSource.manager.delete(LotteryWinnerBuildplan, { id });
  }

  /** STU `transmitShip`: a prize ship of the winner's faction, picked by chance. */
  private async transmitShip(
    manager: EntityManager,
    winner: User,
    post: { id: number; name: string; locationId: number },
    now: Date,
    transaction: { manager: EntityManager; afterCommit: Array<() => void> },
  ): Promise<void> {
    if (winner.factionId === null) return;
    const plans = await manager.find(LotteryWinnerBuildplan, { where: { factionId: winner.factionId }, order: { id: 'ASC' } });
    if (!plans.length || !this.ships) return;
    let roll = this.random.integer(1, plans.reduce((sum, plan) => sum + plan.chance, 0));
    const plan = plans.find((entry) => (roll -= entry.chance) <= 0) ?? plans[plans.length - 1];
    const buildplan = await manager.findOneBy(AdminShipBuildplan, { id: plan.buildplanId });
    const shipClass = buildplan ? await manager.findOneBy(ShipClassDef, { id: buildplan.shipClassId }) : null;
    await this.ships.createShip(manager, {
      userId: winner.id,
      buildplanId: plan.buildplanId,
      locationId: post.locationId,
      name: `Lotteriegewinn (${new Intl.DateTimeFormat('de-DE', { timeZone: this.timezone, day: '2-digit', month: '2-digit', year: 'numeric' }).format(now)})`,
    });
    await this.messaging.sendSystem(
      winner.id,
      'Lotteriegewinn: Schiff',
      `Als zusätzlicher Lotteriegewinn wurde dir ein Schiff der ${shipClass?.name ?? 'unbekannten'}-Klasse am Handelsposten '${post.name}' überstellt.`,
      undefined, MessageFolder.TRADE, undefined, false, transaction,
    );
  }

  /**
   * STU gives each player a free ticket with `10 × (id − first id) / players`
   * percent. SWU ids are not contiguous, so the rank by id stands in for them.
   */
  private async handOutFreeTickets(
    manager: EntityManager,
    now: Date,
    transaction: { manager: EntityManager; afterCommit: Array<() => void> },
  ): Promise<void> {
    const players = await manager.find(User, { select: { id: true }, where: { isNpc: false }, order: { id: 'ASC' } });
    const period = this.period(now);
    for (const [index, player] of players.entries()) {
      const winRate = (10 * index) / players.length;
      if (this.random.integer(1, 100) > winRate) continue;
      await manager.insert(LotteryTicket, { userId: player.id, period, isWinner: null });
      await this.messaging.sendSystem(
        player.id,
        'Gratislos',
        'Du hast ein Gratislos für den aktuellen Lotteriezeitraum erhalten. Möge das Glück mit dir sein!',
        undefined, MessageFolder.TRADE, undefined, false, transaction,
      );
    }
  }

  private period(date: Date): string {
    const { year, month } = this.calendar(date);
    return `${year}.${String(month).padStart(2, '0')}`;
  }

  private dayOfMonth(date: Date): number {
    return this.calendar(date).day;
  }

  private calendar(date: Date) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: this.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
    const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
    return { year: value('year'), month: value('month'), day: value('day') };
  }
}

/** STU `upperStorage`: the jackpot lands without a capacity check. */
async function creditAurodium(manager: EntityManager, tradePostId: number, userId: number, amount: number): Promise<void> {
  const row =
    (await manager.findOne(TradeAccountStorage, {
      where: { tradePostId, userId, commodityId: AURODIUM_COMMODITY_ID },
      lock: { mode: 'pessimistic_write' },
    })) ?? manager.create(TradeAccountStorage, { tradePostId, userId, commodityId: AURODIUM_COMMODITY_ID, amount: 0 });
  row.amount += amount;
  await manager.save(row);
}

