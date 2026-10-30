import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { UserSetting } from './entities/user-setting.entity';
import { User } from '../auth/user.entity';
import { AccountToken } from '../auth/account-token.entity';
import { AccountTokenService } from '../auth/account-token.service';
import { MailModule } from '../mail/mail.module';
import { UserSettingsReader } from './user-settings-reader';
import {
  AllowAllEmailBlocklist,
  EMAIL_BLOCKLIST,
} from './email-blocklist.port';

@Module({
  imports: [TypeOrmModule.forFeature([UserSetting, User, AccountToken]), MailModule],
  controllers: [SettingsController],
  providers: [
    SettingsService,
    UserSettingsReader,
    AccountTokenService,
    { provide: EMAIL_BLOCKLIST, useClass: AllowAllEmailBlocklist },
  ],
  exports: [SettingsService, UserSettingsReader],
})
export class SettingsModule {}
