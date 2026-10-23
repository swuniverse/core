import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { UserSetting } from './entities/user-setting.entity';
import { User } from '../auth/user.entity';
import { UserSettingsReader } from './user-settings-reader';

@Module({
  imports: [TypeOrmModule.forFeature([UserSetting, User])],
  controllers: [SettingsController],
  providers: [SettingsService, UserSettingsReader],
  exports: [SettingsService, UserSettingsReader],
})
export class SettingsModule {}
