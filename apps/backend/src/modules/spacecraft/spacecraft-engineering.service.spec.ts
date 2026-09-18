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
import { SpacecraftEngineeringService } from './spacecraft-engineering.service';

function setup(shipOverrides = {}, cargoAmount = 5) {
  const ship = {
    id: 2,
    userId: 1,
    status: 'IDLE',
    energy: 5,
    energyMax: 10,
    epsMax: 10,
    battery: 4,
    batteryMax: 6,
    reactorFuel: 2,
    reactorFuelMax: 8,
    cargoUsed: cargoAmount,
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
      String(entity.name).includes('SpacecraftModule') ? [reactor] : [cargo],
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
  return {
    service: new SpacecraftEngineeringService(dataSource as any),
    ship,
    cargo,
    manager,
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
