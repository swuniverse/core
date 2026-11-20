import { BadRequestException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AdminGuard } from './admin.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

function createService() {
  const users = [{ id: 2, username: 'Leia', permissions: [] as string[] }];
  const userRepo = {
    update: jest.fn(async (id, values) =>
      Object.assign(users.find((user) => user.id === id)!, values),
    ),
  };
  const service = new AuthService(
    userRepo as never, {} as never, {} as never,
    {} as never, {} as never, {} as never, { get: jest.fn() } as never,
    {} as never, [],
  );
  return { service, users };
}

describe('feature grants', () => {
  it('lets admins grant and revoke COLONY_SANDBOX', async () => {
    const { service, users } = createService();
    await service.updatePermissions(2, ['COLONY_SANDBOX', 'COLONY_SANDBOX']);
    expect(users[0].permissions).toEqual(['COLONY_SANDBOX']);
    await service.updatePermissions(2, []);
    expect(users[0].permissions).toEqual([]);
  });

  it('rejects unknown grants', async () => {
    const { service } = createService();
    await expect(service.updatePermissions(2, ['GOD_MODE'])).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.updatePermissions(2, 'COLONY_SANDBOX' as never)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires admin rights to change grants', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      AuthController.prototype.updatePermissions,
    );
    expect(guards).toContain(AdminGuard);
  });

  it('reads grants from the database so revocation applies immediately', async () => {
    const strategy = new JwtStrategy(
      { get: () => 'secret-with-enough-length-for-tests-1234567890' } as never,
      { findOneBy: async () => ({ id: 2, isNpc: false, permissions: [] }) } as never,
    );
    await expect(
      strategy.validate({ sub: 2, username: 'Leia', permissions: ['COLONY_SANDBOX'] } as never),
    ).resolves.toMatchObject({ permissions: [] });
  });
});
