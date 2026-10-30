import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FindOptionsWhere, ObjectLiteral, Repository } from 'typeorm';
import { NpcAccountService, NpcKey } from '../auth/npc-account.service';
jest.mock('../starmap/entities/star-system.entity', () => ({ StarSystem: class StarSystem {} }));

import { GalaxyField, FactionZone } from '../starmap/entities/galaxy-field.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
import { TradeLicenseCondition } from './entities/trade-license-condition.entity';
import { TradePost } from './entities/trade-post.entity';
import { TradePostSeedService } from './trade-post-seed.service';

function repository<T extends ObjectLiteral>() {
  return {
    create: jest.fn((value) => value),
    find: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(async (value) => ({ id: 1, ...value })),
  } as unknown as jest.Mocked<Repository<T>>;
}

describe('TradePostSeedService', () => {
  let service: TradePostSeedService;
  let posts: jest.Mocked<Repository<TradePost>>;
  let conditions: jest.Mocked<Repository<TradeLicenseCondition>>;
  let fields: jest.Mocked<Repository<GalaxyField>>;
  let locations: jest.Mocked<Repository<SpaceLocation>>;

  beforeEach(async () => {
    posts = repository<TradePost>();
    conditions = repository<TradeLicenseCondition>();
    fields = repository<GalaxyField>();
    locations = repository<SpaceLocation>();
    const module = await Test.createTestingModule({
      providers: [
        TradePostSeedService,
        { provide: getRepositoryToken(TradePost), useValue: posts },
        {
          provide: getRepositoryToken(TradeLicenseCondition),
          useValue: conditions,
        },
        { provide: getRepositoryToken(GalaxyField), useValue: fields },
        { provide: getRepositoryToken(SpaceLocation), useValue: locations },
        {
          provide: NpcAccountService,
          useValue: {
            get: jest.fn(async (key: NpcKey) => ({
              id: key === NpcKey.EMPIRE_SUPPLY ? 10 : key === NpcKey.REBEL_SUPPLY ? 11 : 12,
            })),
          },
        },
      ],
    }).compile();
    service = module.get(TradePostSeedService);
  });

  it('seeds five canonical NPC posts at distinct sorted locations', async () => {
    fields.find.mockResolvedValue([
      { id: 3, layerId: 1, cx: 9, cy: 1, factionZone: FactionZone.NEUTRAL },
      { id: 1, layerId: 1, cx: 1, cy: 7, factionZone: FactionZone.EMPIRE },
      { id: 5, layerId: 1, cx: 2, cy: 2, factionZone: FactionZone.REBEL },
      { id: 2, layerId: 1, cx: 1, cy: 8, factionZone: FactionZone.EMPIRE },
      { id: 4, layerId: 1, cx: 2, cy: 1, factionZone: FactionZone.REBEL },
    ] as GalaxyField[]);
    locations.find.mockResolvedValue([
      { id: 101, galaxyFieldId: 1 },
      { id: 102, galaxyFieldId: 2 },
      { id: 103, galaxyFieldId: 3 },
      { id: 104, galaxyFieldId: 4 },
      { id: 105, galaxyFieldId: 5 },
    ] as SpaceLocation[]);
    posts.findOneBy.mockResolvedValue(null);
    conditions.findOneBy.mockResolvedValue(null);

    await service.seed();

    expect(posts.save).toHaveBeenCalledTimes(5);
    expect(posts.save.mock.calls.map(([post]) => post)).toEqual([
      expect.objectContaining({ name: 'Imperialer Versorgungsknoten Aurek', networkId: 1, ownerId: 10, locationId: 101 }),
      expect.objectContaining({ name: 'Imperialer Versorgungsknoten Besh', networkId: 1, ownerId: 10, locationId: 102 }),
      expect.objectContaining({ name: 'Versorgungsstützpunkt Aurek', networkId: 2, ownerId: 11, locationId: 104 }),
      expect.objectContaining({ name: 'Versorgungsstützpunkt Besh', networkId: 2, ownerId: 11, locationId: 105 }),
      expect.objectContaining({ name: 'Hutten-Handelsposten', networkId: 3, ownerId: 12, locationId: 103 }),
    ]);
    for (const [post] of posts.save.mock.calls) {
      expect(post).toEqual(expect.objectContaining({ level: 1, storageLimit: 10_000, transferCapacity: 200 }));
    }
    expect(conditions.save).toHaveBeenCalledTimes(5);
    for (const [condition] of conditions.save.mock.calls) {
      expect(condition).toEqual(
        expect.objectContaining({ commodityId: 50, amount: 10, durationDays: 30 }),
      );
    }
  });

  it('does not overwrite an existing NPC license condition', async () => {
    fields.find.mockResolvedValue([
      { id: 1, layerId: 1, cx: 1, cy: 1, factionZone: FactionZone.EMPIRE },
      { id: 2, layerId: 1, cx: 1, cy: 2, factionZone: FactionZone.EMPIRE },
      { id: 3, layerId: 1, cx: 1, cy: 3, factionZone: FactionZone.REBEL },
      { id: 4, layerId: 1, cx: 1, cy: 4, factionZone: FactionZone.REBEL },
      { id: 5, layerId: 1, cx: 1, cy: 5, factionZone: FactionZone.NEUTRAL },
    ] as GalaxyField[]);
    locations.find.mockResolvedValue(
      [1, 2, 3, 4, 5].map((id) => ({ id: 100 + id, galaxyFieldId: id })) as SpaceLocation[],
    );
    posts.findOneBy.mockResolvedValue(null);
    conditions.findOneBy.mockResolvedValue({ id: 9 } as TradeLicenseCondition);

    await service.seed();

    expect(conditions.save).not.toHaveBeenCalled();
  });

  it('updates existing named posts instead of duplicating them', async () => {
    fields.find.mockResolvedValue([
      { id: 1, layerId: 1, cx: 1, cy: 1, factionZone: FactionZone.EMPIRE },
      { id: 2, layerId: 1, cx: 1, cy: 2, factionZone: FactionZone.EMPIRE },
      { id: 3, layerId: 1, cx: 1, cy: 3, factionZone: FactionZone.REBEL },
      { id: 4, layerId: 1, cx: 1, cy: 4, factionZone: FactionZone.REBEL },
      { id: 5, layerId: 1, cx: 1, cy: 5, factionZone: FactionZone.NEUTRAL },
    ] as GalaxyField[]);
    locations.find.mockResolvedValue([1, 2, 3, 4, 5].map((id) => ({ id: 100 + id, galaxyFieldId: id })) as SpaceLocation[]);
    posts.findOneBy.mockImplementation(async (where) => {
      const name = (where as FindOptionsWhere<TradePost>).name;
      return name === 'Imperialer Versorgungsknoten Aurek'
        ? ({ id: 99, name } as TradePost)
        : null;
    });

    await service.seed();

    expect(posts.create).toHaveBeenCalledWith(expect.objectContaining({ id: 99, name: 'Imperialer Versorgungsknoten Aurek' }));
  });
});
