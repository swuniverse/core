import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequiresGameAccess } from '../game-status/game-status.guard';
import { TradeQueryService } from './trade-query.service';

@Controller('trade')
@RequiresGameAccess()
@UseGuards(AuthGuard('jwt'))
export class TradeController {
  constructor(private readonly query: TradeQueryService) {}

  @Get('posts')
  listPosts(@Request() req: { user: { sub: number } }) {
    return this.query.listPosts(req.user.sub);
  }

  @Get('overview')
  getOverview(@Request() req: { user: { sub: number } }) {
    return this.query.getOverview(req.user.sub);
  }
}
