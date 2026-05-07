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
import { SpacecraftService } from './spacecraft.service';
import { GameDataService } from '../game-data/game-data.service';

@Controller('spacecraft')
@UseGuards(AuthGuard('jwt'))
export class SpacecraftController {
  constructor(
    private readonly spacecraftService: SpacecraftService,
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
  getShipClasses() {
    return this.spacecraftService.getShipClasses();
  }

  @Post('fleets/create')
  createFleet(
    @Request() req: { user: { sub: number } },
    @Body('name') name: string,
    @Body('leaderId') leaderId: number,
  ) {
    return this.spacecraftService.createFleet(req.user.sub, name, leaderId);
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

  @Post(':id/navigate')
  navigate(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body('targetX') targetX: number,
    @Body('targetY') targetY: number,
  ) {
    return this.spacecraftService.navigate(id, req.user.sub, targetX, targetY);
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
}
