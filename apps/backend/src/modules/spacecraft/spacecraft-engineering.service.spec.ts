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
jest.mock('../messaging/messaging.service', () => ({
  MessagingService: class MessagingService {},
}));
jest.mock('./entities/fleet.entity', () => ({ Fleet: class Fleet {} }));

import { BadRequestException } from '@nestjs/common';
import { SpacecraftEngineeringService } from './spacecraft-engineering.service';

function setup(shipOverrides = {}, cargoAmount = 5) {
  const ship = {
    id: 2,
    userId: 1,
    status: 'IDLE',
    energy: 5,
    energyMax: 10,
    epsMax: 10,
    warpdrive: 0,
    warpdriveMax: 0,
    battery: 4,
    batteryMax: 6,
    reactorFuel: 2,
    reactorFuelMax: 8,
    cargoUsed: cargoAmount,
    modules: [],
    runtimeSystems: {},
    location: { id: 5, kind: 'GALAXY_FIELD', galaxyField: { cx: 4, cy: 7 } },
    ...shipOverrides,
  };
  const cargo = { id: 3, spacecraftId: 2, commodityId: 5, amount: cargoAmount };
  const reactor = {
    spacecraftId: 2,
    moduleType: 'Leichter Hypermaterie-Reaktor',
    isActive: true,
    integrity: 100,
  };
  const manager = {
    find: jest.fn(async (entity) =>
      String(entity.name).includes('SpacecraftModule')
        ? (ship.modules as unknown[]).length > 0
          ? (ship.modules as unknown[])
          : [reactor]
        : [cargo],
    ),
    findOne: jest.fn(async (entity) =>
      String(entity.name).includes('Spacecraft') ? ship : cargo,
    ),
    save: jest.fn(async (value) => value),
    remove: jest.fn(async () => undefined),
  };
  const dataSource = {
    transaction: jest.fn(async (work) => work(manager)),
  };
  const messaging = { sendSystem: jest.fn() };
  return {
    service: new SpacecraftEngineeringService(dataSource as any, messaging as any),
    ship,
    cargo,
    manager,
    messaging,
  };
}

