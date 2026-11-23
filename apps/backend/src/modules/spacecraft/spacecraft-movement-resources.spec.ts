jest.mock('./entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  SpacecraftStatus: {
    IDLE: 'IDLE',
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
import { Spacecraft, SpacecraftStatus } from './entities/spacecraft.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import { Fleet } from './entities/fleet.entity';
import type { EntityManager } from 'typeorm';
import { FieldTransitionExecutor } from './field-transition-executor';

function createService() {
  const persisted = new Map<number, Spacecraft>();
  const shipRepo = {
    findOne: jest.fn(),
    findOneBy: jest.fn<Promise<{ id: number } | null>, [unknown]>(
      async () => null,
    ),
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
  const locationRepo: { findOne: jest.Mock } = {
    findOne: jest.fn(async ({ where }: { where: Record<string, number> }) => ({
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
  const cartographyPlanService = {
    resetFinishingForSpacecraft: jest.fn(async () => undefined),
  };
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
  const statistics = { countEvent: jest.fn(async () => undefined) };
  const flightConsequencePipeline = { onEnterField: jest.fn(async () => []) };
  const flightSignatureService = {
    createMovement: jest.fn(async () => undefined),
  };
  const layerKnowledgeService = {
    markKnown: jest.fn(async () => undefined),
  };
  const manager = {
    queryRunner: { isTransactionActive: true },
    findOneBy: jest.fn(
      async (_entity: unknown, where: { id: number }) =>
        persisted.get(where.id) ?? null,
    ),
    findOne: jest.fn(
      async (entity: unknown, options: { where: { id: number } }) =>
        entity === Fleet ? null : (persisted.get(options.where.id) ?? null),
    ),
    find: jest.fn(async () => [...persisted.values()]),
    findBy: jest.fn(async () => []),
    count: jest.fn(async () => 100),
    save: jest.fn(async (ship: Spacecraft) => {
      persisted.set(ship.id, structuredClone(ship));
      return shipRepo.save(ship);
    }),
    createQueryBuilder: jest.fn((entity: unknown) => {
      if (entity === SpacecraftModule) {
        let spacecraftId = 0;
        const builder: Record<string, jest.Mock> = {
          where: jest.fn((where: { spacecraftId: number }) => {
            spacecraftId = where.spacecraftId;
            return builder;
          }),
          orderBy: jest.fn(() => builder),
          setLock: jest.fn(() => builder),
          setOnLocked: jest.fn(() => builder),
          getMany: jest.fn(
            async () => persisted.get(spacecraftId)?.modules ?? [],
          ),
        };
        return builder;
      }
      let ids: number[] = [];
      const builder: Record<string, jest.Mock> = {
        where: jest.fn((where: { id: { value: number[] } }) => {
          ids = where.id.value;
          return builder;
        }),
        orderBy: jest.fn(() => builder),
        setLock: jest.fn(() => builder),
        setOnLocked: jest.fn(() => builder),
        getMany: jest.fn(async () =>
          ids.map((id) => persisted.get(id)).filter(Boolean),
        ),
      };
      return builder;
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
      transaction: jest.fn(
        async (
          _isolation: string,
          callback: (manager: EntityManager) => Promise<void>,
        ) => callback(manager as unknown as EntityManager),
      ),
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
    {} as ConstructorParameters<typeof SpacecraftService>[23],
    {} as ConstructorParameters<typeof SpacecraftService>[24],
    {} as ConstructorParameters<typeof SpacecraftService>[25],
    cartographyPlanService as unknown as ConstructorParameters<
      typeof SpacecraftService
    >[26],
    {} as ConstructorParameters<typeof SpacecraftService>[27],
    {} as ConstructorParameters<typeof SpacecraftService>[28],
    statistics as unknown as ConstructorParameters<
      typeof SpacecraftService
    >[29],
    undefined,
    undefined,
    flightSignatureService as unknown as ConstructorParameters<
      typeof SpacecraftService
    >[32],
    undefined,
    flightConsequencePipeline as unknown as ConstructorParameters<
      typeof SpacecraftService
    >[34],
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    new FieldTransitionExecutor(),
    layerKnowledgeService as unknown as ConstructorParameters<
      typeof SpacecraftService
    >[42],
  );

  // findOne and the towed-ship load both go through loadShip.
  type Loader = { loadShip(where: { id: number; userId?: number }): Promise<Spacecraft> };
  const loader = service as unknown as Loader;
  const loadShip = loader.loadShip.bind(service);
  jest.spyOn(loader, 'loadShip').mockImplementation(async (where) => {
    const ship = await loadShip(where);
    persisted.set(where.id, structuredClone(ship));
    return ship;
  });

  return {
    service,
    shipRepo,
    systemRepo,
    objectRepo,
    galaxyFieldRepo,
    systemFieldRepo,
    locationRepo,
    runtimeState,
    explorationService,
    statistics,
    flightConsequencePipeline,
    flightSignatureService,
    layerKnowledgeService,
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

  it('marks an arrived galaxy layer known once for every owned fleet ship', async () => {
    const { service, shipRepo, galaxyFieldRepo, layerKnowledgeService } =
      createService();
    const ship = {
      id: 7,
      userId: 1,
      shipClassId: 42,
      kind: 'SHIP',
      status: SpacecraftStatus.IDLE,
      ...galaxyLocation(3),
      energy: 20,
      modules: [],
      fleetId: null,
    };
    shipRepo.findOne.mockResolvedValue(ship);
    galaxyFieldRepo.findOne.mockImplementation(
      async ({ where }: { where: { cx: number; cy: number } }) => ({
        id: where.cx === 2 ? 31 : 30,
        layerId: 3,
        cx: where.cx,
        cy: where.cy,
        isPassable: true,
      }),
    );

    await service.flyGalaxy(7, 1, 2, 1);
    ship.location = galaxyLocation(3, 2, 1).location;
    await service.flyGalaxy(7, 1, 1, 1);

    expect(layerKnowledgeService.markKnown).toHaveBeenCalledTimes(2);
    expect(layerKnowledgeService.markKnown).toHaveBeenNthCalledWith(1, 1, 3);
    expect(layerKnowledgeService.markKnown).toHaveBeenNthCalledWith(2, 1, 3);
  });

  it('does not mark a layer known when galaxy movement fails', async () => {
    const { service, shipRepo, galaxyFieldRepo, layerKnowledgeService } =
      createService();
    shipRepo.findOne.mockResolvedValue({
      id: 7,
      userId: 1,
      shipClassId: 42,
      kind: 'SHIP',
      status: SpacecraftStatus.IDLE,
      ...galaxyLocation(3),
      energy: 20,
      modules: [],
      fleetId: null,
    });
    galaxyFieldRepo.findOne.mockResolvedValue({ isPassable: false });

    await expect(service.flyGalaxy(7, 1, 2, 1)).rejects.toThrow(
      'Next field is not passable',
    );

    expect(layerKnowledgeService.markKnown).not.toHaveBeenCalled();
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

  it('blocks movement while the ship is held by a tractor beam', async () => {
    const { service, shipRepo } = createService();
    const ship = {
      id: 7,
      userId: 1,
      status: SpacecraftStatus.IDLE,
      ...systemLocation(),
      modules: [],
    };
    shipRepo.findOne.mockResolvedValue(ship);
    shipRepo.findOne.mockResolvedValue(ship);
    shipRepo.findOneBy.mockResolvedValue({ id: 8 });

    await expect(service.navigate(7, 1, 1, 2)).rejects.toThrow('Traktorstrahl');
  });

  it('moves a tractored ship and charges its flight EPS cost', async () => {
    const { service, shipRepo, systemRepo, systemFieldRepo, locationRepo } =
      createService();
    const ship = {
      id: 7,
      userId: 1,
      name: 'Falcon',
      shipClassId: 1,
      status: SpacecraftStatus.IDLE,
      energy: 10,
      tractoredShipId: 8,
      ...systemLocation(),
      modules: [],
    };
    const target = {
      id: 8,
      userId: 1,
      name: 'Ghost',
      shipClassId: 2,
      status: SpacecraftStatus.IDLE,
      ...systemLocation(),
      modules: [],
    };
    shipRepo.findOne.mockImplementation(async ({ where }) => {
      if ('tractoredShipId' in where) return null;
      return where.id === target.id ? target : ship;
    });
    systemRepo.findOne.mockResolvedValue({ maxX: 10, maxY: 10 });
    systemFieldRepo.findOne.mockResolvedValue({ id: 31, isPassable: true });
    locationRepo.findOne.mockResolvedValue({
      id: 91,
      kind: 'SYSTEM_FIELD',
      systemFieldId: 31,
    });

    await service.navigate(ship.id, ship.userId, 2, 1);

    expect(ship.energy).toBe(8);
    expect(target.locationId).toBe(91);
    expect(shipRepo.save).toHaveBeenCalledWith(target);
  });

  it('releases the tractor beam when towing EPS are insufficient', async () => {
    const { service, shipRepo, systemRepo, systemFieldRepo, locationRepo } =
      createService();
    const ship = {
      id: 7,
      userId: 1,
      name: 'Falcon',
      shipClassId: 1,
      status: SpacecraftStatus.IDLE,
      energy: 1,
      tractoredShipId: 8,
      ...systemLocation(),
      modules: [],
      runtimeSystems: {
        SUBLIGHT_DRIVE: { active: true, cooldown: 0, integrity: 100 },
        TRACTOR_BEAM: { active: true, cooldown: 0, integrity: 100 },
      },
    };
    const target = {
      id: 8,
      userId: 1,
      name: 'Ghost',
      shipClassId: 2,
      status: SpacecraftStatus.IDLE,
      ...systemLocation(),
      modules: [],
    };
    shipRepo.findOne.mockImplementation(async ({ where }) => {
      if ('tractoredShipId' in where) return null;
      return where.id === target.id ? target : ship;
    });
    systemRepo.findOne.mockResolvedValue({ maxX: 10, maxY: 10 });
    systemFieldRepo.findOne.mockResolvedValue({ id: 31, isPassable: true });
    locationRepo.findOne.mockResolvedValue({
      id: 91,
      kind: 'SYSTEM_FIELD',
      systemFieldId: 31,
    });

    await service.navigate(ship.id, ship.userId, 2, 1);

    expect(ship.tractoredShipId).toBeNull();
    expect(ship.runtimeSystems.TRACTOR_BEAM.active).toBe(false);
    expect(target.locationId).toBe(90);
    expect(ship.locationId).toBe(91);
  });

  it('uses EPS for in-system navigation and syncs runtime systems', async () => {
    const {
      service,
      shipRepo,
      systemRepo,
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
    expect(ship.location).toEqual(
      expect.objectContaining({ systemField: targetField }),
    );
    expect(runtimeState.initialize).toHaveBeenCalledWith(ship);
  });

  it('undocks a docked ship for 1 EPS when the flight starts', async () => {
    const { service, shipRepo, systemRepo, systemFieldRepo } = createService();
    const ship = {
      id: 7,
      userId: 1,
      shipClassId: 42,
      status: SpacecraftStatus.IDLE,
      ...systemLocation(),
      energy: 20,
      dockedAtId: 100,
      modules: [],
    };
    const targetField = {
      id: 31,
      starSystemId: 3,
      sx: 1,
      sy: 3,
      isPassable: true,
    };
    shipRepo.findOne.mockResolvedValue(ship);
    systemRepo.findOne.mockResolvedValue({ id: 3, maxX: 10, maxY: 10 });
    systemFieldRepo.findOne.mockResolvedValue(targetField);

    await service.navigate(7, 1, 1, 3);

    expect(ship.dockedAtId).toBeNull();
    expect(ship.energy).toBe(17);
  });

  it('does not start the flight of a docked ship without the undocking EPS', async () => {
    const { service, shipRepo, systemRepo, systemFieldRepo } = createService();
    const ship = {
      id: 7,
      userId: 1,
      shipClassId: 42,
      status: SpacecraftStatus.IDLE,
      ...systemLocation(),
      energy: 0,
      dockedAtId: 100,
      modules: [],
    };
    shipRepo.findOne.mockResolvedValue(ship);
    systemRepo.findOne.mockResolvedValue({ id: 3, maxX: 10, maxY: 10 });
    systemFieldRepo.findOne.mockResolvedValue({
      id: 31,
      starSystemId: 3,
      sx: 1,
      sy: 3,
      isPassable: true,
    });

    await expect(service.navigate(7, 1, 1, 3)).rejects.toThrow('abgedockt');
    expect(shipRepo.save).not.toHaveBeenCalled();
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

  it('counts the flown fields of successful navigation and galaxy flight', async () => {
    const {
      service,
      shipRepo,
      systemRepo,
      systemFieldRepo,
      galaxyFieldRepo,
      statistics,
    } = createService();
    const ship = {
      id: 7,
      userId: 1,
      status: SpacecraftStatus.IDLE,
      ...systemLocation(),
      energy: 20,
      warpdrive: 10,
      modules: [],
    };
    shipRepo.findOne.mockResolvedValue(ship);
    systemRepo.findOne.mockResolvedValue({ id: 3, maxX: 10, maxY: 10 });
    systemFieldRepo.findOne.mockResolvedValue({ isPassable: true });

    await service.navigate(7, 1, 1, 4);

    expect(statistics.countEvent).toHaveBeenCalledTimes(3);
    expect(statistics.countEvent).toHaveBeenLastCalledWith('flown-fields');

    ship.status = SpacecraftStatus.IDLE;
    Object.assign(ship, galaxyLocation());
    galaxyFieldRepo.findOne.mockResolvedValue({ isPassable: true });

    await service.flyGalaxy(7, 1, 3, 1);

    expect(statistics.countEvent).toHaveBeenCalledTimes(5);
    expect(statistics.countEvent).toHaveBeenLastCalledWith('flown-fields');
  });

  it('does not count fields of a failed movement', async () => {
    const { service, shipRepo, systemRepo, systemFieldRepo, statistics } =
      createService();
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

    await expect(service.navigate(7, 1, 1, 4)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(statistics.countEvent).not.toHaveBeenCalled();
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

  it('tows a tractored ship on galaxy flight and charges its flight EPS cost', async () => {
    const { service, shipRepo, galaxyFieldRepo, locationRepo } = createService();
    const ship = {
      id: 7,
      userId: 1,
      name: 'Hammer 2',
      shipClassId: 1,
      status: SpacecraftStatus.IDLE,
      energy: 10,
      tractoredShipId: 8,
      ...galaxyLocation(),
      runtimeSystems: {
        WARPDRIVE: { active: true, cooldown: 0, integrity: 100 },
      },
      modules: [],
    };
    const target = {
      id: 8,
      userId: 1,
      name: 'Hammer 1',
      shipClassId: 2,
      status: SpacecraftStatus.IDLE,
      ...galaxyLocation(),
      modules: [],
    };
    shipRepo.findOne.mockImplementation(async ({ where }) => {
      if ('tractoredShipId' in where) return null;
      return where.id === target.id ? target : ship;
    });
    galaxyFieldRepo.findOne.mockResolvedValue({ id: 41, isPassable: true });
    locationRepo.findOne.mockResolvedValue({
      id: 92,
      kind: 'GALAXY_FIELD',
      galaxyFieldId: 41,
    });

    await service.flyGalaxy(ship.id, ship.userId, 2, 1);

    expect(ship.energy).toBe(8);
    expect(target.locationId).toBe(92);
    expect(shipRepo.save).toHaveBeenCalledWith(target);
  });

  describe('towing on other flight routes', () => {
    const towed = <L extends { locationId: number }>(userId: number, location: L) => ({
      id: 8,
      userId,
      name: 'Hammer 1',
      shipClassId: 2,
      status: SpacecraftStatus.IDLE,
      ...location,
      modules: [],
    });
    const lookup =
      (ship: { id: number }, target: { id: number }) =>
      async ({ where }: { where: Record<string, unknown> }) => {
        if ('tractoredShipId' in where) return null;
        if (where.id === target.id) return target;
        return where.id === ship.id && (where.userId === undefined || where.userId === 1) ? ship : null;
      };

    it('tows a foreign ship on galaxy flight', async () => {
      const { service, shipRepo, galaxyFieldRepo } = createService();
      const ship = {
        id: 7,
        userId: 1,
        shipClassId: 1,
        status: SpacecraftStatus.IDLE,
        energy: 10,
        tractoredShipId: 8,
        ...galaxyLocation(),
        runtimeSystems: { WARPDRIVE: { active: true, cooldown: 0, integrity: 100 } },
        modules: [],
      };
      const target = towed(2, galaxyLocation());
      shipRepo.findOne.mockImplementation(lookup(ship, target));
      galaxyFieldRepo.findOne.mockResolvedValue({ id: 41, isPassable: true });

      await service.flyGalaxy(ship.id, ship.userId, 2, 1);

      expect(target.locationId).toBe(91);
      expect(shipRepo.save).toHaveBeenCalledWith(target);
    });

    it('tows the held ship into a star system', async () => {
      const { service, shipRepo, galaxyFieldRepo, systemRepo, systemFieldRepo } =
        createService();
      const ship = {
        id: 7,
        userId: 1,
        shipClassId: 1,
        status: SpacecraftStatus.IDLE,
        energy: 10,
        tractoredShipId: 8,
        lastGalaxyFlightDirection: 'TOP',
        ...galaxyLocation(),
        modules: [],
      };
      const target = towed(1, galaxyLocation());
      shipRepo.findOne.mockImplementation(lookup(ship, target));
      galaxyFieldRepo.findOne.mockResolvedValue({ id: 30, starSystemId: 3 });
      systemRepo.findOne.mockResolvedValue({ id: 3, maxX: 10, maxY: 10 });
      (systemFieldRepo as unknown as { find: jest.Mock }).find = jest.fn(async () => [
        { id: 31, sx: 5, sy: 10, isPassable: true },
      ]);

      await service.enterSystem(ship.id, ship.userId);

      expect(target.locationId).toBe(91);
      expect(shipRepo.save).toHaveBeenCalledWith(target);
    });

    it('tows the held ship out of a star system', async () => {
      const { service, shipRepo, galaxyFieldRepo, systemRepo, runtimeState } =
        createService();
      const ship = {
        id: 7,
        userId: 1,
        shipClassId: 1,
        status: SpacecraftStatus.IDLE,
        energy: 10,
        tractoredShipId: 8,
        ...systemLocation(3, 5, 5),
        runtimeSystems: { WARPDRIVE: { active: false, cooldown: 0, integrity: 100 } },
        modules: [],
      };
      const target = towed(1, systemLocation(3, 5, 5));
      runtimeState.initialize.mockImplementation(
        (value: { runtimeSystems?: object }) => value.runtimeSystems ?? {},
      );
      shipRepo.findOne.mockImplementation(lookup(ship, target));
      systemRepo.findOne.mockResolvedValue({ id: 3, layerId: 1, cx: 4, cy: 4 });
      galaxyFieldRepo.findOne.mockResolvedValue({ id: 41, isPassable: true });

      await service.leaveSystem(ship.id, ship.userId);

      expect(target.locationId).toBe(91);
      expect(shipRepo.save).toHaveBeenCalledWith(target);
    });
  });

  it('pays galaxy flight with EPS and keeps the warpdrive charge', async () => {
    const { service, shipRepo, galaxyFieldRepo, runtimeState } =
      createService();
    const ship = {
      id: 7,
      userId: 1,
      status: SpacecraftStatus.IDLE,
      ...galaxyLocation(),
      energy: 10,
      warpdrive: 5,
      runtimeSystems: {
        WARPDRIVE: { active: false, cooldown: 0, integrity: 100 },
      },
      modules: [],
    };
    shipRepo.findOne.mockResolvedValue(ship);
    galaxyFieldRepo.findOne.mockResolvedValue({ isPassable: true });

    await service.flyGalaxy(7, 1, 4, 1);

    expect(ship.warpdrive).toBe(5);
    expect(ship.energy).toBe(7);
    expect(ship.runtimeSystems?.WARPDRIVE.active).toBe(true);
    expect(runtimeState.initialize).toHaveBeenCalledWith(ship);
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
