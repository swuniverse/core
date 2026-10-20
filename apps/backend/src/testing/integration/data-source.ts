import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { User } from '../../modules/auth/user.entity';
import { FactionEntity } from '../../modules/faction/entities/faction.entity';
import { FactionModifier } from '../../modules/faction/entities/faction-modifier.entity';
import { Alliance } from '../../modules/alliance/entities/alliance.entity';
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
import { Layer } from '../../modules/starmap/entities/layer.entity';
import { StarSystem } from '../../modules/starmap/entities/star-system.entity';
import { CelestialObject } from '../../modules/starmap/entities/celestial-object.entity';
import { GalaxyFieldType } from '../../modules/starmap/entities/galaxy-field-type.entity';
import { GalaxyField } from '../../modules/starmap/entities/galaxy-field.entity';
import { SystemField } from '../../modules/starmap/entities/system-field.entity';
import { SpaceLocation } from '../../modules/starmap/entities/space-location.entity';
import { MapRegion } from '../../modules/starmap/entities/map-region.entity';
import { BorderType } from '../../modules/starmap/entities/border-type.entity';
import { Spacecraft } from '../../modules/spacecraft/entities/spacecraft.entity';
import { CargoItem } from '../../modules/spacecraft/entities/cargo-item.entity';
import { SpacecraftTorpedoStorage } from '../../modules/spacecraft/entities/spacecraft-torpedo-storage.entity';
import { SpacecraftModule } from '../../modules/spacecraft/entities/spacecraft-module.entity';
import { Fleet } from '../../modules/spacecraft/entities/fleet.entity';
import { ShipClassDef } from '../../modules/spacecraft/entities/ship-class-def.entity';
import { Colony } from '../../modules/colony/entities/colony.entity';
import { ColonyField } from '../../modules/colony/entities/colony-field.entity';
import { ColonyStorage } from '../../modules/colony/entities/colony-storage.entity';
import { ColonyStats } from '../../modules/colony/entities/colony-stats.entity';
import { ColonyChangeable } from '../../modules/colony/entities/colony-changeable.entity';
import { ColonyCrewTrainingQueue } from '../../modules/colony/entities/colony-crew-training-queue.entity';
import { Crew } from '../../modules/colony/entities/crew.entity';
import { CrewAssignment } from '../../modules/colony/entities/crew-assignment.entity';
import { GameStatus } from '../../modules/game-status/entities/game-status.entity';
import { GameEvent } from '../../modules/events/entities/game-event.entity';
import { CartographyPlan } from '../../modules/spacecraft/entities/cartography-plan.entity';
import { StatisticSnapshot } from '../../modules/statistics/entities/statistic-snapshot.entity';
import { StatisticHourCounter } from '../../modules/statistics/entities/statistic-hour-counter.entity';

/** Entities used by integration tests. Add more as suites need them. */
export const INTEGRATION_ENTITIES = [
  User,
  FactionEntity,
  FactionModifier,
  Alliance,
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
  Layer,
  StarSystem,
  CelestialObject,
  GalaxyFieldType,
  GalaxyField,
  SystemField,
  SpaceLocation,
  MapRegion,
  BorderType,
  Spacecraft,
  CargoItem,
  SpacecraftTorpedoStorage,
  SpacecraftModule,
  Fleet,
  ShipClassDef,
  Colony,
  ColonyField,
  ColonyStorage,
  ColonyStats,
  ColonyChangeable,
  ColonyCrewTrainingQueue,
  Crew,
  CrewAssignment,
  GameStatus,
  GameEvent,
  CartographyPlan,
  StatisticSnapshot,
  StatisticHourCounter,
];

export function createIntegrationDataSource(url: string): DataSource {
  return new DataSource({
    type: 'postgres',
    url,
    entities: INTEGRATION_ENTITIES,
    migrations: [join(__dirname, '../../database/migrations/*.ts')],
    synchronize: false,
    logging: false,
  });
}
