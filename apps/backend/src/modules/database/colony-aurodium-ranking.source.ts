import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { ColonyStorage } from '../colony/entities/colony-storage.entity';
import type {
  AurodiumRankingSource,
  AurodiumRankingTotal,
} from './aurodium-ranking-source';

@Injectable()
export class ColonyAurodiumRankingSource implements AurodiumRankingSource {
  constructor(
    @InjectRepository(ColonyStorage)
    private readonly storageRepo: Repository<ColonyStorage>,
  ) {}

  async totals(commodityId: number): Promise<AurodiumRankingTotal[]> {
    const rows = await this.storageRepo
      .createQueryBuilder('storage')
      .innerJoin('storage.colony', 'colony')
      .innerJoin(User, 'user', 'user.id = colony.userId')
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
