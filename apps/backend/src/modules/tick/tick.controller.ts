import { BadRequestException, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { TICK_RUN_TYPES, type TickRunType } from '@swuniverse/shared';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../auth/admin.guard';
import { TickAdminService } from './tick-admin.service';
import { TickService } from './tick.service';
import { IdleUserMaintenanceService } from '../account-deletion/idle-user-maintenance.service';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class TickController {
  constructor(
    private readonly tickService: TickService,
    private readonly tickAdminService: TickAdminService,
    private readonly idleUsers: IdleUserMaintenanceService,
  ) {}

  @Get('ticks')
  listRuns(@Query('limit', new ParseIntPipe({ optional: true })) limit = 50) {
    return this.tickAdminService.listRuns(limit);
  }

  @Post('ticks/:type/run')
  run(@Param('type') type: string) {
    if (!TICK_RUN_TYPES.includes(type as TickRunType)) {
      throw new BadRequestException('Unbekannter Tick-Typ');
    }
    return this.tickAdminService.run(type as TickRunType);
  }

  @Post('idle-users/preview')
  async previewIdleUsers() {
    return { summary: await this.idleUsers.preview(new Date()) };
  }

  @Post('tick/trigger')
  async triggerTick() {
    return this.tickService.triggerManualTick();
  }

  @Post('colony/complete-all-builds')
  async completeAllBuilds() {
    return this.tickService.completeAllBuilds();
  }
}
