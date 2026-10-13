import { ExecutionContext } from '@nestjs/common';
import {
  GAME_MAINTENANCE_ERROR_CODE,
  GameStatusGuard,
} from './game-status.guard';

describe('GameStatusGuard', () => {
  const context = (user?: { isAdmin?: boolean }) =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;
  const reflector = { getAllAndOverride: jest.fn(() => true) };

  it('allows routes that do not require game access', async () => {
    const service = { isMaintenance: jest.fn() };
    const guard = new GameStatusGuard(
      { getAllAndOverride: jest.fn(() => false) } as never,
      service as never,
    );

    await expect(guard.canActivate(context())).resolves.toBe(true);
    expect(service.isMaintenance).not.toHaveBeenCalled();
  });

  it('blocks a normal player during maintenance with the configured message', async () => {
    const service = {
      isMaintenance: jest.fn().mockResolvedValue(true),
      getPublicStatus: jest
        .fn()
        .mockResolvedValue({ status: 'MAINTENANCE', message: 'Update läuft.' }),
    };
    const guard = new GameStatusGuard(reflector as never, service as never);

    await expect(guard.canActivate(context())).rejects.toMatchObject({
      status: 403,
      response: {
        code: GAME_MAINTENANCE_ERROR_CODE,
        message: 'Update läuft.',
      },
    });
  });

  it('keeps administrator access open during maintenance', async () => {
    const service = { isMaintenance: jest.fn() };
    const guard = new GameStatusGuard(reflector as never, service as never);

    await expect(guard.canActivate(context({ isAdmin: true }))).resolves.toBe(
      true,
    );
    expect(service.isMaintenance).not.toHaveBeenCalled();
  });
});
