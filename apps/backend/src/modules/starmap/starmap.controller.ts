import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../auth/admin.guard';
import { PermissionGuard, RequirePermission } from '../auth/permission.guard';
import { Permission } from '../auth/permissions';
import { StarmapService } from './starmap.service';
import { StarmapAdminService } from './starmap-admin.service';
import { StarmapQueryService } from './starmap-query.service';
import { ExplorationService } from './exploration.service';
import { InfluenceService } from './influence.service';
import { WormholeService } from './wormhole.service';
import type {
  ApplyStarWarsPresetOptionsDto,
  ApplyStarWarsPresetResultDto,
  DefaultStarWarsGalaxySeedResultDto,
  HyperspaceRouteDto,
  StarmapBorderTypeDto,
  StarmapBulkEditFieldsDto,
  StarmapCreateBorderTypeDto,
  StarmapCreateLayerDto,
  StarmapCreateMapRegionDto,
  StarmapCreateSystemDto,
  StarmapCreateWormholeDto,
  StarmapDiscoverFieldDto,
  StarmapDiscoverSystemDto,
  StarmapExploredSectorDto,
  StarmapExplorationStateDto,
  StarmapFieldTypeDto,
  StarmapFillSectorDto,
  StarmapGalaxyFieldDto,
  StarmapGenerateSystemsDto,
  StarmapInfluenceAreaDto,
  StarmapInitializeGridDto,
  StarmapLayerDto,
  StarmapLayerOverviewDto,
  StarmapMapRegionDto,
  StarmapOperationResultDto,
  StarmapRegenerateSystemDto,
  StarmapSectorDto,
  StarmapSystemDetailDto,
  StarmapSystemFieldDto,
  StarmapSystemGridDto,
  StarmapSystemListItemDto,
  StarmapSystemTypeOptionDto,
  StarmapUpdateBorderTypeDto,
  StarmapUpdateGalaxyFieldDto,
  StarmapUpdateMapRegionDto,
  StarmapUpdateSystemFieldDto,
  StarmapWormholeDto,
} from '@swuniverse/shared';

@Controller('starmap')
@UseGuards(AuthGuard('jwt'))
export class StarmapController {
  constructor(
    private readonly starmapService: StarmapService,
    private readonly starmapAdminService: StarmapAdminService,
    private readonly starmapQueryService: StarmapQueryService,
    private readonly explorationService: ExplorationService,
    private readonly influenceService: InfluenceService,
    private readonly wormholeService: WormholeService,
  ) {}

  private bypassFog(user: { isAdmin?: boolean; permissions?: string[] }): boolean {
    return !!user.isAdmin || (user.permissions ?? []).includes('MAP_EDITOR');
  }

  @Get('layers')
  getLayers(): Promise<StarmapLayerDto[]> {
    return this.starmapService.getLayers();
  }

  @Get('layers/:layerId/systems')
  getSystemsInLayer(
    @Param('layerId', ParseIntPipe) layerId: number,
  ): Promise<StarmapSystemListItemDto[]> {
    return this.starmapService.getSystemsInLayer(layerId);
  }

  @Get('layers/:layerId/hyperspace-routes')
  getHyperspaceRoutes(
    @Param('layerId', ParseIntPipe) layerId: number,
    @Req() req: { user: { sub: number; isAdmin?: boolean; permissions?: string[] } },
  ): Promise<HyperspaceRouteDto[]> {
    if (this.bypassFog(req.user))
      return this.starmapQueryService.getHyperspaceRoutes(layerId);
    return this.starmapQueryService.getVisibleHyperspaceRoutes(
      req.user.sub,
      layerId,
      this.explorationService,
    );
  }

  @Get('layers/:layerId/fields')
  async getAllFields(
    @Param('layerId', ParseIntPipe) layerId: number,
    @Req() req: { user: { sub: number; isAdmin?: boolean; permissions?: string[] } },
  ): Promise<StarmapGalaxyFieldDto[]> {
    if (this.bypassFog(req.user)) {
      return this.starmapQueryService.getAllLayerFields(layerId);
    }
    return this.starmapQueryService.getExploredLayerFields(
      req.user.sub,
      layerId,
      this.explorationService,
    );
  }

  @Get('layers/:layerId/sectors')
  getSectorsInLayer(
    @Param('layerId', ParseIntPipe) layerId: number,
    @Req() req: { user: { sub: number; isAdmin?: boolean; permissions?: string[] } },
  ): Promise<StarmapSectorDto[]> {
    if (this.bypassFog(req.user)) return this.starmapService.getSectorsInLayer(layerId);
    return this.starmapQueryService.getExploredGalaxySectors(
      req.user.sub,
      layerId,
      this.explorationService,
    );
  }

