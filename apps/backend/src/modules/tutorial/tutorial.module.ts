import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserTutorialProgress } from './entities/user-tutorial-progress.entity';
import { TutorialController } from './tutorial.controller';
import {
  TUTORIAL_DEFINITIONS,
  TUTORIAL_DEFINITIONS_TOKEN,
} from './tutorial-definitions';
import { TutorialService } from './tutorial.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserTutorialProgress])],
  controllers: [TutorialController],
  providers: [
    TutorialService,
    { provide: TUTORIAL_DEFINITIONS_TOKEN, useValue: TUTORIAL_DEFINITIONS },
  ],
  exports: [TutorialService],
})
export class TutorialModule {}
