jest.mock('../auth/user.entity', () => ({ User: class User {} }));
jest.mock('../colony/entities/colony.entity', () => ({ Colony: class Colony {} }));
jest.mock('../spacecraft/entities/spacecraft.entity', () => ({ Spacecraft: class Spacecraft {} }));
jest.mock('../research/entities/research.entity', () => ({
  Research: class Research {},
  ResearchStatus: { COMPLETED: 'COMPLETED' },
}));
jest.mock('../trade/entities/trade-post.entity', () => ({ TradePost: class TradePost {} }));
jest.mock('../starmap/entities/space-location.entity', () => ({ SpaceLocation: class SpaceLocation {} }));

import { DatabaseService } from './database.service';

function createService() {
  const query = {
    leftJoinAndMapOne: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };
  const tradePostRepo = { createQueryBuilder: jest.fn().mockReturnValue(query) };
  const explorationRepo = { find: jest.fn() };
  const service = new DatabaseService(
    {} as never, {} as never, {} as never, {} as never, {} as never,
    {} as never, {} as never, {} as never, {} as never, {} as never,
    {} as never, {} as never, {} as never, {} as never, {} as never,
    {} as never, {} as never, {} as never, {} as never, {} as never,
    {} as never, {} as never, {} as never, tradePostRepo as never,
    explorationRepo as never,
  );
  return { service, query, explorationRepo };
}

describe('DatabaseService trade posts', () => {
  it('sorts by network and name and only reveals explored locations', async () => {
    const { service, query, explorationRepo } = createService();
    query.getMany.mockResolvedValue([
      {
        id: 2, name: 'Besh', description: 'Rebel post', networkId: 2,
        owner: { username: 'Nachschubkommando' },
        location: { kind: 'SYSTEM_FIELD', systemField: { starSystem: { name: 'Hoth', layerId: 4, cx: 8, cy: 9 } } },
      },
      {
        id: 1, name: 'Aurek', description: 'Imperial post', networkId: 1,
        owner: { username: 'Versorgungsamt' },
        location: { kind: 'GALAXY_FIELD', galaxyField: { layerId: 3, cx: 2, cy: 5, layer: { name: 'Kernwelten' }, starSystem: null } },
      },
      {
        id: 3, name: 'Unknown', description: '', networkId: 1,
        owner: { username: 'Versorgungsamt' },
        location: { kind: 'GALAXY_FIELD', galaxyField: { layerId: 3, cx: 7, cy: 7, layer: { name: 'Kernwelten' }, starSystem: null } },
      },
    ]);
    explorationRepo.find.mockResolvedValue([
      { layerId: 3, cx: 2, cy: 5 },
      { layerId: 4, cx: 8, cy: 9 },
    ]);

    await expect(service.getTradePosts(42)).resolves.toEqual([
      expect.objectContaining({ id: 1, networkId: 1, networkName: 'Imperiales Versorgungsnetz', ownerName: 'Versorgungsamt', location: { layerId: 3, layerName: 'Kernwelten', x: 2, y: 5, systemName: null } }),
      expect.objectContaining({ id: 3, location: null }),
      expect.objectContaining({ id: 2, networkId: 2, networkName: 'Versorgungsnetz der Rebellenallianz', location: { layerId: 4, layerName: null, x: 8, y: 9, systemName: 'Hoth' } }),
    ]);
  });

  it('marks an abandoned player post without operator (tmw-T12c)', async () => {
    const { service, query, explorationRepo } = createService();
    query.getMany.mockResolvedValue([
      { id: 4, name: 'Verlassener Handelsposten', description: '', networkId: 120, ownerId: null, owner: null, location: null },
    ]);
    explorationRepo.find.mockResolvedValue([]);

    await expect(service.getTradePosts(42)).resolves.toEqual([
      expect.objectContaining({ id: 4, networkName: 'Handelsnetz 120', ownerName: 'Verlassen' }),
    ]);
  });
});
