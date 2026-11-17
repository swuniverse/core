import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsBoolean, IsInt, Max, Min } from 'class-validator';
import { AdminGuard } from '../auth/admin.guard';
import { RpgTransponderService } from './rpg-transponder.service';

export class AssignRpgTransponderRequest {
  @IsInt() @Min(1) @Max(2147483647) plotId: number;
}
export class RpgVisibilityRequest {
  @IsBoolean() hidden: boolean;
}

@Controller('spacecraft/admin/rpg')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class RpgTransponderController {
  constructor(private readonly scenes: RpgTransponderService) {}
  @Get() list(@Request() req: { user: { sub: number } }) {
    return this.scenes.list(req.user.sub);
  }
  @Get('plots') plots(@Request() req: { user: { sub: number } }) {
    return this.scenes.plots(req.user.sub);
  }
  @Put(':id/transponder') assign(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() body: AssignRpgTransponderRequest,
  ) {
    return this.scenes.assign(id, req.user.sub, body.plotId);
  }
  @Delete(':id/transponder') remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.scenes.remove(id, req.user.sub);
  }
  @Patch(':id/visibility') visibility(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() body: RpgVisibilityRequest,
  ) {
    return this.scenes.setHidden(id, req.user.sub, body.hidden);
  }
}
