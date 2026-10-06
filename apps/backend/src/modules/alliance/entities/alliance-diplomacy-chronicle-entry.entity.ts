import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  AllianceDiplomacyChronicleEventType,
  AllianceRelationshipType,
} from '@swuniverse/shared';

export { AllianceDiplomacyChronicleEventType } from '@swuniverse/shared';

/**
 * Append-only public snapshots of diplomacy events. Deliberately no relation
 * decorators: names and IDs remain understandable after later changes.
 */
@Entity('alliance_diplomacy_chronicle_entries')
@Index('IDX_alliance_diplomacy_chronicle_entries_first_order', [
  'firstAllianceId',
  'occurredAt',
  'id',
])
@Index('IDX_alliance_diplomacy_chronicle_entries_second_order', [
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

  @Column({ type: 'int' })
  firstAllianceId: number;

  @Column({ type: 'varchar', length: 40 })
  firstAllianceName: string;

  @Column({ type: 'int' })
  secondAllianceId: number;

  @Column({ type: 'varchar', length: 40 })
  secondAllianceName: string;

  @Column({ type: 'varchar', length: 32 })
  relationshipType: AllianceRelationshipType;

  @Column({ type: 'int', nullable: true })
  lordAllianceId: number | null;

  @Column({ type: 'int', nullable: true })
  vassalAllianceId: number | null;

  @CreateDateColumn()
  occurredAt: Date;
}
