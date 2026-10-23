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

jest.mock('../faction/entities/faction.entity', () => ({
  FactionEntity: class FactionEntity {},
}));
jest.mock('../faction/entities/faction-modifier.entity', () => ({
  FactionModifier: class FactionModifier {},
}));

import { SpacecraftService } from './spacecraft.service';
import { AlertState, SpacecraftStatus } from './entities/spacecraft.entity';

function createService() {
  const shipRepo = {
    findOne: jest.fn(),
    save: jest.fn(async (ship) => ship),
    create: jest.fn((ship) => ship),
    find: jest.fn(),
  };
  const moduleRepo = {
    count: jest.fn(async () => 0),
    find: jest.fn(async () => []),
  };
  const fleetRepo = {
    create: jest.fn((fleet) => fleet),
    save: jest.fn(async (fleet) => ({ id: 7, ...fleet })),
    findOne: jest.fn(),
    remove: jest.fn(),
  };
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
    explorationService,
    statistics,
    fleetRepo,
  };
}

const location: Record<string, unknown> = { id: 10 };
const ship = (overrides: Record<string, unknown> = {}): any => ({
  id: 2,
  userId: 5,
  name: 'Falke',
  status: SpacecraftStatus.IDLE,
  fleetId: null,
  locationId: 10,
  location,
  modules: [],
  ...overrides,
});

