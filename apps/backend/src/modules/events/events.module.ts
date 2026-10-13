import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExplorationState } from '../starmap/entities/exploration-state.entity';
import { SystemExploration } from '../starmap/entities/system-exploration.entity';
import { ExplorationService } from '../starmap/exploration.service';
import { GameEvent } from './entities/game-event.entity';
import { GameEventService } from './game-event.service';
import { EventsController } from './events.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([GameEvent, ExplorationState, SystemExploration]),
  ],
  controllers: [EventsController],
  providers: [GameEventService, ExplorationService],
  exports: [GameEventService],
})
export class EventsModule {}
