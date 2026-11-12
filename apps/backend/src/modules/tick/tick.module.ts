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
import { DatabaseModule } from '../database/database.module';
import { PrestigeModule } from '../prestige/prestige.module';
import { TopFlightsRewardService } from './top-flights-reward.service';
import { SpacecraftWreck } from '../spacecraft/entities/spacecraft-wreck.entity';
import {
  WRECK_DECAY_RANDOM_TOKEN,
  WreckDecayService,
} from './wreck-decay.service';
import { ProfileVisitorModule } from '../profile-visitor/profile-visitor.module';
import { ProfileVisitorService } from '../profile-visitor/profile-visitor.service';
import { StarmapModule } from '../starmap/starmap.module';
import { LayerMapCycleService } from '../starmap/layer-map-cycle.service';
import { AnomalyModule } from '../anomaly/anomaly.module';
import { TradeModule } from '../trade/trade.module';
import { TradeLicenseMaintenanceService } from '../trade/trade-license-maintenance.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      Colony,
      ColonyField,
      Spacecraft,
      SpacecraftWreck,
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
    DatabaseModule,
    PrestigeModule,
    ProfileVisitorModule,
    StarmapModule,
    AnomalyModule,
    TradeModule,
  ],
  controllers: [TickController, TickStatusController],
  providers: [
    TickService,
    { provide: 'TickService', useExisting: TickService },
    TickAdminService,
    MaintenanceService,
    TopFlightsRewardService,
    WreckDecayService,
    {
      provide: WRECK_DECAY_RANDOM_TOKEN,
      useValue: () => Math.floor(Math.random() * 11) + 5,
    },
    {
      provide: MAINTENANCE_HANDLERS,
      useFactory: (
        topFlightsReward: TopFlightsRewardService,
        profileVisitors: ProfileVisitorService,
        layerMapCycle: LayerMapCycleService,
        tradeLicenses: TradeLicenseMaintenanceService,
      ) => [topFlightsReward, profileVisitors, layerMapCycle, tradeLicenses],
      inject: [
        TopFlightsRewardService,
        ProfileVisitorService,
        LayerMapCycleService,
        TradeLicenseMaintenanceService,
      ],
    },
  ],
})
export class TickModule {}
