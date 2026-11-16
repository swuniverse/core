import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { PermissionGuard } from '../auth/permission.guard';
import { Permission } from '../auth/permissions';
import {
  FieldMiningController,
  FieldMiningRequest,
} from './resource-collection.controller';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

describe('Mining field-type API protection', () => {
  function context(user: object): ExecutionContext {
    return {
      getHandler: () => FieldMiningController.prototype.configure,
      getClass: () => FieldMiningController,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
  }
  it('requires map-editor permission for field-wide resource edits', () => {
    const guard = new PermissionGuard(new Reflector());
    expect(() => guard.canActivate(context({ sub: 1 }))).toThrow(
      'Insufficient permissions',
    );
    expect(
      guard.canActivate(
        context({ sub: 1, permissions: [Permission.MAP_EDITOR] }),
      ),
    ).toBe(true);
  });
  it.each([
    { resources: [{ commodityId: 3, rate: 0 }] },
    { resources: [{ commodityId: 3, rate: 1001 }] },
    { resources: [{ commodityId: 0, rate: 1 }] },
    {
      resources: Array.from({ length: 17 }, () => ({
        commodityId: 3,
        rate: 1,
      })),
    },
  ])('rejects malformed resource definitions %j', async (value) => {
    expect(
      await validate(plainToInstance(FieldMiningRequest, value)),
    ).not.toHaveLength(0);
  });
});
