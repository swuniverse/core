import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { GameStatusModule } from '../game-status/game-status.module';
import { ConfigModule } from '@nestjs/config';
import { MessagingModule } from '../messaging/messaging.module';
import { OrderBroadcastModule } from '../order-broadcast/order-broadcast.module';
import { PrestigeModule } from '../prestige/prestige.module';
import { AwardService } from './award.service';
import { AdminAwardsController } from './admin-awards.controller';
import { User } from '../auth/user.entity';
import { JwtStrategy } from '../auth/jwt.strategy';
import { AdminGuard } from '../auth/admin.guard';
import { Award } from './entities/award.entity';
import { UserAward } from './entities/user-award.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Award, UserAward, User]),
    GameStatusModule,
    PassportModule,
    ConfigModule,
    MessagingModule,
    PrestigeModule,
    OrderBroadcastModule,
  ],
  controllers: [AdminAwardsController],
  providers: [AwardService, AdminGuard, JwtStrategy],
  exports: [AwardService, TypeOrmModule],
})
export class AwardsModule {}
