jest.mock('../auth/user.entity', () => ({ User: class User {} }));
jest.mock('../colony/entities/colony.entity', () => ({
  Colony: class Colony {},
}));
jest.mock('../starmap/entities/celestial-object.entity', () => ({
  CelestialObject: class CelestialObject {},
  CelestialObjectType: { PLANET: 1, MOON: 2, ASTEROID: 3 },
}));
jest.mock('../starmap/entities/layer.entity', () => ({
  Layer: class Layer {},
}));
jest.mock('../spacecraft/entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  SpacecraftStatus: {
    IDLE: 'IDLE',
    IN_FLIGHT: 'IN_FLIGHT',
    IN_COMBAT: 'IN_COMBAT',
    DESTROYED: 'DESTROYED',
  },
  AlertState: { GREEN: 'GREEN' },
}));
jest.mock('../spacecraft/entities/ship-class-def.entity', () => ({
  ShipClassDef: class ShipClassDef {},
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ColonizationService } from './colonization.service';
import { ColonyEventType } from '../colony/entities/colony-event.entity';

function repo(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
    ...overrides,
  } as any;
}

describe('ColonizationService', () => {
  function createService() {
    const userRepo = repo();
    const colonyRepo = repo();
    const objectRepo = repo();
    const shipRepo = repo({ save: jest.fn(), create: jest.fn() });
    const shipClassRepo = repo();
    const unlockResolver = { hasTech: jest.fn() };
    const colonySeedService = {
      createFollowUpColony: jest.fn(),
      createStarterColony: jest.fn(),
      generateSurfaceSnapshot: jest.fn(() => ({
        width: 1,
        fields: [
          {
            fieldIndex: 0,
            fieldType: 101,
            terrainTileId: 101,
            layer: 'SURFACE',
          },
        ],
      })),
    };
    const colonyEventService = { createActionEvent: jest.fn() };

    const service = new ColonizationService(
      userRepo,
      colonyRepo,
      objectRepo,
      shipRepo,
      shipClassRepo,
      repo({ find: jest.fn(async () => []) }) as never,
      unlockResolver as never,
      colonySeedService as never,
      colonyEventService as never,
    );

    return {
      service,
      userRepo,
      colonyRepo,
      objectRepo,
      shipRepo,
      shipClassRepo,
      unlockResolver,
      colonySeedService,
      colonyEventService,
    };
  }

  const rebelUser = {
    id: 1,
    username: 'Luke',
    faction: 'REBEL_ALLIANCE',
    factionRef: { key: 'REBEL_ALLIANCE' },
  };

  function colonyLayerCountQuery(count: number) {
    return {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(count),
    };
  }

  it('calculates moon limit from colonizer and moon techs', async () => {
    const { service, userRepo, colonyRepo, unlockResolver } = createService();
    userRepo.findOne.mockResolvedValue(rebelUser);
    colonyRepo.find.mockResolvedValue([]);
    unlockResolver.hasTech.mockImplementation(
      async (_userId: number, techId: number) =>
        [415001, 102101].includes(techId),
    );

    const status = await service.getColonizationStatus(1);

    expect(status.limits.moon.limit).toBe(2);
    expect(status.limits.planet.limit).toBe(1);
    expect(status.limits.asteroid.limit).toBe(0);
  });

  it('rejects colonization when target already has a colony', async () => {
    const { service, userRepo, colonyRepo, objectRepo, unlockResolver } =
      createService();
    userRepo.findOne.mockResolvedValue({
      ...rebelUser,
      createdAt: new Date(),
      factionId: 1,
    });
    colonyRepo.find.mockResolvedValue([]);
    colonyRepo.findOne.mockResolvedValue({ id: 99, celestialObjectId: 5 });
    colonyRepo.createQueryBuilder.mockReturnValue(colonyLayerCountQuery(0));
    objectRepo.findOne.mockResolvedValue({
      id: 5,
      objectType: 2,
      isColonizable: true,
      classId: 401,
      systemId: 44,
      posX: 3,
      posY: 7,
      starSystem: { layer: { id: 2, name: 'Outer Rim', isNoobzone: false } },
    });
    unlockResolver.hasTech.mockResolvedValue(true);

    const result = await service.explainTarget(1, 5);

    expect(result.canColonize).toBe(false);
    expect(result.reasons).toContain('Ziel ist bereits kolonisiert');
  });

  it('requires exact target field for colonizer ship', async () => {
    const {
      service,
      userRepo,
      colonyRepo,
      objectRepo,
      shipRepo,
      shipClassRepo,
      unlockResolver,
    } = createService();
    userRepo.findOne.mockResolvedValue({
      ...rebelUser,
      createdAt: new Date(),
      factionId: 1,
    });
    colonyRepo.find.mockResolvedValue([]);
    colonyRepo.findOne.mockResolvedValue(null);
    colonyRepo.createQueryBuilder.mockReturnValue(colonyLayerCountQuery(0));
    objectRepo.findOne.mockResolvedValue({
      id: 6,
      objectType: 2,
      isColonizable: true,
      classId: 401,
      systemId: 44,
      posX: 8,
      posY: 9,
      starSystem: { layer: { id: 2, name: 'Outer Rim', isNoobzone: false } },
    });
    shipRepo.findOne.mockResolvedValue({
      id: 12,
      userId: 1,
      shipClassId: 55,
      status: 'IDLE',
      locationId: 41,
      location: {
        id: 41,
        kind: 'SYSTEM_FIELD',
        systemField: { starSystemId: 44, sx: 8, sy: 8 },
      },
      name: 'GR-75',
    });
    shipClassRepo.findOneBy.mockResolvedValue({
      id: 55,
      isColonizer: true,
      colonizerTier: 1,
      colonizationBuildingId: 81010100,
    });
    unlockResolver.hasTech.mockResolvedValue(true);

    const result = await service.explainTarget(1, 6, 12);

    expect(result.canColonize).toBe(false);
    expect(result.reasons).toContain(
      'Kolonieschiff muss exakt auf dem Zielfeld stehen',
    );
  });

  it('uses the canonical system field for a colonizer ship', async () => {
    const {
      service,
      userRepo,
      colonyRepo,
      objectRepo,
      shipRepo,
      shipClassRepo,
      unlockResolver,
    } = createService();
    userRepo.findOne.mockResolvedValue({
      ...rebelUser,
      createdAt: new Date(),
      factionId: 1,
    });
    colonyRepo.find.mockResolvedValue([]);
    colonyRepo.findOne.mockResolvedValue(null);
    colonyRepo.createQueryBuilder.mockReturnValue(colonyLayerCountQuery(0));
    objectRepo.findOne.mockResolvedValue({
      id: 6,
      objectType: 2,
      isColonizable: true,
      classId: 401,
      systemId: 44,
      posX: 8,
      posY: 9,
      starSystem: { layer: { id: 2, name: 'Outer Rim', isNoobzone: false } },
    });
    shipRepo.findOne.mockResolvedValue({
      id: 12,
      userId: 1,
      shipClassId: 55,
      status: 'IDLE',
      locationId: 42,
      location: {
        id: 42,
        kind: 'SYSTEM_FIELD',
        systemField: { starSystemId: 44, sx: 8, sy: 9 },
      },
      name: 'GR-75',
    });
    shipClassRepo.findOneBy.mockResolvedValue({
      id: 55,
      isColonizer: true,
      colonizerTier: 1,
      colonizationBuildingId: 81010100,
    });
    unlockResolver.hasTech.mockResolvedValue(true);

    const result = await service.explainTarget(1, 6, 12);

    expect(result.reasons).not.toContain(
      'Kolonieschiff muss exakt auf dem Zielfeld stehen',
    );
    expect(result.reasons).not.toContain(
      'Kolonieschiff muss im Sternsystem sein',
    );
  });

  it('creates colony and consumes colonizer ship', async () => {
    const {
      service,
      userRepo,
      colonyRepo,
      objectRepo,
      shipRepo,
      shipClassRepo,
      unlockResolver,
      colonySeedService,
      colonyEventService,
    } = createService();
    userRepo.findOne.mockResolvedValue({
      ...rebelUser,
      createdAt: new Date(),
      factionId: 1,
    });
    colonyRepo.find.mockResolvedValue([{ celestialObject: { objectType: 1 } }]);
    colonyRepo.findOne.mockResolvedValue(null);
    colonyRepo.createQueryBuilder.mockReturnValue(colonyLayerCountQuery(0));
    objectRepo.findOne.mockResolvedValue({
      id: 7,
      objectType: 2,
      isColonizable: true,
      classId: 401,
      systemId: 44,
      posX: 8,
      posY: 9,
      starSystem: { layer: { id: 2, name: 'Outer Rim', isNoobzone: false } },
    });
    objectRepo.findOneBy.mockResolvedValue({
      id: 7,
      objectType: 2,
      isColonizable: true,
      classId: 401,
      systemId: 44,
      posX: 8,
      posY: 9,
    });
    shipRepo.findOne.mockResolvedValue({
      id: 15,
      userId: 1,
      shipClassId: 56,
      status: 'IDLE',
      locationId: 43,
      location: {
        id: 43,
        kind: 'SYSTEM_FIELD',
        systemField: { starSystemId: 44, sx: 8, sy: 9 },
      },
      name: 'Aerie',
    });
    shipClassRepo.findOneBy.mockResolvedValue({
      id: 56,
      isColonizer: true,
      colonizerTier: 2,
      colonizationBuildingId: 82010100,
    });
    unlockResolver.hasTech.mockResolvedValue(true);
    colonySeedService.createFollowUpColony.mockResolvedValue({
      id: 123,
      name: 'Neue Kolonie',
    });

    const result = await service.colonize(1, 15, 7, 0);

    expect(colonySeedService.createFollowUpColony).toHaveBeenCalledWith(
      expect.objectContaining({
        celestialObjectId: 7,
        buildingId: 82010100,
      }),
    );
    expect(shipRepo.delete).toHaveBeenCalledWith({ id: 15, userId: 1 });
    expect(colonyEventService.createActionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ColonyEventType.COLONY_FOUNDED,
        colonyId: 123,
      }),
    );
    expect(result).toMatchObject({
      success: true,
      colonyId: 123,
      colonyName: 'Neue Kolonie',
      consumedShipId: 15,
      transferredCrewCount: 0,
    });
  });

  it('blocks old accounts in noobzone targets', async () => {
    const { service, userRepo, colonyRepo, objectRepo, unlockResolver } =
      createService();
    userRepo.findOne.mockResolvedValue({
      ...rebelUser,
      createdAt: new Date(0),
      factionId: 1,
    });
    colonyRepo.find.mockResolvedValue([]);
    colonyRepo.findOne.mockResolvedValue(null);
    colonyRepo.createQueryBuilder.mockReturnValue(colonyLayerCountQuery(0));
    objectRepo.findOne.mockResolvedValue({
      id: 88,
      objectType: 1,
      isColonizable: true,
      classId: 401,
      systemId: 44,
      posX: 1,
      posY: 1,
      starSystem: { layer: { id: 4, name: 'Noob', isNoobzone: true } },
    });
    unlockResolver.hasTech.mockResolvedValue(true);

    const result = await service.explainTarget(1, 88);

    expect(result.canColonize).toBe(false);
    expect(result.reasons).toContain(
      'Kolonisierung in der Noobzone nur für neue Accounts erlaubt',
    );
    expect(result.target?.starterZone).toMatchObject({
      layerId: 4,
      isNoobzone: true,
      accountAgeAllowed: false,
    });
  });

  it('blocks new accounts with four colonies in same noobzone layer', async () => {
    const { service, userRepo, colonyRepo, objectRepo, unlockResolver } =
      createService();
    userRepo.findOne.mockResolvedValue({
      ...rebelUser,
      createdAt: new Date(),
      factionId: 1,
    });
    colonyRepo.find.mockResolvedValue([]);
    colonyRepo.findOne.mockResolvedValue(null);
    colonyRepo.createQueryBuilder.mockReturnValue(colonyLayerCountQuery(4));
    objectRepo.findOne.mockResolvedValue({
      id: 89,
      objectType: 1,
      isColonizable: true,
      classId: 401,
      systemId: 44,
      posX: 1,
      posY: 1,
      starSystem: { layer: { id: 4, name: 'Noob', isNoobzone: true } },
    });
    unlockResolver.hasTech.mockResolvedValue(true);

    const result = await service.explainTarget(1, 89);

    expect(result.canColonize).toBe(false);
    expect(result.reasons).toContain(
      'Kolonielimit in dieser Noobzone erreicht (4/4)',
    );
    expect(result.target?.starterZone?.currentColoniesInLayer).toBe(4);
  });

  it('allows new accounts below noobzone colony limit', async () => {
    const { service, userRepo, colonyRepo, objectRepo, unlockResolver } =
      createService();
    userRepo.findOne.mockResolvedValue({
      ...rebelUser,
      createdAt: new Date(),
      factionId: 1,
    });
    colonyRepo.find.mockResolvedValue([]);
    colonyRepo.findOne.mockResolvedValue(null);
    colonyRepo.createQueryBuilder.mockReturnValue(colonyLayerCountQuery(3));
    objectRepo.findOne.mockResolvedValue({
      id: 90,
      objectType: 1,
      isColonizable: true,
      classId: 401,
      systemId: 44,
      posX: 1,
      posY: 1,
      starSystem: { layer: { id: 4, name: 'Noob', isNoobzone: true } },
    });
    unlockResolver.hasTech.mockResolvedValue(true);

    const result = await service.explainTarget(1, 90);

    expect(result.reasons).not.toContain(
      'Kolonielimit in dieser Noobzone erreicht (4/4)',
    );
    expect(result.target?.starterZone).toMatchObject({
      currentColoniesInLayer: 3,
      accountAgeAllowed: true,
    });
  });

  it('throws when user is missing', async () => {
    const { service, userRepo } = createService();
    userRepo.findOne.mockResolvedValue(null);
    await expect(service.getColonizationStatus(1)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws bad request when colonization check fails', async () => {
    const { service, userRepo, colonyRepo, objectRepo, unlockResolver } =
      createService();
    userRepo.findOne.mockResolvedValue({
      ...rebelUser,
      createdAt: new Date(),
      factionId: 1,
    });
    colonyRepo.find.mockResolvedValue([]);
    colonyRepo.findOne.mockResolvedValue({ id: 1 });
    colonyRepo.createQueryBuilder.mockReturnValue(colonyLayerCountQuery(0));
    objectRepo.findOne.mockResolvedValue({
      id: 8,
      objectType: 2,
      isColonizable: true,
      classId: 401,
      systemId: 44,
      posX: 1,
      posY: 1,
      starSystem: { layer: { id: 2, name: 'Outer Rim', isNoobzone: false } },
    });
    unlockResolver.hasTech.mockResolvedValue(true);

    await expect(service.colonize(1, 1, 8)).rejects.toThrow(
      BadRequestException,
    );
  });
});
