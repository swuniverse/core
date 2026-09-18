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

import { DatabaseService } from './database.service';

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
