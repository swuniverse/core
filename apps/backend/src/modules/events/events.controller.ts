import { Controller, Get, Query } from '@nestjs/common';
import { GameEventService } from './game-event.service';

@Controller('events')
export class EventsController {
  constructor(private readonly events: GameEventService) {}

  @Get('recent')
  recent(@Query('limit') limit?: string) {
    return this.events.recent(Number(limit) || 20);
  }
}
