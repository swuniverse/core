import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CommodityLocationDto } from '@swuniverse/shared';
import { MoreThan, Repository } from 'typeorm';
import { TradeOffer } from '../trade/entities/trade-offer.entity';
import type { CommodityLocationSource } from './commodity-location-source';

/** Goods reserved by own trade offers, one location per offer. */
@Injectable()
export class TradeOfferCommodityLocationSource implements CommodityLocationSource {
  constructor(
    @InjectRepository(TradeOffer)
    private readonly offerRepo: Repository<TradeOffer>,
  ) {}

  async findLocations(userId: number, commodityId: number): Promise<CommodityLocationDto[]> {
    const offers = await this.offerRepo.find({
      where: { userId, offeredCommodityId: commodityId, reservedAmount: MoreThan(0) },
      relations: ['tradePost'],
      order: { id: 'ASC' },
    });
    return offers.map((offer) => ({
      type: 'TRADE_OFFER' as const,
      id: offer.tradePostId,
      name: offer.tradePost.name,
      location: null,
      amount: offer.reservedAmount,
    }));
  }
}
