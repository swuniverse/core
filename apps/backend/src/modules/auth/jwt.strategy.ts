import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '@swuniverse/shared';
import { getJwtSecret } from './jwt-secret';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(config),
    });
  }

  async validate(payload: JwtPayload & { isAdmin?: boolean }) {
    const user = await this.userRepo.findOneBy({ id: payload.sub });
    if (!user || user.isNpc) throw new UnauthorizedException();
    return {
      sub: payload.sub,
      username: payload.username,
      faction: payload.faction,
      isAdmin: Boolean(payload.isAdmin),
      // From the database so a revoked grant applies before the token expires.
      permissions: user.permissions ?? [],
    };
  }
}
