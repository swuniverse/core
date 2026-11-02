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
  Res,
  ParseIntPipe,
  ParseEnumPipe,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequiresGameAccess } from '../game-status/game-status.guard';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  Max,
  Min,
} from 'class-validator';
import { AdminGuard } from '../auth/admin.guard';
import { SpacecraftService } from './spacecraft.service';
import { SpacecraftTractorService } from './spacecraft-tractor.service';
import { SpacecraftBoardingService } from './spacecraft-boarding.service';
import { SpacecraftTakeoverService } from './spacecraft-takeover.service';
import { StarmapVisibilityService } from './starmap-visibility.service';
import { TransferService } from './transfer.service';
import { EpsTransferService } from './eps-transfer.service';
import { SpacecraftDockingService } from './spacecraft-docking.service';
import { EscapePodService } from './escape-pod.service';
import { SpacecraftScanService } from './spacecraft-scan.service';
import { GameDataService } from '../game-data/game-data.service';
import { ColonizationService } from '../colonization/colonization.service';
import {
  ShipColonyContextService,
  type TransferInitiator,
} from './ship-colony-context.service';
import { SpacecraftCommunicationService } from './spacecraft-communication.service';
import { SpacecraftEngineeringService } from './spacecraft-engineering.service';
import { SpacecraftDestructionService } from './spacecraft-destruction.service';
import { SpacecraftCrewService } from './spacecraft-crew.service';
import { CrewEnhancementService } from './crew-enhancement.service';
import { CrewType } from '../colony/entities/crew.entity';
import { DockingPrivilegeDto, ToggleBatteryReloadDto, ToggleDockPmAutoReadDto } from './docking-privilege.dto';
import { DockingPrivilegeService } from './docking-privilege.service';
import { StationShipManagementService } from './station-ship-management.service';
import { StationRepairService } from './station-repair.service';
import { ShipManagementRequest } from './ship-management.service';
import { EngineeringAmountDto } from './engineering-amount.dto';
import { AdminSpawnShipDto } from './admin-spawn-ship.dto';
import { SpacecraftRepairService } from './spacecraft-repair.service';
import { StationConstructionService } from './station-construction.service';
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

class RenameFleetDto {
  @IsString()
  name: string;
}

class ChangeFleetLeaderDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  leaderId: number;
}

class CelestialObjectActionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  celestialObjectId: number;
}

class ColonizeDto extends CelestialObjectActionDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  initialFieldIndex?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3)
  zoneSlot?: 1 | 2 | 3;
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

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  autoCarryOver?: boolean;
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

class SelfRepairDto {
  @IsIn(['HULL', 'MODULE'])
  targetType: 'HULL' | 'MODULE';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  moduleId: number | null = null;

  @IsIn(['SPARE_PARTS', 'SYSTEM_COMPONENTS', 'BOTH'])
  partsType: 'SPARE_PARTS' | 'SYSTEM_COMPONENTS' | 'BOTH';

  @IsBoolean()
  instant: boolean;
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

  @IsOptional()
  @IsIn(['SHIP', 'COLONY'])
  initiator?: TransferInitiator;
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

class EpsTransferDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount: number;
}

class ReactorChargeTransferItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetShipId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount: number;
}

class ReactorChargeTransferDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReactorChargeTransferItemDto)
  transfers: ReactorChargeTransferItemDto[];
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
@RequiresGameAccess()
@UseGuards(AuthGuard('jwt'))
export class SpacecraftController {
  constructor(
    private readonly spacecraftService: SpacecraftService,
    private readonly tractorService: SpacecraftTractorService,
    private readonly boardingService: SpacecraftBoardingService = {
      board: async () => ({ message: '' }),
    } as unknown as SpacecraftBoardingService,
    private readonly takeoverService: SpacecraftTakeoverService = {
      start: async () => ({}),
      cancel: async () => ({}),
    } as unknown as SpacecraftTakeoverService,
    private readonly transferService: TransferService,
    private readonly scanService: SpacecraftScanService,
    private readonly gameData: GameDataService,
    private readonly colonizationService: ColonizationService,
    private readonly contextService: ShipColonyContextService,
    private readonly communicationService: SpacecraftCommunicationService,
    private readonly engineeringService: SpacecraftEngineeringService,
    private readonly destructionService: SpacecraftDestructionService,
    private readonly starmapVisibilityService: StarmapVisibilityService,
    private readonly crewService: SpacecraftCrewService,
    private readonly crewEnhancementService: CrewEnhancementService = {
      promote: async () => undefined,
    } as unknown as CrewEnhancementService,
    private readonly repairService: SpacecraftRepairService = {
      getOptions: async () => ({
        targets: [],
        engineers: 0,
        cost: 0,
        durationSeconds: 0,
        activeRepair: null,
      }),
      start: async () => ({ completed: false, targetIntegrity: 0 }),
    } as unknown as SpacecraftRepairService,
    private readonly stationConstructionService: StationConstructionService = {
      build: async () => ({ station: null, workbees: [] }),
      getExpansionOptions: async () => [],
      expand: async () => null,
      remove: async () => undefined,
    } as unknown as StationConstructionService,
    private readonly epsTransferService: EpsTransferService = {
      transfer: async () => ({
        transferred: 0,
        requested: 0,
        energy: 0,
        message: '',
      }),
    } as unknown as EpsTransferService,
    private readonly escapePodService: EscapePodService = {
      salvage: async () => ({}),
      listLostCrew: async () => [],
    } as unknown as EscapePodService,
    private readonly dockingService: SpacecraftDockingService = {
      dock: async () => ({ message: '', shipIds: [] }),
      undock: async () => ({ message: '', shipIds: [] }),
      undockFromStation: async () => ({ message: '', shipIds: [] }),
      undockAll: async () => ({ message: '', shipIds: [] }),
    } as unknown as SpacecraftDockingService,
    private readonly dockingPrivilegeService: DockingPrivilegeService = {
      list: async () => ({ privileges: [], autoRead: false }),
      add: async () => ({ privileges: [], autoRead: false }),
      remove: async () => ({ privileges: [], autoRead: false }),
      setAutoRead: async () => ({ privileges: [], autoRead: false }),
    } as unknown as DockingPrivilegeService,
    private readonly stationShipManagementService: StationShipManagementService = {
      getManagement: async () => ({ station: null, ships: [] }),
      execute: async () => ({ results: [] }),
      setBatteryReload: async () => ({ reloadBattery: false, message: '' }),
    } as unknown as StationShipManagementService,
    private readonly stationRepairService: StationRepairService = {
      getOverview: async () => ({}),
      queueShip: async () => ({ message: '' }),
      cancel: async () => ({ message: '' }),
      reactivate: async () => ({ message: '' }),
      startSelfRepair: async () => ({ message: '' }),
    } as unknown as StationRepairService,
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

  @Delete('fleets/:fleetId')
  dissolveFleet(
    @Param('fleetId', ParseIntPipe) fleetId: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.spacecraftService.dissolveFleet(req.user.sub, fleetId);
  }

  @Patch('fleets/:fleetId')
  renameFleet(
    @Param('fleetId', ParseIntPipe) fleetId: number,
    @Request() req: { user: { sub: number } },
    @Body() dto: RenameFleetDto,
  ) {
    return this.spacecraftService.renameFleet(req.user.sub, fleetId, dto.name);
  }

  @Patch('fleets/:fleetId/alert-state')
  setFleetAlertState(
    @Param('fleetId', ParseIntPipe) fleetId: number,
    @Request() req: { user: { sub: number } },
    @Body() dto: AlertStateDto,
  ) {
    return this.spacecraftService.setFleetAlertState(
      req.user.sub,
      fleetId,
      dto.alertState,
    );
  }

  @Patch('fleets/:fleetId/fixation')
  toggleFleetFixation(
    @Param('fleetId', ParseIntPipe) fleetId: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.spacecraftService.toggleFleetFixation(req.user.sub, fleetId);
  }

  @Patch('fleets/:fleetId/leader')
  changeFleetLeader(
    @Param('fleetId', ParseIntPipe) fleetId: number,
    @Request() req: { user: { sub: number } },
    @Body() dto: ChangeFleetLeaderDto,
  ) {
    return this.spacecraftService.changeFleetLeader(
      req.user.sub,
      fleetId,
      dto.leaderId,
    );
  }

  // Collection routes
  @Get()
  findAll(@Request() req: { user: { sub: number } }) {
    return this.spacecraftService.findAllByUser(req.user.sub);
  }

  @Get('shared-live-positions')
  getSharedLivePositions(@Request() req: { user: { sub: number } }) {
    return this.starmapVisibilityService.listSharedLivePositions(req.user.sub);
  }

  /** Starmap contacts of the viewer on one map layer (required `layerId`). */
  @Get('starmap-contacts')
  getStarmapContacts(
    @Query('layerId', ParseIntPipe) layerId: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.starmapVisibilityService.listContacts(req.user.sub, layerId);
  }

  /** Escape pods holding crew of the caller ("Verschollene Crew"). */
  @Get('lost-crew')
  getLostCrew(@Request() req: { user: { sub: number } }) {
    return this.escapePodService.listLostCrew(req.user.sub);
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

  @Post(':id/construction')
  buildConstruction(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.stationConstructionService.build(id, req.user.sub);
  }

  @Get(':id/construction/expansion-options')
  getStationExpansionOptions(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.stationConstructionService.getExpansionOptions(id, req.user.sub);
  }

  @Post(':id/construction/expand')
  expandStation(
    @Param('id', ParseIntPipe) id: number,
    @Body('classKey') classKey: string,
    @Request() req: { user: { sub: number } },
  ) {
    return this.stationConstructionService.expand(id, req.user.sub, classKey);
  }

  @Delete(':id/construction')
  removeConstruction(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.stationConstructionService.remove(id, req.user.sub);
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

  @Get(':id/crew')
  getCrew(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.crewService.getCrewManagement(id, req.user.sub);
  }

  @Patch(':id/crew/:crewId/slot')
  assignCrewSlot(
    @Param('id', ParseIntPipe) id: number,
    @Param('crewId', ParseIntPipe) crewId: number,
    @Request() req: { user: { sub: number } },
    @Body('slot') slot: CrewType | null,
  ) {
    return this.crewService.assignSlot(id, crewId, req.user.sub, slot);
  }

  @Post(':id/crew/:crewId/promote')
  async promoteCrewMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('crewId', ParseIntPipe) crewId: number,
    @Request() req: { user: { sub: number } },
  ) {
    await this.crewEnhancementService.promote(req.user.sub, crewId);
    return this.crewService.getCrewManagement(id, req.user.sub);
  }

  @Patch(':id/crew/:crewId/name')
  renameCrewMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('crewId', ParseIntPipe) crewId: number,
    @Request() req: { user: { sub: number } },
    @Body('name') name: string,
  ) {
    return this.crewService.renameCrewMember(id, crewId, req.user.sub, name);
  }

  @Patch(':id/crew/name')
  renameCrew(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body('name') name: string,
  ) {
    return this.crewService.renameCrew(id, req.user.sub, name);
  }

  @Get(':id/details')
  getDetails(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.spacecraftService.getDetails(id, req.user.sub);
  }

  @Get(':id/repair-options')
  getRepairOptions(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.repairService.getOptions(id, req.user.sub);
  }

  @Post(':id/self-repair')
  selfRepair(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() dto: SelfRepairDto,
  ) {
    return this.repairService.start(id, req.user.sub, dto);
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
  async getCartography(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Res({ passthrough: true })
    response: { setHeader: (name: string, value: string) => void },
  ) {
    response.setHeader('Cache-Control', 'no-store');
    return this.spacecraftService.getCartography(id, req.user.sub);
  }

  @Post(':id/cartography')
  createCartographyPlan(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.spacecraftService.createCartographyPlan(id, req.user.sub);
  }

  @Post(':id/cartography/finalize')
  startCartographyFinalization(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.spacecraftService.startCartographyFinalization(
      id,
      req.user.sub,
    );
  }

  @Get(':id/buoys')
  listBuoys(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.spacecraftService.listBuoys(id, req.user.sub);
  }

  @Post(':id/buoys')
  dropBuoy(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() body: { text: string },
  ) {
    return this.spacecraftService.dropBuoy(id, req.user.sub, body.text);
  }

  @Post(':id/buoys/:buoyId/pick-up')
  pickUpBuoy(
    @Param('id', ParseIntPipe) id: number,
    @Param('buoyId', ParseIntPipe) buoyId: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.spacecraftService.pickUpBuoy(id, buoyId, req.user.sub);
  }

  @Post(':id/sector-scan')
  sectorScan(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.scanService.sectorScan(id, req.user.sub);
  }

  @Post(':id/subspace-analysis/:signatureId')
  analyzeSubspace(
    @Param('id', ParseIntPipe) id: number,
    @Param('signatureId', ParseIntPipe) signatureId: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.scanService.analyzeSubspace(id, req.user.sub, signatureId);
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
    @Body() dto: ColonizeDto,
  ) {
    return this.colonizationService.colonize(
      req.user.sub,
      id,
      dto.celestialObjectId,
      dto.initialFieldIndex,
      dto.zoneSlot,
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
      dto.autoCarryOver,
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

  @Get(':id/reactor-transfer-targets')
  reactorTransferTargets(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.engineeringService.reactorTransferTargets(id, req.user.sub);
  }

  @Post(':id/reactor-charge/transfer')
  transferReactorCharge(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() dto: ReactorChargeTransferDto,
  ) {
    return this.engineeringService.transferReactorCharge(
      id,
      req.user.sub,
      dto.transfers,
    );
  }

  @Post(':id/hyperdrive-boost')
  boostHyperdrive(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.engineeringService.boostHyperdrive(id, req.user.sub);
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

  @Post(':id/nearby/:targetId/board')
  boardNearbyTarget(
    @Param('id', ParseIntPipe) id: number,
    @Param('targetId', ParseIntPipe) targetId: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.boardingService.board(id, targetId, req.user.sub);
  }

  @Post(':id/nearby/:targetId/takeover')
  startTakeover(
    @Param('id', ParseIntPipe) id: number,
    @Param('targetId', ParseIntPipe) targetId: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.takeoverService.start(id, targetId, req.user.sub);
  }

  @Delete(':id/takeover')
  cancelTakeover(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.takeoverService.cancel(id, req.user.sub);
  }

  @Post(':id/nearby/:targetId/tractor')
  activateTractorBeam(
    @Param('id', ParseIntPipe) id: number,
    @Param('targetId', ParseIntPipe) targetId: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.tractorService.activate(id, req.user.sub, targetId);
  }

  @Post(':id/tractor/escape')
  escapeTractorBeam(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.tractorService.escape(id, req.user.sub);
  }

  @Delete(':id/tractor')
  deactivateTractorBeam(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.tractorService.deactivate(id, req.user.sub);
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
      dto.initiator,
    );
  }

  @Get(':id/cargo/ship-transfer-quote')
  getShipTransferQuote(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Query('targetShipId', ParseIntPipe) targetShipId: number,
    @Query('direction', new ParseEnumPipe(['TO_TARGET', 'FROM_TARGET']))
    direction: 'TO_TARGET' | 'FROM_TARGET',
  ) {
    return this.transferService.getShipTransferQuote(
      id,
      req.user.sub,
      targetShipId,
      direction,
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

  @Post(':id/nearby/:targetId/eps-transfer')
  transferEps(
    @Param('id', ParseIntPipe) id: number,
    @Param('targetId', ParseIntPipe) targetId: number,
    @Request() req: { user: { sub: number } },
    @Body() dto: EpsTransferDto,
  ) {
    return this.epsTransferService.transfer(
      id,
      req.user.sub,
      targetId,
      dto.amount,
    );
  }

  @Post(':id/dock/:stationId')
  dock(
    @Param('id', ParseIntPipe) id: number,
    @Param('stationId', ParseIntPipe) stationId: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.dockingService.dock(id, req.user.sub, stationId);
  }

  @Post(':id/undock')
  undock(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.dockingService.undock(id, req.user.sub);
  }

  @Get(':id/docking-privileges')
  dockingPrivileges(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.dockingPrivilegeService.list(id, req.user.sub);
  }

  @Post(':id/docking-privileges')
  addDockingPrivilege(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DockingPrivilegeDto,
    @Request() req: { user: { sub: number } },
  ) {
    return this.dockingPrivilegeService.add(
      id,
      req.user.sub,
      dto.targetType,
      dto.targetId,
      dto.mode,
    );
  }

  @Post(':id/docking-privileges/auto-read')
  setDockingAutoRead(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ToggleDockPmAutoReadDto,
    @Request() req: { user: { sub: number } },
  ) {
    return this.dockingPrivilegeService.setAutoRead(id, req.user.sub, dto.enabled);
  }

  @Delete(':id/docking-privileges/:privilegeId')
  removeDockingPrivilege(
    @Param('id', ParseIntPipe) id: number,
    @Param('privilegeId', ParseIntPipe) privilegeId: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.dockingPrivilegeService.remove(id, req.user.sub, privilegeId);
  }

  @Get(':id/ship-management')
  stationShipManagement(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.stationShipManagementService.getManagement(id, req.user.sub);
  }

  @Post(':id/ship-management')
  executeStationShipManagement(
    @Param('id', ParseIntPipe) id: number,
    @Body('ships') ships: ShipManagementRequest[],
    @Request() req: { user: { sub: number } },
  ) {
    return this.stationShipManagementService.execute(id, req.user.sub, ships ?? []);
  }

  @Get(':id/station-repair')
  stationRepair(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.stationRepairService.getOverview(id, req.user.sub);
  }

  @Post(':id/station-repair/self')
  startStationSelfRepair(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.stationRepairService.startSelfRepair(id, req.user.sub);
  }

  @Post(':id/station-repair/reactivate')
  reactivateStationRepair(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.stationRepairService.reactivate(id, req.user.sub);
  }

  @Post(':id/station-repair/:shipId')
  queueStationRepair(
    @Param('id', ParseIntPipe) id: number,
    @Param('shipId', ParseIntPipe) shipId: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.stationRepairService.queueShip(id, req.user.sub, shipId);
  }

  @Delete(':id/station-repair/:shipId')
  cancelStationRepair(
    @Param('id', ParseIntPipe) id: number,
    @Param('shipId', ParseIntPipe) shipId: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.stationRepairService.cancel(id, req.user.sub, shipId);
  }

  @Post(':id/battery-reload')
  setStationBatteryReload(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ToggleBatteryReloadDto,
    @Request() req: { user: { sub: number } },
  ) {
    return this.stationShipManagementService.setBatteryReload(id, req.user.sub, dto.enabled);
  }

  @Post(':id/docked/undock-all')
  undockAll(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.dockingService.undockAll(id, req.user.sub);
  }

  @Post(':id/docked/:targetId/undock')
  undockStationShip(
    @Param('id', ParseIntPipe) id: number,
    @Param('targetId', ParseIntPipe) targetId: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.dockingService.undockFromStation(id, req.user.sub, targetId);
  }

  @Post(':id/nearby/escape-pods/:podId/salvage')
  salvageEscapePods(
    @Param('id', ParseIntPipe) id: number,
    @Param('podId', ParseIntPipe) podId: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.escapePodService.salvage(id, req.user.sub, podId);
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
      dto.initiator,
    );
  }
}
