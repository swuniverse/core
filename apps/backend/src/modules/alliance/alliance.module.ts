import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagingModule } from '../messaging/messaging.module';
import { AllianceController } from './alliance.controller';
import { AllianceService } from './alliance.service';
import { ALLIANCE_STORE } from './alliance.store';
import { TypeOrmAllianceStore } from './typeorm-alliance.store';
import { DiplomacyRateLimiterService } from './diplomacy-rate-limiter.service';
import { DiplomacyCapabilityService } from './diplomacy-capability.service';
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
import { AllianceMembership } from './entities/alliance-membership.entity';
import { AllianceApplication } from './entities/alliance-application.entity';
import { AllianceRelationship } from './entities/alliance-relationship.entity';
import { AllianceRelationshipProposal } from './entities/alliance-relationship-proposal.entity';
import { AllianceRelationshipChangeProposal } from './entities/alliance-relationship-change-proposal.entity';
import { DiplomacyParty } from './entities/diplomacy-party.entity';
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
      AllianceDiplomacyChronicleEntry,
      AllianceDiplomacyNotification,
    ]),
    MessagingModule,
  ],
  controllers: [AllianceController],
  providers: [
    AllianceService,
    {
      provide: DIPLOMACY_NOTIFICATION_RETRY,
      useExisting: AllianceService,
    },
    DiplomacyCapabilityService,
    RelationshipResolverService,
    {
      provide: PERSONAL_CONTACT_STATUS,
      useClass: NoPersonalContactStatusPort,
    },
    DiplomacyNotificationDispatcherService,
    DiplomacyRateLimiterService,
    { provide: ALLIANCE_STORE, useClass: TypeOrmAllianceStore },
  ],
  exports: [AllianceService, RelationshipResolverService],
})
export class AllianceModule {}
