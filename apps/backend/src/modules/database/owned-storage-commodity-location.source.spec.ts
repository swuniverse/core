jest.mock('../colony/entities/colony-storage.entity', () => ({
  ColonyStorage: class ColonyStorage {},
}));
jest.mock('../spacecraft/entities/cargo-item.entity', () => ({
  CargoItem: class CargoItem {},
}));
jest.mock('../spacecraft/entities/spacecraft-torpedo-storage.entity', () => ({
  SpacecraftTorpedoStorage: class SpacecraftTorpedoStorage {},
}));

import { OwnedStorageCommodityLocationSource } from './owned-storage-commodity-location.source';

describe('OwnedStorageCommodityLocationSource', () => {
  it('returns positive own colony, cargo, and torpedo locations only', async () => {
    const storageRepo = {
      find: jest.fn(async () => [
        {
          amount: 7,
          colony: { id: 1, name: 'Alderaan', userId: 5, starSystem: { name: 'Core' } },
        },
        { amount: 8, colony: { id: 2, name: 'Foreign', userId: 6 } },
      ]),
    };
    const cargoRepo = {
      find: jest.fn(async () => [
        {
          amount: 3,
          spacecraft: {
            id: 4,
            name: 'Falcon',
            userId: 5,
            location: {
              kind: 'GALAXY_FIELD',
              galaxyField: { layerId: 1, cx: 2, cy: 3 },
            },
          },
        },
      ]),
    };
    const torpedoRepo = {
      find: jest.fn(async () => [
        {
          amount: 2,
          spacecraft: {
            id: 4,
            name: 'Falcon',
            userId: 5,
            location: {
              kind: 'SYSTEM_FIELD',
              systemField: { starSystemId: 9, sx: 1, sy: 2 },
            },
          },
        },
      ]),
    };
    const source = new OwnedStorageCommodityLocationSource(
      storageRepo as never,
      cargoRepo as never,
      torpedoRepo as never,
    );

    await expect(source.findLocations(5, 2)).resolves.toEqual([
      { type: 'COLONY', id: 1, name: 'Alderaan', location: 'Core', amount: 7 },
      { type: 'SPACECRAFT', id: 4, name: 'Falcon', location: '1 · 2:3', amount: 3 },
      {
        type: 'TORPEDO_STORAGE',
        id: 4,
        name: 'Falcon',
        location: 'System 9 · 1:2',
        amount: 2,
      },
    ]);
  });
});
