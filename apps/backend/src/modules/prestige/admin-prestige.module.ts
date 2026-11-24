import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminGuard } from '../auth/admin.guard';
import { JwtStrategy } from '../auth/jwt.strategy';
import { User } from '../auth/user.entity';
import { GameStatusModule } from '../game-status/game-status.module';
import { MessagingModule } from '../messaging/messaging.module';
import { AdminPrestigeController } from './admin-prestige.controller';
import { PrestigeModule } from './prestige.module';

/** Separate from PrestigeModule so the core service never depends on messaging. */
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    GameStatusModule,
    PassportModule,
    ConfigModule,
    MessagingModule,
    PrestigeModule,
  ],
  controllers: [AdminPrestigeController],
  providers: [AdminGuard, JwtStrategy],
})
export class AdminPrestigeModule {}
