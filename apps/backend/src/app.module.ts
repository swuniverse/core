import { UserMessageFolder } from './modules/messaging/entities/user-message-folder.entity';
import { ColonySandbox } from './modules/colony/entities/colony-sandbox.entity';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameDataModule } from './modules/game-data/game-data.module';
import { AuthModule } from './modules/auth/auth.module';
import { AccountDeletionModule } from './modules/account-deletion/account-deletion.module';
import { ColonyModule } from './modules/colony/colony.module';
import { StarmapModule } from './modules/starmap/starmap.module';
import { SpacecraftModule } from './modules/spacecraft/spacecraft.module';
import { CombatModule } from './modules/combat/combat.module';
import { AlertReactionModule } from './modules/alert-reaction/alert-reaction.module';
import { DatabaseDiscoveryPortModule } from './modules/database/database-discovery.port';
import { ResearchModule } from './modules/research/research.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { HolonetModule } from './modules/holonet/holonet.module';
import { TickModule } from './modules/tick/tick.module';
import { WebsocketModule } from './modules/websocket/websocket.module';
import { FactionModule } from './modules/faction/faction.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { ColonizationModule } from './modules/colonization/colonization.module';
import { SettingsModule } from './modules/settings/settings.module';
import { DatabaseModule } from './modules/database/database.module';
import { MailModule } from './modules/mail/mail.module';
import { EventsModule } from './modules/events/events.module';
import { OrderBroadcastModule } from './modules/order-broadcast/order-broadcast.module';
import { OrderBroadcast } from './modules/order-broadcast/entities/order-broadcast.entity';
import { OrderBroadcastAck } from './modules/order-broadcast/entities/order-broadcast-ack.entity';
import { GameStatusModule } from './modules/game-status/game-status.module';
import { User } from './modules/auth/user.entity';
import { UserLock } from './modules/auth/user-lock.entity';
import { AccountToken } from './modules/auth/account-token.entity';
import { BlockedUser } from './modules/settings/entities/blocked-user.entity';
import { DatabaseCategoryAward } from './modules/awards/entities/database-category-award.entity';
import { Colony } from './modules/colony/entities/colony.entity';
import { ColonyField } from './modules/colony/entities/colony-field.entity';
import { ColonyStorage } from './modules/colony/entities/colony-storage.entity';
import { ColonyStats } from './modules/colony/entities/colony-stats.entity';
import { ColonyChangeable } from './modules/colony/entities/colony-changeable.entity';
import { ColonyDepositMining } from './modules/colony/entities/colony-deposit-mining.entity';
import { AsteroidResourceDeposit } from './modules/colony/entities/asteroid-resource-deposit.entity';
import { ColonyShipBuildQueue } from './modules/colony/entities/colony-ship-build-queue.entity';
import { ColonyFabricationQueue } from './modules/colony/entities/colony-fabrication-queue.entity';
import { ColonyCrewTrainingQueue } from './modules/colony/entities/colony-crew-training-queue.entity';
import { ColonyShipBuildplan } from './modules/colony/entities/colony-ship-buildplan.entity';
import { ColonyOrbitAssignment } from './modules/colony/entities/colony-orbit-assignment.entity';
import { Crew } from './modules/colony/entities/crew.entity';
import { CrewAssignment } from './modules/colony/entities/crew-assignment.entity';
import { CrewSkill } from './modules/spacecraft/entities/crew-skill.entity';
import { StationScrapping } from './modules/spacecraft/entities/station-scrapping.entity';
import { Layer } from './modules/starmap/entities/layer.entity';
import { LayerKnowledge } from './modules/starmap/entities/layer-knowledge.entity';
import { LayerExploredEvent } from './modules/starmap/entities/layer-explored-event.entity';
import { StarSystem } from './modules/starmap/entities/star-system.entity';
import { CelestialObject } from './modules/starmap/entities/celestial-object.entity';
import { GalaxyFieldType } from './modules/starmap/entities/galaxy-field-type.entity';
import { GalaxyField } from './modules/starmap/entities/galaxy-field.entity';
import { SystemField } from './modules/starmap/entities/system-field.entity';
import { SpaceLocation } from './modules/starmap/entities/space-location.entity';
import { MapRegion } from './modules/starmap/entities/map-region.entity';
import { BorderType } from './modules/starmap/entities/border-type.entity';
import { ExplorationState } from './modules/starmap/entities/exploration-state.entity';
import { SystemExploration } from './modules/starmap/entities/system-exploration.entity';
import { RegionDiscovery } from './modules/starmap/entities/region-discovery.entity';
import { SystemTypeDiscovery } from './modules/starmap/entities/system-type-discovery.entity';
import { CelestialClassDiscovery } from './modules/starmap/entities/celestial-class-discovery.entity';
import { PlanetField } from './modules/starmap/entities/planet-field.entity';
import { InfluenceArea } from './modules/starmap/entities/influence-area.entity';
import { Wormhole } from './modules/starmap/entities/wormhole.entity';
import { WormholeRestriction } from './modules/spacecraft/entities/wormhole-restriction.entity';
import { HyperspaceRoute } from './modules/starmap/entities/hyperspace-route.entity';
import { HyperspaceRouteSegment } from './modules/starmap/entities/hyperspace-route-segment.entity';
import { FactionEntity } from './modules/faction/entities/faction.entity';
import { FactionModifier } from './modules/faction/entities/faction-modifier.entity';
import { OnboardingSelection } from './modules/onboarding/entities/onboarding-selection.entity';
import { Spacecraft } from './modules/spacecraft/entities/spacecraft.entity';
import { CargoItem } from './modules/spacecraft/entities/cargo-item.entity';
import { Buoy } from './modules/spacecraft/entities/buoy.entity';
import { SpacecraftModule as SpacecraftModuleEntity } from './modules/spacecraft/entities/spacecraft-module.entity';
import { SpacecraftTorpedoStorage } from './modules/spacecraft/entities/spacecraft-torpedo-storage.entity';
import { SpacecraftWreck } from './modules/spacecraft/entities/spacecraft-wreck.entity';
import { EscapePod } from './modules/spacecraft/entities/escape-pod.entity';
import { CartographyPlan } from './modules/spacecraft/entities/cartography-plan.entity';
import { FlightSignature } from './modules/spacecraft/entities/flight-signature.entity';
import { SpacecraftRepairTask } from './modules/spacecraft/entities/spacecraft-repair-task.entity';
import { StationShipRepair } from './modules/spacecraft/entities/station-ship-repair.entity';
import { DockingPrivilege } from './modules/spacecraft/entities/docking-privilege.entity';
import { ColonyScan } from './modules/spacecraft/entities/colony-scan.entity';
import { SpacecraftScanResult } from './modules/spacecraft/entities/spacecraft-scan-result.entity';
import { ShipLogEntry } from './modules/spacecraft/entities/ship-log-entry.entity';
import { ShipLogScan } from './modules/spacecraft/entities/ship-log-scan.entity';
import { LocationMining } from './modules/spacecraft/entities/location-mining.entity';
import { ShipDistressSignal } from './modules/spacecraft/entities/ship-distress-signal.entity';
import { Fleet } from './modules/spacecraft/entities/fleet.entity';
import { ShipClassDef } from './modules/spacecraft/entities/ship-class-def.entity';
import { ShipClassDiscovery } from './modules/spacecraft/entities/ship-class-discovery.entity';
import { StationClassDiscovery } from './modules/spacecraft/entities/station-class-discovery.entity';
import { AdminShipBuildplan } from './modules/spacecraft/entities/admin-ship-buildplan.entity';
import { Research } from './modules/research/entities/research.entity';
import { ResearchRewardGrant } from './modules/research/entities/research-reward-grant.entity';
import { Message } from './modules/messaging/entities/message.entity';
import { AdminBroadcastDelivery } from './modules/messaging/entities/admin-broadcast-delivery.entity';
import { HolonetPost } from './modules/holonet/entities/holonet-post.entity';
import { HolonetComment } from './modules/holonet/entities/holonet-comment.entity';
import { HolonetRating } from './modules/holonet/entities/holonet-rating.entity';
import { HolonetCheckpoint } from './modules/holonet/entities/holonet-checkpoint.entity';
import { PlotPostRequest } from './modules/holonet/entities/plot-post-request.entity';
import { GameTickState } from './modules/tick/entities/game-tick-state.entity';
import { Note } from './modules/settings/entities/note.entity';
import { UserSetting } from './modules/settings/entities/user-setting.entity';
import { ProfileVisit } from './modules/profile-visitor/entities/profile-visit.entity';
import { GameEvent } from './modules/events/entities/game-event.entity';
import { GameStatus } from './modules/game-status/entities/game-status.entity';
import { PrestigeHistoryEntry } from './modules/prestige/entities/prestige-history-entry.entity';
import { PrestigeModule } from './modules/prestige/prestige.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DashboardSnapshot } from './modules/dashboard/entities/dashboard-snapshot.entity';
import { StatisticSnapshot } from './modules/statistics/entities/statistic-snapshot.entity';
import { StatisticHourCounter } from './modules/statistics/entities/statistic-hour-counter.entity';
import { AllianceModule } from './modules/alliance/alliance.module';
import { Alliance } from './modules/alliance/entities/alliance.entity';
import { AllianceDepot } from './modules/alliance/entities/alliance-depot.entity';
import { AllianceMembership } from './modules/alliance/entities/alliance-membership.entity';
import { AllianceApplication } from './modules/alliance/entities/alliance-application.entity';
import { AllianceRelationship } from './modules/alliance/entities/alliance-relationship.entity';
import { AllianceRelationshipProposal } from './modules/alliance/entities/alliance-relationship-proposal.entity';
import { AllianceRelationshipChangeProposal } from './modules/alliance/entities/alliance-relationship-change-proposal.entity';
import { DiplomacyParty } from './modules/alliance/entities/diplomacy-party.entity';
import { AllianceChronicleEntry } from './modules/alliance/entities/alliance-chronicle-entry.entity';
import { AllianceDiplomacyChronicleEntry } from './modules/alliance/entities/alliance-diplomacy-chronicle-entry.entity';
import { AllianceAssetDeletion } from './modules/alliance/entities/alliance-asset-deletion.entity';
import { AllianceDiplomacyNotification } from './modules/alliance/entities/alliance-diplomacy-notification.entity';
import { ForumBoard } from './modules/alliance/entities/forum-board.entity';
import { ForumTopic } from './modules/alliance/entities/forum-topic.entity';
import { ForumPost } from './modules/alliance/entities/forum-post.entity';
import { validateGameTimezone } from './modules/tick/maintenance.service';
import { AwardsModule } from './modules/awards/awards.module';
import { AdminPrestigeModule } from './modules/prestige/admin-prestige.module';
import { Award } from './modules/awards/entities/award.entity';
import { UserAward } from './modules/awards/entities/user-award.entity';
import { NewsModule } from './modules/news/news.module';
import { News } from './modules/news/entities/news.entity';
import { TradeModule } from './modules/trade/trade.module';
import { TradePost } from './modules/trade/entities/trade-post.entity';
import { TradeLicenseCondition } from './modules/trade/entities/trade-license-condition.entity';
import { TradeLicense } from './modules/trade/entities/trade-license.entity';
import { TradeAccountStorage } from './modules/trade/entities/trade-account-storage.entity';
import { TradeOffer } from './modules/trade/entities/trade-offer.entity';
import { TradeTransfer } from './modules/trade/entities/trade-transfer.entity';
import { TradeTransaction } from './modules/trade/entities/trade-transaction.entity';
import { TradeShoutboxEntry } from './modules/trade/entities/trade-shoutbox-entry.entity';
import { LotteryTicket } from './modules/trade/entities/lottery-ticket.entity';
import { LotteryWinnerBuildplan } from './modules/trade/entities/lottery-winner-buildplan.entity';
import { TradeAuctionBid } from './modules/trade/entities/trade-auction-bid.entity';
import { TradeDeal } from './modules/trade/entities/trade-deal.entity';
import { BasicTradeRate } from './modules/trade/entities/basic-trade-rate.entity';
import { TutorialModule } from './modules/tutorial/tutorial.module';
import { UserTutorialProgress } from './modules/tutorial/entities/user-tutorial-progress.entity';
import { RpgModule } from './modules/rpg/rpg.module';
import { RpgPlotMember } from './modules/rpg/rpg-plot-member.entity';
import { RpgPlot } from './modules/rpg/rpg-plot.entity';
import { UserCharacter } from './modules/rpg/user-character.entity';
import { ContactModule } from './modules/contacts/contact.module';
import { Contact } from './modules/contacts/entities/contact.entity';
import { SpacecraftTakeover } from './modules/spacecraft/entities/spacecraft-takeover.entity';
import { IgnoreList } from './modules/contacts/entities/ignore-list.entity';
import { Anomaly } from './modules/anomaly/entities/anomaly.entity';
import { AnomalyType } from './modules/anomaly/entities/anomaly-type.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => {
        validateGameTimezone(config.GAME_TIMEZONE);
        return config;
      },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL'),
        entities: [
          Anomaly,
          AnomalyType,
          User,
          UserLock,
          AccountToken,
          BlockedUser,
          DatabaseCategoryAward,
          Colony,
          ColonyField,
          ColonySandbox,
          ColonyStorage,
          ColonyStats,
          ColonyChangeable,
          ColonyDepositMining,
          AsteroidResourceDeposit,
          ColonyShipBuildQueue,
          ColonyFabricationQueue,
          ColonyCrewTrainingQueue,
          ColonyShipBuildplan,
          ColonyOrbitAssignment,
          Crew,
          CrewAssignment,
          CrewSkill,
          StationScrapping,
          Layer,
          LayerKnowledge,
          LayerExploredEvent,
          StarSystem,
          CelestialObject,
          GalaxyFieldType,
          GalaxyField,
          SystemField,
          SpaceLocation,
          MapRegion,
          BorderType,
          ExplorationState,
          SystemExploration,
          RegionDiscovery,
          SystemTypeDiscovery,
          CelestialClassDiscovery,
          PlanetField,
          InfluenceArea,
          Wormhole,
          WormholeRestriction,
          HyperspaceRoute,
          HyperspaceRouteSegment,
          FactionEntity,
          FactionModifier,
          OnboardingSelection,
          Spacecraft,
          SpacecraftTakeover,
          CargoItem,
          Buoy,
          SpacecraftModuleEntity,
          SpacecraftTorpedoStorage,
          SpacecraftWreck,
          EscapePod,
          CartographyPlan,
          FlightSignature,
          SpacecraftRepairTask,
          StationShipRepair,
          DockingPrivilege,
          ColonyScan,
          SpacecraftScanResult,
          ShipLogEntry,
          ShipLogScan,
          LocationMining,
          ShipDistressSignal,
          Fleet,
          ShipClassDef,
          ShipClassDiscovery,
          StationClassDiscovery,
          AdminShipBuildplan,
          Research,
          ResearchRewardGrant,
          Message,
          AdminBroadcastDelivery,
          UserMessageFolder,
          HolonetPost,
          HolonetComment,
          HolonetRating,
          HolonetCheckpoint,
          PlotPostRequest,
          GameTickState,
          UserSetting,
          Note,
          ProfileVisit,
          GameEvent,
          GameStatus,
          OrderBroadcast,
          OrderBroadcastAck,
          PrestigeHistoryEntry,
          DashboardSnapshot,
          StatisticSnapshot,
          StatisticHourCounter,
          Alliance,
          AllianceDepot,
          AllianceMembership,
          AllianceApplication,
          DiplomacyParty,
          AllianceRelationship,
          AllianceRelationshipProposal,
          AllianceRelationshipChangeProposal,
          AllianceChronicleEntry,
          AllianceDiplomacyChronicleEntry,
          AllianceDiplomacyNotification,
          AllianceAssetDeletion,
          ForumBoard,
          ForumTopic,
          ForumPost,
          Award,
          UserAward,
          News,
          TradePost,
          TradeLicenseCondition,
          TradeLicense,
          TradeAccountStorage,
          TradeOffer,
          TradeTransfer,
          TradeTransaction,
          BasicTradeRate,
          TradeDeal,
          TradeAuctionBid,
          LotteryTicket,
          LotteryWinnerBuildplan,
          TradeShoutboxEntry,
          UserTutorialProgress,
          UserCharacter,
          RpgPlot,
          RpgPlotMember,
          Contact,
          IgnoreList,
        ],
        synchronize: config.get('TYPEORM_SYNCHRONIZE') === 'true',
        logging: config.get('NODE_ENV') !== 'production',
      }),
    }),
    GameDataModule,
    FactionModule,
    GameStatusModule,
    NewsModule,
    AccountDeletionModule,
    OrderBroadcastModule,
    AuthModule,
    OnboardingModule,
    ColonyModule,
    ColonizationModule,
    StarmapModule,
    SpacecraftModule,
    CombatModule,
    AlertReactionModule,
    DatabaseDiscoveryPortModule,
    ResearchModule,
    MessagingModule,
    HolonetModule,
    SettingsModule,
    DatabaseModule,
    MailModule,
    EventsModule,
    PrestigeModule,
    AwardsModule,
    AdminPrestigeModule,
    TradeModule,
    TutorialModule,
    RpgModule,
    ContactModule,
    DashboardModule,
    AllianceModule,
    TickModule,
    WebsocketModule,
  ],
})
export class AppModule {}
