import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TickService } from './tick.service';
import { TickController } from './tick.controller';
import { ColonyModule } from '../colony/colony.module';
import { SpacecraftModule } from '../spacecraft/spacecraft.module';
import { ResearchModule } from '../research/research.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { Colony } from '../colony/entities/colony.entity';
import { ColonyField } from '../colony/entities/colony-field.entity';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import { User } from '../auth/user.entity';
import { GameTickState } from './entities/game-tick-state.entity';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      Colony,
      ColonyField,
      Spacecraft,
      User,
      GameTickState,
    ]),
    ColonyModule,
    SpacecraftModule,
    ResearchModule,
    WebsocketModule,
  ],
  controllers: [TickController],
  providers: [TickService],
})
export class TickModule {}
