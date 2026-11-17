import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';

function createService() {
  const users = [
    { id: 1, username: 'Admin', isAdmin: true, refreshToken: 'admin' },
    { id: 2, username: 'Leia', isAdmin: false, refreshToken: 'player' },
  ];
  let lock: { userId: number; remainingTicks: number; reason: string } | null = null;
  const userRepo = {
    findOneBy: jest.fn(async ({ id }) => users.find((user) => user.id === id) ?? null),
    update: jest.fn(async (id, values) => Object.assign(users.find((user) => user.id === id)!, values)),
  };
  const lockRepo = {
    findOne: jest.fn(async ({ where }) => lock?.userId === where.userId ? lock : null),
    create: jest.fn((values) => values),
    save: jest.fn(async (value) => { lock = value; return value; }),
    delete: jest.fn(async ({ userId }) => { if (lock?.userId === userId) lock = null; }),
  };
  const service = new AuthService(
    userRepo as never, {} as never, {} as never,
    {} as never, {} as never, {} as never, { get: jest.fn() } as never,
    {} as never, [], lockRepo as never,
  );
  return { service, users, lockRepo, getLock: () => lock };
}

describe('admin user locks', () => {
  it('creates or overwrites a lock and revokes the refresh token', async () => {
    const { service, users, getLock } = createService();

    await service.lockUser(2, { ticks: 4, reason: ' Regelverstoß ' });
    await service.lockUser(2, { ticks: 2, reason: 'Wiederholung' });

    expect(getLock()).toEqual({ userId: 2, remainingTicks: 2, reason: 'Wiederholung' });
    expect(users[1].refreshToken).toBeNull();
  });

  it('refuses to lock admins and validates lock input', async () => {
    const { service } = createService();

    await expect(service.lockUser(1, { ticks: 1, reason: 'x' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.lockUser(2, { ticks: 0, reason: 'x' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.lockUser(2, { ticks: 1, reason: ' ' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('removes an active lock', async () => {
    const { service, getLock } = createService();
    await service.lockUser(2, { ticks: 1, reason: 'x' });

    await service.unlockUser(2);

    expect(getLock()).toBeNull();
  });
});
