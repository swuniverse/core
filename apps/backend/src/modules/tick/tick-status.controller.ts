import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequiresGameAccess } from '../game-status/game-status.guard';
import { TickService } from './tick.service';

@Controller('tick')
@RequiresGameAccess()
@UseGuards(AuthGuard('jwt'))
export class TickStatusController {
  constructor(private readonly tickService: TickService) {}

  @Get('status')
  getStatus() {
    return this.tickService.getTickStatus();
  }
}
