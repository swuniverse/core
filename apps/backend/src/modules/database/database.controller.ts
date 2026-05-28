import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DatabaseService } from './database.service';

@Controller('database')
@UseGuards(AuthGuard('jwt'))
export class DatabaseController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Get('overview')
  getOverview() {
    return this.databaseService.getOverview();
  }

  @Get('settlers')
  getSettlers() {
    return this.databaseService.getSettlers();
  }

  @Get('commodities')
  getCommodities() {
    return this.databaseService.getCommodities();
  }

  @Get('rankings')
  getRankings() {
    return this.databaseService.getRankings();
  }
}
