import { ShuttleService } from './shuttle.service';
import { LastCombatReportService } from './last-combat-report.service';
import { LastCombatReportController } from './last-combat-report.controller';
import { StationScrappingService } from './station-scrapping.service';
import { StationScrappingController } from './station-scrapping.controller';
import { StationScrapping } from './entities/station-scrapping.entity';
import { ShuttleController } from './shuttle.controller';
import { ResourceConversionService } from './resource-conversion.service';
import { ResourceConversionController } from './resource-conversion.controller';
import { ResourceCollectionService } from './resource-collection.service';
import { ResourceCollectionController, FieldMiningController } from './resource-collection.controller';
import { NavicomputerJumpService } from './navicomputer-jump.service';
import { NavicomputerJumpController } from './navicomputer-jump.controller';
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
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RpgTransponderService } from './rpg-transponder.service';
import { RpgTransponderController } from './rpg-transponder.controller';
import { RpgSpacecraftAccessInterceptor } from './rpg-spacecraft-access.interceptor';
import { RpgActionLockService } from './rpg-action-lock.service';
import { SignatureMaskService } from './signature-mask.service';
import { SignatureMaskController } from './signature-mask.controller';
import { FlightSignatureService } from './flight-signature.service';
import { SpacecraftRepairService } from './spacecraft-repair.service';
import { StationConstructionService } from './station-construction.service';
import { InteractionContextService } from './interaction-context.service';
import { SpacecraftTractorService } from './spacecraft-tractor.service';
import {
  BOARDING_RANDOM_TOKEN,
  SpacecraftBoardingService,
} from './spacecraft-boarding.service';
import { SpacecraftTakeover } from './entities/spacecraft-takeover.entity';
import { Buoy } from './entities/buoy.entity';
import { SpacecraftTakeoverService } from './spacecraft-takeover.service';
import { SpacecraftTrackerService } from './spacecraft-tracker.service';
import { CrewSkill } from './entities/crew-skill.entity';
import { CrewEnhancementService } from './crew-enhancement.service';
import {
  FLIGHT_CONSEQUENCES,
  FlightConsequencePipeline,
} from './flight-consequence-pipeline';
import { FieldTransitionExecutor } from './field-transition-executor';
import { DeflectorConsequence } from './deflector-consequence';
import { MOVEMENT_REACTIONS, type MovementReaction } from './movement-reaction.port';
import { ORBIT_ORDER_VIEW, type OrbitOrderViewPort } from './orbit-order-view.port';
import { ORBIT_ORDER_LIFECYCLE, type OrbitOrderLifecyclePort } from './orbit-order-lifecycle.port';
import {
  FieldEffectConsequence,
  STU_CLOCK_TOKEN,
  STU_RANDOM_TOKEN,
} from './field-effect-consequence';
import { ColonyShipBuildQueue } from '../colony/entities/colony-ship-build-queue.entity';
import { ShipbuildingModule } from '../shipbuilding/shipbuilding.module';
import { StationShipyardService } from './station-shipyard.service';
import { WormholePassageService, WORMHOLE_ACCESS_POLICY, WORMHOLE_RANDOM } from './wormhole-passage.service';
import { WormholeRestrictionAccessPolicy } from './wormhole-access-policy.service';
import { WormholeRestrictionService } from './wormhole-restriction.service';
import { WormholeRestriction } from './entities/wormhole-restriction.entity';
import { AnomalyModule } from '../anomaly/anomaly.module';
import { AnomalyFlightConsequence } from '../anomaly/anomaly-flight-consequence';
import { IonStormHandler } from '../anomaly/ion-storm.handler';
import { createAnomalyRandom } from '../anomaly/stu-random';
import { SpacecraftIonStormEffects } from './ion-storm-effects';
import { GameDataService } from '../game-data/game-data.service';
import { MessagingService } from '../messaging/messaging.service';

