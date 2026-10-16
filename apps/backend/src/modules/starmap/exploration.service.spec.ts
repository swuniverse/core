jest.mock('./entities/exploration-state.entity', () => ({
  ExplorationState: class ExplorationState {},
  ExplorationLevel: { TERRAIN: 'TERRAIN', FULL: 'FULL' },
}));
jest.mock('./entities/system-exploration.entity', () => ({
  SystemExploration: class SystemExploration {},
}));

import { ExplorationService } from './exploration.service';

describe('ExplorationService system discovery', () => {
  it('persists one personal system discovery with astrometry provenance', async () => {
    const explorationRepo = {};
    const systemExplorationRepo = {
      findOne: jest.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 7,
          userId: 1,
          starSystemId: 42,
          discoverySource: 'astrometry',
          discoveredAt: new Date('2026-10-16T12:00:00.000Z'),
        }),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({
        id: 7,
        discoveredAt: new Date('2026-10-16T12:00:00.000Z'),
        ...value,
      })),
    };
    const service = new ExplorationService(
      explorationRepo as never,
      systemExplorationRepo as never,
    );

    await service.discoverSystem({
      userId: 1,
      starSystemId: 42,
      source: 'astrometry',
    });
    await service.discoverSystem({
      userId: 1,
      starSystemId: 42,
      source: 'astrometry',
    });

    expect(systemExplorationRepo.create).toHaveBeenCalledWith({
      userId: 1,
      starSystemId: 42,
      discoverySource: 'astrometry',
    });
    expect(systemExplorationRepo.save).toHaveBeenCalledTimes(1);
  });
});
