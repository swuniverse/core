jest.mock('./entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  SpacecraftStatus: { IDLE: 'IDLE', DESTROYED: 'DESTROYED' },
}));

import { SpacecraftTrackerService } from './spacecraft-tracker.service';

function setup() {
  const source = {
    id: 2,
    userId: 1,
    name: 'Sucher',
    status: 'IDLE',
    energy: 30,
    crew: 4,
    crewRequired: 2,
    locationId: 40,
    runtimeSystems: {
      TRACKER: { active: false, cooldown: 0, integrity: 100 },
      LONG_RANGE_SENSORS: { active: true, cooldown: 0, integrity: 100 },
      SHORT_RANGE_SENSORS: { active: true, cooldown: 0, integrity: 100 },
    },
  };
  const target = {
    id: 3,
    userId: 2,
    name: 'Ziel',
    status: 'IDLE',
    locationId: 40,
    runtimeSystems: {
      SHIELDS: { active: false, cooldown: 0, integrity: 100 },
      CLOAK: { active: false, cooldown: 0, integrity: 100 },
      WARPDRIVE: { active: false, cooldown: 0, integrity: 100 },
    },
  };
  const ships = [source, target];
  const manager = {
    find: jest.fn(async () => ships),
    findOne: jest.fn(async (_entity, options) =>
      ships.find((ship) => ship.id === options.where.id) ?? null,
    ),
    save: jest.fn(async (value) => value),
  };
  const dataSource = {
    transaction: jest.fn(async (work) => work(manager)),
    manager,
  };
  const interactionContext = {
    load: jest.fn(async () => ({
      samePosition: true,
      sourceHasSufficientCrew: true,
      sourceCombatCapable: true,
      sourceShieldsActive: false,
      sourceCloaked: false,
      sourceInHyperspace: false,
      targetShieldsActive: false,
      targetCloaked: false,
      targetInHyperspace: false,
      targetOnVacation: false,
      sourceDestroyed: false,
      targetDestroyed: false,
      sourceBlocked: false,
      targetBlocked: false,
      stanceAllowed: true,
    })),
  };
  const runtime = { initialize: jest.fn((ship) => ship.runtimeSystems) };
  return {
    source,
    target,
    manager,
    service: new SpacecraftTrackerService(
      dataSource as any,
      runtime as any,
      interactionContext as any,
    ),
  };
}

describe('SpacecraftTrackerService', () => {
  it('expires tracking after seventy ticks and consumes seven energy per active tick', async () => {
    const { service, source } = setup();
    source.energy = 500;
    source.runtimeSystems.TRACKER = {
      active: true,
      cooldown: 0,
      integrity: 100,
      targetId: 3,
      ticksRemaining: 2,
    } as never;

    await service.processTick(source as never);
    expect(source.runtimeSystems.TRACKER).toMatchObject({
      active: true,
      ticksRemaining: 1,
    });
    expect(source.energy).toBe(493);

    await service.processTick(source as never);
    expect(source.runtimeSystems.TRACKER).toMatchObject({ active: false });
  });

  it('marks a foreign ship on the same field for seventy ticks and fifteen energy', async () => {
    const { service, source, target } = setup();

    const result = await service.track(source.id, target.id, source.userId);

    expect(result).toMatchObject({ targetId: target.id, ticksRemaining: 70 });
    expect(source.energy).toBe(15);
    expect(source.runtimeSystems.TRACKER).toMatchObject({
      active: true,
      targetId: target.id,
      ticksRemaining: 70,
    });
  });
});
