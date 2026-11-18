jest.mock('../auth/user.entity', () => ({ User: class User {} }));
jest.mock('../colony/entities/colony.entity', () => ({
  Colony: class Colony {},
}));
jest.mock('./entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  SpacecraftStatus: { DESTROYED: 'DESTROYED' },
}));

import { BadRequestException, Logger } from '@nestjs/common';
import { SpacecraftCommunicationService } from './spacecraft-communication.service';

function serviceFixture() {
  const shipRepo = { findOne: jest.fn(), find: jest.fn(async () => []) };
  const colonyRepo = {
    find: jest.fn<Promise<any[]>, any[]>(async () => []),
    findOne: jest.fn(),
  };
  const userRepo = {
    findBy: jest.fn<Promise<any[]>, any[]>(async () => []),
    findOneBy: jest.fn(async () => ({ id: 2, isNpc: false })),
  };
  const logRepo = {
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({
      id: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...x,
    })),
  };
  const distressRepo = {
    findOne: jest.fn(),
    find: jest.fn(async () => []),
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({ id: 1, startedAt: new Date(), ...x })),
  };
  const messaging = { send: jest.fn() };
  const gateway = { emitToAll: jest.fn() };
  const runtimeState = { initialize: jest.fn(() => ({})) };
  const relationships = { resolve: jest.fn(async () => ({ isFriend: false })) };
  const crewEnhancement = { enhanceSpacecraft: jest.fn() };
  const service = new SpacecraftCommunicationService(
    shipRepo as never,
    colonyRepo as never,
    userRepo as never,
    logRepo as never,
    distressRepo as never,
    messaging as never,
    gateway as never,
    runtimeState as never,
    relationships as never,
    crewEnhancement as never,
  );
  return {
    service,
    relationships,
    crewEnhancement,
    shipRepo,
    colonyRepo,
    userRepo,
    distressRepo,
    gateway,
    messaging,
  };
}

