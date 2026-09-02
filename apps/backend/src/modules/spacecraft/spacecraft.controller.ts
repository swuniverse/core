import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { AdminGuard } from '../auth/admin.guard';
import { SpacecraftService } from './spacecraft.service';
import { TransferService } from './transfer.service';
import { SpacecraftScanService } from './spacecraft-scan.service';
import { GameDataService } from '../game-data/game-data.service';
import { ColonizationService } from '../colonization/colonization.service';

class CreateFleetDto {
  @IsString()
  name: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  leaderId: number;
}

class JoinFleetDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  shipId: number;
}

class CelestialObjectActionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  celestialObjectId: number;
}

class ColonyScanDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  colonyId: number;
}

class MoveToCoordinatesDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  targetX: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  targetY: number;
}

class WarpDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetSystemId: number;
}

class ReactorDistributionDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  warpSplit: number;
}

class TorpedoLoadDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  colonyId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  torpedoTypeId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount: number;
}

class TorpedoUnloadDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  colonyId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount?: number;
}

class CargoTransferDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  colonyId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  commodityId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount: number;
}

@Controller('spacecraft')
@UseGuards(AuthGuard('jwt'))
export class SpacecraftController {
  constructor(
    private readonly spacecraftService: SpacecraftService,
    private readonly transferService: TransferService,
    private readonly scanService: SpacecraftScanService,
    private readonly gameData: GameDataService,
    private readonly colonizationService: ColonizationService,
  ) {}

  // Static routes first (before :id)
  @Get('modules/available')
  getAvailableModules(@Query('category') category?: string) {
    const modules = category
      ? this.gameData.getModulesByCategory(category)
      : this.gameData.getAllModules();
    return modules.map(({ secret, ...rest }) => rest);
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
    @Body() dto: CreateFleetDto,
  ) {
    return this.spacecraftService.createFleet(
      req.user.sub,
      dto.name,
      dto.leaderId,
    );
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
    @Body() dto: JoinFleetDto,
  ) {
    return this.spacecraftService.joinFleet(req.user.sub, fleetId, dto.shipId);
  }

  // Collection routes
  @Get()
  findAll(@Request() req: { user: { sub: number } }) {
    return this.spacecraftService.findAllByUser(req.user.sub);
  }

  @Get('colony-scans')
  getColonyScans(@Request() req: { user: { sub: number } }) {
    return this.scanService.listColonyScans(req.user.sub);
  }

  @Get('colony-scans/:scanId')
  getColonyScan(
    @Param('scanId', ParseIntPipe) scanId: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.scanService.getColonyScan(scanId, req.user.sub);
  }

  @Delete('colony-scans/:scanId')
  deleteColonyScan(
    @Param('scanId', ParseIntPipe) scanId: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.scanService.deleteColonyScan(scanId, req.user.sub);
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
    @Body() dto: CelestialObjectActionDto,
  ) {
    return this.scanService.surfaceScan(
      id,
      req.user.sub,
      dto.celestialObjectId,
    );
  }

  @Post(':id/colonize')
  colonize(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() dto: CelestialObjectActionDto,
  ) {
    return this.colonizationService.colonize(
      req.user.sub,
      id,
      dto.celestialObjectId,
    );
  }

  @Post(':id/colony-scan')
  colonyScan(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() dto: ColonyScanDto,
  ) {
    return this.scanService.colonyScan(id, req.user.sub, dto.colonyId);
  }

  @Post(':id/navigate')
  navigate(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() dto: MoveToCoordinatesDto,
  ) {
    return this.spacecraftService.navigate(
      id,
      req.user.sub,
      dto.targetX,
      dto.targetY,
    );
  }

  @Post(':id/fly')
  flyGalaxy(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() dto: MoveToCoordinatesDto,
  ) {
    return this.spacecraftService.flyGalaxy(
      id,
      req.user.sub,
      dto.targetX,
      dto.targetY,
    );
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
    @Body() dto: WarpDto,
  ) {
    return this.spacecraftService.warp(id, req.user.sub, dto.targetSystemId);
  }

  @Patch(':id/reactor-distribution')
  setReactorDistribution(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() dto: ReactorDistributionDto,
  ) {
    return this.spacecraftService.setReactorDistribution(
      id,
      req.user.sub,
      dto.warpSplit,
    );
  }

  @Post(':id/recharge')
  manualRecharge(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.spacecraftService.manualRecharge(id, req.user.sub);
  }

  @Patch(':id/systems/:systemKey')
  toggleSystem(
    @Param('id', ParseIntPipe) id: number,
    @Param('systemKey') systemKey: string,
    @Request() req: { user: { sub: number } },
    @Body('active') active: boolean,
  ) {
    return this.spacecraftService.toggleSystem(
      id,
      req.user.sub,
      systemKey as any,
      active,
    );
  }

  @Post(':id/leave-fleet')
  leaveFleet(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.spacecraftService.leaveFleet(req.user.sub, id);
  }

  @Get(':id/torpedoes')
  getTorpedoes(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.spacecraftService.getTorpedoStorage(id, req.user.sub);
  }

  @Post(':id/torpedoes/load')
  loadTorpedoes(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() dto: TorpedoLoadDto,
  ) {
    return this.spacecraftService.loadTorpedoes(
      id,
      req.user.sub,
      dto.colonyId,
      dto.torpedoTypeId,
      dto.amount,
    );
  }

  @Post(':id/torpedoes/unload')
  unloadTorpedoes(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() dto: TorpedoUnloadDto,
  ) {
    return this.spacecraftService.unloadTorpedoes(
      id,
      req.user.sub,
      dto.colonyId,
      dto.amount,
    );
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
    @Body() dto: CargoTransferDto,
  ) {
    return this.transferService.loadCargo(
      id,
      req.user.sub,
      dto.colonyId,
      dto.commodityId,
      dto.amount,
    );
  }

  @Post(':id/cargo/unload')
  unloadCargo(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() dto: CargoTransferDto,
  ) {
    return this.transferService.unloadCargo(
      id,
      req.user.sub,
      dto.colonyId,
      dto.commodityId,
      dto.amount,
    );
  }
}
