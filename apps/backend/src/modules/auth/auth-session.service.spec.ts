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
      vacationMode: false,
      vacationStartedAt: null as Date | null,
      vacationEndedAt: null as Date | null,
      lock: null as { remainingTicks: number; reason: string } | null,
      deletionMark: 0,
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
      vacationMode: false,
      vacationStartedAt: null as Date | null,
      vacationEndedAt: null as Date | null,
      lock: null as { remainingTicks: number; reason: string } | null,
      deletionMark: 0,
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
    { getSettings: jest.fn(async () => ({ default_view: 'maindesk' })) } as never,
    checks,
    { findOne: jest.fn(async ({ where }) => users.find((user) => user.id === where.userId)?.lock ?? null) } as never,
  );
  return { service, users, userRepo };
}

describe('auth session behavior', () => {
  it('rejects login and refresh with active lock details', async () => {
    const { service, users } = setup();
    users[0].passwordHash = await import('bcrypt').then(({ hash }) => hash('secret', 1));
    users[0].lock = { remainingTicks: 3, reason: 'Regelverstoß' };

    for (const operation of [
      () => service.login({ username: 'Leia', password: 'secret' }),
      () => service.refresh('refresh-42'),
    ]) {
      await expect(operation()).rejects.toMatchObject({
        response: {
          statusCode: 403,
          code: 'ACCOUNT_LOCKED',
          message: 'Dein Spieleraccount ist noch für 3 Ticks gesperrt. Begründung: Regelverstoß',
          remainingTicks: 3,
          reason: 'Regelverstoß',
        },
      });
    }
  });

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

  it('ends active vacation mode on successful login and reports it', async () => {
    const { service, users } = setup();
    users[0].vacationMode = true;
    users[0].vacationStartedAt = new Date('2026-10-20T00:00:00Z');

    await expect(
      service.login({ username: 'Leia', password: 'secret' }),
    ).resolves.toMatchObject({ vacationEnded: true });
    expect(users[0].vacationMode).toBe(false);
    expect(users[0].vacationEndedAt).toBeInstanceOf(Date);
  });

  it('allows a requested deletion but blocks login and refresh after confirmation', async () => {
    const { service, users } = setup();
    users[0].deletionMark = 1;

    await expect(
      service.login({ username: 'Leia', password: 'secret' }),
    ).resolves.toMatchObject({ user: { id: 42 } });
    users[0].deletionMark = 2;

    for (const operation of [
      () => service.login({ username: 'Leia', password: 'secret' }),
      () => service.refresh(users[0].refreshToken!),
    ]) {
      await expect(operation()).rejects.toMatchObject({
        response: {
          message: 'Dein Spieleraccount ist zur Löschung vorgesehen',
          statusCode: 403,
        },
      });
    }
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
