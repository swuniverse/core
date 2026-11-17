import { SpaceLocationDto } from '@swuniverse/shared';

jest.mock('../starmap/entities/star-system.entity', () => ({
  StarSystem: class StarSystem {},
}));
jest.mock('../spacecraft/entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
}));
jest.mock('./entities/trade-post.entity', () => ({
  TradePost: class TradePost {},
}));

import { TradeQueryService } from './trade-query.service';

describe('TradeQueryService', () => {
  const posts = { find: jest.fn() };
  const accounts = { find: jest.fn() };
  const spacecraft = { find: jest.fn() };
  const users = { findBy: jest.fn() };
  const locations = { find: jest.fn() };
  const service = new TradeQueryService(
    posts as never,
    accounts as never,
    spacecraft as never,
    users as never,
    locations as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('lists posts with owner, network and redacted unknown locations', async () => {
    posts.find.mockResolvedValue([
      {
        id: 1,
        name: 'Known',
        description: '',
        networkId: 3,
        ownerId: 10,
        locationId: 100,
        level: 1,
        storageLimit: 10_000,
        transferCapacity: 200,
        location: {
          id: 100,
          kind: 'GALAXY_FIELD',
          galaxyField: { layerId: 2, cx: 7, cy: 8 },
        },
      },
      {
        id: 2,
        name: 'Unknown',
        description: '',
        networkId: 1,
        ownerId: 11,
        locationId: 101,
        level: 1,
        storageLimit: 10_000,
        transferCapacity: 200,
        location: {
          id: 101,
          kind: 'GALAXY_FIELD',
          galaxyField: { layerId: 2, cx: 99, cy: 99 },
        },
      },
    ]);
    accounts.find.mockResolvedValue([
      { tradePostId: 1, userId: 42, commodityId: 5, amount: 3 },
    ]);
    spacecraft.find.mockResolvedValue([{ locationId: 100 }]);
    locations.find.mockResolvedValue([
      {
        id: 100,
        kind: 'GALAXY_FIELD',
        galaxyField: { layerId: 2, cx: 7, cy: 8 },
      },
    ]);
    users.findBy.mockResolvedValue([
      { id: 10, username: 'Hutten-Kartell' },
      { id: 11, username: 'Imperiales Versorgungsamt' },
    ]);

    const result = await service.listPosts(42);

    expect(result).toEqual([
      expect.objectContaining({
        id: 1,
        networkId: 3,
        owner: { id: 10, name: 'Hutten-Kartell' },
        licenseStatus: 'ACCOUNT',
        location: {
          scope: 'GALAXY',
          locationId: 100,
          layerId: 2,
          x: 7,
          y: 8,
        } satisfies SpaceLocationDto,
      }),
      expect.objectContaining({
        id: 2,
        owner: { id: 11, name: 'Imperiales Versorgungsamt' },
        licenseStatus: 'NONE',
        location: null,
      }),
    ]);
  });

  it('returns only the requesting users accounts and ships at the post', async () => {
    posts.find.mockResolvedValue([
      { id: 1, locationId: 100 },
      { id: 2, locationId: 200 },
    ]);
    accounts.find.mockResolvedValue([
      { tradePostId: 1, userId: 42, commodityId: 5, amount: 3 },
    ]);
    spacecraft.find.mockResolvedValue([
      { id: 7, name: 'Falcon', shipClassId: 9, kind: 'SHIP', locationId: 100 },
    ]);
    users.findBy.mockResolvedValue([]);
    locations.find.mockResolvedValue([]);

    const result = await service.getOverview(42);

    expect(accounts.find).toHaveBeenCalledWith({ where: { userId: 42 } });
    expect(spacecraft.find).toHaveBeenCalledWith({
      where: { userId: 42, rpgHidden: false },
      select: ['id', 'name', 'shipClassId', 'kind', 'locationId'],
    });
    expect(result.accounts).toEqual([
      { tradePostId: 1, commodityId: 5, amount: 3 },
    ]);
    expect(result.spacecraft).toEqual([
      {
        tradePostId: 1,
        spacecraftId: 7,
        spacecraftName: 'Falcon',
        shipClassId: 9,
        kind: 'SHIP',
      },
    ]);
  });
});
