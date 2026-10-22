import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagingModule } from '../messaging/messaging.module';
import { PrestigeModule } from '../prestige/prestige.module';
import { AwardService } from './award.service';
import { Award } from './entities/award.entity';
import { UserAward } from './entities/user-award.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Award, UserAward]),
    MessagingModule,
    PrestigeModule,
  ],
  providers: [AwardService],
  exports: [AwardService, TypeOrmModule],
})
export class AwardsModule {}
