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
import {
  AlertState,
  SpacecraftStatus,
  Spacecraft,
} from './entities/spacecraft.entity';
import { Fleet } from './entities/fleet.entity';
import { SpacecraftModule } from './entities/spacecraft-module.entity';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import type { EntityManager } from 'typeorm';

function createService() {
  const movementRows = new Map<number, Spacecraft>();
  const shipRepo = {
    findOne: jest.fn(),
    findOneBy: jest.fn(async (_where?: unknown) => null),
    save: jest.fn(async (ship) => ship),
    create: jest.fn((ship) => ship),
    find: jest.fn(),
  };
  const moduleRepo = {
    count: jest.fn(async () => 0),
    find: jest.fn(async () => []),
  };
  const fleetRepo = {
    find: jest.fn(),
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
    findById: jest.fn(async () => ({ id: 1, flightEnergyCost: 1 })),
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
  const resourceFlow = { recharge: jest.fn(), getSystemCost: jest.fn(() => 0) };
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
  const manager = {
    queryRunner: { isTransactionActive: true },
    query: jest.fn(async () => []),
    findOneBy: jest.fn((entity, where) =>
      entity === Fleet
        ? fleetRepo.findOne({ where })
        : 'tractoredShipId' in where
          ? shipRepo.findOneBy(where)
          : shipRepo.findOne({ where }),
    ),
    findOne: jest.fn(async (entity, options) => {
      if (entity !== Fleet) return shipRepo.findOne(options);
      const fleet = await fleetRepo.findOne(options);
      return fleet ? { ...fleet } : null;
    }),
    findBy: jest.fn(async (entity, where) => {
      if (entity === Spacecraft) {
        const members = await shipRepo.find({ where });
        return (
          members ??
          [await shipRepo.findOne({ where: { id: 3 } })].filter(Boolean)
        ).filter((member: Spacecraft) => member.fleetId === where.fleetId);
      }
      return [];
    }),
    find: jest.fn(
      async (
        _entity?: unknown,
        _options?: { where: { spacecraftId?: number } },
      ) =>
        (await shipRepo.find({})) ??
        [await shipRepo.findOne({})].filter(Boolean),
    ),
    count: jest.fn(async (entity) => (entity === CrewAssignment ? 100 : 0)),
    create: jest.fn((_entity, value) => fleetRepo.create(value)),
    save: jest.fn((entity, value) =>
      value === undefined ? shipRepo.save(entity) : fleetRepo.save(value),
    ),
    update: jest.fn(async (entity, id, values) => {
      if (entity === Fleet) {
        const fleet = await fleetRepo.findOne({ where: { id, userId: 5 } });
        Object.assign(fleet, values);
        return;
      }
      const members = await shipRepo.find({});
      const member = members?.find((ship: Spacecraft) => ship.id === id);
      if (member) Object.assign(member, values);
      return shipRepo.save({ id, ...values });
    }),
    delete: jest.fn(async (_entity, id) =>
      fleetRepo.remove(await fleetRepo.findOne({ where: { id, userId: 5 } })),
    ),
    createQueryBuilder: jest.fn(() => {
      const builder: Record<string, jest.Mock> = {
        where: jest.fn(() => builder),
        orderBy: jest.fn(() => builder),
        setLock: jest.fn(() => builder),
        setOnLocked: jest.fn(() => builder),
        getMany: jest.fn(async () => {
          const members = await shipRepo.find({});
          if (members) return members;
          const ship = await shipRepo.findOne({});
          return ship ? [ship] : [];
        }),
      };
      return builder;
    }),
  };
  const movementManager = {
    ...manager,
    findOneBy: jest.fn(
      async (
        _entity: unknown,
        where: { id?: number; tractoredShipId?: number },
      ) =>
        where.id == null
          ? ([...movementRows.values()].find(
              (ship) => ship.tractoredShipId === where.tractoredShipId,
            ) ?? null)
          : (movementRows.get(where.id) ?? null),
    ),
    find: jest.fn(async () => [...movementRows.values()]),
    findBy: jest.fn(async (_entity: unknown, where: { fleetId: number }) =>
      [...movementRows.values()].filter(
        (ship) => ship.fleetId === where.fleetId,
      ),
    ),
    save: jest.fn(async (ship: Spacecraft) => {
      movementRows.set(ship.id, structuredClone(ship));
      return shipRepo.save(ship);
    }),
    createQueryBuilder: jest.fn((entity: unknown) => {
      let spacecraftId = 0;
      const builder: Record<string, jest.Mock> = {
        where: jest.fn((where: { spacecraftId?: number }) => {
          spacecraftId = where.spacecraftId ?? 0;
          return builder;
        }),
        orderBy: jest.fn(() => builder),
        setLock: jest.fn(() => builder),
        setOnLocked: jest.fn(() => builder),
        getMany: jest.fn(async () =>
          entity === SpacecraftModule
            ? (movementRows.get(spacecraftId)?.modules ?? [])
            : [...movementRows.values()],
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
          isolationOrCallback:
            | string
            | ((manager: EntityManager) => Promise<unknown>),
          callback?: (manager: EntityManager) => Promise<unknown>,
        ) => {
          if (typeof isolationOrCallback === 'function') {
            const result = await isolationOrCallback(
              manager as unknown as EntityManager,
            );
            const members: Spacecraft[] = (await shipRepo.find({})) ?? [];
            for (const member of members) {
              if (!movementRows.has(member.id))
                movementRows.set(member.id, structuredClone(member));
              const current = movementRows.get(member.id);
              if (current) current.fleetId = member.fleetId;
            }
            return result;
          }
          if (!callback) throw new Error('Transaction callback missing');
          return callback(movementManager as unknown as EntityManager);
        },
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
  );

  const findOne = service.findOne.bind(service);
  jest.spyOn(service, 'findOne').mockImplementation(async (id, userId) => {
    const ship = await findOne(id, userId);
    if (ship.fleetId != null)
      ship.fleet = await fleetRepo.findOne({ where: { id: ship.fleetId } });
    movementRows.set(id, structuredClone(ship));
    return ship;
  });
  manager.find.mockImplementation(async (entity, options) => {
    if (entity === SpacecraftModule)
      return movementRows.get(options?.where.spacecraftId ?? 0)?.modules ?? [];
    const members: Spacecraft[] =
      (await shipRepo.find({})) ?? [await shipRepo.findOne({})].filter(Boolean);
    for (const member of members)
      movementRows.set(member.id, structuredClone(member));
    return members;
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
    fleetRepo,
    manager,
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
  shipClassId: 1,
  modules: [],
  energy: 10,
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
      status: SpacecraftStatus.DESTROYED,
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
    expect(leader.energy).toBe(9);

    leader.energy = 10;
    leader.location = {
      id: 10,
      kind: 'SYSTEM_FIELD',
      systemField: { id: 98, starSystemId: 9, sx: 10, sy: 10 },
    };
    leader.locationId = 10;
    stranded.location = leader.location;
    stranded.locationId = 10;
    stranded.fleetId = 7;
    stranded.status = SpacecraftStatus.DESTROYED;
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
    expect(fleet.isFixed).toBe(true);
  });

  it('only joins a local idle ship to its own fleet', async () => {
    const { service, shipRepo, fleetRepo } = createService();
    fleetRepo.findOne.mockResolvedValue({ id: 7, userId: 5, leaderId: 3 });
    const joiner = ship();
    const leader = ship({ id: 3, fleetId: 7 });
    shipRepo.findOne.mockImplementation(({ where }) =>
      Promise.resolve(where.id === 3 ? leader : joiner),
    );
    shipRepo.find.mockResolvedValue([leader, joiner]);

    await service.joinFleet(5, 7, 2);

    expect(shipRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ fleetId: 7 }),
    );
  });

  it.each([
    [SpacecraftStatus.IN_COMBAT, 10, 'Das Schiff ist nicht einsatzbereit'],
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
    const joiner = ship({ status, locationId, location: { id: locationId } });
    const leader = ship({ id: 3, fleetId: 7 });
    shipRepo.findOne.mockImplementation(({ where }) =>
      Promise.resolve(where.id === 3 ? leader : joiner),
    );
    shipRepo.find.mockResolvedValue([leader, joiner]);

    await expect(service.joinFleet(5, 7, 2)).rejects.toThrow(message);
  });

  it('does not let the leader leave its fleet (STU)', async () => {
    const { service, shipRepo, fleetRepo } = createService();
    const leader = ship({ fleetId: 7 });
    const member = ship({ id: 3, fleetId: 7 });
    shipRepo.findOne.mockResolvedValue(leader);
    fleetRepo.findOne.mockResolvedValue({ id: 7, userId: 5, leaderId: 2 });
    shipRepo.find = jest.fn().mockResolvedValue([leader, member]);

    await expect(service.leaveFleet(5, 2)).rejects.toThrow(
      'Der Flottenführer kann die Flotte nicht verlassen',
    );

    expect(leader.fleetId).toBe(7);
    expect(member.fleetId).toBe(7);
    expect(fleetRepo.remove).not.toHaveBeenCalled();
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
      failed: [{ shipId: 3, shipName: 'Falke', reason: 'Reaktor überlastet' }],
    });
    expect(service.setAlertState).toHaveBeenCalledTimes(2);
  });

  it('renames, transfers leadership, dissolves, and denies foreign access', async () => {
    const { service, shipRepo, fleetRepo } = createService();
    const fleet = { id: 7, userId: 5, leaderId: 2, name: 'Alt' };
    fleetRepo.findOne.mockImplementation(({ where }) =>
      Promise.resolve(where.userId === 5 ? fleet : null),
    );
    const leader = ship({ fleetId: 7 });
    const successor = ship({ id: 3, fleetId: 7 });
    shipRepo.findOne.mockImplementation(({ where }) =>
      Promise.resolve(where.id === 3 ? successor : leader),
    );
    shipRepo.find.mockResolvedValue([leader, successor]);

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


describe('SpacecraftService fleet list preferences', () => {
  it('prioritizes a fleet and preserves the order of the remaining fleets', async () => {
    const { service, fleetRepo, manager } = createService();
    const fleets = [
      { id: 1, userId: 5, sort: 7 },
      { id: 2, userId: 5, sort: 3 },
      { id: 3, userId: 5, sort: 3 },
    ];
    manager.find.mockResolvedValue(fleets as never);
    fleetRepo.findOne.mockImplementation(({ where }) =>
      Promise.resolve(fleets.find((fleet) => fleet.id === where.id)),
    );
    await service.prioritizeFleet(5, 3);
    expect(
      [...fleets].sort((a, b) => b.sort - a.sort).map((fleet) => fleet.id),
    ).toEqual([3, 1, 2]);
    expect(manager.find).toHaveBeenCalledWith(Fleet, {
      where: { userId: 5 },
      order: { id: 'ASC' },
      lock: { mode: 'for_no_key_update' },
    });
    await service.prioritizeFleet(5, 2);
    expect(
      [...fleets].sort((a, b) => b.sort - a.sort).map((fleet) => fleet.id),
    ).toEqual([2, 3, 1]);
    await service.prioritizeFleet(5, 2);
    expect(fleets.map((fleet) => fleet.sort).sort()).toEqual([0, 1, 2]);
  });

  it('persists hide and show without overwriting other fleet properties', async () => {
    const { service, fleetRepo, manager } = createService();
    const fleet = {
      id: 7,
      userId: 5,
      name: 'Aurek',
      sort: 3,
      isHidden: false,
      isFixed: true,
    };
    fleetRepo.findOne.mockResolvedValue(fleet);
    await service.setFleetVisibility(5, 7, true);
    expect(fleet).toMatchObject({ isHidden: true, sort: 3, isFixed: true });
    expect(manager.update).toHaveBeenCalledWith(Fleet, 7, { isHidden: true });
    await service.setFleetVisibility(5, 7, false);
    expect(fleet.isHidden).toBe(false);
    await expect(
      service.setFleetVisibility(5, 7, 'true' as never),
    ).rejects.toThrow('boolescher');
  });

  it('denies unknown or foreign fleets without changing preferences', async () => {
    const { service, fleetRepo, manager } = createService();
    fleetRepo.findOne.mockResolvedValue(null);
    manager.find.mockResolvedValue([]);
    await expect(service.setFleetVisibility(6, 7, true)).rejects.toThrow(
      'Flotte nicht gefunden',
    );
    await expect(service.prioritizeFleet(6, 7)).rejects.toThrow(
      'Flotte nicht gefunden',
    );
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('loads fleets with the persisted sort order and deterministic ties', async () => {
    const { service, fleetRepo } = createService();
    fleetRepo.find.mockResolvedValue([]);
    await service.getUserFleets(5);
    expect(fleetRepo.find).toHaveBeenCalledWith({
      where: { userId: 5 },
      relations: ['members'],
      order: { sort: 'DESC', id: 'ASC' },
    });
  });
});
