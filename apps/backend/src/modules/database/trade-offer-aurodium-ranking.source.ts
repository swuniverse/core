import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { TradeOffer } from '../trade/entities/trade-offer.entity';
import type {
  AurodiumRankingSource,
  AurodiumRankingTotal,
} from './aurodium-ranking-source';

/** Aurodium reserved by open trade offers; it left the account but still belongs to the player. */
@Injectable()
export class TradeOfferAurodiumRankingSource implements AurodiumRankingSource {
  constructor(
    @InjectRepository(TradeOffer)
    private readonly offerRepo: Repository<TradeOffer>,
  ) {}

  async totals(commodityId: number): Promise<AurodiumRankingTotal[]> {
    const rows = await this.offerRepo
      .createQueryBuilder('offer')
      .innerJoin(User, 'user', 'user.id = offer.userId')
      .select('user.id', 'userId')
      .addSelect('user.username', 'username')
      .addSelect('SUM(offer.reservedAmount)', 'amount')
      .where('offer.offeredCommodityId = :commodityId', { commodityId })
      .andWhere('user.isNpc = false')
      .groupBy('user.id')
      .addGroupBy('user.username')
      .getRawMany();
    return rows.map((row) => ({ ...row, amount: Number(row.amount) }));
  }
}
