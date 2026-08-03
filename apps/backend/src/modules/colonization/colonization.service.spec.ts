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
    DOCKED: 'DOCKED',
    IN_FLIGHT: 'IN_FLIGHT',
    IN_COMBAT: 'IN_COMBAT',
    DESTROYED: 'DESTROYED',
  },
}));
jest.mock('../spacecraft/entities/ship-class-def.entity', () => ({
  ShipClassDef: class ShipClassDef {},
}));

jest.mock('../research/entities/research.entity', () => ({
  Research: class Research {},
  ResearchStatus: {
    LOCKED: 'LOCKED',
    AVAILABLE: 'AVAILABLE',
    IN_PROGRESS: 'IN_PROGRESS',
    QUEUED: 'QUEUED',
    COMPLETED: 'COMPLETED',
  },
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
    const researchRepo = repo();
    const unlockResolver = { hasTech: jest.fn() };
    const colonySeedService = {
      createFollowUpColony: jest.fn(),
      createStarterColony: jest.fn(),
    };
    const colonyEventService = { createActionEvent: jest.fn() };

    const service = new ColonizationService(
      userRepo,
      colonyRepo,
      objectRepo,
      shipRepo,
      shipClassRepo,
      researchRepo,
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
      researchRepo,
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

  interface StarterTarget {
    id: number;
    systemId: number;
    posX: number;
    posY: number;
    classId: number;
    name: string;
    starSystem?: { id: number; layerId: number };
  }

  function starterTarget(id: number): StarterTarget {
    return {
      id,
      systemId: 55,
      posX: 7,
      posY: 9,
      classId: 401,
      name: `Planet ${id}`,
    };
  }

  function starterTargetQuery(targets: StarterTarget[]) {
    return {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(targets),
    };
  }

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

  it('returns required starter options with available targets', async () => {
    const { service, userRepo, colonyRepo, objectRepo } = createService();
    userRepo.findOne.mockResolvedValue({
      ...rebelUser,
      onboardingCompleted: false,
      starterColonyId: null,
      starterShipId: null,
      factionId: 1,
    });
    colonyRepo.findOne.mockResolvedValue(null);
    objectRepo.createQueryBuilder.mockReturnValue(
      starterTargetQuery([starterTarget(101), starterTarget(102)]),
    );

    const result = await service.getStarterColonizationOptions(1);

    expect(result.mode).toBe('required');
    expect(result.targets).toHaveLength(2);
    expect(result.targets[0]).toMatchObject({ id: 101, systemId: 55 });
  });

  it('queries starter targets by faction zone and starter classes', async () => {
    const { service, userRepo, colonyRepo, objectRepo } = createService();
    const query = starterTargetQuery([starterTarget(201)]);
    userRepo.findOne.mockResolvedValue({
      ...rebelUser,
      onboardingCompleted: false,
      starterColonyId: null,
      starterShipId: null,
      factionId: 1,
      factionRef: { homeZone: 'REBEL' },
    });
    colonyRepo.findOne.mockResolvedValue(null);
    objectRepo.createQueryBuilder.mockReturnValue(query);

    await service.getStarterColonizationOptions(1);

    expect(query.innerJoin).toHaveBeenCalledWith(
      expect.any(Function),
      'galaxyField',
      'galaxyField.starSystemId = starSystem.id',
    );
    expect(query.andWhere).toHaveBeenCalledWith(
      'target.classId IN (:...starterClassIds)',
      { starterClassIds: [201, 203, 205] },
    );
    expect(query.andWhere).toHaveBeenCalledWith(
      'galaxyField.factionZone IN (:...starterZones)',
      { starterZones: ['REBEL'] },
    );
    expect(query.andWhere).not.toHaveBeenCalledWith(
      'starSystem.layerId = :layerId',
      expect.anything(),
    );
  });

  it('creates starter colony and completes onboarding once', async () => {
    const {
      service,
      userRepo,
      colonyRepo,
      objectRepo,
      colonySeedService,
      researchRepo,
    } = createService();
    const user = {
      ...rebelUser,
      onboardingCompleted: false,
      starterColonyId: null,
      starterShipId: null,
      factionId: 1,
    };
    userRepo.findOne.mockResolvedValue(user);
    colonyRepo.findOne.mockResolvedValue(null);
    objectRepo.createQueryBuilder.mockReturnValue(
      starterTargetQuery([starterTarget(777)]),
    );
    colonySeedService.createStarterColony.mockResolvedValue({ id: 7777 });
    researchRepo.findOne.mockResolvedValue(null);

    const result = await service.foundStarterColony(1, 777);

    expect(result).toEqual({ success: true, colonyId: 7777 });
    expect(colonySeedService.createStarterColony).toHaveBeenCalledWith(
      1,
      'Luke',
      777,
      1,
    );
    expect(user.onboardingCompleted).toBe(true);
    expect(user.starterColonyId).toBe(7777);
    expect(researchRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        techId: 1001,
        status: 'COMPLETED',
      }),
    );

    await expect(service.foundStarterColony(1, 777)).rejects.toThrow(
      'Starterkolonisierung bereits abgeschlossen',
    );
  });

  it('marks starter mode not required when active colony already exists', async () => {
    const { service, userRepo, colonyRepo } = createService();
    const user = {
      ...rebelUser,
      onboardingCompleted: false,
      starterColonyId: null,
      starterShipId: null,
      factionId: 1,
    };
    userRepo.findOne.mockResolvedValue(user);
    colonyRepo.findOne.mockResolvedValue({ id: 9001 });

    const result = await service.getStarterColonizationOptions(1);

    expect(result.mode).toBe('not-required');
    expect(result.targets).toEqual([]);
    expect(user.onboardingCompleted).toBe(true);
  });

  it('repairs missing base research for existing starter colonies', async () => {
    const { service, userRepo, colonyRepo, researchRepo } = createService();
    const user = {
      ...rebelUser,
      onboardingCompleted: false,
      starterColonyId: 9001,
      starterShipId: null,
      factionId: 2,
    };
    userRepo.findOne.mockResolvedValue(user);
    colonyRepo.findOne.mockResolvedValue({ id: 9001 });
    researchRepo.findOne.mockResolvedValue({
      userId: 1,
      techId: 1003,
      status: 'LOCKED',
      progress: 12,
      remainingPoints: 5,
      spentPoints: 1,
      blockedReason: 'old',
    });

    const result = await service.getStarterColonizationOptions(1);

    expect(result.mode).toBe('not-required');
    expect(researchRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        techId: 1003,
        status: 'COMPLETED',
        progress: 0,
        remainingPoints: 0,
        spentPoints: 0,
        blockedReason: null,
      }),
    );
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