  @Get('layers/:layerId/sectors/:sectorX/:sectorY')
  async getSectorFields(
    @Param('layerId', ParseIntPipe) layerId: number,
    @Param('sectorX', ParseIntPipe) sectorX: number,
    @Param('sectorY', ParseIntPipe) sectorY: number,
    @Req() req: { user: { sub: number; isAdmin?: boolean; permissions?: string[] } },
  ): Promise<StarmapGalaxyFieldDto[]> {
    if (this.bypassFog(req.user)) {
      return this.starmapQueryService.getGalaxySectorFields(
        layerId,
        sectorX,
        sectorY,
      );
    }
    const explored = await this.starmapQueryService.getExploredSectorFields(
      req.user.sub,
      layerId,
      sectorX,
      sectorY,
      this.explorationService,
    );
    return explored.fields;
  }

  @Get('systems/:id/grid')
  getSystemGrid(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<StarmapSystemGridDto> {
    return this.starmapQueryService.getSystemGrid(id);
  }

  @Get('systems/:id')
  getSystemDetail(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<StarmapSystemDetailDto> {
    return this.starmapService.getSystemDetail(id);
  }

  // --- Exploration / Fog of War ---

  @Get('layers/:layerId/explored-sector/:sectorX/:sectorY')
  async getExploredSectorFields(
    @Req() req: { user: { sub: number; isAdmin?: boolean; permissions?: string[] } },
    @Param('layerId', ParseIntPipe) layerId: number,
    @Param('sectorX', ParseIntPipe) sectorX: number,
    @Param('sectorY', ParseIntPipe) sectorY: number,
  ): Promise<StarmapExploredSectorDto> {
    if (this.bypassFog(req.user)) {
      const fields = await this.starmapQueryService.getGalaxySectorFields(
        layerId,
        sectorX,
        sectorY,
      );
      return {
        fields: fields.map((f) => ({
          ...f,
          explorationLevel: 'FULL' as const,
        })),
        hiddenCount: 0,
      };
    }
    return this.starmapQueryService.getExploredSectorFields(
      req.user.sub,
      layerId,
      sectorX,
      sectorY,
      this.explorationService,
    );
  }

  @Get('layers/:layerId/exploration')
  getExplorationState(
    @Req() req: { user: { sub: number } },
    @Param('layerId', ParseIntPipe) layerId: number,
  ): Promise<StarmapExplorationStateDto[]> {
    return this.explorationService
      .getExploredFields(req.user.sub, layerId)
      .then((states) =>
        states.map((s) => ({
          cx: s.cx,
          cy: s.cy,
          explorationLevel: s.explorationLevel,
        })),
      );
  }

  @Post('exploration/discover-field')
  async discoverField(
    @Req() req: { user: { sub: number } },
    @Body() body: StarmapDiscoverFieldDto,
  ): Promise<StarmapOperationResultDto> {
    const discovered = await this.explorationService.discoverField({
      userId: req.user.sub,
      layerId: body.layerId,
      cx: body.cx,
      cy: body.cy,
      radius: body.radius,
      level: body.level as any,
      source: body.source,
    });
    return { created: discovered };
  }

  @Post('exploration/discover-system')
  async discoverSystem(
    @Req() req: { user: { sub: number } },
    @Body() body: StarmapDiscoverSystemDto,
  ): Promise<StarmapOperationResultDto> {
    await this.explorationService.discoverSystem({
      userId: req.user.sub,
      starSystemId: body.starSystemId,
      source: body.source,
    });
    return { created: 1 };
  }

  @Post('admin/exploration/discover-all')
  @UseGuards(AdminGuard)
  async adminDiscoverAll(
    @Req() req: { user: { sub: number } },
    @Body() body: { layerId: number; userId?: number },
  ): Promise<StarmapOperationResultDto> {
    const layer = await this.starmapService.getLayerById(body.layerId);
    const targetUserId = body.userId ?? req.user.sub;
    const created = await this.explorationService.discoverAllForAdmin(
      targetUserId,
      body.layerId,
      layer.width,
      layer.height,
    );
    return { created };
  }

  @Get('admin/field-types')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.MAP_EDITOR)
  getAdminFieldTypes(): Promise<StarmapFieldTypeDto[]> {
    return this.starmapAdminService.listFieldTypes();
  }

  @Post('admin/field-types/ensure-defaults')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.MAP_EDITOR)
  ensureDefaultFieldTypes(): Promise<StarmapFieldTypeDto[]> {
    return this.starmapAdminService.ensureDefaultFieldTypes();
  }

