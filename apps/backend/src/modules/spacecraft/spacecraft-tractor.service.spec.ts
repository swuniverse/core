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
    tractoredShipId: null as number | null,
    modules: [],
    runtimeSystems: {},
  };
  const ships = [source, target];
  const manager = {
    findOne: jest.fn(async (_entity, options) =>
      ships.find((ship) => ship.id === options.where.id) ?? null,
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
    source,
    target,
    manager,
  };
}

describe('SpacecraftTractorService', () => {
  it('captures an own ship at the same field for 2 EPS', async () => {
    const { service, source, target, manager } = setup();

    await service.activate(source.id, source.userId, target.id);

    expect(source.energy).toBe(8);
    expect(source.tractoredShipId).toBe(target.id);
    expect(source.runtimeSystems.TRACTOR_BEAM.active).toBe(true);
    expect(manager.save).toHaveBeenCalledWith(source);
  });

  it('releases the target without an EPS cost', async () => {
    const { service, source, target } = setup();
    source.tractoredShipId = target.id;
    source.runtimeSystems.TRACTOR_BEAM.active = true;

    await service.deactivate(source.id, source.userId);

    expect(source.energy).toBe(10);
    expect(source.tractoredShipId).toBeNull();
    expect(source.runtimeSystems.TRACTOR_BEAM.active).toBe(false);
  });
});
