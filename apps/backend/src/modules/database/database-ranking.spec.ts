jest.mock('../faction/faction.service', () => ({
  FactionService: class FactionService {},
}));
jest.mock('../starmap/entities/space-location.entity', () => ({ SpaceLocation: class SpaceLocation {} }));
jest.mock('../auth/user.entity', () => ({ User: class User {} }));
jest.mock('../colony/entities/colony.entity', () => ({ Colony: class Colony {} }));
jest.mock('../spacecraft/entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
}));
jest.mock('../research/entities/research.entity', () => ({
  Research: class Research {},
  ResearchStatus: { COMPLETED: 'COMPLETED' },
}));
jest.mock('../starmap/entities/system-type-discovery.entity', () => ({
  SystemTypeDiscovery: class SystemTypeDiscovery {},
}));
jest.mock('../spacecraft/entities/ship-class-discovery.entity', () => ({
  ShipClassDiscovery: class ShipClassDiscovery {},
}));
jest.mock('../starmap/entities/celestial-class-discovery.entity', () => ({
  CelestialClassDiscovery: class CelestialClassDiscovery {},
}));
jest.mock('../spacecraft/entities/ship-class-def.entity', () => ({
  ShipClassDef: class ShipClassDef {},
}));
jest.mock('../prestige/entities/prestige-history-entry.entity', () => ({
  PrestigeHistoryEntry: class PrestigeHistoryEntry {},
}));
jest.mock('../colony/entities/crew-assignment.entity', () => ({
  CrewAssignment: class CrewAssignment {},
}));
jest.mock('../spacecraft/entities/flight-signature.entity', () => ({
  FlightSignature: class FlightSignature {},
}));

import { ColonyStatsService } from '../colony/colony-stats.service';
import { ColonySocialService } from '../colony/colony-social.service';
import { DatabaseService } from './database.service';

function createService(
  overrides: {
    userRepo?: object;
    colonyRepo?: object;
    gameData?: object;
    flightSignatureRepo?: object;
    holonetRatingRepo?: object;
    aurodiumSources?: object[];
    tradePostActivity?: object;
  } = {},
) {
  return new DatabaseService(
    (overrides.userRepo ?? {}) as never,
    (overrides.colonyRepo ?? {}) as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    (overrides.gameData ?? {}) as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    (overrides.flightSignatureRepo ?? {}) as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    (overrides.holonetRatingRepo ?? {}) as never,
    (overrides.aurodiumSources ?? []) as never,
    {} as never,
    {} as never,
    {} as never,
    (overrides.tradePostActivity ?? {}) as never,
    new ColonyStatsService((overrides.gameData ?? {}) as never),
    new ColonySocialService((overrides.gameData ?? {}) as never),
  );
}

describe('DatabaseService RPG ranking', () => {
  it('sums positive ratings across non-deleted posts and limits the ranking to ten players', async () => {
    const getRawMany = jest.fn().mockResolvedValue(
      Array.from({ length: 11 }, (_, index) => ({
        userId: index + 1,
        username: `Spieler ${index + 1}`,
        score: String(20 - index),
      })),
    );
    const query = {
      innerJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getRawMany,
    };
    const service = createService({
      holonetRatingRepo: { createQueryBuilder: jest.fn().mockReturnValue(query) },
    });

    const result = await service.getRanking(11, 'rpg');

    expect(result.entries).toHaveLength(10);
    expect(result.entries[0]).toEqual({
      userId: 1,
      username: 'Spieler 1',
      score: 20,
      rank: 1,
    });
    expect(result.currentUser).toEqual({
      userId: 11,
      username: 'Spieler 11',
      score: 10,
      rank: 11,
    });
    expect(query.where).toHaveBeenCalledWith('rating.value > 0');
    expect(query.andWhere).toHaveBeenCalledWith('post.deletedAt IS NULL');
    expect(query.andWhere).toHaveBeenCalledWith('author.isNpc = false');
  });
});

