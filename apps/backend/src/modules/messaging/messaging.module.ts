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
import { MailModule } from '../mail/mail.module';
import { PrivateMessageNotificationService } from './private-message-notification.service';
import { AdminBroadcastService } from './admin-broadcast.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Message, User]),
    StatisticsModule,
    SettingsModule,
    WebsocketModule,
    AccountDeletionModule,
    MailModule,
  ],
  controllers: [MessagingController],
  providers: [
    MessagingService,
    ColonyEventService,
    MessagingDeletionHandler,
    AdminBroadcastService,
    PrivateMessageNotificationService,
  ],
  exports: [MessagingService, ColonyEventService],
})
export class MessagingModule {}
