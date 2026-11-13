jest.mock('../starmap/entities/star-system.entity', () => ({
  StarSystem: class StarSystem {},
}));
jest.mock('../spacecraft/entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
}));
jest.mock('./entities/trade-post.entity', () => ({
  TradePost: class TradePost {},
}));

import { TradeController } from './trade.controller';

describe('TradeController', () => {
  const query = {
    listPosts: jest.fn(),
    getOverview: jest.fn(),
  };
  const licenses = {
    getCondition: jest.fn(),
    setCondition: jest.fn(),
    listOwn: jest.fn(),
    listIssued: jest.fn(),
  };
  const purchases = { purchase: jest.fn(), renew: jest.fn() };
  const menus = { getMenu: jest.fn(), getPostAtSpacecraft: jest.fn() };
  const offers = { listMine: jest.fn(), getOptions: jest.fn(), create: jest.fn(), cancel: jest.fn() };
  const market = { search: jest.fn(), byCommodity: jest.fn(), take: jest.fn() };
  const basicTrade = { getOverview: jest.fn(), buy: jest.fn(), sell: jest.fn() };
  const transfers = { capacities: jest.fn(), targets: jest.fn(), transfer: jest.fn() };
  const controller = new TradeController(
    query as never,
    licenses as never,
    purchases as never,
    menus as never,
    offers as never,
    market as never,
    basicTrade as never,
    transfers as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('uses the authenticated player for the post list', async () => {
    query.listPosts.mockResolvedValue([]);

    await controller.listPosts({ user: { sub: 42 } });

    expect(query.listPosts).toHaveBeenCalledWith(42);
  });

  it('uses the authenticated player for account and local ship data', async () => {
    query.getOverview.mockResolvedValue({ accounts: [], spacecraft: [] });
    transfers.capacities.mockResolvedValue([]);

    await controller.getOverview({ user: { sub: 42 } });

    expect(query.getOverview).toHaveBeenCalledWith(42);
  });

  it('adds the transfer capacity of every own account post to the overview', async () => {
    query.getOverview.mockResolvedValue({
      accounts: [{ tradePostId: 3, commodityId: 2, amount: 5 }, { tradePostId: 3, commodityId: 4, amount: 1 }, { tradePostId: 8, commodityId: 2, amount: 1 }],
      spacecraft: [],
    });
    transfers.capacities.mockResolvedValue([{ tradePostId: 3, free: 50, capacity: 200 }]);

    const result = await controller.getOverview({ user: { sub: 42 } });

    expect(transfers.capacities).toHaveBeenCalledWith([3, 8], 42);
    expect(result.transferCapacities).toEqual([{ tradePostId: 3, free: 50, capacity: 200 }]);
  });

  it('forwards network transfers and their targets for the authenticated player', async () => {
    const input = { targetPostId: 4, commodityId: 2, amount: 10 };

    await controller.transferTargets(3, { user: { sub: 42 } });
    await controller.transfer(3, { user: { sub: 42 } }, input);

    expect(transfers.targets).toHaveBeenCalledWith(3, 42);
    expect(transfers.transfer).toHaveBeenCalledWith(3, 42, input);
  });

  it('forwards owner condition reads and updates', async () => {
    const input = { commodityId: 50, amount: 10, durationDays: 30 };

    await controller.getLicenseCondition(7, { user: { sub: 42 } });
    await controller.setLicenseCondition(7, { user: { sub: 42 } }, input);

    expect(licenses.getCondition).toHaveBeenCalledWith(7, 42);
    expect(licenses.setCondition).toHaveBeenCalledWith(7, 42, input);
  });

  it('buys a license for the authenticated player, ignoring client principals', async () => {
    const input = { method: 'ship' as const, shipId: 3, payShipId: 4 };

    await controller.buyLicense(7, { user: { sub: 42 } }, input);

    expect(purchases.purchase).toHaveBeenCalledWith(7, 42, input);
  });

  it('scopes license lists and renewals to the authenticated player', async () => {
    await controller.listOwnLicenses({ user: { sub: 42 } });
    await controller.listIssuedLicenses(7, { user: { sub: 42 } });
    await controller.renewLicense(7, { user: { sub: 42 } }, { accountPostId: 9 });

    expect(licenses.listOwn).toHaveBeenCalledWith(42);
    expect(licenses.listIssued).toHaveBeenCalledWith(7, 42);
    expect(purchases.renew).toHaveBeenCalledWith(7, 42, { accountPostId: 9 });
  });

  it('reads license menus and the post at a ship for the authenticated player', async () => {
    await controller.getLicenseMenu(7, { user: { sub: 42 } }, 3);
    await controller.getLicenseMenu(7, { user: { sub: 42 } });
    await controller.getPostAtSpacecraft(3, { user: { sub: 42 } });

    expect(menus.getMenu).toHaveBeenNthCalledWith(1, 7, 42, 3);
    expect(menus.getMenu).toHaveBeenNthCalledWith(2, 7, 42, null);
    expect(menus.getPostAtSpacecraft).toHaveBeenCalledWith(3, 42);
  });

  it('scopes offers to the authenticated player', async () => {
    const input = { offeredCommodityId: 5, offeredAmount: 10, wantedCommodityId: 6, wantedAmount: 5, offerCount: 2 };

    await controller.listOwnOffers({ user: { sub: 42 } });
    await controller.getOfferOptions(7, { user: { sub: 42 } });
    await controller.createOffer(7, { user: { sub: 42 } }, input);
    await controller.cancelOffer(3, { user: { sub: 42 } });

    expect(offers.listMine).toHaveBeenCalledWith(42);
    expect(offers.getOptions).toHaveBeenCalledWith(7, 42);
    expect(offers.create).toHaveBeenCalledWith(7, 42, input);
    expect(offers.cancel).toHaveBeenCalledWith(3, 42);
  });

  it('searches, summarizes and takes offers for the authenticated player', async () => {
    await controller.searchOffers({ user: { sub: 42 } }, 5, 'demand', 7, 2);
    await controller.searchOffers({ user: { sub: 42 } }, undefined, 'bogus');
    await controller.getOffersByCommodity(5, { user: { sub: 42 } });
    await controller.takeOffer(3, { user: { sub: 42 } }, 4);

    expect(market.search).toHaveBeenNthCalledWith(1, 42, { commodityId: 5, mode: 'demand', postId: 7, page: 2 });
    expect(market.search).toHaveBeenNthCalledWith(2, 42, { commodityId: undefined, mode: 'both', postId: undefined, page: undefined });
    expect(market.byCommodity).toHaveBeenCalledWith(42, 5);
    expect(market.take).toHaveBeenCalledWith(3, 42, 4);
  });

  it('runs basic trade for the authenticated player', async () => {
    const input = { postId: 7, rateId: 'rate' };

    await controller.getBasicTrade({ user: { sub: 42 } }, 50);
    await controller.basicBuy({ user: { sub: 42 } }, input);
    await controller.basicSell({ user: { sub: 42 } }, input);

    expect(basicTrade.getOverview).toHaveBeenCalledWith(42, 50);
    expect(basicTrade.buy).toHaveBeenCalledWith(42, input);
    expect(basicTrade.sell).toHaveBeenCalledWith(42, input);
  });
});
