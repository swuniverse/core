import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '@swuniverse/shared';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') || 'fallback',
    });
  }

  validate(payload: JwtPayload) {
    return {
      sub: payload.sub,
      username: payload.username,
      faction: payload.faction,
      isAdmin: Boolean((payload as JwtPayload & { isAdmin?: boolean }).isAdmin),
    };
  }
}
