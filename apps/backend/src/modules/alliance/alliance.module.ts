import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebsocketModule } from '../websocket/websocket.module';
import { GameGateway } from '../websocket/game.gateway';
import { ONLINE_PLAYERS } from './online-players.port';
import { MessagingModule } from '../messaging/messaging.module';
import { AllianceController } from './alliance.controller';
import { AllianceService } from './alliance.service';
import { MemberOverviewService } from './member-overview.service';
import { MEMBER_OPERATIONS_READER } from './member-operations.port';
import { TypeOrmMemberOperationsReader } from './typeorm-member-operations.reader';
import { ColonyModule } from '../colony/colony.module';
import { ALLIANCE_STORE } from './alliance.store';
import { ForumService } from './forum.service';
import { FORUM_STORE } from './forum.store';
import { TypeOrmForumStore } from './typeorm-forum.store';
import { TypeOrmAllianceStore } from './typeorm-alliance.store';
import { AllianceRateLimiterService } from './alliance-rate-limiter.service';
import {
  NoPersonalContactStatusPort,
  PERSONAL_CONTACT_STATUS,
  RelationshipResolverService,
} from './relationship-resolver.service';
import {
  DIPLOMACY_NOTIFICATION_RETRY,
  DiplomacyNotificationDispatcherService,
} from './diplomacy-notification-dispatcher.service';
import { Alliance } from './entities/alliance.entity';
import { ForumBoard } from './entities/forum-board.entity';
import { ForumTopic } from './entities/forum-topic.entity';
import { ForumPost } from './entities/forum-post.entity';
import { AllianceMembership } from './entities/alliance-membership.entity';
import { AllianceApplication } from './entities/alliance-application.entity';
import { AllianceRelationship } from './entities/alliance-relationship.entity';
import { AllianceRelationshipProposal } from './entities/alliance-relationship-proposal.entity';
import { AllianceRelationshipChangeProposal } from './entities/alliance-relationship-change-proposal.entity';
import { DiplomacyParty } from './entities/diplomacy-party.entity';
import { AllianceChronicleEntry } from './entities/alliance-chronicle-entry.entity';
import { AllianceDiplomacyChronicleEntry } from './entities/alliance-diplomacy-chronicle-entry.entity';
import { AllianceDiplomacyNotification } from './entities/alliance-diplomacy-notification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
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
      ForumBoard,
      ForumTopic,
      ForumPost,
    ]),
    MessagingModule,
    WebsocketModule,
    ColonyModule,
  ],
  controllers: [AllianceController],
  providers: [
    AllianceService,
    MemberOverviewService,
    {
      provide: MEMBER_OPERATIONS_READER,
      useClass: TypeOrmMemberOperationsReader,
    },
    {
      provide: DIPLOMACY_NOTIFICATION_RETRY,
      useExisting: AllianceService,
    },
    RelationshipResolverService,
    {
      provide: PERSONAL_CONTACT_STATUS,
      useClass: NoPersonalContactStatusPort,
    },
    DiplomacyNotificationDispatcherService,
    AllianceRateLimiterService,
    {
      provide: ONLINE_PLAYERS,
      inject: [GameGateway],
      useFactory: (gateway: GameGateway) => ({
        onlineUserIds: () => gateway.onlineUserIds,
      }),
    },
    { provide: ALLIANCE_STORE, useClass: TypeOrmAllianceStore },
    ForumService,
    { provide: FORUM_STORE, useClass: TypeOrmForumStore },
  ],
  exports: [AllianceService, ForumService, RelationshipResolverService],
})
export class AllianceModule {}
