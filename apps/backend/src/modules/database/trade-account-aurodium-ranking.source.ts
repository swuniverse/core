import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { TradeAccountStorage } from '../trade/entities/trade-account-storage.entity';
import type {
  AurodiumRankingSource,
  AurodiumRankingTotal,
} from './aurodium-ranking-source';

/** Aurodium on trade accounts; STU includes trade storage in the Latinum ranking. */
@Injectable()
export class TradeAccountAurodiumRankingSource implements AurodiumRankingSource {
  constructor(
    @InjectRepository(TradeAccountStorage)
    private readonly storageRepo: Repository<TradeAccountStorage>,
  ) {}

  async totals(commodityId: number): Promise<AurodiumRankingTotal[]> {
    const rows = await this.storageRepo
      .createQueryBuilder('storage')
      .innerJoin(User, 'user', 'user.id = storage.userId')
      .select('user.id', 'userId')
      .addSelect('user.username', 'username')
      .addSelect('SUM(storage.amount)', 'amount')
      .where('storage.commodityId = :commodityId', { commodityId })
      .andWhere('user.isNpc = false')
      .groupBy('user.id')
      .addGroupBy('user.username')
      .getRawMany();
    return rows.map((row) => ({ ...row, amount: Number(row.amount) }));
  }
}
