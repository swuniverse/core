import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../auth/user.entity';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { ContactStatusAdapter } from './contact-status.adapter';
import { Contact } from './entities/contact.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Contact, User])],
  controllers: [ContactController],
  providers: [ContactService, ContactStatusAdapter],
  exports: [ContactService, ContactStatusAdapter],
})
export class ContactModule {}
