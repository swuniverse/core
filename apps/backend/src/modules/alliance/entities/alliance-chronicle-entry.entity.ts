import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AllianceChronicleEventType } from '@swuniverse/shared';
import { User } from '../../auth/user.entity';
import { Alliance } from './alliance.entity';

/**
 * Immutable internal alliance history. Actor and subject references are
 * nulled on account deletion; the names as of the event time remain.
 */
@Entity('alliance_chronicle_entries')
@Index('IDX_alliance_chronicle_entries_order', [
  'allianceId',
  'occurredAt',
  'id',
])
export class AllianceChronicleEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  allianceId: number;

  @ManyToOne(() => Alliance, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'allianceId' })
  alliance: Alliance;

  @Column({ type: 'varchar', length: 32 })
  eventType: AllianceChronicleEventType;

  @Column({ type: 'int', nullable: true })
  actorUserId: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'actorUserId' })
  actor: User | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  actorName: string | null;

  @Column({ type: 'int', nullable: true })
  subjectUserId: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'subjectUserId' })
  subject: User | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  subjectName: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  occurredAt: Date;
}