describe('SpacecraftEngineeringService', () => {
  it('loads MAX reactor fuel from deuterium cargo within capacity', async () => {
    const { service, ship, cargo, manager } = setup({}, 10);
    const result = await service.loadReactor(2, 1, 'MAX');
    expect(result.transferred).toBe(6);
    expect(ship.reactorFuel).toBe(8);
    expect(cargo.amount).toBe(7);
    expect(ship.cargoUsed).toBe(7);
    expect(manager.save).toHaveBeenCalledWith(ship);
  });

  it('loads standard reactor packages from all required commodities', async () => {
    const { service, ship, manager } = setup({
      reactorFuel: 0,
      reactorFuelMax: 60,
      cargoUsed: 5,
    });
    const cargo = [
      { id: 1, spacecraftId: 2, commodityId: 5, amount: 2 },
      { id: 2, spacecraftId: 2, commodityId: 6, amount: 2 },
      { id: 3, spacecraftId: 2, commodityId: 8, amount: 1 },
    ];
    manager.find.mockImplementation(async (entity) =>
      String(entity.name).includes('SpacecraftModule')
        ? [
            {
              spacecraftId: 2,
              moduleType: 'Hypermaterie-Reaktor',
              isActive: true,
              integrity: 100,
            },
          ]
        : cargo,
    );
    const result = await service.loadReactor(2, 1, 'MAX');
    expect(result.transferred).toBe(30);
    expect(ship.reactorFuel).toBe(30);
    expect(cargo.map((item) => item.amount)).toEqual([0, 0, 0]);
  });

  it('transfers reactor charge to multiple co-located ships and notifies foreign owners', async () => {
    const { service, ship, manager, messaging } = setup({
      reactorFuel: 20,
      modules: [
        {
          moduleType: 'Hypermaterie-Transferkoppler',
          category: 'SPECIAL',
          integrity: 100,
          isActive: true,
        },
      ],
      runtimeSystems: {
        REACTOR_CHARGE_TRANSFER: { active: true, cooldown: 0, integrity: 100 },
        WARPDRIVE: { active: false, cooldown: 0, integrity: 100 },
        SHIELDS: { active: false, cooldown: 0, integrity: 100 },
      },
    });
    const ownTarget = {
      ...ship,
      id: 3,
      name: 'Gamma',
      reactorFuel: 2,
      reactorFuelMax: 10,
      modules: [],
    };
    const foreignTarget = {
      ...ship,
      id: 4,
      userId: 2,
      name: 'Delta',
      reactorFuel: 0,
      reactorFuelMax: 5,
      modules: [],
    };
    manager.find.mockResolvedValueOnce([ship, ownTarget, foreignTarget] as any);

    const result = await service.transferReactorCharge(2, 1, [
      { targetShipId: 3, amount: 8 },
      { targetShipId: 4, amount: 8 },
    ]);

    expect(result.transferred).toBe(13);
    expect(ship.reactorFuel).toBe(7);
    expect(ownTarget.reactorFuel).toBe(10);
    expect(foreignTarget.reactorFuel).toBe(5);
    expect(messaging.sendSystem).toHaveBeenCalledWith(
      2,
      'Reaktorladungstransfer',
      expect.stringContaining('Delta'),
      undefined,
      expect.anything(),
    );
  });

  it('rejects reactor charge transfer while hyperdrive is active', async () => {
    const { service, ship, manager } = setup({
      reactorFuel: 20,
      modules: [
        {
          moduleType: 'Hypermaterie-Transferkoppler',
          category: 'SPECIAL',
          integrity: 100,
          isActive: true,
        },
      ],
      runtimeSystems: {
        REACTOR_CHARGE_TRANSFER: { active: true, cooldown: 0, integrity: 100 },
        WARPDRIVE: { active: true, cooldown: 0, integrity: 100 },
        SHIELDS: { active: false, cooldown: 0, integrity: 100 },
      },
    });

    const target = {
      id: 3,
      userId: 1,
      name: 'Gamma',
      status: 'IDLE',
      reactorFuel: 0,
      reactorFuelMax: 10,
      modules: [],
      runtimeSystems: {},
      location: { id: 5, kind: 'GALAXY_FIELD', galaxyField: { cx: 4, cy: 7 } },
    };
    (ship.runtimeSystems as any).WARPDRIVE.active = true;
    manager.find.mockResolvedValueOnce([ship, target] as any);

    await expect(
      service.transferReactorCharge(2, 1, [{ targetShipId: 3, amount: 1 }]),
    ).rejects.toThrow('Hyperantrieb und Schilde müssen deaktiviert sein');
  });

  it('boosts the hyperdrive by one third of its maximum for 100 EPS', async () => {
    const { service, ship, manager } = setup({
      energy: 150,
      warpdrive: 10,
      warpdriveMax: 100,
      modules: [
        {
          moduleType: 'Hyperantriebs-Notladegerät',
          category: 'SPECIAL',
          integrity: 100,
          isActive: true,
        },
      ],
      runtimeSystems: {
        WARPDRIVE: { active: false, cooldown: 0, integrity: 100 },
        HYPERDRIVE_BOOSTER: { active: true, cooldown: 0, integrity: 100 },
      },
    });

    const result = await service.boostHyperdrive(2, 1);

    expect(result.transferred).toBe(33);
    expect(ship.warpdrive).toBe(43);
    expect(ship.energy).toBe(50);
    expect((ship.runtimeSystems as any).HYPERDRIVE_BOOSTER).toMatchObject({
      active: false,
      cooldown: expect.any(Number),
    });
    expect(manager.save).toHaveBeenCalledWith(ship);
  });

  it('rejects hyperdrive boost while on cooldown', async () => {
    const { service } = setup({
      modules: [
        {
          moduleType: 'Hyperantriebs-Notladegerät',
          category: 'SPECIAL',
          integrity: 100,
          isActive: true,
        },
      ],
      runtimeSystems: {
        HYPERDRIVE_BOOSTER: {
          active: false,
          cooldown: Date.now() + 60_000,
          integrity: 100,
        },
      },
    });

    await expect(service.boostHyperdrive(2, 1)).rejects.toThrow(
      'Hyperantriebs-Notladegerät ist noch nicht bereit',
    );
  });

  it('discharges MAX battery into EPS within capacity', async () => {
    const { service, ship } = setup();
    const result = await service.dischargeBattery(2, 1, 'MAX');
    expect(result.transferred).toBe(4);
    expect(ship.energy).toBe(9);
    expect(ship.battery).toBe(0);
  });

  it('rejects destroyed ships and invalid amounts', async () => {
    const destroyed = setup({ status: 'DESTROYED' });
    await expect(
      destroyed.service.dischargeBattery(2, 1, 1),
    ).rejects.toBeInstanceOf(BadRequestException);
    const valid = setup();
    await expect(valid.service.loadReactor(2, 1, 0)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rolls back the transaction when persistence fails', async () => {
    const { service, manager } = setup();
    manager.save.mockRejectedValueOnce(new Error('database failure'));
    await expect(service.dischargeBattery(2, 1, 1)).rejects.toThrow(
      'database failure',
    );
  });
});
