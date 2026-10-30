jest.mock('../trade/entities/trade-account-storage.entity', () => ({
  TradeAccountStorage: class TradeAccountStorage {},
}));

import { TradeAccountCommodityLocationSource } from './trade-account-commodity-location.source';

describe('TradeAccountCommodityLocationSource', () => {
  it('returns only own positive trade account balances without location', async () => {
    const find = jest.fn(async () => [
      { userId: 5, tradePostId: 3, amount: 12, tradePost: { name: 'Nar Shaddaa' } },
      { userId: 5, tradePostId: 4, amount: 0, tradePost: { name: 'Empty' } },
      { userId: 6, tradePostId: 5, amount: 9, tradePost: { name: 'Foreign' } },
    ]);
    const source = new TradeAccountCommodityLocationSource({ find } as never);

    await expect(source.findLocations(5, 10101)).resolves.toEqual([
      { type: 'TRADE_ACCOUNT', id: 3, name: 'Nar Shaddaa', location: null, amount: 12 },
    ]);
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 5, commodityId: 10101 }),
      }),
    );
  });
});
