import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ColonizationService } from './colonization.service';
import type { StarterColonizationRequestDto } from './colonization.service';

@Controller('colonization')
@UseGuards(AuthGuard('jwt'))
export class ColonizationController {
  constructor(private readonly colonizationService: ColonizationService) {}

  @Get('status')
  status(@Request() req: { user: { sub: number } }) {
    return this.colonizationService.getColonizationStatus(req.user.sub);
  }

  @Get('targets/:celestialObjectId')
  checkTarget(
    @Request() req: { user: { sub: number } },
    @Param('celestialObjectId', ParseIntPipe) celestialObjectId: number,
    @Query('shipId') shipId?: string,
  ) {
    const parsedShipId = shipId ? Number(shipId) : undefined;
    return this.colonizationService.explainTarget(
      req.user.sub,
      celestialObjectId,
      Number.isFinite(parsedShipId) ? parsedShipId : undefined,
    );
  }

  @Get('starter/options')
  starterOptions(@Request() req: { user: { sub: number } }) {
    return this.colonizationService.getStarterColonizationOptions(req.user.sub);
  }

  @Post('starter/ship')
  createStarterShip(@Request() req: { user: { sub: number } }) {
    return this.colonizationService.createStarterColonizationShip(
      req.user.sub,
    );
  }

  @Post('starter/found')
  foundStarterColony(
    @Request() req: { user: { sub: number } },
    @Body() body: StarterColonizationRequestDto,
  ) {
    return this.colonizationService.foundStarterColony(
      req.user.sub,
      body.celestialObjectId,
    );
  }

  @Post('ships/:shipId/colonize')
  colonize(
    @Request() req: { user: { sub: number } },
    @Param('shipId', ParseIntPipe) shipId: number,
    @Body('celestialObjectId') celestialObjectId: number,
  ) {
    return this.colonizationService.colonize(
      req.user.sub,
      shipId,
      celestialObjectId,
    );
  }
}
