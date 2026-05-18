import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HolonetController } from './holonet.controller';
import { HolonetService } from './holonet.service';
import { HolonetPost } from './entities/holonet-post.entity';
import { HolonetComment } from './entities/holonet-comment.entity';
import { HolonetRating } from './entities/holonet-rating.entity';
import { HolonetCheckpoint } from './entities/holonet-checkpoint.entity';
import { User } from '../auth/user.entity';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HolonetPost,
      HolonetComment,
      HolonetRating,
      HolonetCheckpoint,
      User,
    ]),
    MessagingModule,
  ],
  controllers: [HolonetController],
  providers: [HolonetService],
  exports: [HolonetService],
})
export class HolonetModule {}
