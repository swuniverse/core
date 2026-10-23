import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../auth/user.entity';
import { RpgController } from './rpg.controller';
import { RpgService } from './rpg.service';
import { UserCharacter } from './user-character.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserCharacter, User])],
  controllers: [RpgController],
  providers: [RpgService],
})
export class RpgModule {}
