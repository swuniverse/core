jest.mock('./entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  SpacecraftStatus: {
    DOCKED: 'DOCKED',
    IN_FLIGHT: 'IN_FLIGHT',
    IN_COMBAT: 'IN_COMBAT',
    DESTROYED: 'DESTROYED',
  },
  AlertState: { GREEN: 'GREEN', YELLOW: 'YELLOW', RED: 'RED' },
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
jest.mock('./entities/cargo-item.entity', () => ({ CargoItem: class CargoItem {} }));
jest.mock('../auth/user.entity', () => ({ User: class User {} }));
jest.mock('../colony/entities/colony.entity', () => ({ Colony: class Colony {} }));
jest.mock('../starmap/entities/star-system.entity', () => ({
  StarSystem: class StarSystem {},
}));
jest.mock('../starmap/entities/layer.entity', () => ({ Layer: class Layer {} }));
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
  const objectRepo = { findOne: jest.fn() };
  const galaxyFieldRepo = { findOne: jest.fn() };
  const systemFieldRepo = { findOne: jest.fn() };
  const userRepo = { find: jest.fn() };
  const colonyRepo = { findOne: jest.fn() };
  const gameData = { getCombatFormulas: jest.fn() };
  const shipClassService = { findById: jest.fn(async () => null), findAll: jest.fn() };
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
    initialize: jest.fn(),
    getSystems: jest.fn(() => ({})),
  };
  const gameGateway = { emitToUser: jest.fn() };

  const service = new SpacecraftService(
    shipRepo as unknown as ConstructorParameters<typeof SpacecraftService>[0],
    moduleRepo as unknown as ConstructorParameters<typeof SpacecraftService>[1],
    fleetRepo as unknown as ConstructorParameters<typeof SpacecraftService>[2],
    systemRepo as unknown as ConstructorParameters<typeof SpacecraftService>[3],
    layerRepo as unknown as ConstructorParameters<typeof SpacecraftService>[4],
    objectRepo as unknown as ConstructorParameters<typeof SpacecraftService>[5],
    galaxyFieldRepo as unknown as ConstructorParameters<typeof SpacecraftService>[6],
    systemFieldRepo as unknown as ConstructorParameters<typeof SpacecraftService>[7],
    userRepo as unknown as ConstructorParameters<typeof SpacecraftService>[8],
    colonyRepo as unknown as ConstructorParameters<typeof SpacecraftService>[9],
    gameData as unknown as ConstructorParameters<typeof SpacecraftService>[10],
    shipClassService as unknown as ConstructorParameters<typeof SpacecraftService>[11],
    explorationService as unknown as ConstructorParameters<typeof SpacecraftService>[12],
    planetGenerator as unknown as ConstructorParameters<typeof SpacecraftService>[13],
    unlockResolver as unknown as ConstructorParameters<typeof SpacecraftService>[14],
    statsService as unknown as ConstructorParameters<typeof SpacecraftService>[15],
    crewService as unknown as ConstructorParameters<typeof SpacecraftService>[16],
    torpedoService as unknown as ConstructorParameters<typeof SpacecraftService>[17],
    resourceFlow as unknown as ConstructorParameters<typeof SpacecraftService>[18],
    runtimeState as unknown as ConstructorParameters<typeof SpacecraftService>[19],
    gameGateway as unknown as ConstructorParameters<typeof SpacecraftService>[20],
  );

  return {
    service,
    shipRepo,
    systemRepo,
    galaxyFieldRepo,
    systemFieldRepo,
    runtimeState,
  };
}

