import { DatabaseRegionCatalogService } from './database-region-catalog.service';
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
import { STATISTIC_UNITS, type StatisticUnit, type DatabaseRegionsDto, type DatabaseSystemTypesDto, type DatabasePlanetTypesDto } from '@swuniverse/shared';
import { StatisticsService } from '../statistics/statistics.service';
import { CommodityOverviewService } from './commodity-overview.service';
import { LayerAccessGuard } from '../starmap/layer-access.guard';
import { LayerAccessService, type LayerReader } from '../starmap/layer-access.service';

@Controller('database')
export class DatabaseController {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly statisticsService: StatisticsService,
    private readonly commodityOverviewService: CommodityOverviewService,
    private readonly layerAccess: LayerAccessService,
    private readonly regionCatalog: DatabaseRegionCatalogService,
  ) {}

  private async catalogLayers(user: LayerReader, layerId?: number) {
    if (layerId !== undefined) await this.layerAccess.assertAccess(user, layerId);
    const layers = await this.layerAccess.getLayers(user);
    return {
      layers,
      layerIds: layers
        .filter((layer) => layerId === undefined || layer.id === layerId)
        .map((layer) => layer.id),
    };
  }

  @Get('overview')
  getOverview() {
    return this.databaseService.getOverview();
  }

  @Get('online')
  getOnlinePlayers() {
    return this.databaseService.getOnlinePlayers();
  }

  @Get('trade-posts')
  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'))
  getTradePosts(@Request() req: { user: { sub: number } }) {
    return this.databaseService.getTradePosts(req.user.sub);
  }

  @Get('settlers')
  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'))
  getSettlers() {
    return this.databaseService.getSettlers();
  }

  @Get('npcs')
  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'))
  getNpcsAndAdmins() {
    return this.databaseService.getNpcsAndAdmins();
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
  async getSystemTypes(
    @Request() req: { user: LayerReader },
    @Query('layerId', new ParseIntPipe({ optional: true })) layerId?: number,
  ): Promise<DatabaseSystemTypesDto> {
    const { layers, layerIds } = await this.catalogLayers(req.user, layerId);
    return {
      ...await this.databaseService.getSystemTypes(req.user.sub, layerIds),
      layers: layers.map(({ id, name }) => ({ id, name })),
    };
  }

  @Get('regions')
  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'))
  async getRegions(
    @Request() req: { user: LayerReader },
    @Query('layerId', new ParseIntPipe({ optional: true })) layerId?: number,
  ): Promise<DatabaseRegionsDto> {
    const { layers, layerIds } = await this.catalogLayers(req.user, layerId);
    return {
      ...await this.regionCatalog.getRegions(req.user.sub, layerIds),
      layers: layers.map(({ id, name }) => ({ id, name })),
    };
  }

  @Get('systems/:id')
  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'), LayerAccessGuard)
  getSystemDetail(
    @Request() req: { user: { sub: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.databaseService.getSystemDetail(req.user.sub, id);
  }

  @Get('systems')
  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'))
  async getSystems(
    @Request() req: { user: LayerReader },
    @Query('layerId', new ParseIntPipe({ optional: true })) layerId?: number,
  ) {
    const { layerIds } = await this.catalogLayers(req.user, layerId);
    return this.databaseService.getSystems(req.user.sub, layerIds);
  }

  @Get('ship-classes')
  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'))
  getShipClasses(@Request() req: { user: { sub: number } }) {
    return this.databaseService.getShipClasses(req.user.sub);
  }

  @Get('station-classes')
  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'))
  getStationClasses(@Request() req: { user: { sub: number } }) {
    return this.databaseService.getStationClasses(req.user.sub);
  }

  @Get('station-classes/:key')
  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'))
  getStationClassDetail(
    @Request() req: { user: { sub: number } },
    @Param('key') key: string,
  ) {
    return this.databaseService.getStationClassDetail(req.user.sub, key);
  }

  @Get('planet-types')
  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'))
  async getPlanetTypes(
    @Request() req: { user: LayerReader },
    @Query('layerId', new ParseIntPipe({ optional: true })) layerId?: number,
  ): Promise<DatabasePlanetTypesDto> {
    const { layers, layerIds } = await this.catalogLayers(req.user, layerId);
    return {
      ...await this.databaseService.getPlanetTypes(req.user.sub, layerIds),
      layers: layers.map(({ id, name }) => ({ id, name })),
    };
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

  @Get('commodities/overview')
  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'))
  getCommodityOverview(@Request() req: { user: { sub: number } }) {
    return this.commodityOverviewService.getOverview(req.user.sub);
  }

  @Get('commodities/:id/locations')
  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'))
  getCommodityLocations(
    @Request() req: { user: { sub: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.commodityOverviewService.getLocations(req.user.sub, id);
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
      'flights',
      'rpg',
      'aurodium',
      'trade-posts',
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
