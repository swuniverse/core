import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GameStatusService } from './game-status.service';

export const GAME_MAINTENANCE_ERROR_CODE = 'GAME_MAINTENANCE';
const REQUIRES_GAME_ACCESS = 'requires-game-access';
export const RequiresGameAccess = () => SetMetadata(REQUIRES_GAME_ACCESS, true);

@Injectable()
export class GameStatusGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly gameStatusService: GameStatusService,
  ) {}

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
    }>();
    if (
      request.user?.isAdmin ||
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
