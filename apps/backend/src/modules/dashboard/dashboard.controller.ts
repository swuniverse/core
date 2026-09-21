import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(AuthGuard('jwt'))
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  getOperations(@Request() req: { user: { sub: number } }) {
    return this.dashboardService.getOperations(req.user.sub);
  }

  @Get('header')
  getHeader(@Request() req: { user: { sub: number } }) {
    return this.dashboardService.getHeader(req.user.sub);
  }

  @Get('statistics')
  getStatistics(@Query('period') period?: string) {
    return this.dashboardService.getSnapshots(Number(period) || 1);
  }
}