import { TradeModule } from '../trade/trade.module';
import { AccountDeletionModule } from '../account-deletion/account-deletion.module';
import { SpacecraftDeletionHandler } from './spacecraft-deletion.handler';
import { TradeDealFulfillmentAdapter } from './trade-deal-fulfillment.adapter';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Spacecraft,
      StationScrapping,
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
      WormholeRestriction,
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
      SpacecraftTakeover,
      Buoy,
      ColonyShipBuildQueue,
    ]),
    forwardRef(() => StarmapModule),
    forwardRef(() => ColonyModule),
    ShipbuildingModule,
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
    AnomalyModule,
    forwardRef(() => TradeModule),
    AccountDeletionModule,
  ],
  controllers: [RpgTransponderController, SignatureMaskController, LastCombatReportController, StationScrappingController, ShuttleController, ResourceConversionController, SpacecraftController, NavicomputerJumpController, ResourceCollectionController, FieldMiningController],
  providers: [
    SignatureMaskService,
    RpgTransponderService,
    RpgActionLockService,
    { provide: APP_INTERCEPTOR, useClass: RpgSpacecraftAccessInterceptor },
    SpacecraftDeletionHandler,
    TradeDealFulfillmentAdapter,
    SpacecraftService,
    WormholePassageService,
    NavicomputerJumpService,
    ResourceCollectionService,
    ResourceConversionService,
    ShuttleService,
    LastCombatReportService,
    StationScrappingService,
    WormholeRestrictionService,
    WormholeRestrictionAccessPolicy,
    { provide: WORMHOLE_ACCESS_POLICY, useExisting: WormholeRestrictionAccessPolicy },
    { provide: WORMHOLE_RANDOM, useValue: Math.random },
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
    StationShipyardService,
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
    SpacecraftBoardingService,
    {
      provide: BOARDING_RANDOM_TOKEN,
      useValue: {
        integer: (min: number, max: number) =>
          Math.floor(Math.random() * (max - min + 1)) + min,
      },
    },
    SpacecraftTakeoverService,
    SpacecraftTrackerService,
    FieldTransitionExecutor,
    FieldEffectConsequence,
    DeflectorConsequence,
    { provide: STU_RANDOM_TOKEN, useValue: Math.random },
    { provide: STU_CLOCK_TOKEN, useValue: () => new Date() },
    FlightConsequencePipeline,
    {
      provide: SpacecraftIonStormEffects,
      useFactory: (
        messaging: MessagingService,
        destruction: SpacecraftDestructionService,
        crewEnhancement: CrewEnhancementService,
        gameData: GameDataService,
      ) =>
        new SpacecraftIonStormEffects({
          random: createAnomalyRandom(),
          messaging,
          destruction,
          crewEnhancement,
          hasIonStormReduction: (moduleType) =>
            gameData.getAllModules().find((module) => module.name === moduleType)
              ?.secret.ionStormDamageReduction === true,
        }),
      inject: [MessagingService, SpacecraftDestructionService, CrewEnhancementService, GameDataService],
    },
    // Filled at startup by reaction modules (alert combat) that import this module.
    { provide: MOVEMENT_REACTIONS, useFactory: (): MovementReaction[] => [] },
    // Filled at startup by the colony module (orbit order policy).
    { provide: ORBIT_ORDER_VIEW, useFactory: (): OrbitOrderViewPort => ({ view: null }) },
    { provide: ORBIT_ORDER_LIFECYCLE, useFactory: (): OrbitOrderLifecyclePort => ({ lifecycle: null }) },
    {
      provide: FLIGHT_CONSEQUENCES,
      // STU PostFlight order: deflector, field type effects, anomalies.
      useFactory: (
        collection: ResourceCollectionService,
        deflector: DeflectorConsequence,
        fieldEffects: FieldEffectConsequence,
        anomalies: AnomalyFlightConsequence,
      ) => [collection, deflector, fieldEffects, anomalies],
      inject: [ResourceCollectionService, DeflectorConsequence, FieldEffectConsequence, AnomalyFlightConsequence],
    },
  ],
  exports: [
    RpgActionLockService,
    ShuttleService,
    MOVEMENT_REACTIONS,
    ORBIT_ORDER_VIEW,
    ORBIT_ORDER_LIFECYCLE,
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
    SpacecraftTakeoverService,
    SpacecraftTrackerService,
  ],
})
export class SpacecraftModule implements OnModuleInit {
  constructor(
    private readonly shipClassService: ShipClassService,
    private readonly researchService: ResearchService,
    private readonly researchRewardShipService: ResearchRewardShipService,
    private readonly ionStorm: IonStormHandler,
    private readonly ionStormEffects: SpacecraftIonStormEffects,
  ) {}

  async onModuleInit() {
    // The storm lives in the anomaly module; its spacecraft effects live here.
    this.ionStorm.registerEffects(this.ionStormEffects);
    this.researchService.registerShipRewardGranter((userId, techId) =>
      this.researchRewardShipService.grantShipReward(userId, techId),
    );
    await this.shipClassService.seedDefaults();
  }
}
