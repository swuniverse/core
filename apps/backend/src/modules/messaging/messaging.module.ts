import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { Message } from './entities/message.entity';
import { StatisticsModule } from '../statistics/statistics.module';
import { ColonyEventService } from './colony-event.service';
import { User } from '../auth/user.entity';
import { SettingsModule } from '../settings/settings.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Message, User]),
    StatisticsModule,
    SettingsModule,
    WebsocketModule,
  ],
  controllers: [MessagingController],
  providers: [MessagingService, ColonyEventService],
  exports: [MessagingService, ColonyEventService],
})
export class MessagingModule {}
