import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../auth/admin.guard';
import { SpacecraftService } from './spacecraft.service';
import { TransferService } from './transfer.service';
import { SpacecraftScanService } from './spacecraft-scan.service';
import { GameDataService } from '../game-data/game-data.service';

@Controller('spacecraft')
@UseGuards(AuthGuard('jwt'))
export class SpacecraftController {
  constructor(
    private readonly spacecraftService: SpacecraftService,
    private readonly transferService: TransferService,
    private readonly scanService: SpacecraftScanService,
    private readonly gameData: GameDataService,
  ) {}

  // Static routes first (before :id)
  @Get('modules/available')
  getAvailableModules(@Query('category') category?: string) {
    if (category) {
      return this.gameData.getModulesByCategory(category);
    }
    return this.gameData.getAllModules();
  }

  @Get('fleets/all')
  getFleets(@Request() req: { user: { sub: number } }) {
    return this.spacecraftService.getUserFleets(req.user.sub);
  }

  @Get('classes')
  getShipClasses(@Request() req: { user: { sub: number } }) {
    return this.spacecraftService.getShipClasses(req.user.sub);
  }

  @Post('fleets/create')
  createFleet(
    @Request() req: { user: { sub: number } },
    @Body('name') name: string,
    @Body('leaderId') leaderId: number,
  ) {
    return this.spacecraftService.createFleet(req.user.sub, name, leaderId);
  }

  @Post('admin/spawn')
  @UseGuards(AdminGuard)
  adminSpawnShip(
    @Body('userId') userId: number,
    @Body('shipClassId') shipClassId: number,
    @Body('name') name: string,
    @Body('layerId') layerId: number,
    @Body('posX') posX: number,
    @Body('posY') posY: number,
  ) {
    return this.spacecraftService.adminSpawnShip(
      userId,
      shipClassId,
      name,
      layerId,
      posX,
      posY,
    );
  }

  @Get('admin/users')
  @UseGuards(AdminGuard)
  adminListUsers() {
    return this.spacecraftService.adminListUsers();
  }

  @Post('fleets/:fleetId/join')
  joinFleet(
    @Param('fleetId', ParseIntPipe) fleetId: number,
    @Request() req: { user: { sub: number } },
    @Body('shipId') shipId: number,
  ) {
    return this.spacecraftService.joinFleet(req.user.sub, fleetId, shipId);
  }

  // Collection routes
  @Get()
  findAll(@Request() req: { user: { sub: number } }) {
    return this.spacecraftService.findAllByUser(req.user.sub);
  }

  @Get(':id/local-map')
  getLocalMap(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.spacecraftService.getLocalMap(id, req.user.sub);
  }

  // Parameterized routes
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.spacecraftService.findOne(id, req.user.sub);
  }

  @Put(':id')
  rename(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body('name') name: string,
  ) {
    return this.spacecraftService.rename(id, req.user.sub, name);
  }

  @Get(':id/modules')
  getModules(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.spacecraftService.getModules(id, req.user.sub);
  }

  @Post(':id/modules/install')
  installModule(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body('moduleType') moduleType: string,
  ) {
    return this.spacecraftService.installModule(id, req.user.sub, moduleType);
  }

  @Post(':id/modules/:moduleId/level-up')
  levelUpModule(
    @Param('id', ParseIntPipe) id: number,
    @Param('moduleId', ParseIntPipe) moduleId: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.spacecraftService.levelUpModule(id, req.user.sub, moduleId);
  }

  @Delete(':id/modules/:moduleId')
  removeModule(
    @Param('id', ParseIntPipe) id: number,
    @Param('moduleId', ParseIntPipe) moduleId: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.spacecraftService.removeModule(id, req.user.sub, moduleId);
  }

  @Post(':id/surface-scan')
  surfaceScan(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body('celestialObjectId') celestialObjectId: number,
  ) {
    return this.scanService.surfaceScan(id, req.user.sub, celestialObjectId);
  }

  @Post(':id/navigate')
  navigate(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body('targetX') targetX: number,
    @Body('targetY') targetY: number,
  ) {
    return this.spacecraftService.navigate(id, req.user.sub, targetX, targetY);
  }

  @Post(':id/fly')
  flyGalaxy(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body('targetX') targetX: number,
    @Body('targetY') targetY: number,
  ) {
    return this.spacecraftService.flyGalaxy(id, req.user.sub, targetX, targetY);
  }

  @Post(':id/enter-system')
  enterSystem(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.spacecraftService.enterSystem(id, req.user.sub);
  }

  @Post(':id/leave-system')
  leaveSystem(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.spacecraftService.leaveSystem(id, req.user.sub);
  }

  @Post(':id/warp')
  warp(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body('targetSystemId') targetSystemId: number,
  ) {
    return this.spacecraftService.warp(id, req.user.sub, targetSystemId);
  }

  @Post(':id/leave-fleet')
  leaveFleet(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.spacecraftService.leaveFleet(req.user.sub, id);
  }

  @Get(':id/cargo')
  getCargo(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.transferService.getShipCargo(id);
  }

  @Post(':id/cargo/load')
  loadCargo(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body('colonyId') colonyId: number,
    @Body('commodityId') commodityId: number,
    @Body('amount') amount: number,
  ) {
    return this.transferService.loadCargo(
      id,
      req.user.sub,
      colonyId,
      commodityId,
      amount,
    );
  }

  @Post(':id/cargo/unload')
  unloadCargo(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body('colonyId') colonyId: number,
    @Body('commodityId') commodityId: number,
    @Body('amount') amount: number,
  ) {
    return this.transferService.unloadCargo(
      id,
      req.user.sub,
      colonyId,
      commodityId,
      amount,
    );
  }
}
