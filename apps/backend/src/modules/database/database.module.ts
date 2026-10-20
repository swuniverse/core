import { CelestialObject } from '../starmap/entities/celestial-object.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseController } from './database.controller';
import { DatabaseService } from './database.service';
import { User } from '../auth/user.entity';
import { Colony } from '../colony/entities/colony.entity';
import { Spacecraft } from '../spacecraft/entities/spacecraft.entity';
import { Research } from '../research/entities/research.entity';
import { SystemTypeDiscovery } from '../starmap/entities/system-type-discovery.entity';
import { ShipClassDiscovery } from '../spacecraft/entities/ship-class-discovery.entity';
import { ShipClassDef } from '../spacecraft/entities/ship-class-def.entity';
import { FactionModule } from '../faction/faction.module';
import { GameDataModule } from '../game-data/game-data.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { PrestigeHistoryEntry } from '../prestige/entities/prestige-history-entry.entity';
import { CelestialClassDiscovery } from '../starmap/entities/celestial-class-discovery.entity';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { AllianceModule } from '../alliance/alliance.module';
import { Layer } from '../starmap/entities/layer.entity';
import { StarSystem } from '../starmap/entities/star-system.entity';
import { SystemExploration } from '../starmap/entities/system-exploration.entity';
import { SystemField } from '../starmap/entities/system-field.entity';
import { ColonyScan } from '../spacecraft/entities/colony-scan.entity';
import { ColonyScanProjectionService } from '../spacecraft/colony-scan-projection.service';
import { CartographyPlan } from '../spacecraft/entities/cartography-plan.entity';
import { StatisticsModule } from '../statistics/statistics.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Colony,
      Spacecraft,
      Research,
      SystemTypeDiscovery,
      ShipClassDiscovery,
      ShipClassDef,
      PrestigeHistoryEntry,
      CelestialClassDiscovery,
      CrewAssignment,
      CelestialObject,
      Layer,
      StarSystem,
      SystemExploration,
      SystemField,
      CartographyPlan,
      ColonyScan,
    ]),
    FactionModule,
    GameDataModule,
    WebsocketModule,
    AllianceModule,
    StatisticsModule,
  ],
  controllers: [DatabaseController],
  providers: [DatabaseService, ColonyScanProjectionService],
  exports: [ColonyScanProjectionService],
})
export class DatabaseModule {}