describe('DatabaseService trade post ranking', () => {
  it('ranks the most active trade posts anonymously with their network name', async () => {
    const now = new Date('2026-11-13T12:00:00Z');
    const tradePostActivity = {
      top: jest.fn().mockResolvedValue([
        { tradePostId: 4, postName: 'Mos Eisley', networkId: 3, score: 12 },
        { tradePostId: 9, postName: 'Fernposten', networkId: 9, score: 2 },
      ]),
    };

    const result = await createService({ tradePostActivity }).getRanking(1, 'trade-posts', now);

    expect(tradePostActivity.top).toHaveBeenCalledWith(now);
    expect(result).toEqual({
      title: 'Die 10 aktivsten Handelsposten',
      metricLabel: 'Transaktionen (7 Tage)',
      kind: 'trade-posts',
      entries: [
        { rank: 1, tradePostId: 4, postName: 'Mos Eisley', networkName: 'Hutten-Handelsnetz', score: 12 },
        { rank: 2, tradePostId: 9, postName: 'Fernposten', networkName: 'Handelsnetz 9', score: 2 },
      ],
      currentUser: null,
    });
  });
});

describe('DatabaseService Aurodium ranking', () => {
  it('combines colony and spacecraft Aurodium sources and limits the ranking to ten players', async () => {
    const colonySource = {
      totals: jest.fn().mockResolvedValue([
        { userId: 1, username: 'Leia', amount: 1_200 },
        { userId: 2, username: 'Han', amount: 300 },
      ]),
    };
    const shipSource = {
      totals: jest.fn().mockResolvedValue([
        { userId: 1, username: 'Leia', amount: 50 },
        ...Array.from({ length: 10 }, (_, index) => ({
          userId: index + 2,
          username: `Spieler ${index + 2}`,
          amount: 900 - index,
        })),
      ]),
    };
    const service = createService({ aurodiumSources: [colonySource, shipSource] });

    const result = await service.getRanking(11, 'aurodium');

    expect(colonySource.totals).toHaveBeenCalledWith(50);
    expect(shipSource.totals).toHaveBeenCalledWith(50);
    expect(result.title).toBe('Die 10 Günstlinge der Hutten');
    expect(result.entries).toHaveLength(10);
    expect(result.entries[0]).toEqual({
      userId: 1,
      username: 'Leia',
      score: 1_250,
      rank: 1,
    });
    expect(result.currentUser).toEqual({
      userId: 11,
      username: 'Spieler 11',
      score: 891,
      rank: 11,
    });
  });
});

describe('DatabaseService flight ranking', () => {
  it('counts departures from system and galaxy flights in the 48-hour window and anonymizes players', async () => {
    const getRawMany = jest.fn().mockResolvedValue([
      { userId: 7, faction: 'REBELLION', score: '3', shipCount: '2' },
    ]);
    const query = {
      innerJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
      getRawMany,
    };
    const service = createService({
      flightSignatureRepo: { createQueryBuilder: jest.fn().mockReturnValue(query) },
    });

    const result = await service.getRanking(99, 'flights', new Date('2026-10-27T12:00:00Z'));

    expect(query.where).toHaveBeenCalledWith('signature.toDirection IS NOT NULL');
    expect(query.andWhere).toHaveBeenCalledWith('signature.createdAt > :visibleSince');
    expect(query.andWhere).toHaveBeenCalledWith('user.isNpc = false');
    expect(query.setParameters).toHaveBeenCalledWith({
      visibleSince: new Date('2026-10-25T12:00:00Z'),
    });
    expect(result).toEqual({
      title: 'Die Top 10 der Vielflieger',
      metricLabel: 'Geflogene Felder',
      anonymous: true,
      entries: [{ rank: 1, faction: 'REBELLION', score: 3, shipCount: 2 }],
      currentUser: null,
    });
    expect(JSON.stringify(result)).not.toMatch(/userId|username/);
  });
});

