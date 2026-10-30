import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/user.entity';
import { CargoItem } from '../spacecraft/entities/cargo-item.entity';
import type {
  AurodiumRankingSource,
  AurodiumRankingTotal,
} from './aurodium-ranking-source';

@Injectable()
export class SpacecraftAurodiumRankingSource implements AurodiumRankingSource {
  constructor(
    @InjectRepository(CargoItem)
    private readonly cargoRepo: Repository<CargoItem>,
  ) {}

  async totals(commodityId: number): Promise<AurodiumRankingTotal[]> {
    const rows = await this.cargoRepo
      .createQueryBuilder('cargo')
      .innerJoin('cargo.spacecraft', 'spacecraft')
      .innerJoin(User, 'user', 'user.id = spacecraft.userId')
      .select('user.id', 'userId')
      .addSelect('user.username', 'username')
      .addSelect('SUM(cargo.amount)', 'amount')
      .where('cargo.commodityId = :commodityId', { commodityId })
      .andWhere('user.isNpc = false')
      .groupBy('user.id')
      .addGroupBy('user.username')
      .getRawMany();
    return rows.map((row) => ({ ...row, amount: Number(row.amount) }));
  }
}
