import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  AllianceDiplomacyChronicleEndReason,
  AllianceDiplomacyChronicleEventType,
  AllianceRelationshipType,
  DiplomacyPartyType,
} from '@swuniverse/shared';

export { AllianceDiplomacyChronicleEventType } from '@swuniverse/shared';

/**
 * Append-only public snapshots of diplomacy events. Deliberately no relation
 * decorators: names and IDs remain understandable after later changes.
 *
 * The `*AllianceId` columns keep their historical names; with a party type of
 * PLAYER they hold a user ID.
 */
@Entity('alliance_diplomacy_chronicle_entries')
@Index('IDX_alliance_diplomacy_chronicle_entries_first_order', [
  'firstPartyType',
  'firstAllianceId',
  'occurredAt',
  'id',
])
@Index('IDX_alliance_diplomacy_chronicle_entries_second_order', [
  'secondPartyType',
  'secondAllianceId',
  'occurredAt',
  'id',
])
export class AllianceDiplomacyChronicleEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 32 })
  eventType: AllianceDiplomacyChronicleEventType;

  @Column({ type: 'int', nullable: true })
  actorUserId: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  actorName: string | null;

  @Column({ type: 'varchar', length: 16, default: DiplomacyPartyType.ALLIANCE })
  firstPartyType: DiplomacyPartyType;

  @Column({ type: 'int' })
  firstAllianceId: number;

  @Column({ type: 'varchar', length: 255 })
  firstAllianceName: string;

  @Column({ type: 'varchar', length: 16, default: DiplomacyPartyType.ALLIANCE })
  secondPartyType: DiplomacyPartyType;

  @Column({ type: 'int' })
  secondAllianceId: number;

  @Column({ type: 'varchar', length: 255 })
  secondAllianceName: string;

  @Column({ type: 'varchar', length: 32 })
  relationshipType: AllianceRelationshipType;

  @Column({ type: 'varchar', length: 16, default: DiplomacyPartyType.ALLIANCE })
  lordPartyType: DiplomacyPartyType;

  @Column({ type: 'int', nullable: true })
  lordAllianceId: number | null;

  @Column({ type: 'varchar', length: 16, default: DiplomacyPartyType.ALLIANCE })
  vassalPartyType: DiplomacyPartyType;

  @Column({ type: 'int', nullable: true })
  vassalAllianceId: number | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  endReason: AllianceDiplomacyChronicleEndReason | null;

  @CreateDateColumn()
  occurredAt: Date;
}
