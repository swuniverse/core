import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { AdminTradeDealInput, LotteryWinnerBuildplanDto } from '@swuniverse/shared';
import { AdminGuard } from '../auth/admin.guard';
import { RequiresGameAccess } from '../game-status/game-status.guard';
import { TradeDealAdminService } from './trade-deal-admin.service';
import { TradeDealService } from './trade-deal.service';
import { TradeLotteryService } from './trade-lottery.service';

@Controller('trade/deals')
@RequiresGameAccess()
@UseGuards(AuthGuard('jwt'))
export class TradeDealController {
  constructor(private readonly deals: TradeDealService) {}

  @Get()
  list(@Request() req: { user: { sub: number } }) {
    return this.deals.list(req.user.sub);
  }

  @Post(':id/take')
  take(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body('amount') amount: number,
  ) {
    return this.deals.take(id, req.user.sub, amount);
  }
}

@Controller('admin/trade/deals')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminTradeDealController {
  constructor(private readonly deals: TradeDealAdminService) {}

  @Get()
  list() {
    return this.deals.list();
  }

  @Post()
  create(@Body() input: AdminTradeDealInput) {
    return this.deals.create(input);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() input: AdminTradeDealInput) {
    return this.deals.update(id, input);
  }

  @Post(':id/end')
  end(@Param('id', ParseIntPipe) id: number) {
    return this.deals.end(id);
  }
}

@Controller('trade/lottery')
@RequiresGameAccess()
@UseGuards(AuthGuard('jwt'))
export class TradeLotteryController {
  constructor(private readonly lottery: TradeLotteryService) {}

  @Get()
  overview(@Request() req: { user: { sub: number } }) {
    return this.lottery.overview(req.user.sub);
  }

  @Post('tickets')
  buy(@Request() req: { user: { sub: number } }, @Body('amount') amount: number) {
    return this.lottery.buy(req.user.sub, amount);
  }
}

@Controller('admin/trade/lottery-buildplans')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminTradeLotteryController {
  constructor(private readonly lottery: TradeLotteryService) {}

  @Get()
  list() {
    return this.lottery.listWinnerBuildplans();
  }

  @Post()
  add(@Body() input: Omit<LotteryWinnerBuildplanDto, 'id'>) {
    return this.lottery.addWinnerBuildplan(input);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.lottery.removeWinnerBuildplan(id);
  }
}
