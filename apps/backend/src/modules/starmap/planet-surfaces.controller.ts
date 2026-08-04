import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../auth/admin.guard';
import { StarmapService } from './starmap.service';
import { PlanetGeneratorService } from './generator/planet-generator.service';
import {
  getStuSurfaceClassConfig,
  supportsStuSurface,
} from './generator/stu-planet-surface.generator';
import { PlanetFieldLayer } from './entities/planet-field.entity';
import type {
  StarmapPlanetSurfaceDto,
  StarmapOperationResultDto,
  StarmapGeneratePlanetSurfaceDto,
} from '@swuniverse/shared';

@Controller('starmap')
@UseGuards(AuthGuard('jwt'))
export class PlanetSurfacesController {
  constructor(
    private readonly starmapService: StarmapService,
    private readonly planetGenerator: PlanetGeneratorService,
  ) {}

  @Get('planets/:id/surface')
  async getPlanetSurface(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<StarmapPlanetSurfaceDto> {
    const fields = await this.planetGenerator.getPlanetFields(id);
    const obj = await this.starmapService.getCelestialObject(id);
    return {
      celestialObject: {
        id: obj.id,
        objectType: obj.objectType,
        name: obj.name,
        description: obj.description,
        posX: obj.posX,
        posY: obj.posY,
        classId: obj.classId,
        isColonizable: obj.isColonizable,
        surfaceWidth: obj.surfaceWidth,
        surfaceHeight: obj.surfaceHeight,
      },
      orbit: fields
        .filter((f) => f.fieldLayer === PlanetFieldLayer.ORBIT)
        .map((f) => ({
          id: f.id,
          celestialObjectId: f.celestialObjectId,
          fieldLayer: f.fieldLayer,
          px: f.px,
          py: f.py,
          fieldType: f.fieldType,
          terrainTileId: f.terrainTileId,
          buildingId: f.buildingId,
          isBuildable: f.isBuildable,
          resourceModifier: f.resourceModifier,
        })),
      surface: fields
        .filter((f) => f.fieldLayer === PlanetFieldLayer.SURFACE)
        .map((f) => ({
          id: f.id,
          celestialObjectId: f.celestialObjectId,
          fieldLayer: f.fieldLayer,
          px: f.px,
          py: f.py,
          fieldType: f.fieldType,
          terrainTileId: f.terrainTileId,
          buildingId: f.buildingId,
          isBuildable: f.isBuildable,
          resourceModifier: f.resourceModifier,
        })),
      underground: fields
        .filter((f) => f.fieldLayer === PlanetFieldLayer.UNDERGROUND)
        .map((f) => ({
          id: f.id,
          celestialObjectId: f.celestialObjectId,
          fieldLayer: f.fieldLayer,
          px: f.px,
          py: f.py,
          fieldType: f.fieldType,
          terrainTileId: f.terrainTileId,
          buildingId: f.buildingId,
          isBuildable: f.isBuildable,
          resourceModifier: f.resourceModifier,
        })),
    };
  }

  @Post('admin/planets/generate')
  @UseGuards(AdminGuard)
  async generatePlanetSurface(
    @Body() body: StarmapGeneratePlanetSurfaceDto,
  ): Promise<StarmapOperationResultDto> {
    const obj = await this.starmapService.getCelestialObject(
      body.celestialObjectId,
    );
    if (body.classId && supportsStuSurface(body.classId)) {
      obj.classId = body.classId;
    }
    obj.terrainSeed = body.terrainSeed ?? `planet-${obj.id}-${Date.now()}`;
    const classDef = obj.classId ? getStuSurfaceClassConfig(obj.classId) : null;
    if (classDef) {
      obj.surfaceWidth = classDef.width;
      obj.surfaceHeight = classDef.surfaceHeight;
    }
    await this.starmapService.saveCelestialObject(obj);
    const created = await this.planetGenerator.generateAndPersist(obj.id);
    return { created };
  }
}
