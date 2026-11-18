import { UserMessageFolder } from './entities/user-message-folder.entity';
import { UserMessageFoldersService } from './user-message-folders.service';
import { UserMessageFoldersController } from './user-message-folders.controller';
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
import { AdminBroadcastDelivery } from './entities/admin-broadcast-delivery.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Message, User, UserMessageFolder, AdminBroadcastDelivery]),
    StatisticsModule,
    SettingsModule,
    WebsocketModule,
    AccountDeletionModule,
    MailModule,
  ],
  controllers: [MessagingController, UserMessageFoldersController],
  providers: [
    MessagingService,
    UserMessageFoldersService,
    ColonyEventService,
    MessagingDeletionHandler,
    AdminBroadcastService,
    PrivateMessageNotificationService,
  ],
  exports: [MessagingService, ColonyEventService],
})
export class MessagingModule {}
