import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { TradeAccountTransferLineDto } from '@swuniverse/shared';
import { RequiresGameAccess } from '../game-status/game-status.guard';
import { TradeAccountTransferService } from './trade-account-transfer.service';

/** The trade menu of an own ship at a trade post. */
@Controller('spacecraft')
@RequiresGameAccess()
@UseGuards(AuthGuard('jwt'))
export class TradeShipController {
  constructor(private readonly transfers: TradeAccountTransferService) {}

  @Get(':id/trade/:postId')
  getTradeMenu(
    @Param('id', ParseIntPipe) id: number,
    @Param('postId', ParseIntPipe) postId: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.transfers.getMenu(id, req.user.sub, postId);
  }

  @Post(':id/trade/:postId/to-account')
  toAccount(
    @Param('id', ParseIntPipe) id: number,
    @Param('postId', ParseIntPipe) postId: number,
    @Request() req: { user: { sub: number } },
    @Body() lines: TradeAccountTransferLineDto[],
  ) {
    return this.transfers.transfer(id, req.user.sub, postId, 'TO_ACCOUNT', lines);
  }

  @Post(':id/trade/:postId/from-account')
  fromAccount(
    @Param('id', ParseIntPipe) id: number,
    @Param('postId', ParseIntPipe) postId: number,
    @Request() req: { user: { sub: number } },
    @Body() lines: TradeAccountTransferLineDto[],
  ) {
    return this.transfers.transfer(id, req.user.sub, postId, 'FROM_ACCOUNT', lines);
  }
}
