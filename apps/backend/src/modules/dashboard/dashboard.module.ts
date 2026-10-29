import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DashboardSnapshot } from './entities/dashboard-snapshot.entity';
import { User } from '../auth/user.entity';
import { Colony } from '../colony/entities/colony.entity';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import { HolonetPost } from '../holonet/entities/holonet-post.entity';
import { WebsocketModule } from '../websocket/websocket.module';
import { Message } from '../messaging/entities/message.entity';
import { Research } from '../research/entities/research.entity';
import { AllianceModule } from '../alliance/alliance.module';
import { ColonyModule } from '../colony/colony.module';
import { ColonyShipBuildQueue } from '../colony/entities/colony-ship-build-queue.entity';
import { ProfileVisitorModule } from '../profile-visitor/profile-visitor.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DashboardSnapshot,
      User,
      Colony,
      Spacecraft,
      HolonetPost,
      Message,
      Research,
      ColonyShipBuildQueue,
    ]),
    WebsocketModule,
    AllianceModule,
    ColonyModule,
    ProfileVisitorModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