describe('SpacecraftCommunicationService', () => {
  it('enforces distress limit and makes repeated starts idempotent', async () => {
    const { service, shipRepo, distressRepo } = serviceFixture();
    shipRepo.findOne.mockResolvedValue({ id: 7, userId: 1, status: 'IDLE' });
    await expect(
      service.startDistress(7, 1, 'x'.repeat(251)),
    ).rejects.toBeInstanceOf(BadRequestException);
    distressRepo.findOne.mockResolvedValue({
      id: 9,
      message: 'Hilfe',
      active: true,
    });
    await expect(service.startDistress(7, 1, 'Hilfe')).resolves.toMatchObject({
      id: 9,
    });
    expect(distressRepo.save).not.toHaveBeenCalled();
  });

  it('uses canonical location IDs for nearby messages', async () => {
    const { service, shipRepo, messaging } = serviceFixture();
    shipRepo.findOne
      .mockResolvedValueOnce({
        id: 7,
        userId: 1,
        name: 'Source',
        status: 'IDLE',
        locationId: 42,
        location: { id: 42, kind: 'GALAXY_FIELD' },
      })
      .mockResolvedValueOnce({
        id: 8,
        userId: 2,
        name: 'Target',
        status: 'IDLE',
        locationId: 42,
        location: { id: 42, kind: 'GALAXY_FIELD' },
      });

    await expect(service.sendNearbyMessage(7, 1, 8, 'Hallo')).resolves.toEqual({
      delivered: true,
    });
    expect(messaging.send).toHaveBeenCalled();
  });

  describe('FOREIGN_CONTACT_MESSAGE crew experience', () => {
    function nearby(targetLocationId = 42) {
      const fixture = serviceFixture();
      fixture.shipRepo.findOne
        .mockResolvedValueOnce({
          id: 7, userId: 1, name: 'Source', status: 'IDLE',
          locationId: 42, location: { id: 42, kind: 'GALAXY_FIELD' },
        })
        .mockResolvedValueOnce({
          id: 8, userId: 2, name: 'Target', status: 'IDLE',
          locationId: targetLocationId, location: { id: targetLocationId, kind: 'GALAXY_FIELD' },
        });
      return fixture;
    }

    it('rewards the source crew for a neutral foreign recipient on the same field', async () => {
      const { service, crewEnhancement, relationships } = nearby();

      await service.sendNearbyMessage(7, 1, 8, 'Hallo');

      expect(relationships.resolve).toHaveBeenCalledWith(1, 2);
      expect(crewEnhancement.enhanceSpacecraft).toHaveBeenCalledWith(7, 'FOREIGN_CONTACT_MESSAGE');
    });

    it('still reports delivery when awarding experience fails', async () => {
      const { service, crewEnhancement } = nearby();
      crewEnhancement.enhanceSpacecraft.mockRejectedValue(new Error('db down'));
      jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

      await expect(service.sendNearbyMessage(7, 1, 8, 'Hallo')).resolves.toEqual({ delivered: true });
    });

    it('gives no experience to a friend', async () => {
      const { service, crewEnhancement, relationships, messaging } = nearby();
      relationships.resolve.mockResolvedValue({ isFriend: true });

      await service.sendNearbyMessage(7, 1, 8, 'Hallo');

      expect(messaging.send).toHaveBeenCalled();
      expect(crewEnhancement.enhanceSpacecraft).not.toHaveBeenCalled();
    });

    it('gives no experience to an NPC', async () => {
      const { service, crewEnhancement, userRepo, messaging } = nearby();
      userRepo.findOneBy.mockResolvedValue({ id: 2, isNpc: true });

      await service.sendNearbyMessage(7, 1, 8, 'Hallo');

      expect(messaging.send).toHaveBeenCalled();
      expect(crewEnhancement.enhanceSpacecraft).not.toHaveBeenCalled();
    });

    it('sends nothing and gives no experience on another field', async () => {
      const { service, crewEnhancement, messaging } = nearby(43);

      await expect(service.sendNearbyMessage(7, 1, 8, 'Hallo')).rejects.toThrow(
        'Empfänger befindet sich nicht auf diesem Feld',
      );
      expect(messaging.send).not.toHaveBeenCalled();
      expect(crewEnhancement.enhanceSpacecraft).not.toHaveBeenCalled();
    });

    it('gives no experience from a foreign source ship', async () => {
      const { service, shipRepo, crewEnhancement } = serviceFixture();
      shipRepo.findOne.mockResolvedValue(null);

      await expect(service.sendNearbyMessage(7, 1, 8, 'Hallo')).rejects.toThrow();
      expect(crewEnhancement.enhanceSpacecraft).not.toHaveBeenCalled();
    });
  });

  it('uses canonical colony locations for communication recipients', async () => {
    const { service, shipRepo, colonyRepo, userRepo } = serviceFixture();
    shipRepo.findOne.mockResolvedValue({
      id: 7,
      userId: 1,
      status: 'IDLE',
      locationId: 42,
      location: {
        id: 42,
        kind: 'SYSTEM_FIELD',
        systemField: { starSystemId: 9, sx: 5, sy: 5 },
      },
    });
    colonyRepo.find.mockResolvedValue([
      {
        userId: 2,
        systemFieldId: 31,
        systemField: { starSystemId: 9, sx: 6, sy: 5 },
      },
    ]);
    userRepo.findBy.mockResolvedValue([{ id: 2, username: 'Leia' }]);

    await expect(service.getRecipients(7, 1)).resolves.toEqual([
      { userId: 2, username: 'Leia', source: 'COLONY' },
    ]);
    expect(colonyRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: [
          { systemField: { starSystemId: 9 } },
          { starSystemId: 9 },
        ],
        relations: ['systemField'],
      }),
    );
  });

  it('uses canonical locations for colony messages', async () => {
    const { service, shipRepo, colonyRepo } = serviceFixture();
    shipRepo.findOne.mockResolvedValue({
      id: 7,
      userId: 1,
      status: 'IDLE',
      locationId: 42,
      location: {
        id: 42,
        kind: 'SYSTEM_FIELD',
        systemField: { starSystemId: 9, sx: 5, sy: 5 },
      },
    });
    colonyRepo.findOne.mockResolvedValue({
      id: 3,
      name: 'Alderaan',
      systemFieldId: 30,
      systemField: { starSystemId: 9, sx: 5, sy: 5 },
      celestialObject: { name: 'Alderaan' },
      changeable: { colonyMessage: 'Welcome' },
    });

    await expect(service.getColonyMessage(7, 1, 3)).resolves.toMatchObject({
      colonyId: 3,
      message: 'Welcome',
    });
  });
});
