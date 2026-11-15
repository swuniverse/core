import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { DatabaseCategoryProgressDto } from '@swuniverse/shared';
import { RequiresGameAccess } from '../game-status/game-status.guard';
import { LayerAccessService, type LayerReader } from '../starmap/layer-access.service';
import { DatabaseCompletionService } from './database-completion.service';

@Controller('database')
export class DatabaseProgressController {
  constructor(
    private readonly completion: DatabaseCompletionService,
    private readonly layerAccess: LayerAccessService,
  ) {}

  /** Award progress per database category; star systems only for known layers. */
  @Get('category-progress')
  @RequiresGameAccess()
  @UseGuards(AuthGuard('jwt'))
  async categoryProgress(
    @Request() req: { user: LayerReader },
  ): Promise<DatabaseCategoryProgressDto[]> {
    const layers = await this.layerAccess.getLayers(req.user);
    return this.completion.progress(req.user.sub, layers.map((layer) => layer.id));
  }
}
