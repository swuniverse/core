import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequiresGameAccess } from '../game-status/game-status.guard';
import {
  TradeLicenseService,
  type TradeLicenseConditionInput,
} from './trade-license.service';
import {
  TradeLicensePurchaseService,
  type TradeLicensePurchaseInput,
} from './trade-license-purchase.service';
import { TradeLicenseMenuService } from './trade-license-menu.service';
import { TradeOfferService } from './trade-offer.service';
import { TradeOfferMarketService } from './trade-offer-market.service';
import { TradeQueryService } from './trade-query.service';
import type { CreateTradeOfferDto, TradeOfferSearchMode } from '@swuniverse/shared';

@Controller('trade')
@RequiresGameAccess()
@UseGuards(AuthGuard('jwt'))
export class TradeController {
  constructor(
    private readonly query: TradeQueryService,
    private readonly licenses: TradeLicenseService,
    private readonly purchases: TradeLicensePurchaseService,
    private readonly menus: TradeLicenseMenuService,
    private readonly offers: TradeOfferService,
    private readonly market: TradeOfferMarketService,
  ) {}

  @Get('posts')
  listPosts(@Request() req: { user: { sub: number } }) {
    return this.query.listPosts(req.user.sub);
  }

  @Get('overview')
  getOverview(@Request() req: { user: { sub: number } }) {
    return this.query.getOverview(req.user.sub);
  }

  @Get('licenses')
  listOwnLicenses(@Request() req: { user: { sub: number } }) {
    return this.licenses.listOwn(req.user.sub);
  }

  @Get('posts/:id/licenses')
  listIssuedLicenses(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.licenses.listIssued(id, req.user.sub);
  }

  @Get('offers')
  searchOffers(
    @Request() req: { user: { sub: number } },
    @Query('commodityId', new ParseIntPipe({ optional: true })) commodityId?: number,
    @Query('mode') mode?: string,
    @Query('postId', new ParseIntPipe({ optional: true })) postId?: number,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
  ) {
    const searchMode: TradeOfferSearchMode = mode === 'offer' || mode === 'demand' ? mode : 'both';
    return this.market.search(req.user.sub, { commodityId, mode: searchMode, postId, page });
  }

  @Get('offers/by-commodity/:id')
  getOffersByCommodity(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.market.byCommodity(req.user.sub, id);
  }

  @Post('offers/:id/take')
  takeOffer(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body('amount') amount: number,
  ) {
    return this.market.take(id, req.user.sub, amount);
  }

  @Get('offers/mine')
  listOwnOffers(@Request() req: { user: { sub: number } }) {
    return this.offers.listMine(req.user.sub);
  }

  @Get('posts/:id/offer-options')
  getOfferOptions(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.offers.getOptions(id, req.user.sub);
  }

  @Post('posts/:id/offers')
  createOffer(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() input: CreateTradeOfferDto,
  ) {
    return this.offers.create(id, req.user.sub, input);
  }

  @Delete('offers/:id')
  cancelOffer(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.offers.cancel(id, req.user.sub);
  }

  @Get('posts/:id/license-menu')
  getLicenseMenu(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Query('shipId', new ParseIntPipe({ optional: true })) shipId?: number,
  ) {
    return this.menus.getMenu(id, req.user.sub, shipId ?? null);
  }

  @Get('spacecraft/:id/post')
  getPostAtSpacecraft(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.menus.getPostAtSpacecraft(id, req.user.sub);
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

  @Post('posts/:id/licenses')
  buyLicense(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() input: TradeLicensePurchaseInput,
  ) {
    return this.purchases.purchase(id, req.user.sub, input);
  }

  @Post('posts/:id/licenses/renewal')
  renewLicense(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() input: { accountPostId: number },
  ) {
    return this.purchases.renew(id, req.user.sub, input);
  }
}
