import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { GameStatusService } from './game-status.service';

export const GAME_MAINTENANCE_ERROR_CODE = 'GAME_MAINTENANCE';
const REQUIRES_GAME_ACCESS = 'requires-game-access';
export const RequiresGameAccess = () => SetMetadata(REQUIRES_GAME_ACCESS, true);

@Injectable()
export class GameStatusGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly gameStatusService: GameStatusService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Dieser Guard laeuft als globaler APP_GUARD und damit VOR dem
   * AuthGuard('jwt') der Controller; request.user ist dann noch leer.
   * Admin-Status daher direkt aus dem Bearer-Token lesen.
   */
  private isAdminToken(authorization: string | undefined): boolean {
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice(7)
      : null;
    if (!token) return false;
    try {
      const payload = this.jwtService.verify<{ isAdmin?: boolean }>(token, {
        secret: this.config.get<string>('JWT_SECRET') || 'fallback',
      });
      return Boolean(payload.isAdmin);
    } catch {
      return false;
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      !this.reflector.getAllAndOverride<boolean>(REQUIRES_GAME_ACCESS, [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: { isAdmin?: boolean };
      headers?: { authorization?: string };
    }>();
    if (
      request.user?.isAdmin ||
      this.isAdminToken(request.headers?.authorization) ||
      !(await this.gameStatusService.isMaintenance())
    ) {
      return true;
    }

    const status = await this.gameStatusService.getPublicStatus();
    throw new ForbiddenException({
      code: GAME_MAINTENANCE_ERROR_CODE,
      message: status.message,
    });
  }
}
