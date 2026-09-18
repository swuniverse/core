import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameEvent } from './entities/game-event.entity';
import { GameEventService } from './game-event.service';
import { EventsController } from './events.controller';

@Module({
  imports: [TypeOrmModule.forFeature([GameEvent])],
  controllers: [EventsController],
  providers: [GameEventService],
  exports: [GameEventService],
})
export class EventsModule {}
