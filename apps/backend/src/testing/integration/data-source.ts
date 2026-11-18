import { UserMessageFolder } from '../../modules/messaging/entities/user-message-folder.entity';
import { Research } from '../../modules/research/entities/research.entity';
import { StationScrapping } from '../../modules/spacecraft/entities/station-scrapping.entity';
import { ColonySandbox } from '../../modules/colony/entities/colony-sandbox.entity';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { User } from '../../modules/auth/user.entity';
import { Award } from '../../modules/awards/entities/award.entity';
import { UserAward } from '../../modules/awards/entities/user-award.entity';
import { FactionEntity } from '../../modules/faction/entities/faction.entity';
import { FactionModifier } from '../../modules/faction/entities/faction-modifier.entity';
import { Alliance } from '../../modules/alliance/entities/alliance.entity';
import { AllianceDepot } from '../../modules/alliance/entities/alliance-depot.entity';
import { AllianceMembership } from '../../modules/alliance/entities/alliance-membership.entity';
import { AllianceApplication } from '../../modules/alliance/entities/alliance-application.entity';
import { AllianceRelationship } from '../../modules/alliance/entities/alliance-relationship.entity';
import { AllianceRelationshipProposal } from '../../modules/alliance/entities/alliance-relationship-proposal.entity';
import { AllianceRelationshipChangeProposal } from '../../modules/alliance/entities/alliance-relationship-change-proposal.entity';
import { DiplomacyParty } from '../../modules/alliance/entities/diplomacy-party.entity';
import { AllianceChronicleEntry } from '../../modules/alliance/entities/alliance-chronicle-entry.entity';
import { AllianceDiplomacyChronicleEntry } from '../../modules/alliance/entities/alliance-diplomacy-chronicle-entry.entity';
import { AllianceAssetDeletion } from '../../modules/alliance/entities/alliance-asset-deletion.entity';
import { AllianceDiplomacyNotification } from '../../modules/alliance/entities/alliance-diplomacy-notification.entity';
import { ForumBoard } from '../../modules/alliance/entities/forum-board.entity';
import { ForumTopic } from '../../modules/alliance/entities/forum-topic.entity';
import { ForumPost } from '../../modules/alliance/entities/forum-post.entity';
import { Message } from '../../modules/messaging/entities/message.entity';
import { AdminBroadcastDelivery } from '../../modules/messaging/entities/admin-broadcast-delivery.entity';
import { Layer } from '../../modules/starmap/entities/layer.entity';
import { Contact } from '../../modules/contacts/entities/contact.entity';
import { DatabaseCategoryAward } from '../../modules/awards/entities/database-category-award.entity';
import { SystemTypeDiscovery } from '../../modules/starmap/entities/system-type-discovery.entity';
import { ShipClassDiscovery } from '../../modules/spacecraft/entities/ship-class-discovery.entity';
import { CelestialClassDiscovery } from '../../modules/starmap/entities/celestial-class-discovery.entity';
import { UserSetting } from '../../modules/settings/entities/user-setting.entity';
import { LayerKnowledge } from '../../modules/starmap/entities/layer-knowledge.entity';
import { LayerExploredEvent } from '../../modules/starmap/entities/layer-explored-event.entity';
import { ExplorationState } from '../../modules/starmap/entities/exploration-state.entity';
import { SystemExploration } from '../../modules/starmap/entities/system-exploration.entity';
import { RegionDiscovery } from '../../modules/starmap/entities/region-discovery.entity';
import { StarSystem } from '../../modules/starmap/entities/star-system.entity';
import { CelestialObject } from '../../modules/starmap/entities/celestial-object.entity';
import { GalaxyFieldType } from '../../modules/starmap/entities/galaxy-field-type.entity';
import { GalaxyField } from '../../modules/starmap/entities/galaxy-field.entity';
import { Wormhole } from '../../modules/starmap/entities/wormhole.entity';
import { WormholeRestriction } from '../../modules/spacecraft/entities/wormhole-restriction.entity';
import { SystemField } from '../../modules/starmap/entities/system-field.entity';
import { SpaceLocation } from '../../modules/starmap/entities/space-location.entity';
import { MapRegion } from '../../modules/starmap/entities/map-region.entity';
import { BorderType } from '../../modules/starmap/entities/border-type.entity';
import { Spacecraft } from '../../modules/spacecraft/entities/spacecraft.entity';
import { CargoItem } from '../../modules/spacecraft/entities/cargo-item.entity';
import { SpacecraftTorpedoStorage } from '../../modules/spacecraft/entities/spacecraft-torpedo-storage.entity';
import { ShipDistressSignal } from '../../modules/spacecraft/entities/ship-distress-signal.entity';
import { SpacecraftWreck } from '../../modules/spacecraft/entities/spacecraft-wreck.entity';
import { SpacecraftModule } from '../../modules/spacecraft/entities/spacecraft-module.entity';
import { DockingPrivilege } from '../../modules/spacecraft/entities/docking-privilege.entity';
import { EscapePod } from '../../modules/spacecraft/entities/escape-pod.entity';
import { Fleet } from '../../modules/spacecraft/entities/fleet.entity';
import { SpacecraftTakeover } from '../../modules/spacecraft/entities/spacecraft-takeover.entity';
import { FlightSignature } from '../../modules/spacecraft/entities/flight-signature.entity';
import { ShipLogEntry } from '../../modules/spacecraft/entities/ship-log-entry.entity';
import { SpacecraftRepairTask } from '../../modules/spacecraft/entities/spacecraft-repair-task.entity';
import { StationShipRepair } from '../../modules/spacecraft/entities/station-ship-repair.entity';
import { ShipClassDef } from '../../modules/spacecraft/entities/ship-class-def.entity';
import { Colony } from '../../modules/colony/entities/colony.entity';
import { ColonyField } from '../../modules/colony/entities/colony-field.entity';
import { ColonyStorage } from '../../modules/colony/entities/colony-storage.entity';
import { ColonyStats } from '../../modules/colony/entities/colony-stats.entity';
import { ColonyChangeable } from '../../modules/colony/entities/colony-changeable.entity';
import { ColonyCrewTrainingQueue } from '../../modules/colony/entities/colony-crew-training-queue.entity';
import { Crew } from '../../modules/colony/entities/crew.entity';
import { CrewAssignment } from '../../modules/colony/entities/crew-assignment.entity';
import { CrewSkill } from '../../modules/spacecraft/entities/crew-skill.entity';
import { GameStatus } from '../../modules/game-status/entities/game-status.entity';
import { GameEvent } from '../../modules/events/entities/game-event.entity';
import { CartographyPlan } from '../../modules/spacecraft/entities/cartography-plan.entity';
import { StatisticSnapshot } from '../../modules/statistics/entities/statistic-snapshot.entity';
import { StatisticHourCounter } from '../../modules/statistics/entities/statistic-hour-counter.entity';
import { News } from '../../modules/news/entities/news.entity';
import { PrestigeHistoryEntry } from '../../modules/prestige/entities/prestige-history-entry.entity';
import { Anomaly } from '../../modules/anomaly/entities/anomaly.entity';
import { AnomalyType } from '../../modules/anomaly/entities/anomaly-type.entity';
import { GameTickState } from '../../modules/tick/entities/game-tick-state.entity';
import { TradePost } from '../../modules/trade/entities/trade-post.entity';
import { TradeLicenseCondition } from '../../modules/trade/entities/trade-license-condition.entity';
import { TradeLicense } from '../../modules/trade/entities/trade-license.entity';
import { TradeAccountStorage } from '../../modules/trade/entities/trade-account-storage.entity';
import { TradeOffer } from '../../modules/trade/entities/trade-offer.entity';
import { TradeTransfer } from '../../modules/trade/entities/trade-transfer.entity';
import { TradeTransaction } from '../../modules/trade/entities/trade-transaction.entity';
import { TradeShoutboxEntry } from '../../modules/trade/entities/trade-shoutbox-entry.entity';
import { LotteryTicket } from '../../modules/trade/entities/lottery-ticket.entity';
import { LotteryWinnerBuildplan } from '../../modules/trade/entities/lottery-winner-buildplan.entity';
import { TradeAuctionBid } from '../../modules/trade/entities/trade-auction-bid.entity';
import { TradeDeal } from '../../modules/trade/entities/trade-deal.entity';
import { AdminShipBuildplan } from '../../modules/spacecraft/entities/admin-ship-buildplan.entity';
import { ColonyShipBuildplan } from '../../modules/colony/entities/colony-ship-buildplan.entity';
import { BasicTradeRate } from '../../modules/trade/entities/basic-trade-rate.entity';

