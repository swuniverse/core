jest.mock('./database.service', () => ({ DatabaseService: class DatabaseService {} }));
jest.mock('../statistics/statistics.service', () => ({
  StatisticsService: class StatisticsService {},
}));
jest.mock('./commodity-overview.service', () => ({
  CommodityOverviewService: class CommodityOverviewService {},
}));

import { DatabaseController } from './database.controller';

describe('DatabaseController system detail', () => {
  it.each([
    ['unknown', new Error('System nicht gefunden')],
    ['planned', { availability: 'ASTROMETRY_REQUIRED' }],
    ['finishing', { availability: 'ASTROMETRY_REQUIRED' }],
    ['invalidated', { availability: 'ASTROMETRY_REQUIRED' }],
    [
      'successfully finalized',
      {
        availability: 'AVAILABLE',
        id: 9,
        name: 'Bespin',
        fields: [],
        colonies: [],
        scans: [],
      },
    ],
  ])('passes the authenticated user through for a %s system', async (_state, result) => {
    const databaseService = {
      getSystemDetail:
        result instanceof Error
          ? jest.fn().mockRejectedValue(result)
          : jest.fn().mockResolvedValue(result),
    };
    const controller = new DatabaseController(
      databaseService as never,
      {} as never,
      {} as never,
      {} as never,
    );

    if (result instanceof Error) {
      await expect(
        controller.getSystemDetail({ user: { sub: 42 } }, 9),
      ).rejects.toBe(result);
    } else {
      await expect(
        controller.getSystemDetail({ user: { sub: 42 } }, 9),
      ).resolves.toEqual(result);
      if (result.availability === 'ASTROMETRY_REQUIRED') {
        expect(Object.keys(result)).toEqual(['availability']);
      }
    }
    expect(databaseService.getSystemDetail).toHaveBeenCalledWith(42, 9);
  });
});
