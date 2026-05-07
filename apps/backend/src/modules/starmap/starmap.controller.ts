import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../auth/admin.guard';
import { StarmapService } from './starmap.service';
import { StarmapAdminService } from './starmap-admin.service';
import { StarmapQueryService } from './starmap-query.service';
import { FactionZone } from './entities/galaxy-field.entity';

@Controller('starmap')
@UseGuards(AuthGuard('jwt'))
export class StarmapController {
  constructor(
    private readonly starmapService: StarmapService,
    private readonly starmapAdminService: StarmapAdminService,
    private readonly starmapQueryService: StarmapQueryService,
  ) {}

  @Get('layers')
  getLayers() {
    return this.starmapService.getLayers();
  }

  @Get('layers/:layerId/systems')
  getSystemsInLayer(@Param('layerId', ParseIntPipe) layerId: number) {
    return this.starmapService.getSystemsInLayer(layerId);
  }

  @Get('layers/:layerId/sectors')
  getSectorsInLayer(@Param('layerId', ParseIntPipe) layerId: number) {
    return this.starmapService.getSectorsInLayer(layerId);
  }

  @Get('layers/:layerId/sectors/:sectorX/:sectorY')
  getSectorFields(
    @Param('layerId', ParseIntPipe) layerId: number,
    @Param('sectorX', ParseIntPipe) sectorX: number,
    @Param('sectorY', ParseIntPipe) sectorY: number,
  ) {
    return this.starmapQueryService.getGalaxySectorFields(
      layerId,
      sectorX,
      sectorY,
    );
  }

  @Get('systems/:id/grid')
  getSystemGrid(@Param('id', ParseIntPipe) id: number) {
    return this.starmapQueryService.getSystemGrid(id);
  }

  @Get('systems/:id')
  getSystemDetail(@Param('id', ParseIntPipe) id: number) {
    return this.starmapService.getSystemDetail(id);
  }

  @Get('admin/field-types')
  @UseGuards(AdminGuard)
  getAdminFieldTypes() {
    return this.starmapAdminService.listFieldTypes();
  }

  @Post('admin/field-types/ensure-defaults')
  @UseGuards(AdminGuard)
  ensureDefaultFieldTypes() {
    return this.starmapAdminService.ensureDefaultFieldTypes();
  }

  @Get('admin/system-types')
  @UseGuards(AdminGuard)
  getAdminSystemTypes() {
    return this.starmapAdminService.listSystemTypes();
  }

  @Post('admin/layers')
  @UseGuards(AdminGuard)
  createLayer(
    @Body()
    body: {
      name: string;
      width: number;
      height: number;
      sectorSize?: number;
      isDefault?: boolean;
      isColonizable?: boolean;
      isNoobZone?: boolean;
      isFinished?: boolean;
      isHidden?: boolean;
    },
  ) {
    return this.starmapAdminService.createLayer(body);
  }

  @Delete('admin/layers/:id')
  @UseGuards(AdminGuard)
  deleteLayer(@Param('id', ParseIntPipe) id: number) {
    return this.starmapAdminService.deleteLayer(id);
  }

  @Post('admin/layers/:id/initialize-grid')
  @UseGuards(AdminGuard)
  initializeLayerGrid(
    @Param('id', ParseIntPipe) id: number,
    @Body('defaultFieldTypeId') defaultFieldTypeId: number,
  ) {
    return this.starmapAdminService.initializeLayerGrid(id, defaultFieldTypeId);
  }

  @Post('admin/sectors/fill')
  @UseGuards(AdminGuard)
  fillSector(
    @Body()
    body: {
      layerId: number;
      sectorX: number;
      sectorY: number;
      fieldTypeId?: number;
      factionZone?: FactionZone;
      adminRegionKey?: string | null;
    },
  ) {
    return this.starmapAdminService.bulkUpdateSectorFields(body);
  }

  @Post('admin/systems')
  @UseGuards(AdminGuard)
  createSystem(
    @Body()
    body: {
      layerId: number;
      name: string;
      cx: number;
      cy: number;
      systemTypeId: number;
      maxX?: number;
      maxY?: number;
    },
  ) {
    return this.starmapAdminService.createStarSystem(body);
  }

  @Post('admin/systems/:id/initialize-grid')
  @UseGuards(AdminGuard)
  initializeSystemGrid(
    @Param('id', ParseIntPipe) id: number,
    @Body('defaultFieldTypeId') defaultFieldTypeId: number,
  ) {
    return this.starmapAdminService.initializeSystemGrid(
      id,
      defaultFieldTypeId,
    );
  }

  @Patch('admin/fields/:id')
  @UseGuards(AdminGuard)
  updateGalaxyField(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      fieldTypeId?: number;
      factionZone?: FactionZone;
      adminRegionKey?: string | null;
      starSystemId?: number | null;
    },
  ) {
    return this.starmapAdminService.updateGalaxyField(id, body);
  }

  @Patch('admin/system-fields/:id')
  @UseGuards(AdminGuard)
  updateSystemField(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      fieldTypeId?: number;
      celestialObjectId?: number | null;
    },
  ) {
    return this.starmapAdminService.updateSystemField(id, body);
  }
}
