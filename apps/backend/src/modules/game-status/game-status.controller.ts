import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { AdminGuard } from '../auth/admin.guard';
import type { GameStatusKind } from './entities/game-status.entity';
import { GameStatusService } from './game-status.service';

class UpdateGameStatusDto {
  @IsIn(['ONLINE', 'MAINTENANCE_ANNOUNCED', 'MAINTENANCE'])
  status: GameStatusKind;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}

@Controller('game-status')
export class GameStatusController {
  constructor(private readonly gameStatusService: GameStatusService) {}

  @Get()
  get() {
    return this.gameStatusService.getPublicStatus();
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Get('admin')
  getAdmin() {
    return this.gameStatusService.getPublicStatus();
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Patch()
  update(@Body() body: UpdateGameStatusDto) {
    return this.gameStatusService.update(body);
  }
}
