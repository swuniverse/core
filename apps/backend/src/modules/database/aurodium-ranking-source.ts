export type AurodiumRankingTotal = {
  userId: number;
  username: string;
  amount: number;
};

export const AURODIUM_RANKING_SOURCES = Symbol('AURODIUM_RANKING_SOURCES');

export interface AurodiumRankingSource {
  totals(commodityId: number): Promise<AurodiumRankingTotal[]>;
}
