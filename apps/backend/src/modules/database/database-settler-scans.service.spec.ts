jest.mock('../faction/faction.service', () => ({
  FactionService: class FactionService {},
}));
jest.mock('../alliance/alliance.service', () => ({
  AllianceService: class AllianceService {},
}));
jest.mock('../auth/user.entity', () => ({ User: class User {} }));
jest.mock('../colony/entities/colony.entity', () => ({
  Colony: class Colony {},
}));
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
jest.mock('../starmap/entities/layer.entity', () => ({
  Layer: class Layer {},
}));
jest.mock('../starmap/entities/star-system.entity', () => ({
  StarSystem: class StarSystem {},
}));
jest.mock('../starmap/entities/system-exploration.entity', () => ({
  SystemExploration: class SystemExploration {},
}));
jest.mock('../starmap/entities/system-field.entity', () => ({
  SystemField: class SystemField {},
}));

import { DatabaseService } from './database.service';

function createService(overrides: Record<string, unknown> = {}) {
  const repos = {
    userRepo: {
      findOne: jest.fn().mockResolvedValue({
        id: 77,
        username: 'lando',
        displayName: 'Lando',
      }),
    },
    factionService: { findAll: jest.fn().mockResolvedValue([]) },
    allianceService: { getRef: jest.fn().mockResolvedValue(null) },
    colonyRepo: { count: jest.fn().mockResolvedValue(1) },
    systemExplorationRepo: {
      find: jest.fn().mockResolvedValue([{ userId: 42, starSystemId: 9 }]),
    },
    systemRepo: {
      find: jest.fn().mockResolvedValue([{ id: 9, name: 'Bespin' }]),
    },
    shipRepo: { count: jest.fn().mockResolvedValue(2) },
    researchRepo: { count: jest.fn().mockResolvedValue(3) },
    colonyScanProjection: {
      newestAccessibleForColonies: jest.fn().mockResolvedValue([
        { id: 501, colonyId: 201, systemId: 9, canDelete: true },
        { id: 502, colonyId: 202, systemId: 10, canDelete: false },
      ]),
    },
    ...overrides,
  };
  const service = Object.create(DatabaseService.prototype) as DatabaseService;
  Object.assign(service as object, repos);
  return { service, repos };
}

describe('DatabaseService settler scan projection', () => {
  it('includes only viewer-authorized scans of a foreign profile and preserves own-scan deletion rights', async () => {
    const { service, repos } = createService();

    const profile = await service.getSettler(42, 77);

    expect(
      repos.colonyScanProjection.newestAccessibleForColonies,
    ).toHaveBeenCalledWith(42, 77);
    expect(profile).toMatchObject({
      id: 77,
      colonyScans: [
        {
          id: 501,
          canDelete: true,
          system: { id: 9, discovered: true, name: 'Bespin' },
        },
        {
          id: 502,
          canDelete: false,
          system: { id: null, discovered: false, name: null },
        },
      ],
    });
  });

  it('does not expose a scan list on the viewer’s own profile', async () => {
    const { service, repos } = createService();

    const profile = await service.getSettler(77, 77);

    expect(
      repos.colonyScanProjection.newestAccessibleForColonies,
    ).not.toHaveBeenCalled();
    expect(profile).not.toHaveProperty('colonyScans');
  });
});
