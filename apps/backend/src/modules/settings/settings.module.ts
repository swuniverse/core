import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { UserSetting } from './entities/user-setting.entity';
import { User } from '../auth/user.entity';
import { UserSettingsReader } from './user-settings-reader';
import {
  AllowAllEmailBlocklist,
  EMAIL_BLOCKLIST,
} from './email-blocklist.port';

@Module({
  imports: [TypeOrmModule.forFeature([UserSetting, User])],
  controllers: [SettingsController],
  providers: [
    SettingsService,
    UserSettingsReader,
    { provide: EMAIL_BLOCKLIST, useClass: AllowAllEmailBlocklist },
  ],
  exports: [SettingsService, UserSettingsReader],
})
export class SettingsModule {}
