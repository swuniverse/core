import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Faction } from '@swuniverse/shared';
import { ResearchService } from './research.service';

@Controller('research')
@UseGuards(AuthGuard('jwt'))
export class ResearchController {
  constructor(private readonly researchService: ResearchService) {}

  @Get('tree')
  getTechTree() {
    return this.researchService.getTechTree();
  }

  @Get()
  getState(@Request() req: { user: { sub: number; faction?: Faction } }) {
    return this.researchService.getResearchState(
      req.user.sub,
      req.user.faction,
    );
  }

  @Post('start')
  start(
    @Request() req: { user: { sub: number; faction?: Faction } },
    @Body('techId') techId: number,
  ) {
    return this.researchService.startResearch(
      req.user.sub,
      techId,
      req.user.faction,
    );
  }

  @Post('cancel')
  cancel(
    @Request() req: { user: { sub: number } },
    @Body('techId') techId?: number,
  ) {
    return this.researchService.cancelResearch(req.user.sub, techId);
  }

  @Post('queue-target')
  queueTarget(
    @Request() req: { user: { sub: number; faction?: Faction } },
    @Body('targetTechId') targetTechId: number,
  ) {
    return this.researchService.queueTarget(
      req.user.sub,
      targetTechId,
      req.user.faction,
    );
  }

  @Get('queue-preview')
  queuePreview(
    @Request() req: { user: { sub: number; faction?: Faction } },
    @Query('targetTechId') targetTechId: string,
  ) {
    return this.researchService.getQueuePreviewForUser(
      req.user.sub,
      parseInt(targetTechId, 10),
      req.user.faction,
    );
  }

  @Delete('queue')
  clearQueue(@Request() req: { user: { sub: number } }) {
    return this.researchService.clearQueue(req.user.sub);
  }
}
