import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../auth/user.entity';
import { MessagingService } from '../messaging/messaging.service';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { ContactStatusAdapter } from './contact-status.adapter';
import { Contact } from './entities/contact.entity';
import { IgnoreList } from './entities/ignore-list.entity';
import { IgnoreListController } from './ignore-list.controller';
import { IgnoreListService } from './ignore-list.service';

@Module({
  imports: [TypeOrmModule.forFeature([Contact, IgnoreList, User])],
  controllers: [ContactController, IgnoreListController],
  providers: [ContactService, ContactStatusAdapter, IgnoreListService],
  exports: [ContactService, ContactStatusAdapter, IgnoreListService],
})
export class ContactModule implements OnModuleInit {
  constructor(
    private readonly messaging: MessagingService,
    private readonly ignoreList: IgnoreListService,
  ) {}

  onModuleInit(): void {
    this.messaging.setIgnoreCheck((recipientId, senderId) =>
      this.ignoreList.isIgnored(recipientId, senderId),
    );
  }
}
