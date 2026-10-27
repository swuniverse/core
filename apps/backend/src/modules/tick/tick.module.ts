import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TickService } from './tick.service';
import { TickController } from './tick.controller';
import { TickStatusController } from './tick-status.controller';
import { ColonyModule } from '../colony/colony.module';
import { SpacecraftModule } from '../spacecraft/spacecraft.module';
import { ResearchModule } from '../research/research.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { Colony } from '../colony/entities/colony.entity';
import { ColonyField } from '../colony/entities/colony-field.entity';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import { User } from '../auth/user.entity';
import { AuthModule } from '../auth/auth.module';
import { GameTickState } from './entities/game-tick-state.entity';
import { DashboardModule } from '../dashboard/dashboard.module';
import { StatisticsModule } from '../statistics/statistics.module';
import {
  MAINTENANCE_HANDLERS,
  MaintenanceService,
} from './maintenance.service';
import { MessagingModule } from '../messaging/messaging.module';
import { SettingsModule } from '../settings/settings.module';
import { TickAdminService } from './tick-admin.service';
import { GameStatusModule } from '../game-status/game-status.module';

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
    DashboardModule,
    StatisticsModule,
    MessagingModule,
    SettingsModule,
    AuthModule,
    GameStatusModule,
  ],
  controllers: [TickController, TickStatusController],
  providers: [
    TickService,
    TickAdminService,
    MaintenanceService,
    { provide: MAINTENANCE_HANDLERS, useValue: [] },
  ],
})
export class TickModule {}
