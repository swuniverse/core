import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { SaveUserCharacterDto } from '@swuniverse/shared';
import { RequiresGameAccess } from '../game-status/game-status.guard';
import { RpgService } from './rpg.service';

@Controller('rpg/characters')
@RequiresGameAccess()
@UseGuards(AuthGuard('jwt'))
export class RpgController {
  constructor(private readonly rpgService: RpgService) {}

  @Get('player/:userId')
  list(@Param('userId', ParseIntPipe) userId: number) {
    return this.rpgService.list(userId);
  }

  @Post()
  create(@Request() req: { user: { sub: number } }, @Body() body: SaveUserCharacterDto) {
    return this.rpgService.create(req.user.sub, body);
  }

  @Patch(':id')
  update(@Request() req: { user: { sub: number } }, @Param('id', ParseIntPipe) id: number, @Body() body: SaveUserCharacterDto) {
    return this.rpgService.update(req.user.sub, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Request() req: { user: { sub: number } }, @Param('id', ParseIntPipe) id: number) {
    return this.rpgService.remove(req.user.sub, id);
  }
}
