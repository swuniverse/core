import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { TradePost } from '../trade/entities/trade-post.entity';
import { TradeTransaction } from '../trade/entities/trade-transaction.entity';

const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export type TradePostActivity = {
  tradePostId: number;
  postName: string;
  networkId: number;
  score: number;
};

/** STU `TradeTransactionRepository::getTradePostsTop10`: transactions of the last 7 days per post. */
@Injectable()
export class TradePostActivityRanking {
  constructor(
    @InjectRepository(TradeTransaction)
    private readonly transactionRepo: Repository<TradeTransaction>,
  ) {}

  async top(now: Date): Promise<TradePostActivity[]> {
    const rows = await this.transactionRepo
      .createQueryBuilder('transaction')
      .innerJoin(TradePost, 'post', 'post.id = transaction.tradePostId')
      .select('post.id', 'tradePostId')
      .addSelect('post.name', 'postName')
      .addSelect('post.networkId', 'networkId')
      .addSelect('COUNT(transaction.id)', 'score')
      .where('transaction.createdAt > :since', { since: new Date(now.getTime() - WINDOW_MS) })
      .groupBy('post.id')
      .orderBy('COUNT(transaction.id)', 'DESC')
      .addOrderBy('post.id', 'ASC')
      .limit(10)
      .getRawMany<{ tradePostId: number; postName: string; networkId: number; score: string }>();
    return rows.map((row) => ({
      tradePostId: Number(row.tradePostId),
      postName: row.postName,
      networkId: Number(row.networkId),
      score: Number(row.score),
    }));
  }
}
