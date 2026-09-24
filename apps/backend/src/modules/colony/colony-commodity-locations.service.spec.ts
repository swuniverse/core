jest.mock('./entities/colony-storage.entity', () => ({
  ColonyStorage: class ColonyStorage {},
}));
jest.mock('../spacecraft/entities/cargo-item.entity', () => ({
  CargoItem: class CargoItem {},
}));
jest.mock('../spacecraft/entities/ship-class-def.entity', () => ({
  ShipClassDef: class ShipClassDef {},
}));
jest.mock('./colony-ownership.service', () => ({
  ColonyOwnershipService: class ColonyOwnershipService {},
}));
jest.mock('../game-data/game-data.service', () => ({
  GameDataService: class GameDataService {},
}));

import { NotFoundException } from '@nestjs/common';
import { FindOperator } from 'typeorm';
import { ColonyCommodityLocationsService } from './colony-commodity-locations.service';

describe('ColonyCommodityLocationsService', () => {
  function setup() {
    const ownership = {
      findOwnedColony: jest.fn<Promise<any>, [number, number]>(async () => ({
        id: 7,
        userId: 99,
      })),
    };
    const storageRepo = {
      find: jest.fn<Promise<any[]>, [any]>(async () => [
        storage(1, 3, 'Beta', 202, 99, 643),
        storage(2, 2, 'Alpha', 201, 99, 1572),
        storage(3, 4, 'Foreign', 203, 100, 9999),
        storage(4, 5, 'Zero', 204, 99, 0),
        storage(5, 6, 'Negative', 205, 99, -4),
        storage(6, 7, 'Wrong Commodity', 206, 99, 700, 3),
      ]),
    };
    const cargoRepo = {
      find: jest.fn<Promise<any[]>, [any]>(async () => [
        cargo(1, 9, 'Y-Frachter', 44, 99, 1),
        cargo(2, 10, 'Foreign Ship', 45, 100, 500),
        cargo(3, 11, 'Zero Ship', 46, 99, 0),
        cargo(4, 12, 'Negative Ship', 47, 99, -2),
        cargo(5, 13, 'Wrong Commodity Ship', 48, 99, 600, 3),
      ]),
    };
    const shipClassRepo = {
      findBy: jest.fn<Promise<any[]>, [any]>(async () => [
        { id: 44, key: 'Y_FREIGHTER' },
      ]),
    };
    const gameData = {
      getCommodity: jest.fn<{ id: number; name: string } | undefined, [number]>(
        () => ({ id: 2, name: 'Baumaterial' }),
      ),
    };
    const service = new ColonyCommodityLocationsService(
      ownership as never,
      storageRepo as never,
      cargoRepo as never,
      shipClassRepo as never,
      gameData as never,
    );

    return {
      ownership,
      storageRepo,
      cargoRepo,
      shipClassRepo,
      gameData,
      service,
    };
  }

  it('validates source-colony ownership before querying any locations', async () => {
    const { ownership, storageRepo, cargoRepo, shipClassRepo, service } =
      setup();
    ownership.findOwnedColony.mockRejectedValue(new NotFoundException());

    await expect(service.getLocations(7, 2, 99)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(storageRepo.find).not.toHaveBeenCalled();
    expect(cargoRepo.find).not.toHaveBeenCalled();
    expect(shipClassRepo.findBy).not.toHaveBeenCalled();
  });

  it('returns only positive own locations and maps existing classes as ships', async () => {
    const {
      ownership,
      storageRepo,
      cargoRepo,
      shipClassRepo,
      gameData,
      service,
    } = setup();

    const result = await service.getLocations(7, 2, 99);

    expect(ownership.findOwnedColony).toHaveBeenCalledWith(7, 99);
    expect(gameData.getCommodity).toHaveBeenCalledWith(2);
    expect(result).toEqual({
      commodityId: 2,
      commodityName: 'Baumaterial',
      colonies: [
        {
          colonyId: 2,
          colonyName: 'Alpha',
          colonyClassId: 201,
          amount: 1572,
        },
        {
          colonyId: 3,
          colonyName: 'Beta',
          colonyClassId: 202,
          amount: 643,
        },
      ],
      spacecraft: [
        {
          spacecraftId: 9,
          spacecraftName: 'Y-Frachter',
          shipClassId: 44,
          shipClassKey: 'Y_FREIGHTER',
          entityType: 'SHIP',
          amount: 1,
        },
      ],
    });

    const storageOptions = storageRepo.find.mock.calls[0][0];
    expect(storageOptions.relations).toEqual(['colony']);
    expect(storageOptions.where).toEqual({
      commodityId: 2,
      amount: expect.any(FindOperator),
      colony: { userId: 99 },
    });
    expect(storageOptions.where.amount.type).toBe('moreThan');
    expect(storageOptions.where.amount.value).toBe(0);

    const cargoOptions = cargoRepo.find.mock.calls[0][0];
    expect(cargoOptions.relations).toEqual(['spacecraft']);
    expect(cargoOptions.where).toEqual({
      commodityId: 2,
      amount: expect.any(FindOperator),
      spacecraft: { userId: 99 },
    });
    expect(cargoOptions.where.amount.type).toBe('moreThan');
    expect(cargoOptions.where.amount.value).toBe(0);

    const classWhere = shipClassRepo.findBy.mock.calls[0][0];
    expect(classWhere.id).toBeInstanceOf(FindOperator);
    expect(classWhere.id.type).toBe('in');
    expect(classWhere.id.value).toEqual([44]);
  });

  it('uses German name ordering with ID tie-breaks and a commodity fallback', async () => {
    const { storageRepo, cargoRepo, shipClassRepo, gameData, service } =
      setup();
    storageRepo.find.mockResolvedValue([
      storage(1, 8, 'Zeta', 208, 99, 1, 404),
      storage(2, 7, 'Ähre', 207, 99, 1, 404),
      storage(3, 6, 'Ähre', 206, 99, 1, 404),
    ]);
    cargoRepo.find.mockResolvedValue([
      cargo(1, 15, 'Zeta', 50, 99, 1, 404),
      cargo(2, 14, 'Ähre', 49, 99, 1, 404),
      cargo(3, 13, 'Ähre', 48, 99, 1, 404),
    ]);
    shipClassRepo.findBy.mockResolvedValue([
      { id: 48, key: 'A' },
      { id: 49, key: 'B' },
      { id: 50, key: 'C' },
    ]);
    gameData.getCommodity.mockReturnValue(undefined);

    const result = await service.getLocations(7, 404, 99);

    expect(result.commodityName).toBe('Ware #404');
    expect(result.colonies.map((entry) => entry.colonyId)).toEqual([6, 7, 8]);
    expect(result.spacecraft.map((entry) => entry.spacecraftId)).toEqual([
      13, 14, 15,
    ]);
  });
});

function storage(
  id: number,
  colonyId: number,
  colonyName: string,
  colonyClassId: number,
  userId: number,
  amount: number,
  commodityId = 2,
) {
  return {
    id,
    colonyId,
    commodityId,
    amount,
    colony: { id: colonyId, name: colonyName, colonyClassId, userId },
  };
}

function cargo(
  id: number,
  spacecraftId: number,
  spacecraftName: string,
  shipClassId: number,
  userId: number,
  amount: number,
  commodityId = 2,
) {
  return {
    id,
    spacecraftId,
    commodityId,
    amount,
    spacecraft: {
      id: spacecraftId,
      name: spacecraftName,
      shipClassId,
      userId,
    },
  };
}
