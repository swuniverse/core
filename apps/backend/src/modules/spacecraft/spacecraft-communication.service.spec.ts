jest.mock('../auth/user.entity', () => ({ User: class User {} }));
jest.mock('../colony/entities/colony.entity', () => ({
  Colony: class Colony {},
}));
jest.mock('./entities/spacecraft.entity', () => ({
  Spacecraft: class Spacecraft {},
  SpacecraftStatus: { DESTROYED: 'DESTROYED' },
}));

import { BadRequestException } from '@nestjs/common';
import { SpacecraftCommunicationService } from './spacecraft-communication.service';

function serviceFixture() {
  const shipRepo = { findOne: jest.fn(), find: jest.fn(async () => []) };
  const colonyRepo = { find: jest.fn(async () => []), findOne: jest.fn() };
  const userRepo = { findBy: jest.fn(async () => []) };
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
  const service = new SpacecraftCommunicationService(
    shipRepo as never,
    colonyRepo as never,
    userRepo as never,
    logRepo as never,
    distressRepo as never,
    messaging as never,
    gateway as never,
  );
  return { service, shipRepo, distressRepo, gateway };
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
});
