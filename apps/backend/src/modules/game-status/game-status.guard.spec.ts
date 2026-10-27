import { ExecutionContext } from '@nestjs/common';
import {
  EMAIL_NOT_VERIFIED_ERROR_CODE,
  GAME_MAINTENANCE_ERROR_CODE,
  GAME_TICK_RUNNING_ERROR_CODE,
  GameStatusGuard,
} from './game-status.guard';

describe('GameStatusGuard', () => {
  const context = (
    user?: { isAdmin?: boolean },
    authorization?: string,
    method = 'GET',
  ) =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({
        getRequest: () => ({ user, headers: { authorization }, method }),
      }),
    }) as unknown as ExecutionContext;
  const jwt = {
    verify: jest.fn<
      { sub?: number; isAdmin: boolean },
      [string, unknown?]
    >(() => ({ isAdmin: false })),
  };
  const config = { get: jest.fn(() => 'secret') };
  const reflector = { getAllAndOverride: jest.fn(() => true) };

  it('allows routes that do not require game access', async () => {
    const service = { getPublicStatus: jest.fn() };
    const guard = new GameStatusGuard(
      { getAllAndOverride: jest.fn(() => false) } as never,
      service as never,
      jwt as never,
      config as never,
      { findOneBy: jest.fn(async () => ({ isAdmin: false, emailVerifiedAt: new Date() })) } as never,
    );

    await expect(guard.canActivate(context())).resolves.toBe(true);
    expect(service.getPublicStatus).not.toHaveBeenCalled();
  });

  it('blocks an unverified player on game routes', async () => {
    jwt.verify.mockReturnValueOnce({ sub: 42, isAdmin: false });
    const service = { getPublicStatus: jest.fn() };
    const guard = new GameStatusGuard(
      reflector as never,
      service as never,
      jwt as never,
      { get: jest.fn((key: string) => key === 'EMAIL_VERIFICATION_ENABLED' ? 'true' : 'secret') } as never,
      { findOneBy: jest.fn(async () => ({ isAdmin: false, emailVerifiedAt: null })) } as never,
    );

    await expect(
      guard.canActivate(context(undefined, 'Bearer player-token')),
    ).rejects.toMatchObject({
      status: 403,
      response: { code: EMAIL_NOT_VERIFIED_ERROR_CODE },
    });
    expect(service.getPublicStatus).not.toHaveBeenCalled();
  });

  it('blocks a normal player during maintenance with the configured message', async () => {
    const service = {
      getPublicStatus: jest
        .fn()
        .mockResolvedValue({ status: 'MAINTENANCE', message: 'Update läuft.' }),
    };
    const guard = new GameStatusGuard(
      reflector as never,
      service as never,
      jwt as never,
      config as never,
      { findOneBy: jest.fn(async () => ({ isAdmin: false, emailVerifiedAt: new Date() })) } as never,
    );

    await expect(guard.canActivate(context())).rejects.toMatchObject({
      status: 403,
      response: {
        code: GAME_MAINTENANCE_ERROR_CODE,
        message: 'Update läuft.',
      },
    });
  });

  it('blocks a normal player from writing while the main tick runs', async () => {
    const service = {
      getPublicStatus: jest.fn().mockResolvedValue({ status: 'TICK', message: '' }),
    };
    const guard = new GameStatusGuard(
      reflector as never,
      service as never,
      jwt as never,
      config as never,
      { findOneBy: jest.fn() } as never,
    );

    await expect(guard.canActivate(context(undefined, undefined, 'POST'))).rejects.toMatchObject({
      status: 503,
      response: {
        code: GAME_TICK_RUNNING_ERROR_CODE,
        message: 'Der Tick läuft gerade. Bitte versuche es gleich noch einmal.',
      },
    });
  });

  it('allows a normal player to read while the main tick runs', async () => {
    const service = {
      getPublicStatus: jest.fn().mockResolvedValue({ status: 'TICK', message: '' }),
    };
    const guard = new GameStatusGuard(
      reflector as never,
      service as never,
      jwt as never,
      config as never,
      { findOneBy: jest.fn() } as never,
    );

    await expect(guard.canActivate(context())).resolves.toBe(true);
  });

  it('keeps administrator access open during maintenance', async () => {
    const service = { getPublicStatus: jest.fn() };
    const guard = new GameStatusGuard(
      reflector as never,
      service as never,
      jwt as never,
      config as never,
      { findOneBy: jest.fn(async () => ({ isAdmin: false, emailVerifiedAt: new Date() })) } as never,
    );

    await expect(guard.canActivate(context({ isAdmin: true }))).resolves.toBe(
      true,
    );
    expect(service.getPublicStatus).not.toHaveBeenCalled();
  });

  it('keeps administrator access open when only the bearer token identifies them', async () => {
    jwt.verify.mockReturnValueOnce({ isAdmin: true });
    const service = { getPublicStatus: jest.fn() };
    const guard = new GameStatusGuard(
      reflector as never,
      service as never,
      jwt as never,
      config as never,
      { findOneBy: jest.fn(async () => ({ isAdmin: false, emailVerifiedAt: new Date() })) } as never,
    );

    await expect(
      guard.canActivate(context(undefined, 'Bearer admin-token')),
    ).resolves.toBe(true);
    expect(service.getPublicStatus).not.toHaveBeenCalled();
  });
});
