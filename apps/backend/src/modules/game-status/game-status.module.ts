import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameStatusController } from './game-status.controller';
import { GameStatusGuard } from './game-status.guard';
import { GameStatus } from './entities/game-status.entity';
import { GameStatusService } from './game-status.service';

@Module({
  imports: [TypeOrmModule.forFeature([GameStatus]), JwtModule.register({})],
  controllers: [GameStatusController],
  providers: [
    GameStatusService,
    GameStatusGuard,
    { provide: APP_GUARD, useExisting: GameStatusGuard },
  ],
  exports: [GameStatusService, GameStatusGuard],
})
export class GameStatusModule {}
