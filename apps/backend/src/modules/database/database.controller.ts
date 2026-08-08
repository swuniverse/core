import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
