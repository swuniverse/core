import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CommodityLocationDto } from '@swuniverse/shared';
import { MoreThan, Repository } from 'typeorm';
import { TradeAccountStorage } from '../trade/entities/trade-account-storage.entity';
import type { CommodityLocationSource } from './commodity-location-source';

@Injectable()
export class TradeAccountCommodityLocationSource implements CommodityLocationSource {
  constructor(
    @InjectRepository(TradeAccountStorage)
    private readonly accountRepo: Repository<TradeAccountStorage>,
  ) {}

  async findLocations(
    userId: number,
    commodityId: number,
  ): Promise<CommodityLocationDto[]> {
    const accounts = await this.accountRepo.find({
      where: { userId, commodityId, amount: MoreThan(0) },
      relations: ['tradePost'],
    });
    return accounts
      .filter((account) => account.userId === userId && account.amount > 0)
      .map((account) => ({
        type: 'TRADE_ACCOUNT' as const,
        id: account.tradePostId,
        name: account.tradePost.name,
        location: null,
        amount: account.amount,
      }));
  }
}
