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
import { ColonyFabricationQueueType } from './entities/colony-fabrication-queue.entity';

@Controller('colonies')
@UseGuards(AuthGuard('jwt'))
export class ColonyController {
  constructor(
    private readonly colonyService: ColonyService,
    private readonly gameData: GameDataService,
  ) {}

  @Get('buildings/available')
  getAvailableBuildings(
    @Request() req: { user: { sub: number } },
    @Query('fieldType') fieldType?: string,
  ) {
    return this.colonyService.getAvailableBuildings(
      req.user.sub,
      fieldType ? Number(fieldType) : undefined,
    );
  }

  @Get('buildings/all')
  getAllBuildings() {
    return this.gameData.getAllBuildings();
  }

  @Get('terraforming/all')
  getTerraforming() {
    return this.gameData.getAllTerraforming();
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

  @Post(':id/shields/frequency')
  setShieldFrequency(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body('frequency') frequency: number,
  ) {
    return this.colonyService.setShieldFrequency(id, req.user.sub, frequency);
  }

  @Post(':id/shields/load')
  loadShields(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body('amount') amount: number,
  ) {
    return this.colonyService.loadShields(id, req.user.sub, amount);
  }

  @Post(':id/crew-training')
  queueCrewTraining(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body('amount') amount: number,
  ) {
    return this.colonyService.queueCrewTraining(id, req.user.sub, amount);
  }

  @Post(':id/fabrication-queue')
  queueFabrication(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body('queueType') queueType: ColonyFabricationQueueType,
    @Body('itemKey') itemKey: string,
    @Body('amount') amount: number,
    @Body('buildingFunctionId') buildingFunctionId: number,
  ) {
    return this.colonyService.queueFabrication(
      id,
      req.user.sub,
      queueType,
      itemKey,
      amount,
      buildingFunctionId,
    );
  }

  @Delete(':id/fabrication-queue/:queueId')
  cancelFabricationQueue(
    @Param('id', ParseIntPipe) id: number,
    @Param('queueId', ParseIntPipe) queueId: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.colonyService.cancelFabricationQueue(id, req.user.sub, queueId);
  }

  @Post(':id/ships/:shipId/land')
  landShip(
    @Param('id', ParseIntPipe) id: number,
    @Param('shipId', ParseIntPipe) shipId: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.colonyService.landShip(id, req.user.sub, shipId);
  }

  @Post(':id/ships/:shipId/disassemble')
  disassembleShip(
    @Param('id', ParseIntPipe) id: number,
    @Param('shipId', ParseIntPipe) shipId: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.colonyService.disassembleShip(id, req.user.sub, shipId);
  }

  @Post(':id/ships/:shipId/crew/assign')
  assignCrewToShip(
    @Param('id', ParseIntPipe) id: number,
    @Param('shipId', ParseIntPipe) shipId: number,
    @Request() req: { user: { sub: number } },
    @Body('amount') amount: number,
  ) {
    return this.colonyService.assignCrewToShip(
      id,
      req.user.sub,
      shipId,
      amount,
    );
  }

  @Post(':id/ships/:shipId/crew/unassign')
  unassignCrewFromShip(
    @Param('id', ParseIntPipe) id: number,
    @Param('shipId', ParseIntPipe) shipId: number,
    @Request() req: { user: { sub: number } },
    @Body('amount') amount: number,
  ) {
    return this.colonyService.unassignCrewFromShip(
      id,
      req.user.sub,
      shipId,
      amount,
    );
  }

  @Post(':id/ships/:shipId/repair-queue')
  queueShipRepair(
    @Param('id', ParseIntPipe) id: number,
    @Param('shipId', ParseIntPipe) shipId: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.colonyService.queueShipRepair(id, req.user.sub, shipId);
  }

  @Post(':id/ships/:shipId/retrofit-queue')
  queueShipRetrofit(
    @Param('id', ParseIntPipe) id: number,
    @Param('shipId', ParseIntPipe) shipId: number,
    @Request() req: { user: { sub: number } },
    @Body('moduleCommodityIds') moduleCommodityIds: number[],
    @Body('buildPlanName') buildPlanName?: string,
  ) {
    return this.colonyService.queueShipRetrofit(
      id,
      req.user.sub,
      shipId,
      moduleCommodityIds ?? [],
      buildPlanName,
    );
  }

  @Delete(':id/ship-build-queue/:queueId')
  cancelShipBuildQueue(
    @Param('id', ParseIntPipe) id: number,
    @Param('queueId', ParseIntPipe) queueId: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.colonyService.cancelShipBuildQueue(id, req.user.sub, queueId);
  }

  @Delete(':id/shipyard-queue/:queueId')
  cancelShipyardQueue(
    @Param('id', ParseIntPipe) id: number,
    @Param('queueId', ParseIntPipe) queueId: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.colonyService.cancelShipyardQueue(id, req.user.sub, queueId);
  }

  @Post(':id/hangar/build-rump')
  buildAirfieldRump(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body('shipClassId') shipClassId: number,
    @Body('amount') amount?: number,
  ) {
    return this.colonyService.buildAirfieldRump(
      id,
      req.user.sub,
      shipClassId,
      amount ?? 1,
    );
  }

  @Post(':id/hangar/start-ship')
  startHangarShip(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body('shipClassId') shipClassId: number,
    @Body('name') name?: string,
  ) {
    return this.colonyService.startHangarShip(
      id,
      req.user.sub,
      shipClassId,
      name,
    );
  }

  @Post(':id/build-ship')
  buildShip(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body('shipClassId') shipClassId: number,
    @Body('name') name: string,
    @Body('moduleTypes') moduleTypes?: string[],
    @Body('buildPlanName') buildPlanName?: string,
    @Body('moduleCommodityIds') moduleCommodityIds?: number[],
  ) {
    return this.colonyService.buildShip(
      id,
      req.user.sub,
      shipClassId,
      name,
      moduleTypes,
      buildPlanName,
      moduleCommodityIds,
    );
  }

  @Post(':id/fields/:fieldIndex/terraform')
  terraformField(
    @Param('id', ParseIntPipe) id: number,
    @Param('fieldIndex', ParseIntPipe) fieldIndex: number,
    @Request() req: { user: { sub: number } },
    @Body('terraformingId') terraformingId: number,
  ) {
    return this.colonyService.terraformField(
      id,
      req.user.sub,
      fieldIndex,
      terraformingId,
    );
  }

  @Post(':id/fields/:fieldIndex/upgrade')
  upgradeBuilding(
    @Param('id', ParseIntPipe) id: number,
    @Param('fieldIndex', ParseIntPipe) fieldIndex: number,
    @Request() req: { user: { sub: number } },
    @Body('upgradeId') upgradeId: number,
  ) {
    return this.colonyService.upgradeBuilding(
      id,
      req.user.sub,
      fieldIndex,
      upgradeId,
    );
  }

  @Post(':id/fields/:fieldIndex/repair')
  repairBuilding(
    @Param('id', ParseIntPipe) id: number,
    @Param('fieldIndex', ParseIntPipe) fieldIndex: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.colonyService.repairBuilding(id, req.user.sub, fieldIndex);
  }

  @Post(':id/fields/:fieldIndex/toggle')
  toggleBuilding(
    @Param('id', ParseIntPipe) id: number,
    @Param('fieldIndex', ParseIntPipe) fieldIndex: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.colonyService.toggleBuilding(id, req.user.sub, fieldIndex);
  }
}
