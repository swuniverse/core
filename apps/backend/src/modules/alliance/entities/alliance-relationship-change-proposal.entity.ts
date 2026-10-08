import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AllianceRelationship } from './alliance-relationship.entity';
import { DiplomacyParty } from './diplomacy-party.entity';

@Entity('alliance_relationship_change_proposals')
export class AllianceRelationshipChangeProposal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  relationshipId: number;

  @ManyToOne(() => AllianceRelationship, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'relationshipId' })
  relationship: AllianceRelationship;

  @Column({ type: 'int' })
  senderPartyId: number;

  @ManyToOne(() => DiplomacyParty, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderPartyId' })
  senderParty: DiplomacyParty;

  @Column({ type: 'int' })
  recipientPartyId: number;

  @ManyToOne(() => DiplomacyParty, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipientPartyId' })
  recipientParty: DiplomacyParty;

  @Column({ type: 'text', default: '' })
  contract: string;

  @Column({ type: 'boolean', default: false })
  treatAsFriend: boolean;

  @Column({ type: 'boolean', default: false })
  shareLivePositions: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
