import {
  Controller,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequiresGameAccess } from '../game-status/game-status.guard';
import { SeasonalAnomalyService } from './seasonal-anomaly.service';
@Controller('spacecraft')
@RequiresGameAccess()
@UseGuards(AuthGuard('jwt'))
export class SeasonalAnomalyController {
  constructor(private readonly seasonal: SeasonalAnomalyService) {}
  @Post(':id/anomaly/:anomalyId/open')
  open(
    @Request() req: { user: { sub: number } },
    @Param('id', ParseIntPipe) id: number,
    @Param('anomalyId', ParseIntPipe) anomalyId: number,
  ) {
    return this.seasonal.open(req.user.sub, id, anomalyId);
  }
}
