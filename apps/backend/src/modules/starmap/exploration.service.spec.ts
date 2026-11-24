jest.mock('./entities/exploration-state.entity', () => ({
  ExplorationState: class ExplorationState {},
  ExplorationLevel: { TERRAIN: 'TERRAIN', FULL: 'FULL' },
}));
jest.mock('./entities/system-exploration.entity', () => ({
  SystemExploration: class SystemExploration {},
}));
jest.mock('../prestige/prestige.service', () => ({
  PrestigeService: class PrestigeService {},
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

describe('ExplorationService catalog system entry', () => {
  const system = { id: 42, name: 'Yavin', layerId: 2, inDatabaseCatalog: true };

  function setup(raw: Array<{ id: number }>) {
    const query = {
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      returning: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ raw }),
    };
    const manager = {
      createQueryBuilder: jest.fn(() => query),
      findOneBy: jest.fn(async () => ({ id: 1, isNpc: false })),
    };
    const systemExplorationRepo = {
      manager: { transaction: (work: (m: unknown) => unknown) => work(manager) },
    };
    const prestige = { change: jest.fn(async () => undefined) };
    const port = { notify: jest.fn(async () => undefined) };
    const service = new ExplorationService(
      {} as never,
      systemExplorationRepo as never,
      prestige as never,
      port as never,
    );
    return { service, query, prestige, port, manager };
  }

  it('files a new catalog system with cartography prestige and notice', async () => {
    const { service, query, prestige, port, manager } = setup([{ id: 1 }]);

    await expect(
      service.discoverCatalogSystem(1, system, 'AIRFIELD_START'),
    ).resolves.toBe(true);

    expect(query.values).toHaveBeenCalledWith({
      userId: 1,
      starSystemId: 42,
      discoverySource: 'AIRFIELD_START',
    });
    expect(prestige.change).toHaveBeenCalledWith(
      1,
      10,
      '10 Prestige erhalten für den Datenbankeintrag des Sternensystems „Yavin“',
      manager,
    );
    expect(port.notify).toHaveBeenCalledWith({
      userId: 1,
      category: 'SYSTEMS',
      layerId: 2,
      name: 'Yavin',
      prestige: 10,
    });
  });

  it('books nothing for a known or non-catalog system', async () => {
    const known = setup([]);
    await expect(
      known.service.discoverCatalogSystem(1, system, 'AIRFIELD_START'),
    ).resolves.toBe(false);
    expect(known.prestige.change).not.toHaveBeenCalled();
    expect(known.port.notify).not.toHaveBeenCalled();

    const outside = setup([{ id: 1 }]);
    await expect(
      outside.service.discoverCatalogSystem(
        1,
        { ...system, inDatabaseCatalog: false },
        'AIRFIELD_START',
      ),
    ).resolves.toBe(false);
    expect(outside.query.execute).not.toHaveBeenCalled();
  });
});
