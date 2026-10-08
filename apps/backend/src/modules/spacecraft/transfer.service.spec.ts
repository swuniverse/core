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
jest.mock('../colony/entities/colony-storage.entity', () => ({
  ColonyStorage: class ColonyStorage {},
}));
jest.mock('../colony/entities/crew-assignment.entity', () => ({
  CrewAssignment: class CrewAssignment {},
}));
jest.mock('../colony/colony-crew.service', () => ({
  ColonyCrewService: class ColonyCrewService {},
}));
jest.mock('./ship-colony-context.service', () => ({
  ShipColonyContextService: class ShipColonyContextService {},
}));
jest.mock('./spacecraft-torpedo.service', () => ({
  SpacecraftTorpedoService: class SpacecraftTorpedoService {},
}));

import { BadRequestException } from '@nestjs/common';
import { CargoItem } from './entities/cargo-item.entity';
import { Spacecraft } from './entities/spacecraft.entity';
import { SpacecraftTorpedoStorage } from './entities/spacecraft-torpedo-storage.entity';
import { SpacecraftWreck } from './entities/spacecraft-wreck.entity';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { TransferService } from './transfer.service';
import {
  NoPersonalContactStatusPort,
  RelationshipResolverService,
} from '../alliance/relationship-resolver.service';
import { InMemoryAllianceStore } from '../alliance/testing/in-memory-alliance.store';

const relationship = (status: 'FRIEND' | 'ENEMY' | 'NEUTRAL') => ({
  status,
  isFriend: status === 'FRIEND',
  isEnemy: status === 'ENEMY',
  mayReactAutomatically: status === 'ENEMY',
  mayTransferSafely: status === 'FRIEND',
  mayProvisionProtectedShip: status === 'FRIEND',
  mayShareLivePosition: false,
});

function cargoTransfer(
  status: 'FRIEND' | 'ENEMY' | 'NEUTRAL',
  resolver?: RelationshipResolverService,
  targetShieldsActive = false,
) {
  const sourceShip = {
    id: 1,
    userId: 10,
    status: 'IDLE',
    runtimeSystems: {},
    energy: 10,
    cargoUsed: 2,
    cargoMax: 10,
    locationId: 20,
    location: { id: 20, kind: 'GALAXY_FIELD' },
  };
  const targetShip = {
    id: 2,
    userId: 11,
    status: 'IDLE',
    runtimeSystems: targetShieldsActive ? { SHIELDS: { active: true } } : {},
    cargoUsed: 0,
    cargoMax: 10,
    locationId: 20,
    location: { id: 20, kind: 'GALAXY_FIELD' },
  };
  const sourceCargo = { spacecraftId: 1, commodityId: 3, amount: 2 };
  const targetCargo = { spacecraftId: 2, commodityId: 3, amount: 0 };
  const cargoRepo = {
    findOne: jest
      .fn()
      .mockResolvedValueOnce(sourceCargo)
      .mockResolvedValueOnce(targetCargo),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest
        .fn()
        .mockResolvedValueOnce({ total: '0' })
        .mockResolvedValueOnce({ total: '0' })
        .mockResolvedValueOnce({ total: '1' }),
    })),
    remove: jest.fn(),
    save: jest.fn(async (item) => item),
    create: jest.fn((item) => item),
  };
  const manager = {
    getRepository: jest.fn((entity) =>
      entity === Spacecraft
        ? { find: jest.fn().mockResolvedValue([sourceShip, targetShip]) }
        : entity === CargoItem
          ? cargoRepo
          : {},
    ),
    save: jest.fn(),
  };
  const dataSource = {
    transaction: jest.fn(async (work) => work(manager)),
  };
  const service = new TransferService(
    {} as never,
    { chargeEnergy: jest.fn() } as never,
    dataSource as never,
    {} as never,
    {} as never,
    {} as never,
    (resolver ?? {
      resolve: jest.fn().mockResolvedValue(relationship(status)),
    }) as never,
  );

  return { service, targetCargo };
}

