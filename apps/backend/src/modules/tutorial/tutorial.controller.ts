import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  TUTORIAL_VIEWS,
  type SetTutorialStepDto,
  type TutorialView,
} from '@swuniverse/shared';
import { RequiresGameAccess } from '../game-status/game-status.guard';
import { TutorialService } from './tutorial.service';

@Controller('tutorial')
@RequiresGameAccess()
@UseGuards(AuthGuard('jwt'))
export class TutorialController {
  constructor(private readonly tutorials: TutorialService) {}

  @Get(':view')
  getView(
    @Request() req: { user: { sub: number } },
    @Param('view') view: string,
  ) {
    return this.tutorials.getView(req.user.sub, this.parseView(view));
  }

  @Post(':view/step')
  setStep(
    @Request() req: { user: { sub: number } },
    @Param('view') view: string,
    @Body() body: SetTutorialStepDto,
  ) {
    if (typeof body.stepId !== 'string' || body.stepId.length === 0) {
      throw new BadRequestException('Tutorial step id is required');
    }
    return this.tutorials.setStep(req.user.sub, this.parseView(view), body.stepId);
  }

  @Post(':view/finish')
  finish(
    @Request() req: { user: { sub: number } },
    @Param('view') view: string,
  ) {
    return this.tutorials.finish(req.user.sub, this.parseView(view));
  }

  @Post('reset')
  reset(@Request() req: { user: { sub: number } }) {
    return this.tutorials.reset(req.user.sub);
  }

  @Post('disable')
  disable(@Request() req: { user: { sub: number } }) {
    return this.tutorials.disable(req.user.sub);
  }

  private parseView(view: string): TutorialView {
    if (!TUTORIAL_VIEWS.includes(view as TutorialView)) {
      throw new BadRequestException('Unknown tutorial view');
    }
    return view as TutorialView;
  }
}
