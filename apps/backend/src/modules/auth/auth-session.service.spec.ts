import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import type { AccountAccessCheck } from './account-access-check';

function setup(checks: AccountAccessCheck[] = []) {
  const users = [
    {
      id: 42,
      username: 'Leia',
      email: 'leia@example.test',
      passwordHash: '',
      refreshToken: 'refresh-42',
      faction: null,
      prestige: 0,
      onboardingCompleted: true,
      starterColonyId: null,
      isAdmin: false,
      isNpc: false,
      permissions: [],
      createdAt: new Date('2026-01-01T00:00:00Z'),
    },
    {
      id: 7,
      username: '42',
      email: 'numeric@example.test',
      passwordHash: '',
      refreshToken: 'refresh-numeric',
      faction: null,
      prestige: 0,
      onboardingCompleted: true,
      starterColonyId: null,
      isAdmin: false,
      isNpc: false,
      permissions: [],
      createdAt: new Date('2026-01-01T00:00:00Z'),
    },
  ];
  const userRepo = {
    findOne: jest.fn(async ({ where }) => {
      if ('refreshToken' in where) {
        return users.find((user) => user.refreshToken === where.refreshToken) ?? null;
      }
      const username = String(where.username?._objectLiteralParameters?.username ?? where.username?._value ?? '');
      return users.find((user) => user.username.toLowerCase() === username.toLowerCase()) ?? null;
    }),
    findOneBy: jest.fn(async ({ id }) => users.find((user) => user.id === id) ?? null),
    update: jest.fn(async (id, values) => {
      const user = users.find((candidate) => candidate.id === id);
      if (user) Object.assign(user, values);
    }),
  };
  const jwt = { sign: jest.fn(() => 'signed-token') };
  const service = new AuthService(
    userRepo as never,
    {} as never,
    {} as never,
    {} as never,
    jwt as never,
    {} as never,
    { isMaintenance: jest.fn(async () => false) } as never,
    {} as never,
    { get: jest.fn() } as never,
    checks,
  );
  return { service, users, userRepo };
}

describe('auth session behavior', () => {
  beforeEach(async () => {
    jest.spyOn(bcrypt, 'compare').mockImplementation(async () => true);
  });

  afterEach(() => jest.restoreAllMocks());


  it('rejects NPC login before password verification', async () => {
    const { service, users } = setup();
    users[0].isNpc = true;
    const compare = jest.spyOn(bcrypt, 'compare');

    await expect(
      service.login({ username: 'Leia', password: 'secret' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(compare).not.toHaveBeenCalled();
  });

  it('logs in by player id when no exact numeric login name exists', async () => {
    const { service, users, userRepo } = setup();
    users.splice(1, 1);

    await expect(service.login({ username: '42', password: 'secret' })).resolves.toMatchObject({
      user: { id: 42, username: 'Leia' },
    });
    expect(userRepo.findOneBy).toHaveBeenCalledWith({ id: 42 });
  });

  it('gives an exact numeric login name precedence over the player id', async () => {
    const { service, userRepo } = setup();

    await expect(service.login({ username: '42', password: 'secret' })).resolves.toMatchObject({
      user: { id: 7, username: '42' },
    });
    expect(userRepo.findOneBy).not.toHaveBeenCalled();
  });

  it('invalidates the refresh token on logout', async () => {
    const { service } = setup();

    await service.logout(42);
    await expect(service.refresh('refresh-42')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('runs registered account access checks before game access for login and refresh', async () => {
    const blocked = new ForbiddenException({ code: 'ACCOUNT_BLOCKED' });
    const check = { assertAccountAccess: jest.fn(async () => Promise.reject(blocked)) };
    const { service } = setup([check]);

    await expect(service.login({ username: 'Leia', password: 'secret' })).rejects.toBe(blocked);
    await expect(service.refresh('refresh-42')).rejects.toBe(blocked);
    expect(check.assertAccountAccess).toHaveBeenCalledTimes(2);
  });
});
