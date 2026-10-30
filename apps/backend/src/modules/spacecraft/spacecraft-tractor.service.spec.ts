jest.mock('./entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  SpacecraftStatus: { IDLE: 'IDLE', IN_FLIGHT: 'IN_FLIGHT', DESTROYED: 'DESTROYED' },
}));

import { SpacecraftTractorService } from './spacecraft-tractor.service';

function setup() {
  const source = {
    id: 1,
    userId: 7,
    name: 'Falcon',
    locationId: 9,
    status: 'IDLE',
    energy: 10,
    tractoredShipId: null as number | null,
    tractoredShip: null as unknown,
    modules: [{ category: 'TRACTOR_BEAM', moduleType: 'Standard-Traktorstrahl' }],
    runtimeSystems: {
      TRACTOR_BEAM: { active: false, cooldown: 0, integrity: 100 },
      SHIELDS: { active: false, cooldown: 0, integrity: 100 },
      WARPDRIVE: { active: false, cooldown: 0, integrity: 100 },
    },
  };
  const target = {
    id: 2,
    userId: 7,
    name: 'Ghost',
    locationId: 9,
    status: 'IDLE',
    energy: 50,
    hull: 100,
    hullMax: 100,
    tractoredShipId: null as number | null,
    modules: [],
    runtimeSystems: {
      SHIELDS: { active: false, cooldown: 0, integrity: 100 },
    },
    user: {
      id: 7,
      isNpc: false,
      vacationMode: false,
      vacationStartedAt: null as Date | null,
    },
  };
  const ships = [source, target];
  const manager = {
    findOne: jest.fn(async (_entity, options) =>
      ships.find((ship) =>
        options.where.id != null
          ? ship.id === options.where.id
          : ship.tractoredShipId === options.where.tractoredShipId,
      ) ?? null,
    ),
    findOneBy: jest.fn(async (_entity, where) =>
      ships.find((ship) => ship.tractoredShipId === where.tractoredShipId) ?? null,
    ),
    save: jest.fn(async (value) => value),
  };
  const dataSource = { transaction: jest.fn(async (work) => work(manager)) };
  const runtime = { initialize: jest.fn((ship) => ship.runtimeSystems) };
  const messaging = { sendSystem: jest.fn(async () => undefined) };
  return {
    service: new SpacecraftTractorService(dataSource as any, runtime as any, messaging as any),
    messaging,
    source,
    target,
    manager,
  };
}

describe('SpacecraftTractorService', () => {
  it.each(['FRIEND', 'NEUTRAL', 'ENEMY'])('captures a foreign %s ship regardless of stance', async () => {
    const { service, source, target } = setup();
    target.userId = 8;
    target.user.id = 8;

    await service.activate(source.id, source.userId, target.id);

    expect(source.tractoredShipId).toBe(target.id);
  });

  it('rejects a shielded foreign target', async () => {
    const { service, source, target } = setup();
    target.userId = 8;
    target.user.id = 8;
    target.runtimeSystems.SHIELDS.active = true;

    await expect(service.activate(source.id, source.userId, target.id)).rejects.toThrow(
      'Die Schilde des Ziels sind aktiviert',
    );
  });

  it('rejects a target whose owner has effective vacation protection', async () => {
    const { service, source, target } = setup();
    target.userId = 8;
    target.user.id = 8;
    target.user.vacationMode = true;
    target.user.vacationStartedAt = new Date(Date.now() - 49 * 60 * 60 * 1000);

    await expect(service.activate(source.id, source.userId, target.id)).rejects.toThrow(
      'Der Spieler befindet sich im Urlaubsmodus',
    );
  });

  it('rejects an NPC target', async () => {
    const { service, source, target } = setup();
    target.userId = 8;
    target.user.id = 8;
    target.user.isNpc = true;

    await expect(service.activate(source.id, source.userId, target.id)).rejects.toThrow(
      'NPC-Schiffe können nicht erfasst werden',
    );
  });

  it('notifies the foreign target owner when captured', async () => {
    const { service, source, target, messaging } = setup();
    target.userId = 8;
    target.user.id = 8;

    await service.activate(source.id, source.userId, target.id);

    expect(messaging.sendSystem).toHaveBeenCalledWith(
      8,
      'Traktorstrahl',
      'Ghost wurde vom Traktorstrahl der Falcon erfasst.',
    );
  });

  it('captures an own ship at the same field for 2 EPS', async () => {
    const { service, source, target, manager } = setup();

    await service.activate(source.id, source.userId, target.id);

    expect(source.energy).toBe(8);
    expect(source.tractoredShipId).toBe(target.id);
    expect(source.runtimeSystems.TRACTOR_BEAM.active).toBe(true);
    expect(manager.save).toHaveBeenCalledWith(source);
  });

  it('escapes on a successful STU roll for 20 EPS', async () => {
    const { service, source, target } = setup();
    source.tractoredShipId = target.id;
    source.tractoredShip = target;

    const result = await service.escape(target.id, target.userId, () => 1);

    expect(result.outcome).toBe('ESCAPED');
    expect(target.energy).toBe(30);
    expect(source.tractoredShipId).toBeNull();
  });

  it('damages shields after a failed STU roll below 55', async () => {
    const { service, source, target } = setup();
    source.tractoredShipId = target.id;
    source.tractoredShip = target;

    const rolls = [40, 10];
    const result = await service.escape(target.id, target.userId, () => rolls.shift()!);

    expect(result.outcome).toBe('SHIELD_DAMAGE');
    expect(target.runtimeSystems.SHIELDS.integrity).toBe(90);
  });

  it('damages hull by 10-25 percent after a high failed STU roll', async () => {
    const { service, source, target } = setup();
    source.tractoredShipId = target.id;
    source.tractoredShip = target;

    const rolls = [80, 20];
    const result = await service.escape(target.id, target.userId, () => rolls.shift()!);

    expect(result.outcome).toBe('HULL_DAMAGE');
    expect(target.hull).toBe(80);
  });

  it('releases the target without an EPS cost', async () => {
    const { service, source, target } = setup();
    source.tractoredShipId = target.id;
    source.tractoredShip = target;
    source.runtimeSystems.TRACTOR_BEAM.active = true;

    await service.deactivate(source.id, source.userId);

    expect(source.energy).toBe(10);
    expect(source.tractoredShipId).toBeNull();
    expect(source.runtimeSystems.TRACTOR_BEAM.active).toBe(false);
  });
});