describe('TransferService ship transfers', () => {
  it('offers protected provisioning, but not crew transfer, to a friend', async () => {
    const sourceShip = {
      id: 1,
      userId: 10,
      status: 'IDLE',
      runtimeSystems: {},
      cargoMax: 10,
      crewMax: 10,
      locationId: 20,
      location: { id: 20, kind: 'GALAXY_FIELD' },
    };
    const targetShip = {
      id: 2,
      userId: 11,
      status: 'IDLE',
      runtimeSystems: { SHIELDS: { active: true } },
      cargoMax: 10,
      crewMax: 10,
      locationId: 20,
      location: { id: 20, kind: 'GALAXY_FIELD' },
    };
    const spacecraftRepo = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(sourceShip)
        .mockResolvedValueOnce(targetShip),
    };
    const dataSource = {
      getRepository: jest.fn((entity) =>
        entity === Spacecraft
          ? spacecraftRepo
          : {
              count: jest.fn().mockResolvedValue(0),
              findOneBy: jest.fn().mockResolvedValue(null),
            },
      ),
    };
    const cargoRepo = {
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
      })),
    };
    const service = new TransferService(
      cargoRepo as never,
      {} as never,
      dataSource as never,
      {} as never,
      {} as never,
      { getCommodity: jest.fn() } as never,
      {
        resolve: jest.fn().mockResolvedValue({
          ...relationship('FRIEND'),
          mayTransferSafely: false,
          mayProvisionProtectedShip: true,
        }),
      } as never,
    );

    const quote = await service.getShipTransferQuote(1, 10, 2);

    expect(quote.available).toBe(true);
    expect(quote.crewTransferAvailable).toBe(true);
    expect(quote.torpedoTransferAvailable).toBe(true);
  });

  it.each([
    ['FRIEND', true],
    ['NEUTRAL', false],
    ['ENEMY', false],
  ] as const)(
    'reports ship transfers as available only for friends (%s)',
    async (status, expectedAvailable) => {
      const sourceShip = {
        id: 1,
        userId: 10,
        status: 'IDLE',
        runtimeSystems: {},
        cargoMax: 10,
        crewMax: 10,
        locationId: 20,
        location: { id: 20, kind: 'GALAXY_FIELD' },
      };
      const targetShip = {
        id: 2,
        userId: 11,
        status: 'IDLE',
        runtimeSystems: {},
        cargoMax: 10,
        crewMax: 10,
        locationId: 20,
        location: { id: 20, kind: 'GALAXY_FIELD' },
      };
      const count = jest.fn().mockResolvedValue(0);
      const spacecraftRepo = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(sourceShip)
          .mockResolvedValueOnce(targetShip),
      };
      const dataSource = {
        getRepository: jest.fn((entity) =>
          entity === Spacecraft
            ? spacecraftRepo
            : { count, findOneBy: jest.fn().mockResolvedValue(null) },
        ),
      };
      const cargoRepo = {
        find: jest.fn().mockResolvedValue([]),
        createQueryBuilder: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
        })),
      };
      const service = new TransferService(
        cargoRepo as never,
        {} as never,
        dataSource as never,
        {} as never,
        {} as never,
        { getCommodity: jest.fn() } as never,
        {
          resolve: jest.fn().mockResolvedValue(relationship(status)),
        } as never,
      );

      const quote = await service.getShipTransferQuote(1, 10, 2);

      expect(quote.available).toBe(expectedAvailable);
      expect(quote.crewTransferAvailable).toBe(expectedAvailable);
      expect(quote.torpedoTransferAvailable).toBe(expectedAvailable);
    },
  );
  it('rejects cargo provisioning to a neutral foreign ship', async () => {
    const { service, targetCargo } = cargoTransfer('NEUTRAL');

    await expect(
      service.transferShipCargo(1, 10, 2, 3, 1, 'TO_TARGET'),
    ).rejects.toThrow('Transfer nur zwischen Freunden erlaubt');

    expect(targetCargo.amount).toBe(0);
  });

  it('lets a friend provision a protected foreign ship with cargo', async () => {
    const { service, targetCargo } = cargoTransfer(
      'FRIEND',
      undefined,
      true,
    );

    await service.transferShipCargo(1, 10, 2, 3, 1, 'TO_TARGET');

    expect(targetCargo.amount).toBe(1);
  });

  it('rejects cargo transfer to a cross-faction enemy', async () => {
    const { service, targetCargo } = cargoTransfer('ENEMY');

    await expect(
      service.transferShipCargo(1, 10, 2, 3, 1, 'TO_TARGET'),
    ).rejects.toThrow('Transfer nur zwischen Freunden erlaubt');

    expect(targetCargo.amount).toBe(0);
  });

  it('fails closed when relationship resolution fails', async () => {
    const store = new InMemoryAllianceStore();
    jest
      .spyOn(store, 'findPlayer')
      .mockRejectedValue(new Error('database unavailable'));
    const { service, targetCargo } = cargoTransfer(
      'NEUTRAL',
      new RelationshipResolverService(store, new NoPersonalContactStatusPort()),
    );

    await expect(
      service.transferShipCargo(1, 10, 2, 3, 1, 'TO_TARGET'),
    ).rejects.toThrow('Transfer nur zwischen Freunden erlaubt');

    expect(targetCargo.amount).toBe(0);
  });

  it('lets a friend provision a protected foreign ship with torpedoes', async () => {
    const sourceShip = {
      id: 1,
      userId: 10,
      status: 'IDLE',
      runtimeSystems: {},
      locationId: 20,
      location: { id: 20, kind: 'GALAXY_FIELD' },
    };
    const targetShip = {
      id: 2,
      userId: 11,
      status: 'IDLE',
      runtimeSystems: { SHIELDS: { active: true } },
      locationId: 20,
      location: { id: 20, kind: 'GALAXY_FIELD' },
    };
    const sourceStorage = {
      spacecraftId: 1,
      torpedoTypeId: 3,
      commodityId: 4,
      amount: 2,
      isActive: true,
    };
    const targetStorage = {
      spacecraftId: 2,
      torpedoTypeId: 3,
      commodityId: 4,
      amount: 0,
      isActive: false,
    };
    const storageRepo = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(sourceStorage)
        .mockResolvedValueOnce(targetStorage),
      find: jest.fn().mockResolvedValue([targetStorage]),
      create: jest.fn((item) => item),
      save: jest.fn(),
    };
    const manager = {
      getRepository: jest.fn((entity) =>
        entity === Spacecraft
          ? { find: jest.fn().mockResolvedValue([sourceShip, targetShip]) }
          : entity === SpacecraftTorpedoStorage
            ? storageRepo
            : {},
      ),
    };
    const service = new TransferService(
      {} as never,
      { chargeEnergy: jest.fn() } as never,
      { transaction: jest.fn(async (work) => work(manager)) } as never,
      { getCapacity: jest.fn().mockResolvedValue(10) } as never,
      {} as never,
      {} as never,
      {
        resolve: jest.fn().mockResolvedValue({
          ...relationship('FRIEND'),
          mayTransferSafely: false,
          mayProvisionProtectedShip: true,
        }),
      } as never,
    );

    await service.transferShipTorpedoes(1, 10, 2, 1, 'TO_TARGET');

    expect(targetStorage.amount).toBe(1);
  });

  it('rejects provisioning a protected neutral ship', async () => {
    const { service, targetCargo } = cargoTransfer(
      'NEUTRAL',
      undefined,
      true,
    );

    await expect(
      service.transferShipCargo(1, 10, 2, 3, 1, 'TO_TARGET'),
    ).rejects.toThrow('Transfer nur zwischen Freunden erlaubt');

    expect(targetCargo.amount).toBe(0);
  });

  it('rejects crew transfer from a neutral foreign ship', async () => {
    const sourceShip = {
      id: 1,
      userId: 10,
      status: 'IDLE',
      runtimeSystems: {},
      locationId: 20,
      location: { id: 20, kind: 'GALAXY_FIELD' },
    };
    const targetShip = {
      id: 2,
      userId: 11,
      status: 'IDLE',
      runtimeSystems: {},
      locationId: 20,
      location: { id: 20, kind: 'GALAXY_FIELD' },
    };
    const manager = {
      getRepository: jest.fn((entity) =>
        entity === Spacecraft
          ? { find: jest.fn().mockResolvedValue([sourceShip, targetShip]) }
          : {},
      ),
    };
    const service = new TransferService(
      {} as never,
      {} as never,
      { transaction: jest.fn(async (work) => work(manager)) } as never,
      {} as never,
      {} as never,
      {} as never,
      {
        resolve: jest.fn().mockResolvedValue(relationship('NEUTRAL')),
      } as never,
    );

    await expect(
      service.transferShipCrew(1, 10, 2, 1, 'FROM_TARGET'),
    ).rejects.toThrow('Transfer nur zwischen Freunden erlaubt');
  });

  it('lets a friend supply crew to a protected foreign ship', async () => {
    const sourceShip = {
      id: 1,
      userId: 10,
      status: 'IDLE',
      runtimeSystems: {},
      locationId: 20,
      location: { id: 20, kind: 'GALAXY_FIELD' },
      crew: 2,
      crewMax: 10,
    };
    const targetShip = {
      id: 2,
      userId: 11,
      status: 'IDLE',
      runtimeSystems: { SHIELDS: { active: true } },
      locationId: 20,
      location: { id: 20, kind: 'GALAXY_FIELD' },
      crew: 0,
      crewMax: 10,
    };
    const assignments = [
      { spacecraftId: 1, crewId: 1 },
      { spacecraftId: 1, crewId: 2 },
    ];
    const crewRepo = {
      find: jest.fn().mockResolvedValue(assignments),
      count: jest.fn().mockResolvedValue(0),
      save: jest.fn(),
    };
    const manager = {
      getRepository: jest.fn((entity) =>
        entity === Spacecraft
          ? { find: jest.fn().mockResolvedValue([sourceShip, targetShip]) }
          : entity === CrewAssignment
            ? crewRepo
            : {},
      ),
      save: jest.fn(),
    };
    const service = new TransferService(
      {} as never,
      { chargeEnergy: jest.fn() } as never,
      { transaction: jest.fn(async (work) => work(manager)) } as never,
      {} as never,
      {} as never,
      {} as never,
      {
        resolve: jest.fn().mockResolvedValue({
          ...relationship('FRIEND'),
          mayTransferSafely: false,
          mayProvisionProtectedShip: true,
        }),
      } as never,
    );

    await service.transferShipCrew(1, 10, 2, 1, 'TO_TARGET');

    expect(assignments[0].spacecraftId).toBe(2);
  });
});

