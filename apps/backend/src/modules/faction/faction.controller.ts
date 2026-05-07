import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FactionService } from './faction.service';

@Controller('factions')
@UseGuards(AuthGuard('jwt'))
export class FactionController {
  constructor(private readonly factionService: FactionService) {}

  @Get()
  findAll() {
    return this.factionService.findAll();
  }
}
