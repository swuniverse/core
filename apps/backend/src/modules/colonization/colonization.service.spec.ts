jest.mock('../auth/user.entity', () => ({ User: class User {} }));
jest.mock('../colony/entities/colony.entity', () => ({
  Colony: class Colony {},
}));
jest.mock('../starmap/entities/celestial-object.entity', () => ({
  CelestialObject: class CelestialObject {},
  CelestialObjectType: { PLANET: 1, MOON: 2, ASTEROID: 3 },
}));
jest.mock('../spacecraft/entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  SpacecraftStatus: {
    DOCKED: 'DOCKED',
    IN_FLIGHT: 'IN_FLIGHT',
    IN_COMBAT: 'IN_COMBAT',
    DESTROYED: 'DESTROYED',
  },
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
    delete: jest.fn(),
    ...overrides,
  } as any;
}

describe('ColonizationService', () => {
  function createService() {
    const userRepo = repo();
    const colonyRepo = repo();
    const objectRepo = repo();
    const shipRepo = repo();
    const shipClassRepo = repo();
    const unlockResolver = { hasTech: jest.fn() } as any;
    const colonySeedService = { createFollowUpColony: jest.fn() } as any;
    const colonyEventService = { createActionEvent: jest.fn() } as any;

    const service = new ColonizationService(
      userRepo,
      colonyRepo,
      objectRepo,
      shipRepo,
      shipClassRepo,
      unlockResolver,
      colonySeedService,
      colonyEventService,
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
    userRepo.findOne.mockResolvedValue(rebelUser);
    colonyRepo.find.mockResolvedValue([]);
    colonyRepo.findOne.mockResolvedValue({ id: 99, celestialObjectId: 5 });
    objectRepo.findOneBy.mockResolvedValue({
      id: 5,
      objectType: 2,
      isColonizable: true,
      classId: 401,
      systemId: 44,
      posX: 3,
      posY: 7,
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
    userRepo.findOne.mockResolvedValue(rebelUser);
    colonyRepo.find.mockResolvedValue([]);
    colonyRepo.findOne.mockResolvedValue(null);
    objectRepo.findOneBy.mockResolvedValue({
      id: 6,
      objectType: 2,
      isColonizable: true,
      classId: 401,
      systemId: 44,
      posX: 8,
      posY: 9,
    });
    shipRepo.findOne.mockResolvedValue({
      id: 12,
      userId: 1,
      shipClassId: 55,
      status: 'DOCKED',
      inSystem: true,
      starSystemId: 44,
      currentSystemFieldX: 8,
      currentSystemFieldY: 8,
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
    userRepo.findOne.mockResolvedValue(rebelUser);
    colonyRepo.find.mockResolvedValue([{ celestialObject: { objectType: 1 } }]);
    colonyRepo.findOne.mockResolvedValue(null);
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
      status: 'DOCKED',
      inSystem: true,
      starSystemId: 44,
      currentSystemFieldX: 8,
      currentSystemFieldY: 9,
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

    const result = await service.colonize(1, 15, 7);

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
    expect(result).toEqual({
      success: true,
      colonyId: 123,
      consumedShipId: 15,
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
    userRepo.findOne.mockResolvedValue(rebelUser);
    colonyRepo.find.mockResolvedValue([]);
    colonyRepo.findOne.mockResolvedValue({ id: 1 });
    objectRepo.findOneBy.mockResolvedValue({
      id: 8,
      objectType: 2,
      isColonizable: true,
      classId: 401,
      systemId: 44,
      posX: 1,
      posY: 1,
    });
    unlockResolver.hasTech.mockResolvedValue(true);

    await expect(service.colonize(1, 1, 8)).rejects.toThrow(
      BadRequestException,
    );
  });
});
