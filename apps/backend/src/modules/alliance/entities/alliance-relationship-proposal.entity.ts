import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AllianceRelationshipType } from '@swuniverse/shared';
import { DiplomacyParty } from './diplomacy-party.entity';

@Entity('alliance_relationship_proposals')
export class AllianceRelationshipProposal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  firstPartyId: number;

  @ManyToOne(() => DiplomacyParty, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'firstPartyId' })
  firstParty: DiplomacyParty;

  @Column({ type: 'int' })
  secondPartyId: number;

  @ManyToOne(() => DiplomacyParty, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'secondPartyId' })
  secondParty: DiplomacyParty;

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

  @Column({ type: 'varchar', length: 32 })
  type: AllianceRelationshipType;

  @Column({ type: 'text', default: '' })
  contract: string;

  @Column({ type: 'boolean', default: false })
  treatAsFriend: boolean;

  @Column({ type: 'boolean', default: false })
  shareLivePositions: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
