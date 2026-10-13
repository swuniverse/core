import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequiresGameAccess } from '../game-status/game-status.guard';
import { GameEventService } from './game-event.service';

@Controller('events')
@RequiresGameAccess()
@UseGuards(AuthGuard('jwt'))
export class EventsController {
  constructor(private readonly events: GameEventService) {}

  @Get('recent')
  recent(
    @Request() req: { user: { sub: number } },
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    return this.events.recent({
      viewerId: req.user.sub,
      limit: Number(limit) || 20,
      type,
      search,
    });
  }
}
