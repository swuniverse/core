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
jest.mock('../starmap/entities/system-field.entity', () => ({
  SystemField: class SystemField {},
}));
jest.mock('../spacecraft/entities/cartography-plan.entity', () => ({
  CartographyPlan: class CartographyPlan {},
  CartographyPlanStatus: { DONE: 'DONE' },
  CartographyCompletionOutcome: { SUCCESS: 'SUCCESS' },
}));

import { NotFoundException } from '@nestjs/common';
import { DatabaseService } from './database.service';

function createService(overrides: Record<string, unknown> = {}) {
  const repos = {
    systemRepo: {
      findOneBy: jest.fn().mockResolvedValue({
        id: 9,
        name: 'Bespin',
        layerId: 3,
        cx: 4,
        cy: 7,
        systemTypeId: 1049,
        maxX: 22,
        maxY: 22,
      }),
    },
    explorationRepo: {
      findOne: jest.fn().mockResolvedValue({ userId: 42, starSystemId: 9 }),
    },
    cartographyPlanRepo: {
      findOne: jest.fn().mockResolvedValue({
        status: 'DONE',
        completionOutcome: 'SUCCESS',
      }),
    },
    scanProjection: {
      newestAccessibleForSystem: jest.fn().mockResolvedValue([]),
    },
    fieldRepo: {
      find: jest.fn().mockResolvedValue([
        {
          id: 11,
          sx: 1,
          sy: 2,
          fieldTypeId: 5,
          fieldType: { id: 5, key: 'EMPTY_SPACE', name: 'Leerer Raum' },
          isPassable: true,
          energyCost: 0,
          damage: 0,
          effects: [],
          celestialObject: {
            id: 81,
            objectType: 1,
            name: 'Bespin II',
            description: 'Gasriese',
            posX: 1,
            posY: 2,
            classId: 42,
            isColonizable: true,
          },
        },
      ]),
    },
    colonyRepo: {
      find: jest.fn().mockResolvedValue([
        {
          id: 201,
          name: 'Eigene Kolonie',
          userId: 42,
          isAbandoned: false,
          posX: 1,
          posY: 2,
          celestialObjectId: 81,
        },
        {
          id: 202,
          name: 'Fremde Kolonie',
          userId: 77,
          isAbandoned: false,
          posX: 3,
          posY: 4,
          celestialObjectId: null,
          user: { id: 77, username: 'lando' },
        },
        {
          id: 203,
          name: 'Aufgegeben',
          userId: null,
          isAbandoned: true,
          posX: 5,
          posY: 6,
          celestialObjectId: null,
        },
      ]),
    },
    ...overrides,
  };
  const service = Object.create(DatabaseService.prototype) as DatabaseService;
  Object.assign(service as object, {
    colonyRepo: repos.colonyRepo,
    cartographyPlanRepo: repos.cartographyPlanRepo,
    systemRepo: repos.systemRepo,
    systemExplorationRepo: repos.explorationRepo,
    systemFieldRepo: repos.fieldRepo,
    colonyScanProjection: repos.scanProjection,
  });
  return { service, repos };
}

describe('DatabaseService system detail', () => {
  it('returns a static system map only after a successful finalization', async () => {
    const { service, repos } = createService();

    await expect(service.getSystemDetail(42, 9)).resolves.toEqual({
      availability: 'AVAILABLE',
      id: 9,
      name: 'Bespin',
      layerId: 3,
      cx: 4,
      cy: 7,
      systemTypeId: 1049,
      systemTypeName: expect.any(String),
      maxX: 22,
      maxY: 22,
      fields: [
        {
          id: 11,
          sx: 1,
          sy: 2,
          fieldType: { id: 5, key: 'EMPTY_SPACE', name: 'Leerer Raum' },
          celestialObject: {
            id: 81,
            objectType: 1,
            name: 'Bespin II',
            description: 'Gasriese',
            posX: 1,
            posY: 2,
            classId: 42,
            isColonizable: true,
          },
        },
      ],
    });
    expect(repos.fieldRepo.find).toHaveBeenCalledWith({
      where: { starSystemId: 9 },
      relations: ['fieldType', 'celestialObject'],
      order: { sy: 'ASC', sx: 'ASC' },
    });
    expect(repos.colonyRepo.find).not.toHaveBeenCalled();
    expect(repos.scanProjection.newestAccessibleForSystem).not.toHaveBeenCalled();
  });

  it.each([
    undefined,
    { status: 'PLANNED', completionOutcome: null },
    { status: 'MEASURED', completionOutcome: null },
    { status: 'FINISHING', completionOutcome: null },
    { status: 'DONE', completionOutcome: 'INVALIDATED' },
    { status: 'DONE', completionOutcome: null },
  ])(
    'withholds system structure unless the Kartographieplan completed successfully: %p',
    async (plan) => {
      const { service, repos } = createService({
        cartographyPlanRepo: { findOne: jest.fn().mockResolvedValue(plan) },
      });

      await expect(service.getSystemDetail(42, 9)).resolves.toEqual({
        availability: 'ASTROMETRY_REQUIRED',
      });
      expect(repos.fieldRepo.find).not.toHaveBeenCalled();
      expect(repos.colonyRepo.find).not.toHaveBeenCalled();
      expect(repos.scanProjection.newestAccessibleForSystem).not.toHaveBeenCalled();
    },
  );

  it('rejects a system detail request without the viewer’s personal discovery', async () => {
    const { service } = createService({
      explorationRepo: { findOne: jest.fn().mockResolvedValue(null) },
    });

    await expect(service.getSystemDetail(42, 9)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
