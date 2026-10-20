import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  NotFoundException,
  ParseEnumPipe,
  ParseIntPipe,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequiresGameAccess } from '../game-status/game-status.guard';
import { DatabaseService } from './database.service';
import { STATISTIC_UNITS, type StatisticUnit } from '@swuniverse/shared';
import { StatisticsService } from '../statistics/statistics.service';

@Controller('database')
export class DatabaseController {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly statisticsService: StatisticsService,
  ) {}

  @Get('overview')
  getOverview() {
    return this.databaseService.getOverview();
  }

  @Get('online')
  getOnlinePlayers() {
    return this.databaseService.getOnlinePlayers();
  }

  @Get('settlers')
  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'))
  getSettlers() {
    return this.databaseService.getSettlers();
  }

  @Get('settlers/:id')
  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'))
  getSettler(
    @Request() req: { user: { sub: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.databaseService.getSettler(req.user.sub, id);
  }

  @Get('system-types')
  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'))
  getSystemTypes(@Request() req: { user: { sub: number } }) {
    return this.databaseService.getSystemTypes(req.user.sub);
  }

  @Get('systems/:id')
  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'))
  getSystemDetail(
    @Request() req: { user: { sub: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.databaseService.getSystemDetail(req.user.sub, id);
  }

  @Get('systems')
  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'))
  getSystems(@Request() req: { user: { sub: number } }) {
    return this.databaseService.getSystems(req.user.sub);
  }

  @Get('ship-classes')
  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'))
  getShipClasses(@Request() req: { user: { sub: number } }) {
    return this.databaseService.getShipClasses(req.user.sub);
  }

  @Get('planet-types')
  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'))
  getPlanetTypes(@Request() req: { user: { sub: number } }) {
    return this.databaseService.getPlanetTypes(req.user.sub);
  }

  @Get('ship-classes/:key')
  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'))
  getShipClassDetail(
    @Request() req: { user: { sub: number } },
    @Param('key') key: string,
  ) {
    return this.databaseService.getShipClassDetail(req.user.sub, key);
  }

  @Get('modules')
  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'))
  getModules() {
    return this.databaseService.getModules();
  }

  @Get('commodities')
  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'))
  getCommodities() {
    return this.databaseService.getCommodities();
  }

  @Get('prestige-history')
  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'))
  getPrestigeHistory(
    @Request() req: { user: { sub: number } },
    @Query('limit') limit?: string,
  ) {
    return this.databaseService.getPrestigeHistory(
      req.user.sub,
      Number(limit) || 50,
    );
  }

  @Get('statistics')
  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'))
  getStatistics(
    @Query(
      'unit',
      new DefaultValuePipe('tick'),
      new ParseEnumPipe(STATISTIC_UNITS, {
        exceptionFactory: () =>
          new BadRequestException('Unbekannte Zeiteinheit'),
      }),
    )
    unit: StatisticUnit,
  ) {
    return this.statisticsService.getStatistics(unit);
  }

  @Get('rankings/:key')
  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'))
  getRanking(
    @Request() req: { user: { sub: number } },
    @Param('key') key: string,
  ) {
    const keys = [
      'discoveries',
      'research',
      'prestige',
      'crew-training',
      'colony-worth',
      'colony-production',
    ] as const;
    if (!keys.includes(key as (typeof keys)[number])) {
      throw new NotFoundException('Rangliste nicht gefunden');
    }
    return this.databaseService.getRanking(
      req.user.sub,
      key as (typeof keys)[number],
    );
  }

  @Get('rankings')
  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'))
  getRankings() {
    return this.databaseService.getRankings();
  }
}