  @Get('admin/system-types')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.MAP_EDITOR)
  getAdminSystemTypes(): StarmapSystemTypeOptionDto[] {
    return this.starmapAdminService.listSystemTypes();
  }

  @Post('admin/layers')
  @UseGuards(AdminGuard)
  createLayer(
    @Body()
    body: StarmapCreateLayerDto,
  ): Promise<StarmapLayerDto> {
    return this.starmapAdminService.createLayer(body);
  }

  @Post('admin/default-star-wars-galaxy')
  @UseGuards(AdminGuard)
  initializeDefaultStarWarsGalaxy(): Promise<DefaultStarWarsGalaxySeedResultDto> {
    return this.starmapAdminService.initializeDefaultStarWarsGalaxy();
  }

  @Delete('admin/layers/:id')
  @UseGuards(AdminGuard)
  deleteLayer(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<StarmapOperationResultDto> {
    return this.starmapAdminService.deleteLayer(id);
  }

  @Post('admin/layers/:id/initialize-grid')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.MAP_EDITOR)
  initializeLayerGrid(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: StarmapInitializeGridDto,
  ): Promise<StarmapOperationResultDto> {
    return this.starmapAdminService.initializeLayerGrid(id, body);
  }

  @Post('admin/layers/:id/apply-star-wars-preset')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.MAP_EDITOR)
  applyStarWarsPreset(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ApplyStarWarsPresetOptionsDto = {},
  ): Promise<ApplyStarWarsPresetResultDto> {
    return this.starmapAdminService.applyStarWarsPreset(id, body);
  }

  @Post('admin/layers/:id/generate-systems')
  @UseGuards(AdminGuard)
  generateSystemsForLayer(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: StarmapGenerateSystemsDto,
  ): Promise<StarmapOperationResultDto> {
    return this.starmapAdminService.generateSystemsForLayer(id, body.limit);
  }

  @Post('admin/sectors/fill')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.MAP_EDITOR)
  fillSector(
    @Body()
    body: StarmapFillSectorDto,
  ): Promise<StarmapOperationResultDto> {
    return this.starmapAdminService.bulkUpdateSectorFields(body);
  }

  @Post('admin/systems')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.MAP_EDITOR)
  createSystem(
    @Body()
    body: StarmapCreateSystemDto,
  ): Promise<StarmapSystemListItemDto> {
    return this.starmapAdminService.createStarSystem(body);
  }

  @Post('admin/systems/:id/initialize-grid')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.MAP_EDITOR)
  initializeSystemGrid(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: StarmapInitializeGridDto,
  ): Promise<StarmapOperationResultDto> {
    return this.starmapAdminService.initializeSystemGrid(id, body);
  }

  @Post('admin/systems/:id/regenerate')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.MAP_EDITOR)
  regenerateSystem(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: StarmapRegenerateSystemDto,
  ): Promise<StarmapOperationResultDto> {
    return this.starmapAdminService.regenerateSystem(id, body);
  }

  @Patch('admin/fields/:id')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.MAP_EDITOR)
  updateGalaxyField(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: StarmapUpdateGalaxyFieldDto,
  ): Promise<StarmapGalaxyFieldDto> {
    return this.starmapAdminService.updateGalaxyField(id, body);
  }

  @Patch('admin/system-fields/:id')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.MAP_EDITOR)
  updateSystemField(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: StarmapUpdateSystemFieldDto,
  ): Promise<StarmapSystemFieldDto> {
    return this.starmapAdminService.updateSystemField(id, body);
  }

  // --- Bulk Edit ---

  @Patch('admin/galaxy-fields/bulk')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.MAP_EDITOR)
  bulkEditFields(
    @Body() body: StarmapBulkEditFieldsDto,
  ): Promise<StarmapOperationResultDto> {
    return this.starmapAdminService.bulkEditFields(body);
  }

  // --- Layer Overview ---

  @Get('admin/layers/:id/overview')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.MAP_EDITOR)
  getLayerOverview(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<StarmapLayerOverviewDto> {
    return this.starmapAdminService.getLayerOverview(id);
  }

  // --- Map Regions CRUD ---

  @Get('admin/layers/:id/regions')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.MAP_EDITOR)
  listRegions(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<StarmapMapRegionDto[]> {
    return this.starmapAdminService.listRegions(id);
  }

  @Post('admin/regions')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.MAP_EDITOR)
  createRegion(
    @Body() body: StarmapCreateMapRegionDto,
  ): Promise<StarmapMapRegionDto> {
    return this.starmapAdminService.createRegion(body);
  }

  @Patch('admin/regions/:id')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.MAP_EDITOR)
  updateRegion(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: StarmapUpdateMapRegionDto,
  ): Promise<StarmapMapRegionDto> {
    return this.starmapAdminService.updateRegion(id, body);
  }

  @Delete('admin/regions/:id')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.MAP_EDITOR)
  deleteRegion(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<StarmapOperationResultDto> {
    return this.starmapAdminService.deleteRegion(id);
  }

  // --- Border Types CRUD ---

  @Get('admin/border-types')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.MAP_EDITOR)
  listBorderTypes(): Promise<StarmapBorderTypeDto[]> {
    return this.starmapAdminService.listBorderTypes();
  }

  @Post('admin/border-types')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.MAP_EDITOR)
  createBorderType(
    @Body() body: StarmapCreateBorderTypeDto,
  ): Promise<StarmapBorderTypeDto> {
    return this.starmapAdminService.createBorderType(body);
  }

  @Patch('admin/border-types/:id')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.MAP_EDITOR)
  updateBorderType(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: StarmapUpdateBorderTypeDto,
  ): Promise<StarmapBorderTypeDto> {
    return this.starmapAdminService.updateBorderType(id, body);
  }

  @Delete('admin/border-types/:id')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.MAP_EDITOR)
  deleteBorderType(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<StarmapOperationResultDto> {
    return this.starmapAdminService.deleteBorderType(id);
  }

  // --- Wormholes ---

  @Get('admin/layers/:id/wormholes')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.MAP_EDITOR)
  listWormholes(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<StarmapWormholeDto[]> {
    return this.wormholeService.listForLayer(id);
  }

  @Post('admin/wormholes')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.MAP_EDITOR)
  createWormhole(
    @Body() body: StarmapCreateWormholeDto,
  ): Promise<StarmapWormholeDto> {
    return this.wormholeService.create(body);
  }

  @Delete('admin/wormholes/:id')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.MAP_EDITOR)
  deleteWormhole(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<StarmapOperationResultDto> {
    return this.wormholeService.delete(id).then(() => ({ deleted: true }));
  }

  @Patch('admin/wormholes/:id/toggle')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.MAP_EDITOR)
  toggleWormhole(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { isActive: boolean },
  ): Promise<StarmapWormholeDto> {
    return this.wormholeService.toggle(id, body.isActive);
  }

  // --- Influence Areas ---

  @Get('layers/:layerId/influence/:sectorX/:sectorY')
  getInfluenceInSector(
    @Param('layerId', ParseIntPipe) layerId: number,
    @Param('sectorX', ParseIntPipe) sectorX: number,
    @Param('sectorY', ParseIntPipe) sectorY: number,
  ): Promise<StarmapInfluenceAreaDto[]> {
    return this.starmapService.getLayerById(layerId).then((layer) => {
      const minX = sectorX * layer.sectorSize + 1;
      const maxX = Math.min((sectorX + 1) * layer.sectorSize, layer.width);
      const minY = sectorY * layer.sectorSize + 1;
      const maxY = Math.min((sectorY + 1) * layer.sectorSize, layer.height);
      return this.influenceService.getInfluenceInSector(
        layerId,
        minX,
        maxX,
        minY,
        maxY,
      );
    });
  }

  @Post('admin/layers/:id/recalculate-influence')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.MAP_EDITOR)
  async recalculateInfluence(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      sources?: Array<{
        sourceType: string;
        sourceId: number;
        cx: number;
        cy: number;
        radius: number;
        strength: number;
      }>;
    },
  ): Promise<StarmapOperationResultDto> {
    const sources = (body.sources ?? []).map((s) => ({
      ...s,
      sourceType: s.sourceType as any,
      layerId: id,
    }));
    const created = await this.influenceService.calculateInfluenceForLayer(
      id,
      sources,
    );
    return { created };
  }

  @Get('admin/layers/:id/export')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.MAP_EDITOR)
  exportLayer(@Param('id', ParseIntPipe) id: number) {
    return this.starmapAdminService.exportLayer(id);
  }

  @Post('admin/layers/import')
  @UseGuards(AdminGuard)
  importLayer(@Body() body: any) {
    return this.starmapAdminService.importLayer(body);
  }
}
