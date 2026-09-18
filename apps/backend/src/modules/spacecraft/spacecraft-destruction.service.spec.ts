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

import { BadRequestException } from '@nestjs/common';
import { SpacecraftDestructionService } from './spacecraft-destruction.service';

function setup(
  overrides = {},
  assignments: Array<{ crewId: number }> = [{ crewId: 9 }],
) {
  const ship = {
    id: 2,
    userId: 1,
    status: 'IN_COMBAT',
    hull: 20,
    hullMax: 100,
    shipClassId: 7,
    currentLayerId: 1,
    starSystemId: null,
    inSystem: false,
    posX: 5,
    posY: 6,
    currentSystemFieldX: null,
    currentSystemFieldY: null,
    crew: assignments.length,
    fleetId: 4,
    targetSystemId: 8,
    targetX: 9,
    targetY: 10,
    arrivalAt: new Date(),
    runtimeSystems: {
      SHIELDS: { active: true, cooldown: 0, integrity: 100 },
    },
    ...overrides,
  };
  const distress = { id: 5, spacecraftId: 2, active: true, stoppedAt: null };
  const manager = {
    findOne: jest.fn(async (entity) => {
      if (entity.name === 'Spacecraft') return ship;
      if (entity.name === 'ShipDistressSignal') return distress;
      return null;
    }),
    find: jest.fn(async (entity) =>
      entity.name === 'CrewAssignment' ? assignments : [],
    ),
    save: jest.fn(async (value) => value),
    remove: jest.fn(async () => undefined),
    create: jest.fn((_entity, value) => value),
  };
  const dataSource = { transaction: jest.fn(async (work) => work(manager)) };
  const runtime = { initialize: jest.fn((value) => value.runtimeSystems) };
  const gateway = { emitToUser: jest.fn(), emitToAll: jest.fn() };
  const messaging = { sendSystem: jest.fn(async () => undefined) };
  return {
    service: new SpacecraftDestructionService(
      dataSource as any,
      runtime as any,
      gateway as any,
      messaging as any,
    ),
    ship,
    distress,
    manager,
    gateway,
    messaging,
  };
}

describe('SpacecraftDestructionService', () => {
  it('replaces a crewed ship with a wreck at its current field', async () => {
    const { service, ship, distress, manager } = setup();
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
      targetSystemId: null,
      targetX: null,
      targetY: null,
      arrivalAt: null,
    });
    expect(ship.runtimeSystems.SHIELDS.active).toBe(false);
    expect(distress.active).toBe(false);
    expect(manager.remove).toHaveBeenCalledWith([{ crewId: 9 }]);
    expect(manager.save).toHaveBeenCalledWith(
      expect.objectContaining({
        formerShipClassId: 7,
        posX: 5,
        posY: 6,
        hull: 5,
        crewCount: 1,
      }),
    );
    expect(manager.remove).toHaveBeenCalledWith(ship);
  });

  it('requires an actual crew assignment', async () => {
    const { service } = setup({}, []);
    await expect(service.selfDestruct(2, 1)).rejects.toBeInstanceOf(
      BadRequestException,
    );
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
