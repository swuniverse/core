jest.mock('./entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  SpacecraftStatus: {
    IDLE: 'IDLE',
    IN_FLIGHT: 'IN_FLIGHT',
    IN_COMBAT: 'IN_COMBAT',
    DESTROYED: 'DESTROYED',
  },
  AlertState: { GREEN: 'GREEN', YELLOW: 'YELLOW', RED: 'RED' },
  SpacecraftOperatingMode: { NORMAL: 'NORMAL', STANDBY: 'STANDBY' },
}));
jest.mock('./entities/spacecraft-module.entity', () => ({
  SpacecraftModule: class SpacecraftModule {},
}));
jest.mock('./entities/fleet.entity', () => ({ Fleet: class Fleet {} }));
jest.mock('./entities/ship-class-def.entity', () => ({
  ShipClassDef: class ShipClassDef {},
}));
jest.mock('./entities/spacecraft-torpedo-storage.entity', () => ({
  SpacecraftTorpedoStorage: class SpacecraftTorpedoStorage {},
}));
jest.mock('./entities/cargo-item.entity', () => ({
  CargoItem: class CargoItem {},
}));
jest.mock('../auth/user.entity', () => ({ User: class User {} }));
jest.mock('../colony/entities/colony.entity', () => ({
  Colony: class Colony {},
}));
jest.mock('../starmap/entities/star-system.entity', () => ({
  StarSystem: class StarSystem {},
}));
jest.mock('../starmap/entities/layer.entity', () => ({
  Layer: class Layer {},
}));
jest.mock('../starmap/entities/celestial-object.entity', () => ({
  CelestialObject: class CelestialObject {},
}));
jest.mock('../starmap/entities/galaxy-field.entity', () => ({
  GalaxyField: class GalaxyField {},
}));
jest.mock('../starmap/entities/system-field.entity', () => ({
  SystemField: class SystemField {},
}));
jest.mock('../starmap/generator/planet-generator.service', () => ({
  PlanetGeneratorService: class PlanetGeneratorService {},
}));
jest.mock('../starmap/generator/stu-planet-surface.generator', () => ({
  supportsStuSurface: jest.fn(() => true),
}));

import { BadRequestException } from '@nestjs/common';
jest.mock('../faction/entities/faction.entity', () => ({
  FactionEntity: class FactionEntity {},
}));
jest.mock('../faction/entities/faction-modifier.entity', () => ({
  FactionModifier: class FactionModifier {},
}));

import { SpacecraftService } from './spacecraft.service';
import { SpacecraftStatus } from './entities/spacecraft.entity';

