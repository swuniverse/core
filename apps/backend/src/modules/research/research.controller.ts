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
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { Faction } from '@swuniverse/shared';
import { ResearchService } from './research.service';

class StartResearchDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  techId: number;
}

class CancelResearchDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  techId?: number;
}

class QueueTargetDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetTechId: number;
}

class QueuePreviewQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetTechId: number;
}

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
    @Body() dto: StartResearchDto,
  ) {
    return this.researchService.startResearch(
      req.user.sub,
      dto.techId,
      req.user.faction,
    );
  }

  @Post('cancel')
  cancel(
    @Request() req: { user: { sub: number } },
    @Body() dto: CancelResearchDto,
  ) {
    return this.researchService.cancelResearch(req.user.sub, dto.techId);
  }

  @Post('queue-target')
  queueTarget(
    @Request() req: { user: { sub: number; faction?: Faction } },
    @Body() dto: QueueTargetDto,
  ) {
    return this.researchService.queueTarget(
      req.user.sub,
      dto.targetTechId,
      req.user.faction,
    );
  }

  @Get('queue-preview')
  queuePreview(
    @Request() req: { user: { sub: number; faction?: Faction } },
    @Query() query: QueuePreviewQueryDto,
  ) {
    return this.researchService.getQueuePreviewForUser(
      req.user.sub,
      query.targetTechId,
      req.user.faction,
    );
  }

  @Delete('queue')
  clearQueue(@Request() req: { user: { sub: number } }) {
    return this.researchService.clearQueue(req.user.sub);
  }
}
