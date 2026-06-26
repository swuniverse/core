import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CombatController } from './combat.controller';
import { CombatService } from './combat.service';
import { CombatEngine } from './combat.engine';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import { SpacecraftModule as SpacecraftModuleEntity } from '../spacecraft/entities/spacecraft-module.entity';
import { WebsocketModule } from '../websocket/websocket.module';
import { SpacecraftModule } from '../spacecraft/spacecraft.module';
import { Colony } from '../colony/entities/colony.entity';
import { ColonyStats } from '../colony/entities/colony-stats.entity';
import { ColonyField } from '../colony/entities/colony-field.entity';
import { ColonyStorage } from '../colony/entities/colony-storage.entity';
import { ColonyStorageService } from '../colony/colony-storage.service';
import { ColonyDefenseService } from '../colony/colony-defense.service';
import { ColonyEvent } from '../colony/entities/colony-event.entity';
import { ColonyEventService } from '../colony/colony-event.service';
import { ColonyDamageService } from '../colony/colony-damage.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Spacecraft,
      SpacecraftModuleEntity,
      Colony,
      ColonyStats,
      ColonyField,
      ColonyStorage,
      ColonyEvent,
    ]),
    WebsocketModule,
    SpacecraftModule,
  ],
  controllers: [CombatController],
  providers: [
    CombatService,
    CombatEngine,
    ColonyStorageService,
    ColonyDefenseService,
    ColonyDamageService,
    ColonyEventService,
  ],
  exports: [CombatService],
})
export class CombatModule {}
