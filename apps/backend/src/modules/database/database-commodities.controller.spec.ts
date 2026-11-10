jest.mock('./database.service', () => ({ DatabaseService: class DatabaseService {} }));
jest.mock('../statistics/statistics.service', () => ({
  StatisticsService: class StatisticsService {},
}));
jest.mock('./commodity-overview.service', () => ({
  CommodityOverviewService: class CommodityOverviewService {},
}));

import { DatabaseController } from './database.controller';

describe('DatabaseController commodities', () => {
  it('passes the authenticated user to overview and location services', async () => {
    const commodityOverview = {
      getOverview: jest.fn(async () => []),
      getLocations: jest.fn(async () => ({ locations: [] })),
    };
    const controller = new DatabaseController(
      {} as never,
      {} as never,
      commodityOverview as never,
      {} as never,
    );

    await controller.getCommodityOverview({ user: { sub: 42 } });
    await controller.getCommodityLocations({ user: { sub: 42 } }, 2);

    expect(commodityOverview.getOverview).toHaveBeenCalledWith(42);
    expect(commodityOverview.getLocations).toHaveBeenCalledWith(42, 2);
  });
});
