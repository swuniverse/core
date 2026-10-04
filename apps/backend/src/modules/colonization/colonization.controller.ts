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

  @Get('targets/:celestialObjectId/swu-proposals')
  swuProposals(
    @Param('celestialObjectId', ParseIntPipe) celestialObjectId: number,
    @Query('rotation') rotation?: string,
  ) {
    return this.colonizationService.getSwuColonizationProposals(
      celestialObjectId,
      rotation === 'tidal-locked' ? 'tidal-locked' : 'rotating',
    );
  }

  @Get('colonies/:colonyId/ecosystem')
  colonyEcosystem(
    @Request() req: { user: { sub: number } },
    @Param('colonyId', ParseIntPipe) colonyId: number,
  ) {
    return this.colonizationService.getSwuColonyEcosystem(
      colonyId,
      req.user.sub,
    );
  }

  @Post('ships/:shipId/colonize')
  colonize(
    @Request() req: { user: { sub: number } },
    @Param('shipId', ParseIntPipe) shipId: number,
    @Body('celestialObjectId') celestialObjectId: number,
    @Body('initialFieldIndex') initialFieldIndex?: number,
    @Body('zoneSlot') zoneSlot?: 1 | 2 | 3,
  ) {
    return this.colonizationService.colonize(
      req.user.sub,
      shipId,
      celestialObjectId,
      initialFieldIndex,
      zoneSlot,
    );
  }
}
