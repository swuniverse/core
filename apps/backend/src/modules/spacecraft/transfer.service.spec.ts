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
import { Spacecraft } from './entities/spacecraft.entity';
import { SpacecraftWreck } from './entities/spacecraft-wreck.entity';
import { TransferService } from './transfer.service';

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
