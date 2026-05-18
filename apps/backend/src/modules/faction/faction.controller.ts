import { Controller, Get } from '@nestjs/common';
import { FactionService } from './faction.service';

@Controller('factions')
export class FactionController {
  constructor(private readonly factionService: FactionService) {}

  @Get()
  findAll() {
    return this.factionService.findAll();
  }
}
