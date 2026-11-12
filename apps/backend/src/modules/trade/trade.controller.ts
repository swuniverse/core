import {
  Body,
  Controller,
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
import { TradeQueryService } from './trade-query.service';

@Controller('trade')
@RequiresGameAccess()
@UseGuards(AuthGuard('jwt'))
export class TradeController {
  constructor(
    private readonly query: TradeQueryService,
    private readonly licenses: TradeLicenseService,
    private readonly purchases: TradeLicensePurchaseService,
    private readonly menus: TradeLicenseMenuService,
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