describe('SpacecraftService movement resources', () => {
  it('uses EPS for in-system navigation and syncs runtime systems', async () => {
    const { service, shipRepo, systemRepo, systemFieldRepo, runtimeState } =
      createService();
    const ship = {
      id: 7,
      userId: 1,
      status: SpacecraftStatus.DOCKED,
      inSystem: true,
      starSystemId: 3,
      currentSystemFieldX: 1,
      currentSystemFieldY: 1,
      energy: 20,
      modules: [],
    };
    shipRepo.findOne.mockResolvedValue(ship);
    systemRepo.findOne.mockResolvedValue({ id: 3, maxX: 10, maxY: 10 });
    systemFieldRepo.findOne.mockResolvedValue({ isPassable: true });

    await service.navigate(7, 1, 1, 3);

    expect(ship.energy).toBe(10);
    expect(runtimeState.initialize).toHaveBeenCalledWith(ship);
  });

  it('rejects in-system navigation when EPS is insufficient', async () => {
    const { service, shipRepo, systemRepo, systemFieldRepo } = createService();
    shipRepo.findOne.mockResolvedValue({
      id: 7,
      userId: 1,
      status: SpacecraftStatus.DOCKED,
      inSystem: true,
      starSystemId: 3,
      currentSystemFieldX: 1,
      currentSystemFieldY: 1,
      energy: 4,
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
      warpCooldown?: number;
      posX: number;
      posY: number;
      warpdrive: number;
      modules: never[];
    } = {
      id: 7,
      userId: 1,
      status: SpacecraftStatus.DOCKED,
      inSystem: false,
      currentLayerId: 1,
      posX: 1,
      posY: 1,
      warpdrive: 5,
      modules: [],
    };
    shipRepo.findOne.mockResolvedValue(ship);
    galaxyFieldRepo.findOne.mockResolvedValue({ isPassable: true });

    await service.flyGalaxy(7, 1, 4, 1);

    expect(ship.warpdrive).toBe(2);
    expect(runtimeState.initialize).toHaveBeenCalledWith(ship);

    ship.status = SpacecraftStatus.DOCKED;
    ship.inSystem = true;
    ship.starSystemId = 11;
    ship.warpCooldown = 0;
    systemRepo.findOne
      .mockResolvedValueOnce({ id: 11, cx: 1, cy: 1 })
      .mockResolvedValueOnce({ id: 12, cx: 3, cy: 1 });

    await service.warp(7, 1, 12);

    expect(ship.warpdrive).toBe(0);
    expect(ship.status).toBe(SpacecraftStatus.IN_FLIGHT);
  });

  it('blocks in-system navigation when SUBLIGHT_DRIVE is offline', async () => {
    const { service, shipRepo, systemRepo, systemFieldRepo, runtimeState } =
      createService();
    runtimeState.getSystems.mockReturnValue({
      SUBLIGHT_DRIVE: { active: false, cooldown: 0, integrity: 100 },
    });
    shipRepo.findOne.mockResolvedValue({
      id: 7,
      userId: 1,
      status: SpacecraftStatus.DOCKED,
      inSystem: true,
      starSystemId: 3,
      currentSystemFieldX: 1,
      currentSystemFieldY: 1,
      energy: 50,
      modules: [],
    });
    systemRepo.findOne.mockResolvedValue({ id: 3, maxX: 10, maxY: 10 });
    systemFieldRepo.findOne.mockResolvedValue({ isPassable: true });

    await expect(service.navigate(7, 1, 1, 3)).rejects.toThrow('Sublight drive offline');
  });

  it('blocks warp when WARPDRIVE system is offline', async () => {
    const { service, shipRepo, systemRepo, runtimeState } = createService();
    runtimeState.getSystems.mockReturnValue({
      WARPDRIVE: { active: false, cooldown: 0, integrity: 100 },
    });
    shipRepo.findOne.mockResolvedValue({
      id: 7,
      userId: 1,
      status: SpacecraftStatus.DOCKED,
      inSystem: true,
      starSystemId: 11,
      warpCooldown: 0,
      modules: [],
      warpdrive: 10,
    });
    systemRepo.findOne
      .mockResolvedValueOnce({ id: 11, cx: 1, cy: 1 })
      .mockResolvedValueOnce({ id: 12, cx: 3, cy: 1 });

    await expect(service.warp(7, 1, 12)).rejects.toThrow('Warp drive offline');
  });

  it('blocks galaxy flight when COMPUTER is offline', async () => {
    const { service, shipRepo, galaxyFieldRepo, runtimeState } = createService();
    runtimeState.getSystems.mockReturnValue({
      COMPUTER: { active: false, cooldown: 0, integrity: 100 },
    });
    shipRepo.findOne.mockResolvedValue({
      id: 7,
      userId: 1,
      status: SpacecraftStatus.DOCKED,
      inSystem: false,
      currentLayerId: 1,
      posX: 1,
      posY: 1,
      warpdrive: 10,
      modules: [],
    });
    galaxyFieldRepo.findOne.mockResolvedValue({ isPassable: true });

    await expect(service.flyGalaxy(7, 1, 4, 1)).rejects.toThrow('Navigation computer offline');
  });
});
