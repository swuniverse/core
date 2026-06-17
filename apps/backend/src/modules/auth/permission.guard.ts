import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermission = (...perms: string[]) =>
  SetMetadata(PERMISSIONS_KEY, perms);

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (user?.isAdmin) return true;

    const hasPermission = required.some((p) =>
      user?.permissions?.includes(p),
    );
    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}
