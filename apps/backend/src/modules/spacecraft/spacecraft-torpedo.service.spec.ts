jest.mock('./entities/spacecraft-torpedo-storage.entity', () => ({
  SpacecraftTorpedoStorage: class SpacecraftTorpedoStorage {},
}));
jest.mock('./entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
}));
jest.mock('./entities/ship-class-def.entity', () => ({
  ShipClassDef: class ShipClassDef {},
}));
jest.mock('../colony/entities/colony.entity', () => ({
  Colony: class Colony {},
}));

import { SpacecraftTorpedoService } from './spacecraft-torpedo.service';

function createService() {
  const torpedoRepo = {
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
  };
  const shipClassRepo = { findOneBy: jest.fn() };
  const gameData = {
    getTorpedoType: jest.fn((id: number) =>
      id === 81
        ? { id: 81, commodityId: 81, name: 'Micro', baseDamage: 90 }
        : undefined,
    ),
  };
  const colonyStorageService = {
    lowerStorage: jest.fn(async () => 1),
    upperStorage: jest.fn(async () => 1),
  };
  const service = new SpacecraftTorpedoService(
    torpedoRepo as any,
    shipClassRepo as any,
    gameData as any,
    colonyStorageService as any,
  );
  return { service, torpedoRepo, shipClassRepo, colonyStorageService };
}

describe('SpacecraftTorpedoService', () => {
  const colony = { id: 1, storageMax: 100 } as any;
  const ship = { id: 7, shipClassId: 1 } as any;

  it('loads torpedoes from colony storage into empty ship storage', async () => {
    const { service, torpedoRepo, shipClassRepo, colonyStorageService } =
      createService();
    shipClassRepo.findOneBy.mockResolvedValue({ category: 'CORVETTE' });
    torpedoRepo.findOne.mockResolvedValue(null);

    const storage = await service.loadFromColony(colony, ship, 81, 2);

    expect(colonyStorageService.lowerStorage).toHaveBeenCalledWith(
      colony,
      81,
      2,
    );
    expect(torpedoRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        spacecraftId: 7,
        torpedoTypeId: 81,
        commodityId: 81,
      }),
    );
    expect(storage.amount).toBe(2);
  });

  it('rejects over-capacity loads and mixed loaded types', async () => {
    const { service, torpedoRepo, shipClassRepo } = createService();
    shipClassRepo.findOneBy.mockResolvedValue({ category: 'CORVETTE' });
    torpedoRepo.findOne.mockResolvedValue({
      spacecraftId: 7,
      torpedoTypeId: 82,
      commodityId: 82,
      amount: 1,
    });
    await expect(service.loadFromColony(colony, ship, 81, 1)).rejects.toThrow(
      'Unload current torpedo type first',
    );

    torpedoRepo.findOne.mockResolvedValue({
      spacecraftId: 7,
      torpedoTypeId: 81,
      commodityId: 81,
      amount: 4,
    });
    await expect(service.loadFromColony(colony, ship, 81, 1)).rejects.toThrow(
      'Not enough torpedo capacity',
    );
  });

  it('unloads torpedoes to colony and consumes for attacks', async () => {
    const { service, torpedoRepo, colonyStorageService } = createService();
    const storage = {
      spacecraftId: 7,
      torpedoTypeId: 81,
      commodityId: 81,
      amount: 3,
    };
    torpedoRepo.findOne.mockResolvedValue(storage);

    await service.unloadToColony(colony, ship, 2, 100);
    expect(colonyStorageService.upperStorage).toHaveBeenCalledWith(
      colony,
      81,
      2,
      100,
    );
    expect(storage.amount).toBe(1);

    const torpedo = await service.consumeForAttack(ship, 1);
    expect(torpedo).toMatchObject({ id: 81, commodityId: 81 });
    expect(storage.amount).toBe(0);
  });
});
