import { Module, OnModuleInit, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpacecraftController } from './spacecraft.controller';
import { SpacecraftService } from './spacecraft.service';
import { TransferService } from './transfer.service';
import { Spacecraft } from './entities/spacecraft.entity';
import { SpacecraftModule as SpacecraftModuleEntity } from './entities/spacecraft-module.entity';
import { ColonyScan } from './entities/colony-scan.entity';
import { SpacecraftScanResult } from './entities/spacecraft-scan-result.entity';
import { ShipLogEntry } from './entities/ship-log-entry.entity';
import { ShipDistressSignal } from './entities/ship-distress-signal.entity';
import { Fleet } from './entities/fleet.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { ShipClassDiscovery } from './entities/ship-class-discovery.entity';
import { AdminShipBuildplan } from './entities/admin-ship-buildplan.entity';
import { CargoItem } from './entities/cargo-item.entity';
import { SpacecraftTorpedoStorage } from './entities/spacecraft-torpedo-storage.entity';
import { SpacecraftWreck } from './entities/spacecraft-wreck.entity';
import { StarSystem } from '../starmap/entities/star-system.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { CelestialObject } from '../starmap/entities/celestial-object.entity';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { SystemField } from '../starmap/entities/system-field.entity';
import { FactionEntity } from '../faction/entities/faction.entity';
import { User } from '../auth/user.entity';
import { Colony } from '../colony/entities/colony.entity';
import { ColonyStorage } from '../colony/entities/colony-storage.entity';
import { CrewAssignment } from '../colony/entities/crew-assignment.entity';
import { Crew } from '../colony/entities/crew.entity';
import { ShipClassService } from './ship-class.service';
import { SpacecraftScanService } from './spacecraft-scan.service';
import { SpacecraftStatsService } from './spacecraft-stats.service';
import { SpacecraftCrewService } from './spacecraft-crew.service';
import { SpacecraftTorpedoService } from './spacecraft-torpedo.service';
import { SpacecraftRuntimeStateService } from './spacecraft-runtime-state.service';
import { SpacecraftResourceFlowService } from './spacecraft-resource-flow.service';
import { ColonyStorageService } from '../colony/colony-storage.service';
import { StarmapModule } from '../starmap/starmap.module';
import { ResearchModule } from '../research/research.module';
import { GameDataModule } from '../game-data/game-data.module';
import { ColonizationModule } from '../colonization/colonization.module';
import { ColonyModule } from '../colony/colony.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { MessagingModule } from '../messaging/messaging.module';
import { EventsModule } from '../events/events.module';
import { ShipColonyContextService } from './ship-colony-context.service';
import { SpacecraftCommunicationService } from './spacecraft-communication.service';
import { SpacecraftEngineeringService } from './spacecraft-engineering.service';
import { SpacecraftDestructionService } from './spacecraft-destruction.service';
import { ShipClassDiscoveryService } from './ship-class-discovery.service';
import { HyperdriveDisruptionService } from './hyperdrive-disruption.service';
import { SpacecraftAlertService } from './spacecraft-alert.service';
import { PrestigeModule } from '../prestige/prestige.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Spacecraft,
      SpacecraftModuleEntity,
      ColonyScan,
      SpacecraftScanResult,
      ShipLogEntry,
      ShipDistressSignal,
      Fleet,
      ShipClassDef,
      ShipClassDiscovery,
      AdminShipBuildplan,
      CargoItem,
      SpacecraftTorpedoStorage,
      SpacecraftWreck,
      StarSystem,
      Layer,
      CelestialObject,
      GalaxyField,
      SystemField,
      FactionEntity,
      User,
      Colony,
      ColonyStorage,
      CrewAssignment,
      Crew,
    ]),
    forwardRef(() => StarmapModule),
    ColonyModule,
    ResearchModule,
    GameDataModule,
    ColonizationModule,
    WebsocketModule,
    MessagingModule,
    EventsModule,
    PrestigeModule,
  ],
  controllers: [SpacecraftController],
  providers: [
    SpacecraftService,
    ShipClassService,
    ShipClassDiscoveryService,
    HyperdriveDisruptionService,
    SpacecraftAlertService,
    TransferService,
    SpacecraftScanService,
    SpacecraftStatsService,
    SpacecraftCrewService,
    SpacecraftTorpedoService,
    SpacecraftRuntimeStateService,
    SpacecraftResourceFlowService,
    ColonyStorageService,
    ShipColonyContextService,
    SpacecraftCommunicationService,
    SpacecraftEngineeringService,
    SpacecraftDestructionService,
  ],
  exports: [
    SpacecraftService,
    ShipColonyContextService,
    ShipClassService,
    TransferService,
    SpacecraftScanService,
    SpacecraftStatsService,
    SpacecraftCrewService,
    SpacecraftTorpedoService,
    SpacecraftRuntimeStateService,
    SpacecraftResourceFlowService,
    SpacecraftDestructionService,
  ],
})
export class SpacecraftModule implements OnModuleInit {
  constructor(private readonly shipClassService: ShipClassService) {}

  async onModuleInit() {
    await this.shipClassService.seedDefaults();
  }
}