/** Entities used by integration tests. Add more as suites need them. */
export const INTEGRATION_ENTITIES = [
  Research,
  User,
  Award,
  UserAward,
  FactionEntity,
  FactionModifier,
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
  Message,
  AdminBroadcastDelivery,
  UserMessageFolder,
  Layer,
  LayerKnowledge,
  UserSetting,
  Contact,
  DatabaseCategoryAward,
  SystemTypeDiscovery,
  ShipClassDiscovery,
  CelestialClassDiscovery,
  LayerExploredEvent,
  ExplorationState,
  SystemExploration,
  RegionDiscovery,
  StarSystem,
  CelestialObject,
  GalaxyFieldType,
  GalaxyField,
  Wormhole,
  WormholeRestriction,
  SystemField,
  SpaceLocation,
  MapRegion,
  BorderType,
  Spacecraft,
  StationScrapping,
  CargoItem,
  SpacecraftTorpedoStorage,
  SpacecraftModule,
  SpacecraftWreck,
  ShipDistressSignal,
  Fleet,
  SpacecraftTakeover,
  FlightSignature,
  ShipLogEntry,
  SpacecraftRepairTask,
  StationShipRepair,
  EscapePod,
  DockingPrivilege,
  ShipClassDef,
  Colony,
  ColonyField,
  ColonySandbox,
  ColonyStorage,
  ColonyStats,
  ColonyChangeable,
  ColonyCrewTrainingQueue,
  Crew,
  CrewAssignment,
  CrewSkill,
  GameStatus,
  GameEvent,
  CartographyPlan,
  StatisticSnapshot,
  StatisticHourCounter,
  News,
  PrestigeHistoryEntry,
  Anomaly,
  AnomalyType,
  GameTickState,
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
  AdminShipBuildplan,
  ColonyShipBuildplan,
];

export function createIntegrationDataSource(url: string): DataSource {
  return new DataSource({
    type: 'postgres',
    url,
    entities: INTEGRATION_ENTITIES,
    migrations: [
      join(__dirname, '../../database/migrations/[0-9]*-!(*.spec|*.test).ts'),
    ],
    synchronize: false,
    logging: false,
  });
}
