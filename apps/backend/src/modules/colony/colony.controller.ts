import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ColonyService } from './colony.service';
import { GameDataService } from '../game-data/game-data.service';

@Controller('colonies')
@UseGuards(AuthGuard('jwt'))
export class ColonyController {
  constructor(
    private readonly colonyService: ColonyService,
    private readonly gameData: GameDataService,
  ) {}

  @Get('buildings/available')
  getAvailableBuildings(@Query('fieldType') fieldType?: string) {
    if (fieldType) {
      return this.gameData.getBuildingsForFieldType(Number(fieldType));
    }
    return this.gameData.getAllBuildings();
  }

  @Get('commodities/all')
  getCommodities() {
    return this.gameData.getAllCommodities();
  }

  @Get()
  findAll(@Request() req: { user: { sub: number } }) {
    return this.colonyService.findAllByUser(req.user.sub);
  }

  @Get('objectives/current')
  getCurrentObjective(@Request() req: { user: { sub: number } }) {
    return this.colonyService.getCurrentObjective(req.user.sub);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.colonyService.findOne(id, req.user.sub);
  }

  @Put(':id')
  rename(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body('name') name: string,
  ) {
    return this.colonyService.rename(id, req.user.sub, name);
  }

  @Post(':id/build')
  build(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body('fieldIndex') fieldIndex: number,
    @Body('buildingId') buildingId: number,
  ) {
    return this.colonyService.build(id, req.user.sub, fieldIndex, buildingId);
  }

  @Delete(':id/fields/:fieldIndex/building')
  demolish(
    @Param('id', ParseIntPipe) id: number,
    @Param('fieldIndex', ParseIntPipe) fieldIndex: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.colonyService.demolish(id, req.user.sub, fieldIndex);
  }

  @Post(':id/build-ship')
  buildShip(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body('shipClassId') shipClassId: number,
    @Body('name') name: string,
  ) {
    return this.colonyService.buildShip(id, req.user.sub, shipClassId, name);
  }
}
