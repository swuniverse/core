import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CombatController } from './combat.controller';
import { CombatService } from './combat.service';
import { CombatEngine } from './combat.engine';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Spacecraft]),
    WebsocketModule,
  ],
  controllers: [CombatController],
  providers: [CombatService, CombatEngine],
  exports: [CombatService],
})
export class CombatModule {}
