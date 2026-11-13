import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, MoreThan, type EntityManager } from 'typeorm';
import type { CreateTradeOfferDto, TradeOfferDto, TradeOfferOptionsDto } from '@swuniverse/shared';
import { GameDataService } from '../game-data/game-data.service';
import { TradeAccountStorage } from './entities/trade-account-storage.entity';
import { TradeLicense } from './entities/trade-license.entity';
import { TradeOffer } from './entities/trade-offer.entity';
import { TradePost } from './entities/trade-post.entity';
import { assertNotAbandoned } from './player-trade-post.service';
import { TradeStorageService } from './trade-storage.service';

/** STU allows at most 99 offers per entry. */
export const MAX_OFFER_COUNT = 99;

/**
 * STU `CreateOffer`/`CancelOffer`: offers reserve their goods from the trade
 * account, still count against its space and return the rest on cancel.
 */
@Injectable()
export class TradeOfferService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly storage: TradeStorageService,
    private readonly gameData: GameDataService,
  ) {}

  async create(tradePostId: number, userId: number, input: CreateTradeOfferDto): Promise<{ offer: TradeOfferDto; message: string }> {
    this.validate(input);
    const saved = await this.dataSource.transaction(async (manager) => {
      const post = await manager.findOne(TradePost, { where: { id: tradePostId }, lock: { mode: 'pessimistic_write' } });
      if (!post) throw new NotFoundException('Handelsposten nicht gefunden');
      assertNotAbandoned(post);
      if (!(await this.hasLicense(manager, tradePostId, userId))) {
        throw new BadRequestException('Du benötigst eine gültige Lizenz für diesen Handelsposten');
      }
      if (await this.hasEquivalentOffer(manager, tradePostId, userId, input)) {
        throw new BadRequestException('Du hast auf diesem Handelsposten bereits ein vergleichbares Angebot');
      }
      const capacity = await this.storage.capacityIn(manager, tradePostId, userId, post);
      if (capacity.free <= 0) {
        throw new BadRequestException('Dein Warenkonto auf diesem Handelsposten ist überfüllt - Angebot kann nicht erstellt werden');
      }
      const stock = await manager.findOne(TradeAccountStorage, {
        where: { tradePostId, userId, commodityId: input.offeredCommodityId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!stock || stock.amount <= 0) {
        throw new BadRequestException('Waren zum Erstellen des Angebots nicht gefunden');
      }
      // STU truncates the number of offers to the stock.
      const offerCount = Math.min(input.offerCount, Math.floor(stock.amount / input.offeredAmount));
      if (offerCount < 1) throw new BadRequestException('Nicht genügend Waren im Warenkonto');
      const reservedAmount = offerCount * input.offeredAmount;
      stock.amount -= reservedAmount;
      if (stock.amount === 0) await manager.remove(stock);
      else await manager.save(stock);
      const offer = await manager.save(
        manager.create(TradeOffer, {
          tradePostId,
          userId,
          offeredCommodityId: input.offeredCommodityId,
          offeredAmount: input.offeredAmount,
          wantedCommodityId: input.wantedCommodityId,
          wantedAmount: input.wantedAmount,
          offerCount,
          reservedAmount,
        }),
      );
      offer.tradePost = post;
      return offer;
    });
    return {
      offer: this.toDto(saved),
      message:
        saved.offerCount < input.offerCount
          ? `Das Angebot wurde erstellt (Anzahl auf ${saved.offerCount} gekürzt)`
          : 'Das Angebot wurde erstellt',
    };
  }

  /** Returns the remaining reserve even beyond the account limit, like STU. */
  async cancel(offerId: number, userId: number): Promise<{ message: string }> {
    await this.dataSource.transaction(async (manager) => {
      const offer = await manager.findOne(TradeOffer, { where: { id: offerId }, lock: { mode: 'pessimistic_write' } });
      if (!offer) throw new NotFoundException('Angebot nicht gefunden');
      if (offer.userId !== userId) throw new ForbiddenException('Das Angebot gehört nicht dir');
      if (offer.reservedAmount > 0) {
        const stock =
          (await manager.findOne(TradeAccountStorage, {
            where: { tradePostId: offer.tradePostId, userId, commodityId: offer.offeredCommodityId },
            lock: { mode: 'pessimistic_write' },
          })) ??
          manager.create(TradeAccountStorage, {
            tradePostId: offer.tradePostId,
            userId,
            commodityId: offer.offeredCommodityId,
            amount: 0,
          });
        stock.amount += offer.reservedAmount;
        await manager.save(stock);
      }
      await manager.remove(offer);
    });
    return { message: 'Das Angebot wurde gelöscht' };
  }

  async listMine(userId: number): Promise<TradeOfferDto[]> {
    const offers = await this.dataSource.manager.find(TradeOffer, {
      where: { userId },
      relations: ['tradePost'],
      order: { tradePostId: 'ASC', id: 'ASC' },
    });
    return offers.map((offer) => this.toDto(offer));
  }

  async getOptions(tradePostId: number, userId: number): Promise<TradeOfferOptionsDto> {
    const manager = this.dataSource.manager;
    const post = await manager.findOneBy(TradePost, { id: tradePostId });
    if (!post) throw new NotFoundException('Handelsposten nicht gefunden');
    const [hasLicense, capacity, stock] = await Promise.all([
      this.hasLicense(manager, tradePostId, userId),
      this.storage.capacityIn(manager, tradePostId, userId, post),
      manager.find(TradeAccountStorage, {
        where: { tradePostId, userId, amount: MoreThan(0) },
        order: { commodityId: 'ASC' },
      }),
    ]);
    return {
      tradePostId: post.id,
      tradePostName: post.name,
      hasLicense,
      accountFree: capacity.free,
      accountGoods: stock
        .filter((row) => this.gameData.getCommodity(row.commodityId)?.isTradeable === true)
        .map((row) => ({ commodityId: row.commodityId, commodityName: this.commodityName(row.commodityId), amount: row.amount })),
      tradeableCommodities: this.gameData
        .getAllCommodities()
        .filter((commodity) => commodity.isTradeable)
        .map((commodity) => ({ id: commodity.id, name: commodity.name }))
        .sort((left, right) => left.name.localeCompare(right.name, 'de')),
    };
  }

  /** STU `isEquivalentOfferExistent`: same pair and ratio rounded to two decimals. */
  private async hasEquivalentOffer(manager: EntityManager, tradePostId: number, userId: number, input: CreateTradeOfferDto): Promise<boolean> {
    const offers = await manager.find(TradeOffer, {
      where: {
        tradePostId,
        userId,
        offeredCommodityId: input.offeredCommodityId,
        wantedCommodityId: input.wantedCommodityId,
      },
    });
    const ratio = this.round2(input.offeredAmount / input.wantedAmount);
    return offers.some((offer) => this.round2(offer.offeredAmount / offer.wantedAmount) === ratio);
  }

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private async hasLicense(manager: EntityManager, tradePostId: number, userId: number): Promise<boolean> {
    return manager.exists(TradeLicense, { where: { tradePostId, userId, expiresAt: MoreThan(new Date()) } });
  }

  private validate(input: CreateTradeOfferDto): void {
    const integer = (value: unknown) => Number.isSafeInteger(value);
    if (!integer(input?.offeredCommodityId) || !integer(input.wantedCommodityId)) {
      throw new BadRequestException('Waren müssen gültige IDs haben');
    }
    if (input.offeredCommodityId === input.wantedCommodityId) {
      throw new BadRequestException('Es kann nicht die gleiche Ware eingetauscht werden');
    }
    if (!integer(input.offeredAmount) || input.offeredAmount < 1) {
      throw new BadRequestException('Es wurde keine angebotene Menge angegeben');
    }
    if (!integer(input.wantedAmount) || input.wantedAmount < 1) {
      throw new BadRequestException('Es wurde keine verlangte Menge angegeben');
    }
    if (!integer(input.offerCount) || input.offerCount < 1) {
      throw new BadRequestException('Es wurde keine Anzahl an Angeboten angegeben');
    }
    if (input.offerCount > MAX_OFFER_COUNT) {
      throw new BadRequestException(`Es sind höchstens ${MAX_OFFER_COUNT} Angebote auf einmal möglich`);
    }
    for (const id of [input.offeredCommodityId, input.wantedCommodityId]) {
      if (this.gameData.getCommodity(id)?.isTradeable !== true) {
        throw new BadRequestException('Diese Ware kann nicht gehandelt werden');
      }
    }
  }

  private toDto(offer: TradeOffer): TradeOfferDto {
    return {
      id: offer.id,
      tradePostId: offer.tradePostId,
      tradePostName: offer.tradePost.name,
      offeredCommodityId: offer.offeredCommodityId,
      offeredCommodityName: this.commodityName(offer.offeredCommodityId),
      offeredAmount: offer.offeredAmount,
      wantedCommodityId: offer.wantedCommodityId,
      wantedCommodityName: this.commodityName(offer.wantedCommodityId),
      wantedAmount: offer.wantedAmount,
      offerCount: offer.offerCount,
      reservedAmount: offer.reservedAmount,
      createdAt: offer.createdAt.toISOString(),
    };
  }

  private commodityName(id: number): string {
    return this.gameData.getCommodity(id)?.name ?? `Ware #${id}`;
  }
}
