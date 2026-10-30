import { Module, OnModuleInit, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpacecraftController } from './spacecraft.controller';
import { SpacecraftService } from './spacecraft.service';
import { TransferService } from './transfer.service';
import { EpsTransferService } from './eps-transfer.service';
import { SpacecraftDockingService } from './spacecraft-docking.service';
import { ShipManagementService } from './ship-management.service';
import { StationShipManagementService } from './station-ship-management.service';
import { DockingPrivilegeService } from './docking-privilege.service';
import { DockingPrivilege } from './entities/docking-privilege.entity';
import { Spacecraft } from './entities/spacecraft.entity';
import { SpacecraftModule as SpacecraftModuleEntity } from './entities/spacecraft-module.entity';
import { ColonyScan } from './entities/colony-scan.entity';
import { SpacecraftScanResult } from './entities/spacecraft-scan-result.entity';
import { ShipLogEntry } from './entities/ship-log-entry.entity';
import { ShipDistressSignal } from './entities/ship-distress-signal.entity';
import { Fleet } from './entities/fleet.entity';
import { ShipClassDef } from './entities/ship-class-def.entity';
import { ShipClassDiscovery } from './entities/ship-class-discovery.entity';
import { StationClassDiscovery } from './entities/station-class-discovery.entity';
import { AdminShipBuildplan } from './entities/admin-ship-buildplan.entity';
import { CargoItem } from './entities/cargo-item.entity';
import { SpacecraftTorpedoStorage } from './entities/spacecraft-torpedo-storage.entity';
import { SpacecraftWreck } from './entities/spacecraft-wreck.entity';
import { EscapePod } from './entities/escape-pod.entity';
import { EscapePodService } from './escape-pod.service';
import { CartographyPlan } from './entities/cartography-plan.entity';
import { FlightSignature } from './entities/flight-signature.entity';
import { SpacecraftRepairTask } from './entities/spacecraft-repair-task.entity';
import { StationShipRepair } from './entities/station-ship-repair.entity';
import { StationRepairService } from './station-repair.service';
import { StarSystem } from '../starmap/entities/star-system.entity';
import { Layer } from '../starmap/entities/layer.entity';
import { CelestialObject } from '../starmap/entities/celestial-object.entity';
import { GalaxyField } from '../starmap/entities/galaxy-field.entity';
import { SystemField } from '../starmap/entities/system-field.entity';
import { SpaceLocation } from '../starmap/entities/space-location.entity';
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
import { ResearchRewardShipService } from './research-reward-ship.service';
import { ResearchService } from '../research/research.service';
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
import { StationClassDiscoveryService } from './station-class-discovery.service';
import { HyperdriveDisruptionService } from './hyperdrive-disruption.service';
import { SpacecraftAlertService } from './spacecraft-alert.service';
import { PrestigeModule } from '../prestige/prestige.module';
import { AllianceModule } from '../alliance/alliance.module';
import { StarmapVisibilityService } from './starmap-visibility.service';
import { CartographyPlanService } from './cartography-plan.service';
import { DatabaseModule } from '../database/database.module';
import { StatisticsModule } from '../statistics/statistics.module';
import { FlightSignatureService } from './flight-signature.service';
import { SpacecraftRepairService } from './spacecraft-repair.service';
import { StationConstructionService } from './station-construction.service';
import { InteractionContextService } from './interaction-context.service';
import { SpacecraftTractorService } from './spacecraft-tractor.service';
import { CrewSkill } from './entities/crew-skill.entity';
import { CrewEnhancementService } from './crew-enhancement.service';
import {
  FLIGHT_CONSEQUENCES,
  FlightConsequencePipeline,
} from './flight-consequence-pipeline';
import { FieldTransitionExecutor } from './field-transition-executor';
import { FieldEffectConsequence } from './field-effect-consequence';

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
      StationClassDiscovery,
      AdminShipBuildplan,
      CargoItem,
      SpacecraftTorpedoStorage,
      SpacecraftWreck,
      EscapePod,
      CartographyPlan,
      FlightSignature,
      SpacecraftRepairTask,
      StationShipRepair,
      DockingPrivilege,
      StarSystem,
      Layer,
      CelestialObject,
      GalaxyField,
      SystemField,
      SpaceLocation,
      FactionEntity,
      User,
      Colony,
      ColonyStorage,
      CrewAssignment,
      Crew,
      CrewSkill,
    ]),
    forwardRef(() => StarmapModule),
    forwardRef(() => ColonyModule),
    ResearchModule,
    GameDataModule,
    ColonizationModule,
    WebsocketModule,
    MessagingModule,
    EventsModule,
    PrestigeModule,
    AllianceModule,
    DatabaseModule,
    StatisticsModule,
  ],
  controllers: [SpacecraftController],
  providers: [
    SpacecraftService,
    ShipClassService,
    ShipClassDiscoveryService,
    StationClassDiscoveryService,
    HyperdriveDisruptionService,
    SpacecraftAlertService,
    CartographyPlanService,
    TransferService,
    EpsTransferService,
    SpacecraftDockingService,
    ShipManagementService,
    StationShipManagementService,
    StationRepairService,
    DockingPrivilegeService,
    SpacecraftScanService,
    SpacecraftStatsService,
    SpacecraftCrewService,
    EscapePodService,
    ResearchRewardShipService,
    CrewEnhancementService,
    SpacecraftTorpedoService,
    SpacecraftRuntimeStateService,
    SpacecraftResourceFlowService,
    ColonyStorageService,
    ShipColonyContextService,
    SpacecraftCommunicationService,
    SpacecraftEngineeringService,
    SpacecraftDestructionService,
    StarmapVisibilityService,
    FlightSignatureService,
    SpacecraftRepairService,
    StationConstructionService,
    InteractionContextService,
    SpacecraftTractorService,
    FieldTransitionExecutor,
    FieldEffectConsequence,
    FlightConsequencePipeline,
    {
      provide: FLIGHT_CONSEQUENCES,
      useFactory: (fieldEffects: FieldEffectConsequence) => [fieldEffects],
      inject: [FieldEffectConsequence],
    },
  ],
  exports: [
    SpacecraftService,
    ShipColonyContextService,
    ShipClassService,
    TransferService,
    EpsTransferService,
    SpacecraftScanService,
    SpacecraftStatsService,
    SpacecraftCrewService,
    EscapePodService,
    ResearchRewardShipService,
    CrewEnhancementService,
    SpacecraftTorpedoService,
    ShipManagementService,
    SpacecraftRuntimeStateService,
    SpacecraftResourceFlowService,
    CartographyPlanService,
    SpacecraftDestructionService,
    FlightSignatureService,
    InteractionContextService,
  ],
})
export class SpacecraftModule implements OnModuleInit {
  constructor(
    private readonly shipClassService: ShipClassService,
    private readonly researchService: ResearchService,
    private readonly researchRewardShipService: ResearchRewardShipService,
  ) {}

  async onModuleInit() {
    this.researchService.registerShipRewardGranter((userId, techId) =>
      this.researchRewardShipService.grantShipReward(userId, techId),
    );
    await this.shipClassService.seedDefaults();
  }
}
