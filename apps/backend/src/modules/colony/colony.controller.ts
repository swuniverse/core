import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
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

  @Get(':id/events')
  getEvents(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.colonyService.getEvents(
      id,
      req.user.sub,
      Number(limit) || 50,
      unreadOnly === 'true',
    );
  }

  @Post(':id/events/read-all')
  markAllEventsRead(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.colonyService.markAllEventsRead(id, req.user.sub);
  }

  @Post(':id/events/:eventId/read')
  markEventRead(
    @Param('id', ParseIntPipe) id: number,
    @Param('eventId', ParseIntPipe) eventId: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.colonyService.markEventRead(id, req.user.sub, eventId);
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

  @Post(':id/population-limit')
  setPopulationLimit(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body('limit') limit: number,
  ) {
    return this.colonyService.setPopulationLimit(id, req.user.sub, limit);
  }

  @Post(':id/immigration')
  setImmigration(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body('enabled') enabled: boolean,
  ) {
    return this.colonyService.setImmigration(id, req.user.sub, enabled);
  }

  @Post(':id/message')
  setColonyMessage(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body('message') message: string | null,
  ) {
    return this.colonyService.setColonyMessage(id, req.user.sub, message);
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

  @Post(':id/defense/torpedo-type')
  setDefenseTorpedoType(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body('torpedoTypeId') torpedoTypeId: number | null,
  ) {
    return this.colonyService.setDefenseTorpedoType(
      id,
      req.user.sub,
      torpedoTypeId,
    );
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

  @Get(':id/buildings/repair-preview')
  getBuildingRepairPreview(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Query('fieldIndexes') fieldIndexes?: string,
  ) {
    const parsed = fieldIndexes
      ? fieldIndexes
          .split(',')
          .map((value) => Number(value.trim()))
          .filter((value) => Number.isInteger(value))
      : undefined;
    return this.colonyService.getBuildingRepairPreview(
      id,
      req.user.sub,
      parsed,
    );
  }

  @Post(':id/buildings/repair-damaged')
  repairDamagedBuildings(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body('fieldIndexes') fieldIndexes?: number[],
  ) {
    return this.colonyService.repairDamagedBuildings(
      id,
      req.user.sub,
      fieldIndexes,
    );
  }

  @Post(':id/buildings/activate')
  activateBuildings(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body('mode') mode: number,
    @Body('fieldIndexes') fieldIndexes?: number[],
    @Body('commodityId') commodityId?: number,
  ) {
    return this.colonyService.activateBuildings(id, req.user.sub, mode, {
      fieldIndexes,
      commodityId,
    });
  }

  @Post(':id/buildings/deactivate')
  deactivateBuildings(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body('mode') mode: number,
    @Body('fieldIndexes') fieldIndexes?: number[],
    @Body('commodityId') commodityId?: number,
  ) {
    return this.colonyService.deactivateBuildings(id, req.user.sub, mode, {
      fieldIndexes,
      commodityId,
    });
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

  @Post(':id/buildplans')
  createBuildplan(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body('shipClassId') shipClassId: number,
    @Body('name') name: string,
    @Body('moduleCommodityIds') moduleCommodityIds?: number[],
    @Body('moduleTypes') moduleTypes?: string[],
  ) {
    return this.colonyService.createShipBuildplan(
      id,
      req.user.sub,
      shipClassId,
      name,
      moduleCommodityIds ?? [],
      moduleTypes ?? [],
    );
  }

  @Patch(':id/buildplans/:planId')
  renameBuildplan(
    @Param('id', ParseIntPipe) id: number,
    @Param('planId', ParseIntPipe) planId: number,
    @Request() req: { user: { sub: number } },
    @Body('name') name: string,
  ) {
    return this.colonyService.renameShipBuildplan(
      id,
      req.user.sub,
      planId,
      name,
    );
  }

  @Delete(':id/buildplans/:planId')
  deleteBuildplan(
    @Param('id', ParseIntPipe) id: number,
    @Param('planId', ParseIntPipe) planId: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.colonyService.deleteShipBuildplan(id, req.user.sub, planId);
  }

  @Post(':id/buildplans/:planId/build')
  buildFromBuildplan(
    @Param('id', ParseIntPipe) id: number,
    @Param('planId', ParseIntPipe) planId: number,
    @Request() req: { user: { sub: number } },
    @Body('name') name: string,
  ) {
    return this.colonyService.buildShipFromBuildplan(
      id,
      req.user.sub,
      planId,
      name,
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
