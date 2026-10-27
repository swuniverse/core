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
  const controller = new TradeController(query as never);

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
});
