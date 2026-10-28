import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { SaveRpgPlotDto } from '@swuniverse/shared';
import { RequiresGameAccess } from '../game-status/game-status.guard';
import { RpgPlotService } from './rpg-plot.service';

@Controller('rpg/plots')
@RequiresGameAccess()
@UseGuards(AuthGuard('jwt'))
export class RpgPlotController {
  constructor(private readonly plots: RpgPlotService) {}

  @Get()
  list(@Query('page') page?: string) {
    return this.plots.list(Number(page) || 1);
  }

  @Get('mine')
  mine(
    @Request() req: { user: { sub: number } },
    @Query('page') page?: string,
  ) {
    return this.plots.list(Number(page) || 1, req.user.sub);
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.plots.detail(id);
  }

  @Post()
  create(
    @Request() req: { user: { sub: number } },
    @Body() body: SaveRpgPlotDto,
  ) {
    return this.plots.create(req.user.sub, body);
  }

  @Patch(':id')
  update(
    @Request() req: { user: { sub: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SaveRpgPlotDto,
  ) {
    return this.plots.update(req.user.sub, id, body);
  }

  @Post(':id/end')
  end(
    @Request() req: { user: { sub: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.plots.end(req.user.sub, id);
  }

  @Post(':id/members')
  @HttpCode(204)
  addMember(
    @Request() req: { user: { sub: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body('userId', ParseIntPipe) userId: number,
  ) {
    return this.plots.addMember(req.user.sub, id, userId);
  }

  @Delete(':id/members/:userId')
  @HttpCode(204)
  removeMember(
    @Request() req: { user: { sub: number } },
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.plots.removeMember(req.user.sub, id, userId);
  }
}
