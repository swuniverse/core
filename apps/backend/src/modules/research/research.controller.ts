import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
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
  getState(@Request() req: { user: { sub: number } }) {
    return this.researchService.getResearchState(req.user.sub);
  }

  @Post('start')
  start(
    @Request() req: { user: { sub: number } },
    @Body('techId') techId: number,
  ) {
    return this.researchService.startResearch(req.user.sub, techId);
  }

  @Post('cancel')
  cancel(
    @Request() req: { user: { sub: number } },
    @Body('techId') techId?: number,
  ) {
    return this.researchService.cancelResearch(req.user.sub, techId);
  }
}
