import { Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../auth/admin.guard';
import { TickService } from './tick.service';

@Controller('admin/tick')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class TickController {
  constructor(private readonly tickService: TickService) {}

  @Post('trigger')
  async triggerTick() {
    return this.tickService.triggerManualTick();
  }
}
