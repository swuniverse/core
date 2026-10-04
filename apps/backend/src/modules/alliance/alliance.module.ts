import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagingModule } from '../messaging/messaging.module';
import { AllianceController } from './alliance.controller';
import { AllianceService } from './alliance.service';
import { ALLIANCE_STORE } from './alliance.store';
import { TypeOrmAllianceStore } from './typeorm-alliance.store';
import { Alliance } from './entities/alliance.entity';
import { AllianceMembership } from './entities/alliance-membership.entity';
import { AllianceApplication } from './entities/alliance-application.entity';
import { AllianceRelationship } from './entities/alliance-relationship.entity';
import { DiplomacyParty } from './entities/diplomacy-party.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Alliance,
      AllianceMembership,
      AllianceApplication,
      DiplomacyParty,
      AllianceRelationship,
    ]),
    MessagingModule,
  ],
  controllers: [AllianceController],
  providers: [
    AllianceService,
    { provide: ALLIANCE_STORE, useClass: TypeOrmAllianceStore },
  ],
  exports: [AllianceService],
})
export class AllianceModule {}
