import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  SetMetadata,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { GameStatusService } from './game-status.service';
import { getJwtSecret } from '../auth/jwt-secret';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/user.entity';

export const GAME_MAINTENANCE_ERROR_CODE = 'GAME_MAINTENANCE';
export const GAME_TICK_RUNNING_ERROR_CODE = 'GAME_TICK_RUNNING';
export const EMAIL_NOT_VERIFIED_ERROR_CODE = 'EMAIL_NOT_VERIFIED';
const REQUIRES_GAME_ACCESS = 'requires-game-access';
export const RequiresGameAccess = () => SetMetadata(REQUIRES_GAME_ACCESS, true);

@Injectable()
export class GameStatusGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly gameStatusService: GameStatusService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Dieser Guard laeuft als globaler APP_GUARD und damit VOR dem
   * AuthGuard('jwt') der Controller; request.user ist dann noch leer.
   * Admin-Status daher direkt aus dem Bearer-Token lesen.
   */
  private tokenPayload(
    authorization: string | undefined,
  ): { sub?: number; isAdmin?: boolean } | null {
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice(7)
      : null;
    if (!token) return null;
    try {
      return this.jwtService.verify<{ sub?: number; isAdmin?: boolean }>(token, {
        secret: getJwtSecret(this.config),
      });
    } catch {
      return null;
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
      method?: string;
    }>();
    const payload = this.tokenPayload(request.headers?.authorization);
    const isAdmin = request.user?.isAdmin || payload?.isAdmin;
    if (isAdmin) return true;

    if (payload?.sub) {
      const user = await this.userRepository.findOneBy({ id: payload.sub });
      if (user && !user.emailVerifiedAt) {
        throw new ForbiddenException({
          code: EMAIL_NOT_VERIFIED_ERROR_CODE,
          message: 'Bitte bestätige zuerst deine E-Mail-Adresse',
        });
      }
    }

    const status = await this.gameStatusService.getPublicStatus();
    if (status.status === 'TICK') {
      if (request.method === 'GET') return true;
      throw new ServiceUnavailableException({
        code: GAME_TICK_RUNNING_ERROR_CODE,
        message: 'Der Tick läuft gerade. Bitte versuche es gleich noch einmal.',
      });
    }
    if (status.status !== 'MAINTENANCE') return true;

    throw new ForbiddenException({
      code: GAME_MAINTENANCE_ERROR_CODE,
      message: status.message,
    });
  }
}