function createService() {
  const shipRepo = {
    findOne: jest.fn(),
    save: jest.fn(async (ship) => ship),
    create: jest.fn((ship) => ship),
  };
  const moduleRepo = {
    count: jest.fn(async () => 0),
    find: jest.fn(async () => []),
  };
  const fleetRepo = { create: jest.fn(), save: jest.fn() };
  const systemRepo = { findOne: jest.fn() };
  const layerRepo = { findOne: jest.fn() };
  const objectRepo = { findOne: jest.fn(), findOneBy: jest.fn() };
  const galaxyFieldRepo = { findOne: jest.fn() };
  const systemFieldRepo = { findOne: jest.fn() };
  const locationRepo = {
    findOne: jest.fn(async ({ where }: any) => ({
      id: 91,
      kind: 'systemFieldId' in where ? 'SYSTEM_FIELD' : 'GALAXY_FIELD',
      systemFieldId: where.systemFieldId ?? null,
      galaxyFieldId: where.galaxyFieldId ?? null,
    })),
  };
  const userRepo = { find: jest.fn() };
  const gameData = { getCombatFormulas: jest.fn() };
  const shipClassService = {
    findById: jest.fn(async () => ({ flightEnergyCost: 1 })),
    findAll: jest.fn(),
  };
  const explorationService = {
    discoverSystem: jest.fn(async () => undefined),
    discoverFieldsAround: jest.fn(async () => undefined),
    discoverArea: jest.fn(async () => undefined),
  };
  const planetGenerator = {};
  const unlockResolver = { isShipClassUnlocked: jest.fn() };
  const statsService = { applyStats: jest.fn() };
  const crewService = { hasEnoughCrew: jest.fn(async () => true) };
  const torpedoService = { getStorage: jest.fn() };
  const resourceFlow = { recharge: jest.fn() };
  const runtimeState = {
    initialize: jest.fn((ship) => {
      ship.runtimeSystems ??= {
        SUBLIGHT_DRIVE: { active: true, cooldown: 0, integrity: 100 },
        WARPDRIVE: { active: true, cooldown: 0, integrity: 100 },
      };
      return ship.runtimeSystems;
    }),
    getSystems: jest.fn((ship) => ship.runtimeSystems ?? {}),
  };
  const gameGateway = { emitToUser: jest.fn() };
  const destructionService = {
    saveUnlessDestroyed: jest.fn(async (ship) => {
      await shipRepo.save(ship);
      return true;
    }),
  };

  const service = new SpacecraftService(
    shipRepo as unknown as ConstructorParameters<typeof SpacecraftService>[0],
    moduleRepo as unknown as ConstructorParameters<typeof SpacecraftService>[1],
    fleetRepo as unknown as ConstructorParameters<typeof SpacecraftService>[2],
    systemRepo as unknown as ConstructorParameters<typeof SpacecraftService>[3],
    layerRepo as unknown as ConstructorParameters<typeof SpacecraftService>[4],
    objectRepo as unknown as ConstructorParameters<typeof SpacecraftService>[5],
    galaxyFieldRepo as unknown as ConstructorParameters<
      typeof SpacecraftService
    >[6],
    systemFieldRepo as unknown as ConstructorParameters<
      typeof SpacecraftService
    >[7],
    userRepo as unknown as ConstructorParameters<typeof SpacecraftService>[8],
    {
      getRepository: jest.fn(() => locationRepo),
    } as unknown as ConstructorParameters<typeof SpacecraftService>[9],
    gameData as unknown as ConstructorParameters<typeof SpacecraftService>[10],
    shipClassService as unknown as ConstructorParameters<
      typeof SpacecraftService
    >[11],
    explorationService as unknown as ConstructorParameters<
      typeof SpacecraftService
    >[12],
    planetGenerator as unknown as ConstructorParameters<
      typeof SpacecraftService
    >[13],
    unlockResolver as unknown as ConstructorParameters<
      typeof SpacecraftService
    >[14],
    statsService as unknown as ConstructorParameters<
      typeof SpacecraftService
    >[15],
    crewService as unknown as ConstructorParameters<
      typeof SpacecraftService
    >[16],
    torpedoService as unknown as ConstructorParameters<
      typeof SpacecraftService
    >[17],
    resourceFlow as unknown as ConstructorParameters<
      typeof SpacecraftService
    >[18],
    runtimeState as unknown as ConstructorParameters<
      typeof SpacecraftService
    >[19],
    gameGateway as unknown as ConstructorParameters<
      typeof SpacecraftService
    >[20],
    {} as ConstructorParameters<typeof SpacecraftService>[21],
    destructionService as unknown as ConstructorParameters<
      typeof SpacecraftService
    >[22],
  );

  return {
    service,
    shipRepo,
    systemRepo,
    objectRepo,
    galaxyFieldRepo,
    systemFieldRepo,
    locationRepo,
    runtimeState,
  };
}

