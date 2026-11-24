import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../auth/admin.guard';
import { FactionService } from './faction.service';
import { UpdateFactionSelectabilityDto } from './dto/update-faction-selectability.dto';
import { UpdateFactionPlayerLimitDto } from './dto/update-faction-player-limit.dto';

@Controller('factions')
export class FactionController {
  constructor(private readonly factionService: FactionService) {}

  @Get()
  findAll() {
    return this.factionService.findAll();
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Patch(':id/selectability')
  updateSelectability(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFactionSelectabilityDto,
  ) {
    return this.factionService.updateSelectability(id, dto.isSelectable);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Patch(':id/player-limit')
  updatePlayerLimit(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFactionPlayerLimitDto,
  ) {
    return this.factionService.updatePlayerLimit(id, dto.playerLimit);
  }
}
