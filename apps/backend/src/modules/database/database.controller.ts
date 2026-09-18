import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DatabaseService } from './database.service';

@Controller('database')
export class DatabaseController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Get('overview')
  getOverview() {
    return this.databaseService.getOverview();
  }

  @Get('online')
  getOnlinePlayers() {
    return this.databaseService.getOnlinePlayers();
  }

  @Get('settlers')
  @UseGuards(AuthGuard('jwt'))
  getSettlers() {
    return this.databaseService.getSettlers();
  }

  @Get('settlers/:id')
  @UseGuards(AuthGuard('jwt'))
  getSettler(@Param('id', ParseIntPipe) id: number) {
    return this.databaseService.getSettler(id);
  }

  @Get('system-types')
  @UseGuards(AuthGuard('jwt'))
  getSystemTypes(@Request() req: { user: { sub: number } }) {
    return this.databaseService.getSystemTypes(req.user.sub);
  }

  @Get('ship-classes')
  @UseGuards(AuthGuard('jwt'))
  getShipClasses(@Request() req: { user: { sub: number } }) {
    return this.databaseService.getShipClasses(req.user.sub);
  }

  @Get('ship-classes/:key')
  @UseGuards(AuthGuard('jwt'))
  getShipClassDetail(
    @Request() req: { user: { sub: number } },
    @Param('key') key: string,
  ) {
    return this.databaseService.getShipClassDetail(req.user.sub, key);
  }

  @Get('modules')
  @UseGuards(AuthGuard('jwt'))
  getModules() {
    return this.databaseService.getModules();
  }

  @Get('commodities')
  @UseGuards(AuthGuard('jwt'))
  getCommodities() {
    return this.databaseService.getCommodities();
  }

  @Get('rankings')
  @UseGuards(AuthGuard('jwt'))
  getRankings() {
    return this.databaseService.getRankings();
  }
}
