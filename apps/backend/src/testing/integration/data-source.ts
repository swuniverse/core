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
