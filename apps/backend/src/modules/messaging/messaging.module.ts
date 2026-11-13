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
import { AccountDeletionModule } from '../account-deletion/account-deletion.module';
import { MessagingDeletionHandler } from './messaging-deletion.handler';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Message, User]),
    StatisticsModule,
    SettingsModule,
    WebsocketModule,
    AccountDeletionModule,
  ],
  controllers: [MessagingController],
  providers: [MessagingService, ColonyEventService, MessagingDeletionHandler],
  exports: [MessagingService, ColonyEventService],
})
export class MessagingModule {}
