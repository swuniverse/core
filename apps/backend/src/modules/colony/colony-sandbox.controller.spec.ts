import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from '../auth/permission.guard';
import { ColonySandboxController } from './colony-sandbox.controller';

const endpoints = [
  'list',
  'create',
  'get',
  'rename',
  'remove',
  'options',
  'act',
  'preview',
] as const;

function context(
  handler: string,
  user: { isAdmin: boolean; permissions: string[] },
): ExecutionContext {
  return {
    getHandler: () =>
      ColonySandboxController.prototype[
        handler as keyof ColonySandboxController
      ],
    getClass: () => ColonySandboxController,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('ColonySandboxController feature grant', () => {
  const guard = new PermissionGuard(new Reflector());

  it('runs the permission guard on the whole controller', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, ColonySandboxController),
    ).toContain(PermissionGuard);
  });

  it.each(endpoints)('refuses %s without COLONY_SANDBOX', (handler) => {
    expect(() =>
      guard.canActivate(context(handler, { isAdmin: false, permissions: [] })),
    ).toThrow(
      new ForbiddenException(
        'Aktion nicht möglich, Spieler ist nicht berechtigt',
      ),
    );
  });

  it.each(endpoints)('allows %s with the grant or as admin', (handler) => {
    expect(
      guard.canActivate(
        context(handler, { isAdmin: false, permissions: ['COLONY_SANDBOX'] }),
      ),
    ).toBe(true);
    expect(
      guard.canActivate(context(handler, { isAdmin: true, permissions: [] })),
    ).toBe(true);
  });

  it('covers every endpoint', () => {
    const handlers = Object.getOwnPropertyNames(
      ColonySandboxController.prototype,
    ).filter((name) => name !== 'constructor');
    expect(handlers.sort()).toEqual([...endpoints].sort());
  });
});
