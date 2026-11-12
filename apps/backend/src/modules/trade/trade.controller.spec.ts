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
  const controller = new TradeController(
    query as never,
    licenses as never,
    purchases as never,
    menus as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('uses the authenticated player for the post list', async () => {
    query.listPosts.mockResolvedValue([]);

    await controller.listPosts({ user: { sub: 42 } });

    expect(query.listPosts).toHaveBeenCalledWith(42);
  });

  it('uses the authenticated player for account and local ship data', async () => {
    query.getOverview.mockResolvedValue({ accounts: [], spacecraft: [] });

    await controller.getOverview({ user: { sub: 42 } });

    expect(query.getOverview).toHaveBeenCalledWith(42);
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
});
