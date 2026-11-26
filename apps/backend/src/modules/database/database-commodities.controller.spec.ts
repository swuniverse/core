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
      {} as never,
      {} as never,
    );

    await controller.getCommodityOverview({ user: { sub: 42 } });
    await controller.getCommodityLocations({ user: { sub: 42 } }, 2);

    expect(commodityOverview.getOverview).toHaveBeenCalledWith(42);
    expect(commodityOverview.getLocations).toHaveBeenCalledWith(42, 2);
  });
});

describe('DatabaseController rankings', () => {
  const controllerWith = (getRanking: jest.Mock) =>
    new DatabaseController({ getRanking } as never, {} as never, {} as never, {} as never, {} as never, {} as never);

  it.each(['rpg', 'aurodium', 'trade-posts'])('serves the %s ranking', async (key) => {
    const getRanking = jest.fn(async () => ({ entries: [] }));

    await controllerWith(getRanking).getRanking({ user: { sub: 7 } }, key);

    expect(getRanking).toHaveBeenCalledWith(7, key);
  });

  it('rejects unknown rankings', () => {
    expect(() => controllerWith(jest.fn()).getRanking({ user: { sub: 7 } }, 'nagus')).toThrow('Rangliste nicht gefunden');
  });
});
