import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HolonetController } from './holonet.controller';
import { HolonetService } from './holonet.service';
import { HolonetPost } from './entities/holonet-post.entity';
import { HolonetComment } from './entities/holonet-comment.entity';
import { HolonetRating } from './entities/holonet-rating.entity';
import { HolonetCheckpoint } from './entities/holonet-checkpoint.entity';
import { PlotPostRequest } from './entities/plot-post-request.entity';
import { User } from '../auth/user.entity';
import { MessagingModule } from '../messaging/messaging.module';
import { PrestigeModule } from '../prestige/prestige.module';
import { RpgPlot } from '../rpg/rpg-plot.entity';
import { RpgPlotMember } from '../rpg/rpg-plot-member.entity';
import { UserCharacter } from '../rpg/user-character.entity';
import { AccountDeletionModule } from '../account-deletion/account-deletion.module';
import { HolonetDeletionHandler } from './holonet-deletion.handler';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HolonetPost,
      HolonetComment,
      HolonetRating,
      HolonetCheckpoint,
      User,
      RpgPlot,
      RpgPlotMember,
      UserCharacter,
      PlotPostRequest,
    ]),
    MessagingModule,
    PrestigeModule,
    AccountDeletionModule,
  ],
  controllers: [HolonetController],
  providers: [HolonetService, HolonetDeletionHandler],
  exports: [HolonetService],
})
export class HolonetModule {}
