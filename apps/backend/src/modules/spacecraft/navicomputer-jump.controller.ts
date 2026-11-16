import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsInt, Max, Min } from 'class-validator';
import type { NavicomputerDestinationDto } from '@swuniverse/shared';
import { RequiresGameAccess } from '../game-status/game-status.guard';
import { NavicomputerJumpService } from './navicomputer-jump.service';

export class NavicomputerJumpRequest implements NavicomputerDestinationDto {
  @IsInt() @Min(1) @Max(2147483647) layerId: number;
  @IsInt() @Min(1) @Max(2147483647) x: number;
  @IsInt() @Min(1) @Max(2147483647) y: number;
}

@Controller('spacecraft')
@RequiresGameAccess()
@UseGuards(AuthGuard('jwt'))
export class NavicomputerJumpController {
  constructor(private readonly jumps: NavicomputerJumpService) {}

  @Get('navicomputer/layers')
  layers(@Request() req: { user: { sub: number } }) {
    return this.jumps.layers(req.user.sub);
  }

  @Post(':id/navicomputer-jump')
  jump(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() target: NavicomputerJumpRequest,
  ) {
    return this.jumps.jump(id, req.user.sub, target);
  }
}