describe('DatabaseService individual discovery ranking', () => {
  it('combines each persistent discovery source once and returns own rank', async () => {
    const userRepo = {
      find: jest.fn().mockResolvedValue([
        { id: 1, username: 'Leia' },
        { id: 2, username: 'Han' },
      ]),
    };
    const service = new DatabaseService(
      userRepo as never,
      {} as never,
      {} as never,
      {} as never,
      { find: jest.fn().mockResolvedValue([{ userId: 1 }]) } as never,
      { find: jest.fn().mockResolvedValue([{ userId: 1 }, { userId: 2 }]) } as never,
      {} as never,
      {} as never,
      { find: jest.fn().mockResolvedValue([{ userId: 1 }]) } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const result = await service.getRanking(2, 'discoveries');

    expect(result.entries).toEqual([
      { userId: 1, username: 'Leia', score: 3, rank: 1 },
      { userId: 2, username: 'Han', score: 1, rank: 2 },
    ]);
    expect(result.currentUser).toEqual({
      userId: 2,
      username: 'Han',
      score: 1,
      rank: 2,
    });
  });
});

describe('DatabaseService satisfied worker ranking', () => {
  const building = (id: number, amount: number) => ({
    id,
    epsProc: 0,
    bevUse: 30,
    bonuses: {},
    production: [{ commodityId: 1300, amount }],
  });
  const field = (buildingId: number, isActive = true, isBuilding = false) => ({
    id: buildingId,
    buildingId,
    isActive,
    isBuilding,
  });
  const colony = (
    userId: number,
    username: string,
    workers: number,
    fields: object[] = [],
  ) => ({
    userId,
    user: { id: userId, username, isNpc: false },
    stats: { workers },
    fields,
    population: 100,
  });
  const gameData = {
    getBuilding: (id: number) => building(id, id === 1 ? 40 : 100),
    getBuildingFunctions: () => [],
    getCommodity: (id: number) => ({ id, isDeposit: false }),
    getColonyClass: () => null,
    getSocialEffects: () => ({ lifeStandardCommodityId: 1300 }),
  };

  it('caps satisfaction per colony, totals across colonies, and ignores inactive and unfinished buildings', async () => {
    const colonyRepo = {
      find: jest
        .fn()
        .mockResolvedValue([
          colony(1, 'Leia', 80, [
            field(1),
            field(2, false),
            field(2, true, true),
          ]),
          colony(1, 'Leia', 10, [field(2)]),
          colony(2, 'Han', 45, [field(1), field(1)]),
          colony(2, 'Han', 100),
        ]),
    };
    const result = await createService({ colonyRepo, gameData }).getRanking(
      2,
      'satisfied-workers',
    );
    expect(result.title).toBe('Die Top 10 der besten Arbeitgeber');
    expect(result.metricLabel).toBe('Zufriedene Arbeiter');
    expect(result.entries).toEqual([
      { userId: 1, username: 'Leia', score: 50, rank: 1 },
      { userId: 2, username: 'Han', score: 45, rank: 2 },
    ]);
    expect(result.currentUser).toEqual(result.entries[1]);
    expect(colonyRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        relations: expect.arrayContaining(['user', 'stats', 'fields']),
        where: { isAbandoned: false, user: { isNpc: false } },
      }),
    );
  });

  it('limits the list to ten, sorts equal scores by name and keeps the own position outside the top ten', async () => {
    const colonyRepo = {
      find: jest
        .fn()
        .mockResolvedValue([
          colony(1, 'Zeta', 40, [field(1)]),
          colony(2, 'Alpha', 40, [field(1)]),
          ...Array.from({ length: 9 }, (_, i) =>
            colony(i + 3, `Player ${i}`, 20 - i, [field(1)]),
          ),
        ]),
    };
    const result = await createService({ colonyRepo, gameData }).getRanking(
      11,
      'satisfied-workers',
    );
    expect(result.entries).toHaveLength(10);
    expect(result.entries[0]).toMatchObject({ username: 'Alpha', rank: 1 });
    expect(result.entries[1]).toMatchObject({ username: 'Zeta', rank: 2 });
    expect(result.currentUser).toEqual({
      userId: 11,
      username: 'Player 8',
      score: 12,
      rank: 11,
    });
  });

  it('returns zero satisfaction without active production and no own position without colonies', async () => {
    const colonyRepo = {
      find: jest.fn().mockResolvedValue([colony(1, 'Leia', 100)]),
    };
    const service = createService({ colonyRepo, gameData });
    expect(
      (await service.getRanking(1, 'satisfied-workers')).currentUser,
    ).toMatchObject({ score: 0, rank: 1 });
    expect(
      (await service.getRanking(2, 'satisfied-workers')).currentUser,
    ).toBeNull();
  });
});
