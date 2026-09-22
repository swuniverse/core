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
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { AdminGuard } from '../auth/admin.guard';
import { SpacecraftService } from './spacecraft.service';
import { TransferService } from './transfer.service';
import { SpacecraftScanService } from './spacecraft-scan.service';
import { GameDataService } from '../game-data/game-data.service';
import { ColonizationService } from '../colonization/colonization.service';
import { ShipColonyContextService } from './ship-colony-context.service';
import { SpacecraftCommunicationService } from './spacecraft-communication.service';
import { SpacecraftEngineeringService } from './spacecraft-engineering.service';
import { SpacecraftDestructionService } from './spacecraft-destruction.service';
import { EngineeringAmountDto } from './engineering-amount.dto';
import { AdminSpawnShipDto } from './admin-spawn-ship.dto';
import {
  AlertState,
  SpacecraftOperatingMode,
  SpacecraftLssMode,
} from './entities/spacecraft.entity';

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
  torpedoTypeId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount?: number;
}

class AlertStateDto {
  @IsEnum(AlertState)
  alertState: AlertState;
}

class OperatingModeDto {
  @IsEnum(SpacecraftOperatingMode)
  operatingMode: SpacecraftOperatingMode;
}

class LssModeDto {
  @IsEnum(SpacecraftLssMode)
  mode: SpacecraftLssMode;
}

class SystemFieldScanDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  targetX: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  targetY: number;
}

class CommunicationTextDto {
  @IsString()
  body: string;
}

class DistressDto {
  @IsString()
  message: string;
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

class ColonyCrewTransferDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  colonyId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount: number;
}

class ShipTorpedoTransferDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetShipId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount: number;

  @IsEnum(['TO_TARGET', 'FROM_TARGET'])
  direction: 'TO_TARGET' | 'FROM_TARGET';
}

class ShipCrewTransferDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetShipId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount: number;

  @IsEnum(['TO_TARGET', 'FROM_TARGET'])
  direction: 'TO_TARGET' | 'FROM_TARGET';
}

class ShipCargoTransferDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetShipId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  commodityId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount: number;

  @IsEnum(['TO_TARGET', 'FROM_TARGET'])
  direction: 'TO_TARGET' | 'FROM_TARGET';
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
    private readonly contextService: ShipColonyContextService,
    private readonly communicationService: SpacecraftCommunicationService,
    private readonly engineeringService: SpacecraftEngineeringService,
    private readonly destructionService: SpacecraftDestructionService,
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

  @Get('admin/buildplans')
  @UseGuards(AdminGuard)
  adminBuildplans() {
    return this.spacecraftService.listAdminBuildplans();
  }

  @Post('admin/buildplans')
  @UseGuards(AdminGuard)
  adminCreateBuildplan(
    @Body('shipClassId', ParseIntPipe) shipClassId: number,
    @Body('name') name: string,
    @Body('moduleSelections')
    moduleSelections: Array<{ slotId: string; commodityId: number }> = [],
  ) {
    return this.spacecraftService.createAdminBuildplan(
      shipClassId,
      name,
      moduleSelections,
    );
  }

  @Patch('admin/buildplans/:id')
  @UseGuards(AdminGuard)
  adminUpdateBuildplan(
    @Param('id', ParseIntPipe) id: number,
    @Body('shipClassId', ParseIntPipe) shipClassId: number,
    @Body('name') name: string,
    @Body('moduleSelections')
    moduleSelections: Array<{ slotId: string; commodityId: number }> = [],
  ) {
    return this.spacecraftService.updateAdminBuildplan(
      id,
      shipClassId,
      name,
      moduleSelections,
    );
  }

  @Delete('admin/buildplans/:id')
  @UseGuards(AdminGuard)
  adminDeleteBuildplan(@Param('id', ParseIntPipe) id: number) {
    return this.spacecraftService.deleteAdminBuildplan(id);
  }

  @Post('admin/spawn')
  @UseGuards(AdminGuard)
  adminSpawnShip(@Body() dto: AdminSpawnShipDto) {
    return this.spacecraftService.adminSpawnShip(dto);
  }

  @Get('admin/spawn-options/:shipClassId')
  @UseGuards(AdminGuard)
  adminSpawnOptions(@Param('shipClassId', ParseIntPipe) shipClassId: number) {
    return this.spacecraftService.getAdminSpawnOptions(shipClassId);
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

  @Get(':id/field-context')
  getFieldContext(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.spacecraftService.getFieldContext(id, req.user.sub);
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
    return this.spacecraftService.getDetails(id, req.user.sub);
  }

  @Put(':id')
  rename(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body('name') name: string,
  ) {
    return this.spacecraftService.rename(id, req.user.sub, name);
  }

  @Get(':id/details')
  getDetails(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.spacecraftService.getDetails(id, req.user.sub);
  }

  @Get(':id/energy-flow')
  getEnergyFlow(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.spacecraftService.getEnergyFlow(id, req.user.sub);
  }

  @Patch(':id/alert-state')
  setAlertState(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() dto: AlertStateDto,
  ) {
    return this.spacecraftService.setAlertState(
      id,
      req.user.sub,
      dto.alertState,
    );
  }

  @Patch(':id/operating-mode')
  setOperatingMode(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() dto: OperatingModeDto,
  ) {
    return this.spacecraftService.setOperatingMode(
      id,
      req.user.sub,
      dto.operatingMode,
    );
  }

  @Get(':id/lss-mode')
  getLssMode(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.spacecraftService.getLssMode(id, req.user.sub);
  }

  @Patch(':id/lss-mode')
  setLssMode(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() dto: LssModeDto,
  ) {
    return this.spacecraftService.setLssMode(id, req.user.sub, dto.mode);
  }

  @Get(':id/centred-map')
  getCentredMap(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Query('sectionX') sectionX?: string,
    @Query('sectionY') sectionY?: string,
  ) {
    return this.spacecraftService.getShipCentredMap(
      id,
      req.user.sub,
      Number(sectionX) || 0,
      Number(sectionY) || 0,
    );
  }

  @Get(':id/cartography')
  getCartography(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.spacecraftService.getCartography(id, req.user.sub);
  }

  @Post(':id/cartography/survey')
  surveyCartography(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.spacecraftService.surveyCurrentSystem(id, req.user.sub);
  }

  @Post(':id/sector-scan')
  sectorScan(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.scanService.sectorScan(id, req.user.sub);
  }

  @Post(':id/system-field-scan')
  systemFieldScan(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() dto: SystemFieldScanDto,
  ) {
    return this.scanService.systemFieldScan(
      id,
      req.user.sub,
      dto.targetX,
      dto.targetY,
    );
  }

  @Get(':id/scans')
  listScans(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.scanService.listScans(
      id,
      req.user.sub,
      Number(page) || 1,
      Number(limit) || 20,
    );
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

  @Post(':id/reactor/load')
  loadReactor(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() dto: EngineeringAmountDto,
  ) {
    return this.engineeringService.loadReactor(id, req.user.sub, dto.amount);
  }

  @Post(':id/battery/discharge')
  dischargeBattery(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() dto: EngineeringAmountDto,
  ) {
    return this.engineeringService.dischargeBattery(
      id,
      req.user.sub,
      dto.amount,
    );
  }

  @Post(':id/self-destruct')
  selfDestruct(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.destructionService.selfDestruct(id, req.user.sub);
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

  @Patch(':id/torpedoes/active')
  setActiveTorpedo(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body('torpedoTypeId', ParseIntPipe) torpedoTypeId: number,
  ) {
    return this.spacecraftService.setActiveTorpedo(
      id,
      req.user.sub,
      torpedoTypeId,
    );
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
      dto.torpedoTypeId,
    );
  }

  @Get('distress-signals/active')
  getActiveDistressSignals() {
    return this.communicationService.listActiveDistress();
  }

  @Post(':id/nearby/:targetId/scan')
  scanNearbyTarget(
    @Param('id', ParseIntPipe) id: number,
    @Param('targetId', ParseIntPipe) targetId: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.spacecraftService.scanNearbyTarget(id, req.user.sub, targetId);
  }

  @Post(':id/nearby/:targetId/intercept')
  interceptNearbyTarget(
    @Param('id', ParseIntPipe) id: number,
    @Param('targetId', ParseIntPipe) targetId: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.spacecraftService.interceptNearbyTarget(
      id,
      req.user.sub,
      targetId,
    );
  }

  @Post(':id/communications/nearby/:targetId')
  sendNearbyMessage(
    @Param('id', ParseIntPipe) id: number,
    @Param('targetId', ParseIntPipe) targetId: number,
    @Request() req: { user: { sub: number } },
    @Body() dto: CommunicationTextDto,
  ) {
    return this.communicationService.sendNearbyMessage(
      id,
      req.user.sub,
      targetId,
      dto.body,
    );
  }

  @Get(':id/nearby')
  getNearby(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.spacecraftService.getNearby(id, req.user.sub);
  }

  @Get(':id/transfer-quote')
  getTransferQuote(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Query('colonyId', ParseIntPipe) colonyId: number,
  ) {
    return this.contextService.getQuote(id, req.user.sub, colonyId);
  }

  @Get(':id/communications/recipients')
  getCommunicationRecipients(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.communicationService.getRecipients(id, req.user.sub);
  }

  @Post(':id/communications/broadcast')
  broadcast(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() dto: CommunicationTextDto,
  ) {
    return this.communicationService.broadcast(id, req.user.sub, dto.body);
  }

  @Get(':id/communications/logs')
  listCommunicationLogs(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Query('page') page?: string,
  ) {
    return this.communicationService.listLogs(
      id,
      req.user.sub,
      Math.max(1, Number(page) || 1),
    );
  }

  @Post(':id/communications/logs')
  createCommunicationLog(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() dto: CommunicationTextDto,
  ) {
    return this.communicationService.createLog(id, req.user.sub, dto.body);
  }

  @Patch(':id/communications/logs/:entryId')
  updateCommunicationLog(
    @Param('id', ParseIntPipe) id: number,
    @Param('entryId', ParseIntPipe) entryId: number,
    @Request() req: { user: { sub: number } },
    @Body() dto: CommunicationTextDto,
  ) {
    return this.communicationService.updateLog(
      id,
      entryId,
      req.user.sub,
      dto.body,
    );
  }

  @Delete(':id/communications/logs/:entryId')
  deleteCommunicationLog(
    @Param('id', ParseIntPipe) id: number,
    @Param('entryId', ParseIntPipe) entryId: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.communicationService.deleteLog(id, entryId, req.user.sub);
  }

  @Get(':id/communications/distress')
  getDistress(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.communicationService.getDistress(id, req.user.sub);
  }

  @Post(':id/communications/distress')
  startDistress(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() dto: DistressDto,
  ) {
    return this.communicationService.startDistress(
      id,
      req.user.sub,
      dto.message,
    );
  }

  @Delete(':id/communications/distress')
  stopDistress(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.communicationService.stopDistress(id, req.user.sub);
  }

  @Get(':id/communications/colony-message')
  getColonyMessage(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Query('colonyId', ParseIntPipe) colonyId: number,
  ) {
    return this.communicationService.getColonyMessage(
      id,
      req.user.sub,
      colonyId,
    );
  }

  @Get(':id/cargo')
  getCargo(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.transferService.getShipCargo(id, req.user.sub);
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

  @Get(':id/cargo/ship-transfer-quote')
  getShipTransferQuote(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Query('targetShipId', ParseIntPipe) targetShipId: number,
  ) {
    return this.transferService.getShipTransferQuote(
      id,
      req.user.sub,
      targetShipId,
    );
  }

  @Post(':id/torpedoes/ship-transfer')
  transferShipTorpedoes(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() dto: ShipTorpedoTransferDto,
  ) {
    return this.transferService.transferShipTorpedoes(
      id,
      req.user.sub,
      dto.targetShipId,
      dto.amount,
      dto.direction,
    );
  }

  @Post(':id/crew/ship-transfer')
  transferShipCrew(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() dto: ShipCrewTransferDto,
  ) {
    return this.transferService.transferShipCrew(
      id,
      req.user.sub,
      dto.targetShipId,
      dto.amount,
      dto.direction,
    );
  }

  @Post(':id/cargo/ship-transfer')
  transferShipCargo(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() dto: ShipCargoTransferDto,
  ) {
    return this.transferService.transferShipCargo(
      id,
      req.user.sub,
      dto.targetShipId,
      dto.commodityId,
      dto.amount,
      dto.direction,
    );
  }

  @Post(':id/wrecks/:wreckId/recover-cargo')
  recoverWreckCargo(
    @Param('id', ParseIntPipe) id: number,
    @Param('wreckId', ParseIntPipe) wreckId: number,
    @Request() req: { user: { sub: number } },
    @Body('commodityId', ParseIntPipe) commodityId: number,
    @Body('amount', ParseIntPipe) amount: number,
  ) {
    return this.transferService.recoverWreckCargo(
      id,
      req.user.sub,
      wreckId,
      commodityId,
      amount,
    );
  }

  @Post(':id/crew/load')
  loadCrew(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() dto: ColonyCrewTransferDto,
  ) {
    return this.transferService.loadCrew(
      id,
      req.user.sub,
      dto.colonyId,
      dto.amount,
    );
  }

  @Post(':id/crew/unload')
  unloadCrew(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() dto: ColonyCrewTransferDto,
  ) {
    return this.transferService.unloadCrew(
      id,
      req.user.sub,
      dto.colonyId,
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
