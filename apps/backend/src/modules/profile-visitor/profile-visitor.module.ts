import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSetting } from '../settings/entities/user-setting.entity';
import { ProfileVisit } from './entities/profile-visit.entity';
import { ProfileVisitorService } from './profile-visitor.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProfileVisit, UserSetting])],
  providers: [ProfileVisitorService],
  exports: [ProfileVisitorService],
})
export class ProfileVisitorModule {}
