import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '@swuniverse/shared';
import { getJwtSecret } from './jwt-secret';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(config),
    });
  }

  validate(payload: JwtPayload & { isAdmin?: boolean }) {
    return {
      sub: payload.sub,
      username: payload.username,
      faction: payload.faction,
      isAdmin: Boolean(payload.isAdmin),
      permissions: payload.permissions ?? [],
    };
  }
}
