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

@Entity('alliance_relationships')
export class AllianceRelationship {
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

  @Column({ type: 'varchar', length: 32 })
  type: AllianceRelationshipType;

  @CreateDateColumn()
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  endedAt: Date | null;

  @Column({ type: 'text', default: '' })
  contract: string;

  @Column({ type: 'boolean', default: false })
  treatAsFriend: boolean;

  @Column({ type: 'boolean', default: false })
  shareLivePositions: boolean;

  @Column({ type: 'int', nullable: true })
  lordPartyId: number | null;

  @ManyToOne(() => DiplomacyParty, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'lordPartyId' })
  lordParty: DiplomacyParty | null;

  @Column({ type: 'int', nullable: true })
  vassalPartyId: number | null;

  @ManyToOne(() => DiplomacyParty, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'vassalPartyId' })
  vassalParty: DiplomacyParty | null;
}
