import { CommodityOverviewService } from './commodity-overview.service';
import type { CommodityLocationSource } from './commodity-location-source';

describe('CommodityOverviewService', () => {
  const gameData = {
    getAllCommodities: jest.fn(() => [
      { id: 3, name: 'Tibanna-Gas', sort: 3, visible: true },
      { id: 2, name: 'Doonium', sort: 2, visible: true },
      { id: 51, name: 'Flüssiges Aurodium', sort: 51, visible: false },
    ]),
    getCommodity: jest.fn((id: number) =>
      id === 2 ? { id, name: 'Doonium', sort: 2, visible: true } : undefined,
    ),
  };
  const primary: CommodityLocationSource = {
    findLocations: jest.fn(async (_userId, commodityId) =>
      commodityId === 2
        ? [
            { type: 'COLONY' as const, id: 1, name: 'Alderaan', location: 'Core', amount: 1200 },
            { type: 'SPACECRAFT' as const, id: 2, name: 'Falcon', location: 'Core', amount: 30 },
          ]
        : commodityId === 51
          ? [{ type: 'COLONY' as const, id: 1, name: 'Alderaan', location: null, amount: 9 }]
          : [],
    ),
  };
  const extension: CommodityLocationSource = {
    findLocations: jest.fn(async (_userId, commodityId) =>
      commodityId === 2
        ? [{ type: 'SPACECRAFT' as const, id: 9, name: 'Reserve', location: null, amount: 5 }]
        : [],
    ),
  };

  it('sums visible positive commodities in game-data sort order', async () => {
    const service = new CommodityOverviewService(gameData as never, [primary, extension]);

    await expect(service.getOverview(7)).resolves.toEqual([
      { commodityId: 2, commodityName: 'Doonium', total: 1235 },
    ]);
  });

  it('combines registered sources for a location response', async () => {
    const service = new CommodityOverviewService(gameData as never, [primary, extension]);

    const result = await service.getLocations(7, 2);

    expect(result.total).toBe(1235);
    expect(result.locations).toHaveLength(3);
    expect(extension.findLocations).toHaveBeenCalledWith(7, 2);
  });
});
