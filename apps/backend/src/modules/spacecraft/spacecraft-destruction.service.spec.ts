import { leaveFleetOnDestruction } from './fleet-leadership';
jest.mock('./fleet-leadership', () => ({
  leaveFleetOnDestruction: jest.fn(async () => undefined),
}));
jest.mock('../auth/user.entity', () => ({ User: class User {} }));
jest.mock('../faction/entities/faction.entity', () => ({
  FactionEntity: class FactionEntity {},
}));
jest.mock('../starmap/entities/star-system.entity', () => ({
  StarSystem: class StarSystem {},
}));
jest.mock('../starmap/entities/celestial-object.entity', () => ({
  CelestialObject: class CelestialObject {},
}));
jest.mock('../starmap/entities/layer.entity', () => ({
  Layer: class Layer {},
}));
jest.mock('./entities/spacecraft-module.entity', () => ({
  SpacecraftModule: class SpacecraftModule {},
}));
jest.mock('./entities/fleet.entity', () => ({ Fleet: class Fleet {} }));

jest.mock('./escape-pod.service', () => ({
  EscapePodService: class EscapePodService {},
}));

import { BadRequestException } from '@nestjs/common';
import { SpacecraftDestructionService } from './spacecraft-destruction.service';

function setup(
  overrides = {},
  assignments: Array<{ crewId: number }> = [{ crewId: 9 }],
) {
  const ship = {
    id: 2,
    userId: 1,
    name: 'Opfer',
    status: 'IN_COMBAT',
    hull: 20,
    hullMax: 100,
    shipClassId: 7,
    shipClass: { name: 'X-Wing Jäger', prestige: 6 },
    locationId: 42,
    location: {
      id: 42,
      kind: 'GALAXY_FIELD',
      galaxyField: { id: 20, layerId: 1, cx: 5, cy: 6 },
    },
    crew: assignments.length,
    fleetId: 4,
    targetSystemId: 8,
    targetX: 9,
    targetY: 10,
    runtimeSystems: {
      SHIELDS: { active: true, cooldown: 0, integrity: 100 },
    } as Record<string, any>,
    ...overrides,
  };
  const distress = { id: 5, spacecraftId: 2, active: true, stoppedAt: null };
  const manager = {
    findOne: jest.fn(async (entity) => {
      if (entity.name === 'Spacecraft') return ship;
      if (entity.name === 'SpaceLocation') return ship.location ?? null;
      if (entity.name === 'ShipDistressSignal') return distress;
      if (entity.name === 'User') return destroyer;
      return null;
    }),
    find: jest.fn(async (entity) =>
      entity.name === 'CrewAssignment' ? assignments : [],
    ),
    save: jest.fn(async (value) => value),
    remove: jest.fn(async () => undefined),
    create: jest.fn((_entity, value) => value),
  };
  const dataSource = {
    transaction: jest.fn(async (work) => work(manager)),
    manager,
    getRepository: jest.fn(() => ({
      findOneBy: jest.fn().mockResolvedValue(ship),
    })),
  };
  const runtime = { initialize: jest.fn((value) => value.runtimeSystems) };
  const gateway = { emitToUser: jest.fn(), emitToAll: jest.fn() };
  const messaging = { sendSystem: jest.fn(async () => undefined) };
  const gameEvents = { recordSpacecraft: jest.fn(async () => undefined) };
  const destroyer = { id: 9, username: 'Sieger' };
  const prestige = { change: jest.fn(async () => undefined) };
  const escapePods = {
    launchForShip: jest.fn(async (_manager: unknown, value: any) =>
      value.crew > 0 ? { podId: 3, crewCount: value.crew } : null,
    ),
  };
  const trackerService = {
    clearTrackingTarget: jest.fn(async () => undefined),
  };
  const playerTradePosts = {
    destroyForStation: jest.fn(async () => [{ commodityId: 5, amount: 3 }, { commodityId: 9, amount: 4 }]),
  };
  const gameData = {
    getAllFabricationItems: jest.fn(() => [
      {
        queueType: 'MODULE',
        moduleType: 'LASER_CANNON',
        shipyardType: 'ENERGY_WEAPON',
        moduleLevel: 1,
        outputCommodityId: 10_101,
      },
      {
        queueType: 'MODULE',
        moduleType: 'SHIELD_GENERATOR',
        shipyardType: 'SHIELD',
        moduleLevel: 1,
        outputCommodityId: 10_201,
      },
    ]),
  };
  return {
    service: new SpacecraftDestructionService(
      dataSource as any,
      runtime as any,
      gateway as any,
      messaging as any,
      gameEvents as any,
      prestige as any,
      gameData as any,
      undefined,
      escapePods as any,
      undefined,
      trackerService as any,
      playerTradePosts as never,
    ),
    escapePods,
    playerTradePosts,
    ship,
    distress,
    manager,
    gateway,
    messaging,
    prestige,
    gameEvents,
  };
}

