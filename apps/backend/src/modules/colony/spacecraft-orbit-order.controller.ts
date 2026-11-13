import {
  Body,
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsEnum } from 'class-validator';
import { RequiresGameAccess } from '../game-status/game-status.guard';
import { ColonyOrbitService } from './colony-orbit.service';
import { ColonyOrbitAssignmentMode } from './entities/colony-orbit-assignment.entity';

class OrbitOrderDto {
  @IsEnum(ColonyOrbitAssignmentMode)
  mode: ColonyOrbitAssignmentMode;
}

/**
 * Canonical ship-based routes for fleet-wide colony defense and blockade
 * orders. Lives in the colony module so the spacecraft controller does not
 * import colony services; the colony routes stay as compatibility aliases.
 */
@Controller('spacecraft')
@RequiresGameAccess()
@UseGuards(AuthGuard('jwt'))
export class SpacecraftOrbitOrderController {
  constructor(private readonly colonyOrbitService: ColonyOrbitService) {}

  @Post(':id/orbit-order')
  start(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
    @Body() dto: OrbitOrderDto,
  ) {
    return this.colonyOrbitService.startOrbitOrder(id, req.user.sub, dto.mode);
  }

  @Delete(':id/orbit-order')
  stop(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { sub: number } },
  ) {
    return this.colonyOrbitService.stopOrbitOrder(id, req.user.sub);
  }
}
