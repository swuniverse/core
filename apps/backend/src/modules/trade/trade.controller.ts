import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequiresGameAccess } from '../game-status/game-status.guard';
import {
  TradeLicenseService,
  type TradeLicenseConditionInput,
} from './trade-license.service';
import { TradeQueryService } from './trade-query.service';

@Controller('trade')
@RequiresGameAccess()
@UseGuards(AuthGuard('jwt'))
export class TradeController {
  constructor(
    private readonly query: TradeQueryService,
    private readonly licenses: TradeLicenseService,
  ) {}

  @Get('posts')
  listPosts(@Request() req: { user: { sub: number } }) {
    return this.query.listPosts(req.user.sub);
  }

  @Get('overview')
  getOverview(@Request() req: { user: { sub: number } }) {
    return this.query.getOverview(req.user.sub);
  }

  @Get('posts/:id/license-info')
  getLicenseCondition(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.licenses.getCondition(id, req.user.sub);
  }

  @Put('posts/:id/license-info')
  setLicenseCondition(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() input: TradeLicenseConditionInput,
  ) {
    return this.licenses.setCondition(id, req.user.sub, input);
  }
}
