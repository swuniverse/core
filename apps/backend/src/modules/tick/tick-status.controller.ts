import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TickService } from './tick.service';

@Controller('tick')
@UseGuards(AuthGuard('jwt'))
export class TickStatusController {
  constructor(private readonly tickService: TickService) {}

  @Get('status')
  getStatus() {
    return this.tickService.getTickStatus();
  }
}
