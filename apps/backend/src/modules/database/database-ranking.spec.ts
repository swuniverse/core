jest.mock('../faction/faction.service', () => ({
  FactionService: class FactionService {},
}));
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

import { DatabaseService } from './database.service';

function createService(overrides: { userRepo?: object; flightSignatureRepo?: object } = {}) {
  return new DatabaseService(
    (overrides.userRepo ?? {}) as never,
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
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    (overrides.flightSignatureRepo ?? {}) as never,
  );
}

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