describe('TransferService ship transfer quote matches the transfer action', () => {
  function shieldedTarget(
    status: 'FRIEND' | 'NEUTRAL',
    targetUserId: number,
    direction?: 'TO_TARGET' | 'FROM_TARGET',
  ) {
    const ship = (id: number, userId: number, shields: boolean) => ({
      id,
      userId,
      status: 'IDLE',
      runtimeSystems: shields ? { SHIELDS: { active: true } } : {},
      cargoMax: 10,
      crewMax: 10,
      locationId: 20,
      location: { id: 20, kind: 'GALAXY_FIELD' },
    });
    const sourceShip = ship(1, 10, false);
    const targetShip = ship(2, targetUserId, true);
    const spacecraftRepo = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(sourceShip)
        .mockResolvedValueOnce(targetShip),
      find: jest.fn().mockResolvedValue([sourceShip, targetShip]),
    };
    const dataSource = {
      getRepository: jest.fn((entity) =>
        entity === Spacecraft
          ? spacecraftRepo
          : {
              count: jest.fn().mockResolvedValue(0),
              findOneBy: jest.fn().mockResolvedValue(null),
            },
      ),
      transaction: jest.fn(async (work) =>
        work({ getRepository: () => spacecraftRepo }),
      ),
    };
    const cargoRepo = {
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
      })),
    };
    const service = new TransferService(
      cargoRepo as never,
      {} as never,
      dataSource as never,
      {} as never,
      {} as never,
      { getCommodity: jest.fn() } as never,
      { resolve: jest.fn().mockResolvedValue(relationship(status)) } as never,
    );
    return {
      quote: () => service.getShipTransferQuote(1, 10, 2, direction),
      service,
    };
  }

  it('reports shields as blocking a transfer to an own shielded ship', async () => {
    const { quote } = shieldedTarget('FRIEND', 10, 'TO_TARGET');

    await expect(quote()).resolves.toMatchObject({
      available: false,
      reason: 'Schilde müssen deaktiviert sein',
      crewTransferAvailable: false,
      torpedoTransferAvailable: false,
    });
  });

  it('reports shields as blocking a withdrawal from a shielded friend', async () => {
    const { quote, service } = shieldedTarget('FRIEND', 11, 'FROM_TARGET');

    await expect(quote()).resolves.toMatchObject({
      available: false,
      reason: 'Schilde müssen deaktiviert sein',
    });
    await expect(
      service.transferShipCrew(1, 10, 2, 1, 'FROM_TARGET'),
    ).rejects.toThrow('Schilde müssen deaktiviert sein');
  });

  it('offers provisioning a shielded friend', async () => {
    const { quote } = shieldedTarget('FRIEND', 11, 'TO_TARGET');

    await expect(quote()).resolves.toMatchObject({
      available: true,
      reason: null,
      crewTransferAvailable: true,
      torpedoTransferAvailable: true,
    });
  });

  it('rejects provisioning a shielded neutral ship in the quote', async () => {
    const { quote } = shieldedTarget('NEUTRAL', 11, 'TO_TARGET');

    await expect(quote()).resolves.toMatchObject({
      available: false,
      reason: 'Transfer nur zwischen Freunden erlaubt',
    });
  });
});

describe('TransferService wreck recovery', () => {
  it('rejects different canonical locations', async () => {
    const ship = {
      id: 1,
      userId: 2,
      locationId: 10,
      location: { id: 10, kind: 'GALAXY_FIELD' },
    };
    const wreck = {
      id: 3,
      locationId: 11,
      location: { id: 11, kind: 'GALAXY_FIELD' },
      cargo: [{ commodityId: 4, amount: 5 }],
    };
    const manager = {
      findOne: jest.fn(async (entity) =>
        entity === Spacecraft
          ? ship
          : entity === SpacecraftWreck
            ? wreck
            : null,
      ),
    };
    const dataSource = {
      transaction: jest.fn(async (work) => work(manager)),
    };
    const service = new TransferService(
      {} as never,
      {} as never,
      dataSource as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.recoverWreckCargo(1, 2, 3, 4, 1),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(manager.findOne).toHaveBeenCalledWith(
      Spacecraft,
      expect.objectContaining({
        relations: {
          location: { galaxyField: true, systemField: true },
        },
      }),
    );
  });
});
