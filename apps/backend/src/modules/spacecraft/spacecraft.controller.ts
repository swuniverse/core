import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SpacecraftService } from './spacecraft.service';

@Controller('spacecraft')
@UseGuards(AuthGuard('jwt'))
export class SpacecraftController {
  constructor(private readonly spacecraftService: SpacecraftService) {}

  @Get()
  findAll(@Request() req: { user: { sub: number } }) {
    return this.spacecraftService.findAllByUser(req.user.sub);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.spacecraftService.findOne(id, req.user.sub);
  }

  @Put(':id')
  rename(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body('name') name: string,
  ) {
    return this.spacecraftService.rename(id, req.user.sub, name);
  }

  @Post(':id/navigate')
  navigate(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body('targetX') targetX: number,
    @Body('targetY') targetY: number,
  ) {
    return this.spacecraftService.navigate(id, req.user.sub, targetX, targetY);
  }

  @Post(':id/warp')
  warp(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body('targetSystemId') targetSystemId: number,
  ) {
    return this.spacecraftService.warp(id, req.user.sub, targetSystemId);
  }
}