describe('SpacecraftService movement resources', () => {
  const systemLocation = (systemId = 3, x = 1, y = 1) => ({
    locationId: 90,
    location: {
      id: 90,
      kind: 'SYSTEM_FIELD',
      systemField: { id: 30, starSystemId: systemId, sx: x, sy: y },
    },
  });
  const galaxyLocation = (layerId = 1, x = 1, y = 1) => ({
    locationId: 90,
    location: {
      id: 90,
      kind: 'GALAXY_FIELD',
      galaxyField: { id: 30, layerId, cx: x, cy: y },
    },
  });

  it('blocks movement while the ship is in standby', async () => {
    const { service, shipRepo } = createService();
    shipRepo.findOne.mockResolvedValue({
      id: 7,
      userId: 1,
      status: SpacecraftStatus.IDLE,
      operatingMode: 'STANDBY',
      ...systemLocation(),
      modules: [],
    });
    await expect(service.navigate(7, 1, 2, 2)).rejects.toThrow(/Standby/);
  });

  it('uses EPS for in-system navigation and syncs runtime systems', async () => {
    const {
      service,
      shipRepo,
      systemRepo,
      objectRepo,
      systemFieldRepo,
      locationRepo,
      runtimeState,
    } = createService();
    const ship = {
      id: 7,
      userId: 1,
      status: SpacecraftStatus.IDLE,
      ...systemLocation(),
      energy: 20,
      modules: [],
    };
    shipRepo.findOne.mockResolvedValue(ship);
    systemRepo.findOne.mockResolvedValue({ id: 3, maxX: 10, maxY: 10 });
    const targetField = {
      id: 31,
      starSystemId: 3,
      sx: 1,
      sy: 3,
      isPassable: true,
      celestialObjectId: 42,
      celestialObject: { id: 42 },
    };
    systemFieldRepo.findOne.mockResolvedValue(targetField);
    locationRepo.findOne.mockResolvedValue({
      id: 91,
      kind: 'SYSTEM_FIELD',
      systemFieldId: 31,
      systemField: targetField,
    });

    await service.navigate(7, 1, 1, 3);

    expect(systemRepo.findOne).toHaveBeenCalledWith({ where: { id: 3 } });
    expect(ship.energy).toBe(18);
    expect(ship.locationId).toBe(91);
    expect(ship.location).toEqual(expect.objectContaining({ systemField: targetField }));
    expect(runtimeState.initialize).toHaveBeenCalledWith(ship);
  });

  it('writes the canonical system location during navigation', async () => {
    const { service, shipRepo, systemRepo, systemFieldRepo, locationRepo } =
      createService();
    const ship = {
      id: 7,
      userId: 1,
      shipClassId: 42,
      status: SpacecraftStatus.IDLE,
      ...systemLocation(),
      energy: 20,
      modules: [],
    };
    const targetField = {
      id: 31,
      starSystemId: 3,
      sx: 1,
      sy: 3,
      isPassable: true,
      celestialObjectId: null,
    };
    const location = { id: 91, kind: 'SYSTEM_FIELD', systemField: targetField };
    shipRepo.findOne.mockResolvedValue(ship);
    systemRepo.findOne.mockResolvedValue({ id: 3, maxX: 10, maxY: 10 });
    systemFieldRepo.findOne.mockResolvedValue(targetField);
    locationRepo.findOne.mockResolvedValue(location);

    await service.navigate(7, 1, 1, 3);

    expect(locationRepo.findOne).toHaveBeenCalledWith({
      where: { systemFieldId: 31 },
      relations: ['systemField', 'systemField.celestialObject'],
    });
    expect(ship).toEqual(
      expect.objectContaining({
        locationId: 91,
        location,
      }),
    );
  });

  it('uses the STU rump flight cost for every in-system field', async () => {
    const { service, shipRepo, systemRepo, systemFieldRepo } = createService();
    const ship = {
      id: 7,
      userId: 1,
      shipClassId: 42,
      status: SpacecraftStatus.IDLE,
      ...systemLocation(),
      energy: 20,
      modules: [],
    };
    shipRepo.findOne.mockResolvedValue(ship);
    systemRepo.findOne.mockResolvedValue({ id: 3, maxX: 10, maxY: 10 });
    systemFieldRepo.findOne.mockResolvedValue({ isPassable: true });
    (service as any).shipClassService.findById.mockResolvedValue({
      flightEnergyCost: 2,
    });

    await service.navigate(7, 1, 1, 4);

    expect(ship.energy).toBe(14);
  });

  it('rejects in-system navigation when EPS is insufficient', async () => {
    const { service, shipRepo, systemRepo, systemFieldRepo } = createService();
    shipRepo.findOne.mockResolvedValue({
      id: 7,
      userId: 1,
      status: SpacecraftStatus.IDLE,
      ...systemLocation(),
      energy: 0,
      modules: [],
    });
    systemRepo.findOne.mockResolvedValue({ id: 3, maxX: 10, maxY: 10 });
    systemFieldRepo.findOne.mockResolvedValue({ isPassable: true });

    await expect(service.navigate(7, 1, 1, 2)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('uses warpdrive for galaxy flight and warp', async () => {
    const { service, shipRepo, galaxyFieldRepo, systemRepo, runtimeState } =
      createService();
    const ship: {
      id: number;
      userId: number;
      status: SpacecraftStatus;
      inSystem: boolean;
      currentLayerId: number;
      starSystemId?: number;
      currentSystemFieldX?: number;
      currentSystemFieldY?: number;
      warpCooldown?: number;
      posX: number;
      posY: number;
      warpdrive: number;
      runtimeSystems?: {
        WARPDRIVE: { active: boolean; cooldown: number; integrity: number };
      };
      modules: never[];
    } = {
      id: 7,
      userId: 1,
      status: SpacecraftStatus.IDLE,
      ...galaxyLocation(),
      warpdrive: 5,
      runtimeSystems: {
        WARPDRIVE: { active: false, cooldown: 0, integrity: 100 },
      },
      modules: [],
    };
    shipRepo.findOne.mockResolvedValue(ship);
    galaxyFieldRepo.findOne.mockResolvedValue({ isPassable: true });

    await service.flyGalaxy(7, 1, 4, 1);

    expect(ship.warpdrive).toBe(2);
    expect(ship.runtimeSystems?.WARPDRIVE.active).toBe(true);
    expect(runtimeState.initialize).toHaveBeenCalledWith(ship);

    ship.status = SpacecraftStatus.IDLE;
    Object.assign(ship, systemLocation(11));
    ship.warpCooldown = 0;
    systemRepo.findOne
      .mockResolvedValueOnce({ id: 11, cx: 1, cy: 1 })
      .mockResolvedValueOnce({ id: 12, cx: 3, cy: 1 });

    await service.warp(7, 1, 12);

    expect(ship.warpdrive).toBe(0);
    expect(ship.status).toBe(SpacecraftStatus.IN_FLIGHT);
  });

  it('writes canonical origin and target locations for warp', async () => {
    const { service, shipRepo, systemRepo, systemFieldRepo, locationRepo } =
      createService();
    const originLocation = {
      id: 90,
      kind: 'SYSTEM_FIELD',
      systemField: { id: 30, starSystemId: 11, sx: 4, sy: 5 },
    };
    const targetField = {
      id: 31,
      starSystemId: 12,
      sx: 1,
      sy: 1,
      celestialObjectId: null,
    };
    const targetLocation = {
      id: 91,
      kind: 'SYSTEM_FIELD',
      systemField: targetField,
    };
    const ship = {
      id: 7,
      userId: 1,
      status: SpacecraftStatus.IDLE,
      inSystem: true,
      starSystemId: 99,
      currentSystemFieldX: 9,
      currentSystemFieldY: 9,
      locationId: 90,
      location: originLocation,
      warpCooldown: 0,
      warpdrive: 10,
      runtimeSystems: {
        WARPDRIVE: { active: true, cooldown: 0, integrity: 100 },
      },
      modules: [],
    };
    shipRepo.findOne.mockResolvedValue(ship);
    systemRepo.findOne
      .mockResolvedValueOnce({ id: 11, cx: 1, cy: 1 })
      .mockResolvedValueOnce({ id: 12, cx: 3, cy: 1 });
    systemFieldRepo.findOne.mockResolvedValue(targetField);
    locationRepo.findOne.mockResolvedValue(targetLocation);

    await service.warp(7, 1, 12);

    expect(systemRepo.findOne).toHaveBeenNthCalledWith(1, {
      where: { id: 11 },
    });
    expect(ship).toEqual(
      expect.objectContaining({
        originLocationId: 90,
        originLocation,
        targetLocationId: 91,
        targetLocation,
      }),
    );
  });

  it('uses a canonical target location on arrival and clears flight locations', async () => {
    const { service, shipRepo, objectRepo, systemFieldRepo, locationRepo } =
      createService();
    const celestialObject = { id: 42 };
    const canonicalField = {
      id: 31,
      starSystemId: 3,
      sx: 8,
      sy: 12,
      celestialObjectId: 42,
    };
    const targetLocation = {
      id: 91,
      kind: 'SYSTEM_FIELD',
      galaxyFieldId: null,
      galaxyField: null,
      systemFieldId: canonicalField.id,
      systemField: canonicalField,
    };
    const ship = {
      id: 7,
      userId: 1,
      status: SpacecraftStatus.IN_FLIGHT,
      inSystem: true,
      starSystemId: 3,
      currentSystemFieldX: 1,
      currentSystemFieldY: 1,
      celestialObjectId: null,
      celestialObject: null,
      targetX: 2,
      targetY: 2,
      targetSystemId: null,
      targetLocationId: 91,
      targetLocation: null,
      originLocationId: 90,
      originLocation: { id: 90 },
      flightOrigin: { scope: 'SYSTEM', systemId: 3, x: 1, y: 1 },
      arrivalAt: new Date(0),
    };
    locationRepo.findOne.mockResolvedValue(targetLocation);
    objectRepo.findOneBy.mockResolvedValue(celestialObject);

    await service.processMovement(ship as any);

    expect(locationRepo.findOne).toHaveBeenCalledWith({
      where: { id: 91 },
      relations: ['galaxyField', 'systemField', 'systemField.celestialObject'],
    });
    expect(systemFieldRepo.findOne).not.toHaveBeenCalled();
    expect(ship).toEqual(
      expect.objectContaining({
        locationId: 91,
        location: targetLocation,
        targetLocationId: null,
        targetLocation: null,
        originLocationId: null,
        originLocation: null,
      }),
    );
    expect(shipRepo.save).toHaveBeenCalledWith(ship);
  });

  it('uses the canonical target location kind on arrival', async () => {
    const { service, shipRepo, systemRepo, galaxyFieldRepo } = createService();
    const currentLocation = {
      id: 90,
      kind: 'SYSTEM_FIELD',
      systemField: { starSystemId: 3, sx: 1, sy: 1 },
    };
    const targetLocation = {
      id: 91,
      kind: 'GALAXY_FIELD',
      galaxyField: {
        id: 41,
        layerId: 5,
        cx: 12,
        cy: 14,
        starSystemId: null,
      },
    };
    const ship = {
      id: 7,
      userId: 1,
      status: SpacecraftStatus.IN_FLIGHT,
      inSystem: true,
      starSystemId: 3,
      currentSystemFieldX: 1,
      currentSystemFieldY: 1,
      currentLayerId: 2,
      posX: 2,
      posY: 2,
      locationId: 90,
      location: currentLocation,
      targetLocationId: 91,
      targetLocation,
      targetSystemId: 99,
      targetX: 8,
      targetY: 9,
      arrivalAt: new Date(0),
    };

    await service.processMovement(ship as any);

    expect(systemRepo.findOne).not.toHaveBeenCalled();
    expect(galaxyFieldRepo.findOne).not.toHaveBeenCalled();
    expect(ship).toEqual(
      expect.objectContaining({
        locationId: 91,
        location: targetLocation,
        targetLocationId: null,
        targetLocation: null,
      }),
    );
    expect(shipRepo.save).toHaveBeenCalledWith(ship);
  });

  it('activates SUBLIGHT_DRIVE for in-system navigation', async () => {
    const { service, shipRepo, systemRepo, systemFieldRepo, runtimeState } =
      createService();
    const ship = {
      id: 7,
      userId: 1,
      status: SpacecraftStatus.IDLE,
      ...systemLocation(),
      energy: 50,
      runtimeSystems: {
        SUBLIGHT_DRIVE: { active: false, cooldown: 0, integrity: 100 },
      },
      modules: [],
    };
    runtimeState.getSystems.mockReturnValue(ship.runtimeSystems);
    shipRepo.findOne.mockResolvedValue(ship);
    systemRepo.findOne.mockResolvedValue({ id: 3, maxX: 10, maxY: 10 });
    systemFieldRepo.findOne.mockResolvedValue({ isPassable: true });

    await service.navigate(7, 1, 1, 3);

    expect(ship.runtimeSystems.SUBLIGHT_DRIVE.active).toBe(true);
  });

  it('blocks warp when WARPDRIVE system is offline', async () => {
    const { service, shipRepo, systemRepo, runtimeState } = createService();
    runtimeState.getSystems.mockReturnValue({
      WARPDRIVE: { active: false, cooldown: 0, integrity: 100 },
    });
    shipRepo.findOne.mockResolvedValue({
      id: 7,
      userId: 1,
      status: SpacecraftStatus.IDLE,
      ...systemLocation(11),
      warpCooldown: 0,
      modules: [],
      warpdrive: 10,
    });
    systemRepo.findOne
      .mockResolvedValueOnce({ id: 11, cx: 1, cy: 1 })
      .mockResolvedValueOnce({ id: 12, cx: 3, cy: 1 });

    await expect(service.warp(7, 1, 12)).rejects.toThrow(
      'Hyperantrieb offline',
    );
  });

  it('blocks galaxy flight when no hyperdrive is installed', async () => {
    const { service, shipRepo, runtimeState } = createService();
    const ship = {
      id: 7,
      userId: 1,
      status: SpacecraftStatus.IDLE,
      ...galaxyLocation(),
      warpdrive: 10,
      runtimeSystems: {},
      modules: [],
    };
    runtimeState.initialize.mockReturnValue(ship.runtimeSystems);
    runtimeState.getSystems.mockReturnValue(ship.runtimeSystems);
    shipRepo.findOne.mockResolvedValue(ship);
    await expect(service.flyGalaxy(7, 1, 4, 1)).rejects.toThrow(
      'Kein Hyperantrieb installiert',
    );
  });

  it('blocks in-system navigation when no impulse drive is installed', async () => {
    const { service, shipRepo, runtimeState } = createService();
    const ship = {
      id: 7,
      userId: 1,
      status: SpacecraftStatus.IDLE,
      ...systemLocation(),
      energy: 20,
      runtimeSystems: {},
      modules: [],
    };
    runtimeState.initialize.mockReturnValue(ship.runtimeSystems);
    runtimeState.getSystems.mockReturnValue(ship.runtimeSystems);
    shipRepo.findOne.mockResolvedValue(ship);

    await expect(service.navigate(7, 1, 1, 2)).rejects.toThrow(
      'Kein Impulsantrieb installiert',
    );
  });

  it('blocks leaving a system when no hyperdrive is installed', async () => {
    const { service, shipRepo, runtimeState } = createService();
    const ship = {
      id: 7,
      userId: 1,
      status: SpacecraftStatus.IDLE,
      ...systemLocation(3, 5, 5),
      runtimeSystems: {},
      modules: [],
    };
    runtimeState.initialize.mockReturnValue(ship.runtimeSystems);
    runtimeState.getSystems.mockReturnValue(ship.runtimeSystems);
    shipRepo.findOne.mockResolvedValue(ship);

    await expect(service.leaveSystem(7, 1)).rejects.toThrow(
      'Kein Hyperantrieb installiert',
    );
  });
});
