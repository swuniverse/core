jest.mock('../faction/faction.service', () => ({
  FactionService: class FactionService {},
}));
jest.mock('../alliance/alliance.service', () => ({
  AllianceService: class AllianceService {},
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
jest.mock('../starmap/entities/layer.entity', () => ({ Layer: class Layer {} }));
jest.mock('../starmap/entities/star-system.entity', () => ({
  StarSystem: class StarSystem {},
}));
jest.mock('../starmap/entities/system-exploration.entity', () => ({
  SystemExploration: class SystemExploration {},
}));

import { DatabaseService } from './database.service';

describe('DatabaseService system catalog', () => {
  it('returns a stable, strictly masked catalog for personally undiscovered systems', async () => {
    const layerRepo = {
      find: jest.fn().mockResolvedValue([{ id: 7, name: 'Kern' }]),
    };
    const systemRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 20,
          layerId: 7,
          name: 'Alderaan',
          cx: 4,
          cy: 9,
          systemTypeId: 1049,
        },
        {
          id: 10,
          layerId: 7,
          name: 'Bespin',
          cx: 1,
          cy: 3,
          systemTypeId: 1050,
        },
        {
          id: 30,
          layerId: 99,
          name: 'Verborgener Sektor',
          cx: 1,
          cy: 1,
          systemTypeId: 1049,
        },
      ]),
    };
    const explorationRepo = {
      find: jest.fn().mockResolvedValue([
        {
          userId: 42,
          starSystemId: 20,
          discoveredAt: new Date('2026-10-01T12:00:00.000Z'),
        },
      ]),
    };
    const service = new DatabaseService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      layerRepo as any,
      systemRepo as any,
      explorationRepo as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await expect(service.getSystems(42)).resolves.toEqual({
      layers: [
        {
          id: 7,
          name: 'Kern',
          entries: [
            { discovered: false, name: '???' },
            {
              discovered: true,
              name: 'Alderaan',
              cx: 4,
              cy: 9,
              systemTypeName: expect.any(String),
              discoveredAt: '2026-10-01T12:00:00.000Z',
              systemId: 20,
            },
          ],
        },
      ],
    });
  });
});
