import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { AdminGuard } from './admin.guard';
import { AdminBootstrapService } from './admin-bootstrap.service';
import { User } from './user.entity';
import { InviteKey } from './invite-key.entity';
import { InviteQuota } from './invite-quota.entity';
import { FactionEntity } from '../faction/entities/faction.entity';
import { ColonyModule } from '../colony/colony.module';
import { FactionModule } from '../faction/faction.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, FactionEntity, InviteKey, InviteQuota]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
    ColonyModule,
    FactionModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, AdminGuard, AdminBootstrapService],
  exports: [AuthService, AdminGuard],
})
export class AuthModule {}
