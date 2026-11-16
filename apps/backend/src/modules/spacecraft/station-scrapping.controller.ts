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
import { IsString, MaxLength } from 'class-validator';
import { RequiresGameAccess } from '../game-status/game-status.guard';
import { StationScrappingService } from './station-scrapping.service';

export class StationScrappingRequest {
  @IsString()
  @MaxLength(64)
  code: string;
}

@Controller('spacecraft')
@RequiresGameAccess()
@UseGuards(AuthGuard('jwt'))
export class StationScrappingController {
  constructor(private readonly scrapping: StationScrappingService) {}
  @Get(':id/scrapping')
  get(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.scrapping.get(id, req.user.sub);
  }
  @Post(':id/scrapping')
  start(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() body: StationScrappingRequest,
  ) {
    return this.scrapping.start(id, req.user.sub, body.code);
  }
}