describe('SpacecraftDestructionService', () => {
  it('destroys through an anomaly inside the caller transaction and notifies after commit', async () => {
    const { service, manager, escapePods, gateway, ship } = setup();
    const afterCommit: Array<() => void> = [];

    await service.destroyInManager(manager as never, ship.id, 'ANOMALY', {
      manager: manager as never,
      afterCommit,
    });

    expect(escapePods.launchForShip).toHaveBeenCalledWith(
      manager,
      ship,
      'ANOMALY_DESTRUCTION',
    );
    expect(manager.remove).toHaveBeenCalledWith(ship);
    expect(gateway.emitToUser).not.toHaveBeenCalled();
    afterCommit.forEach((notify) => notify());
    expect(gateway.emitToUser).toHaveBeenCalledWith(1, expect.anything(), {
      shipId: 2,
      type: 'DESTROYED',
      detail: 'Durch eine Anomalie zerstört',
    });
  });

  it('hands over the fleet before the destroyed row is removed', async () => {
    const leave = jest.mocked(leaveFleetOnDestruction);
    leave.mockClear();
    let fleetAtHandover: number | null | undefined;
    leave.mockImplementationOnce(async (_manager, value) => {
      fleetAtHandover = value.fleetId;
    });
    {
      const { service, manager, ship } = setup();
      ship.fleetId = 7;

      await service.destroyInManager(manager as never, ship.id, 'ANOMALY', {
        manager: manager as never,
        afterCommit: [],
      });

      expect(leave).toHaveBeenCalledWith(manager, expect.objectContaining({ id: ship.id }));
      expect(fleetAtHandover).toBe(7);
      const removal = (manager.remove.mock.calls as unknown[][]).findIndex(([value]) => value === ship);
      expect(leave.mock.invocationCallOrder[0]).toBeLessThan(
        manager.remove.mock.invocationCallOrder[removal],
      );
    }
  });

  it('replaces a crewed ship with a wreck at its current field', async () => {
    const { service, ship, distress, manager, escapePods, messaging } =
      setup();
    const result = await service.selfDestruct(2, 1);
    expect(result).toEqual({
      spacecraftId: 2,
      status: 'DESTROYED',
      alreadyDestroyed: false,
    });
    expect(ship).toMatchObject({
      status: 'DESTROYED',
      hull: 0,
      fleetId: null,
    });
    expect(ship.runtimeSystems.SHIELDS.active).toBe(false);
    expect(distress.active).toBe(false);
    expect(escapePods.launchForShip).toHaveBeenCalledWith(
      manager,
      ship,
      'SELF_DESTRUCTION',
    );
    expect(manager.remove).not.toHaveBeenCalledWith([{ crewId: 9 }]);
    expect(messaging.sendSystem).toHaveBeenCalledWith(
      1,
      'Schiff zerstört',
      expect.stringContaining('1 Crewmitglieder konnten sich in Rettungskapseln retten'),
    );
    expect(manager.save).toHaveBeenCalledWith(
      expect.objectContaining({
        formerShipClassId: 7,
        locationId: 42,
        location: ship.location,
        hull: 5,
        crewCount: 0,
      }),
    );
    expect(manager.remove).toHaveBeenCalledWith(ship);
  });

  it('turns the trade post of a destroyed station into salvage on its wreck (tmw-T12c)', async () => {
    const { service, ship, manager, playerTradePosts } = setup({ kind: 'STATION' });
    (manager.find as jest.Mock).mockImplementation(async (entity) =>
      entity.name === 'CargoItem' ? [{ commodityId: 5, amount: 2 }] : entity.name === 'CrewAssignment' ? [{ crewId: 9 }] : [],
    );

    await service.selfDestruct(ship.id, ship.userId);

    expect(playerTradePosts.destroyForStation).toHaveBeenCalledWith(
      manager,
      ship,
      expect.objectContaining({ manager, afterCommit: expect.any(Array) }),
    );
    expect(manager.save).toHaveBeenCalledWith(
      expect.objectContaining({
        cargo: [
          { commodityId: 5, amount: 5 },
          { commodityId: 9, amount: 4 },
        ],
      }),
    );
  });

  it('leaves trade posts alone when a ship is destroyed', async () => {
    const { service, ship, playerTradePosts } = setup();

    await service.selfDestruct(ship.id, ship.userId);

    expect(playerTradePosts.destroyForStation).not.toHaveBeenCalled();
  });

  it('clears trackers that point to a destroyed ship', async () => {
    const { service, ship } = setup();
    const trackerService = (service as any).trackerService;

    await service.selfDestruct(ship.id, ship.userId);

    expect(trackerService.clearTrackingTarget).toHaveBeenCalledWith(
      expect.anything(),
      ship.id,
    );
  });

  it('releases tractor beams involving a destroyed ship', async () => {
    const { service, ship, manager } = setup({ tractoredShipId: 3 });
    const puller = { id: 4, tractoredShipId: ship.id, runtimeSystems: {} };
    (manager.findOne as jest.Mock).mockImplementation(async (entity, options) => {
      if (entity.name === 'Spacecraft' && options.where.id === ship.id) return ship;
      if (entity.name === 'Spacecraft' && options.where.tractoredShipId === ship.id)
        return puller;
      if (entity.name === 'SpaceLocation') return ship.location;
      if (entity.name === 'ShipDistressSignal') return null;
      return null;
    });

    await service.selfDestruct(ship.id, ship.userId);

    expect((ship as typeof ship & { tractoredShipId: number | null }).tractoredShipId).toBeNull();
    expect(puller.tractoredShipId).toBeNull();
    expect(manager.save).toHaveBeenCalledWith(puller);
  });

  it('awards combat prestige and stores half of the intact modules', async () => {
    const { service, manager, prestige } = setup({
      shipClass: { name: 'X-Wing Jäger', prestige: 6 },
    });
    (manager.find as jest.Mock).mockImplementation(async (entity) => {
      if (entity.name === 'SpacecraftModule') {
        return [
          {
            id: 1,
            moduleType: 'LASER_CANNON',
            category: 'ENERGY_WEAPON',
            level: 1,
            integrity: 100,
          },
          {
            id: 2,
            moduleType: 'SHIELD_GENERATOR',
            category: 'SHIELD',
            level: 1,
            integrity: 40,
          },
          {
            id: 3,
            moduleType: 'BROKEN',
            category: 'SHIELD',
            level: 1,
            integrity: 0,
          },
        ];
      }
      return [];
    });

    await service.destroyFromCombat(2, 9);

    expect(manager.save).toHaveBeenCalledWith(
      expect.objectContaining({
        modules: [
          expect.objectContaining({
            commodityId: expect.any(Number),
            amount: 1,
          }),
        ],
      }),
    );
    const wreck = (manager.save as jest.Mock).mock.calls
      .map(([value]) => value)
      .find((value) => Array.isArray(value.modules));
    expect([10_101, 10_201]).toContain(wreck.modules[0].commodityId);
    expect(prestige.change).toHaveBeenCalledWith(
      9,
      6,
      '6 Prestige erhalten für die Zerstörung von: X-Wing Jäger',
      manager,
    );
  });

  it('records destroyer, victim and class in combat history', async () => {
    const { service, gameEvents } = setup();

    await service.destroyFromCombat(2, 9);

    expect(gameEvents.recordSpacecraft).toHaveBeenCalledWith(
      expect.anything(),
      'Sieger zerstörte Opfer (X-Wing Jäger).',
      expect.objectContaining({ id: 2, name: 'Opfer' }),
    );
  });

  it('does not award prestige for self-destruction', async () => {
    const { service, prestige } = setup({
      shipClass: { name: 'X-Wing Jäger', prestige: 6 },
    });

    await service.selfDestruct(2, 1);

    expect(prestige.change).not.toHaveBeenCalled();
  });

  it('locks the ship without loading nullable location relations', async () => {
    const { service, manager } = setup();

    await service.selfDestruct(2, 1);

    expect(manager.findOne).toHaveBeenCalledWith(expect.anything(), {
      where: { id: 2, userId: 1 },
      lock: { mode: 'pessimistic_write' },
    });
  });

  it('requires an actual crew assignment', async () => {
    const { service } = setup({ crewRequired: 1 }, []);
    await expect(service.selfDestruct(2, 1)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('allows a crew-free ship to self-destruct without assignments', async () => {
    const { service, manager } = setup({ crewRequired: 0 }, []);

    await expect(service.selfDestruct(2, 1)).resolves.toMatchObject({
      spacecraftId: 2,
      status: 'DESTROYED',
    });
    expect(manager.remove).not.toHaveBeenCalledWith([]);
  });

  it('preserves the canonical location on the wreck', async () => {
    const { service, manager } = setup({
      location: {
        id: 42,
        kind: 'SYSTEM_FIELD',
        systemField: { starSystemId: 8, sx: 9, sy: 10 },
      },
    });

    await service.selfDestruct(2, 1);

    expect(manager.save).toHaveBeenCalledWith(
      expect.objectContaining({
        locationId: 42,
        location: expect.objectContaining({ id: 42, kind: 'SYSTEM_FIELD' }),
      }),
    );
    expect(manager.findOne).toHaveBeenCalledWith(expect.anything(), {
      where: { id: 42 },
      relations: ['galaxyField', 'systemField'],
    });
  });

  it('propagates persistence failure so the transaction can roll back', async () => {
    const { service, manager } = setup();
    manager.save.mockRejectedValueOnce(new Error('database failure'));
    await expect(service.selfDestruct(2, 1)).rejects.toThrow(
      'database failure',
    );
  });

  it('is idempotent for an already destroyed ship', async () => {
    const { service, manager } = setup({ status: 'DESTROYED' });
    await expect(service.selfDestruct(2, 1)).resolves.toEqual({
      spacecraftId: 2,
      status: 'DESTROYED',
      alreadyDestroyed: true,
    });
    expect(manager.find).not.toHaveBeenCalled();
  });

  it('does not overwrite a concurrently destroyed combat survivor', async () => {
    const { service, manager } = setup({ status: 'DESTROYED' });
    await expect(service.saveCombatSurvivor({ id: 2 } as any)).resolves.toBe(
      false,
    );
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('does not overwrite a concurrently destroyed ship action', async () => {
    const { service, manager } = setup({ status: 'DESTROYED' });
    await expect(service.saveUnlessDestroyed({ id: 2 } as any)).resolves.toBe(
      false,
    );
    expect(manager.save).not.toHaveBeenCalled();
  });
});