describe('SpacecraftService fleet management', () => {
  it('creates and normalizes a fleet name', async () => {
    const { service, shipRepo, fleetRepo } = createService();
    shipRepo.findOne.mockResolvedValue(ship());

    await service.createFleet(5, '  Aurek  ', 2);

    expect(fleetRepo.save).toHaveBeenCalledWith({
      name: 'Aurek',
      userId: 5,
      leaderId: 2,
    });
    expect(shipRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ fleetId: 7 }),
    );
  });

  it('moves all capable local members when the fleet leader flies', async () => {
    const { service, shipRepo, fleetRepo, systemRepo, systemFieldRepo } =
      createService();
    const leader = ship({
      id: 2,
      fleetId: 7,
      energy: 10,
      runtimeSystems: {
        SUBLIGHT_DRIVE: { active: true, cooldown: 0, integrity: 100 },
      },
    });
    const wingOne = ship({
      id: 3,
      name: 'Möwe',
      fleetId: 7,
      energy: 10,
      runtimeSystems: {
        SUBLIGHT_DRIVE: { active: true, cooldown: 0, integrity: 100 },
      },
    });
    const wingTwo = ship({
      id: 4,
      name: 'Rabe',
      fleetId: 7,
      energy: 10,
      runtimeSystems: {
        SUBLIGHT_DRIVE: { active: true, cooldown: 0, integrity: 100 },
      },
    });
    shipRepo.findOne.mockResolvedValue(leader);
    shipRepo.find.mockResolvedValue([leader, wingOne, wingTwo]);
    fleetRepo.findOne.mockResolvedValue({
      id: 7,
      userId: 5,
      leaderId: 2,
      isFixed: false,
    });
    systemRepo.findOne.mockResolvedValue({ id: 9, maxX: 20, maxY: 20 });
    systemFieldRepo.findOne.mockResolvedValue({
      id: 99,
      starSystemId: 9,
      sx: 11,
      sy: 10,
      isPassable: true,
    });
    leader.location = {
      id: 10,
      kind: 'SYSTEM_FIELD',
      systemField: { id: 98, starSystemId: 9, sx: 10, sy: 10 },
    };
    wingOne.location = leader.location;
    wingTwo.location = leader.location;

    await service.navigate(2, 5, 11, 10);

    expect(shipRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 3, energy: 9 }),
    );
    expect(shipRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 4, energy: 9 }),
    );
  });

  it('detaches an incapable member but blocks a fixed fleet', async () => {
    const { service, shipRepo, fleetRepo, systemRepo, systemFieldRepo } =
      createService();
    const leader = ship({
      id: 2,
      fleetId: 7,
      energy: 10,
      runtimeSystems: {
        SUBLIGHT_DRIVE: { active: true, cooldown: 0, integrity: 100 },
      },
    });
    const stranded = ship({
      id: 3,
      name: 'Möwe',
      fleetId: 7,
      energy: 0,
      runtimeSystems: {
        SUBLIGHT_DRIVE: { active: true, cooldown: 0, integrity: 100 },
      },
    });
    leader.location = {
      id: 10,
      kind: 'SYSTEM_FIELD',
      systemField: { id: 98, starSystemId: 9, sx: 10, sy: 10 },
    };
    stranded.location = leader.location;
    shipRepo.findOne.mockResolvedValue(leader);
    shipRepo.find.mockResolvedValue([leader, stranded]);
    const fleet = { id: 7, userId: 5, leaderId: 2, isFixed: false };
    fleetRepo.findOne.mockResolvedValue(fleet);
    systemRepo.findOne.mockResolvedValue({ id: 9, maxX: 20, maxY: 20 });
    systemFieldRepo.findOne.mockResolvedValue({
      id: 99,
      starSystemId: 9,
      sx: 11,
      sy: 10,
      isPassable: true,
    });

    await service.navigate(2, 5, 11, 10);
    expect(stranded.fleetId).toBeNull();

    leader.location = {
      id: 10,
      kind: 'SYSTEM_FIELD',
      systemField: { id: 98, starSystemId: 9, sx: 10, sy: 10 },
    };
    leader.locationId = 10;
    stranded.location = leader.location;
    stranded.locationId = 10;
    stranded.fleetId = 7;
    fleet.isFixed = true;
    fleetRepo.findOne.mockResolvedValue(fleet);
    await expect(service.navigate(2, 5, 11, 10)).rejects.toThrow('Möwe');
  });

  it('prevents a non-leader fleet member from flying alone', async () => {
    const { service, shipRepo, fleetRepo } = createService();
    shipRepo.findOne.mockResolvedValue(ship({ id: 3, fleetId: 7 }));
    fleetRepo.findOne.mockResolvedValue({
      id: 7,
      userId: 5,
      leaderId: 2,
      isFixed: false,
    });

    await expect(service.navigate(3, 5, 11, 10)).rejects.toThrow(
      'Nur der Flottenführer kann die Flotte bewegen',
    );
  });

  it('toggles fixation only for the fleet leader', async () => {
    const { service, shipRepo, fleetRepo } = createService();
    const fleet = { id: 7, userId: 5, leaderId: 2, isFixed: false };
    fleetRepo.findOne.mockResolvedValue(fleet);
    shipRepo.findOne.mockResolvedValue(ship({ id: 2, fleetId: 7 }));

    await expect(service.toggleFleetFixation(5, 7)).resolves.toMatchObject({
      isFixed: true,
    });
    expect(fleetRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ isFixed: true }),
    );
  });

  it('only joins a local idle ship to its own fleet', async () => {
    const { service, shipRepo, fleetRepo } = createService();
    fleetRepo.findOne.mockResolvedValue({ id: 7, userId: 5, leaderId: 3 });
    shipRepo.findOne
      .mockResolvedValueOnce(ship())
      .mockResolvedValueOnce(ship({ id: 3 }));

    await service.joinFleet(5, 7, 2);

    expect(shipRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ fleetId: 7 }),
    );
  });

  it.each([
    [SpacecraftStatus.IN_FLIGHT, 10, 'Schiff darf sich nicht im Flug befinden'],
    [
      SpacecraftStatus.DESTROYED,
      10,
      'Zerstörte Schiffe können keiner Flotte beitreten',
    ],
    [
      SpacecraftStatus.IDLE,
      11,
      'Schiff und Flottenführer müssen sich auf demselben Feld befinden',
    ],
  ])('rejects invalid joins', async (status, locationId, message) => {
    const { service, shipRepo, fleetRepo } = createService();
    fleetRepo.findOne.mockResolvedValue({ id: 7, userId: 5, leaderId: 3 });
    shipRepo.findOne
      .mockResolvedValueOnce(
        ship({ status, locationId, location: { id: locationId } }),
      )
      .mockResolvedValueOnce(ship({ id: 3 }));

    await expect(service.joinFleet(5, 7, 2)).rejects.toThrow(message);
  });

  it('dissolves a fleet when its leader leaves', async () => {
    const { service, shipRepo, fleetRepo } = createService();
    const leader = ship({ fleetId: 7 });
    const member = ship({ id: 3, fleetId: 7 });
    shipRepo.findOne.mockResolvedValue(leader);
    fleetRepo.findOne.mockResolvedValue({ id: 7, userId: 5, leaderId: 2 });
    shipRepo.find = jest.fn().mockResolvedValue([leader, member]);

    await service.leaveFleet(5, 2);

    expect(leader.fleetId).toBeNull();
    expect(member.fleetId).toBeNull();
    expect(fleetRepo.remove).toHaveBeenCalled();
  });

  it('changes the fleet alert state for capable ships and reports failures', async () => {
    const { service, shipRepo, fleetRepo } = createService();
    const leader = ship({ id: 2, fleetId: 7, alertState: AlertState.GREEN });
    const wing = ship({ id: 3, fleetId: 7, alertState: AlertState.GREEN });
    fleetRepo.findOne.mockResolvedValue({ id: 7, userId: 5, leaderId: 2 });
    shipRepo.find.mockResolvedValue([leader, wing]);
    jest
      .spyOn(service, 'setAlertState')
      .mockResolvedValueOnce({ applied: true } as never)
      .mockRejectedValueOnce(new Error('Reaktor überlastet'));

    await expect(
      service.setFleetAlertState(5, 7, AlertState.RED),
    ).resolves.toEqual({
      alertState: AlertState.RED,
      applied: [{ shipId: 2, shipName: 'Falke' }],
      failed: [
        { shipId: 3, shipName: 'Falke', reason: 'Reaktor überlastet' },
      ],
    });
    expect(service.setAlertState).toHaveBeenCalledTimes(2);
  });

  it('renames, transfers leadership, dissolves, and denies foreign access', async () => {
    const { service, shipRepo, fleetRepo } = createService();
    const fleet = { id: 7, userId: 5, leaderId: 2, name: 'Alt' };
    fleetRepo.findOne.mockImplementation(({ where }) =>
      Promise.resolve(where.userId === 5 ? fleet : null),
    );
    shipRepo.findOne.mockResolvedValue(ship({ id: 3, fleetId: 7 }));
    shipRepo.find = jest.fn().mockResolvedValue([ship({ fleetId: 7 })]);

    await expect(service.renameFleet(6, 7, 'Neu')).rejects.toThrow(
      'Flotte nicht gefunden',
    );
    await service.renameFleet(5, 7, ' Neu ');
    expect(fleet.name).toBe('Neu');
    await service.changeFleetLeader(5, 7, 3);
    expect(fleet.leaderId).toBe(3);
    await service.dissolveFleet(5, 7);
    expect(fleetRepo.remove).toHaveBeenCalledWith(fleet);
  });
});
