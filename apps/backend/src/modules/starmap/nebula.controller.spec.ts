jest.mock('./nebula.service', () => ({ NebulaService: class {} }));
import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';
import { PermissionGuard, PERMISSIONS_KEY } from '../auth/permission.guard';
import { NebulaController } from './nebula.controller';

describe('nebula editor permissions', () => {
  it.each(['preview', 'apply'] as const)(
    'requires MAP_EDITOR for %s',
    (method) => {
      const reflector = new Reflector();
      expect(
        reflector.getAllAndOverride(PERMISSIONS_KEY, [
          NebulaController.prototype[method],
          NebulaController,
        ]),
      ).toEqual(['MAP_EDITOR']);
      const context = (user: object) =>
        ({
          getClass: () => NebulaController,
          getHandler: () => NebulaController.prototype[method],
          switchToHttp: () => ({ getRequest: () => ({ user }) }),
        }) as never;
      const guard = new PermissionGuard(reflector);
      expect(() => guard.canActivate(context({ permissions: [] }))).toThrow(
        ForbiddenException,
      );
      expect(guard.canActivate(context({ permissions: ['MAP_EDITOR'] }))).toBe(
        true,
      );
      expect(guard.canActivate(context({ isAdmin: true }))).toBe(true);
    },
  );
});
