import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequiresGameAccess } from '../game-status/game-status.guard';
import { LastCombatReportService } from './last-combat-report.service';
@Controller('spacecraft')
@RequiresGameAccess()
@UseGuards(AuthGuard('jwt'))
export class LastCombatReportController {
  constructor(private readonly reports: LastCombatReportService) {}
  @Get(':id/last-combat-report')
  get(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.reports.get(id, req.user.sub);
  }
}
