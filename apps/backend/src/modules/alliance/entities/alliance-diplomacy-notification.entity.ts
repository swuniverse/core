import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Durable post-commit delivery intent for a system message caused by a
 * diplomacy transition. The body contains no confidential draft data.
 */
@Entity('alliance_diplomacy_notifications')
@Index('UQ_alliance_diplomacy_notifications_delivery_key', ['deliveryKey'], {
  unique: true,
})
export class AllianceDiplomacyNotification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  recipientUserId: number;

  @Column({ type: 'text' })
  body: string;

  /** Stable key for idempotent creation of the physical system message. */
  @Column({ type: 'varchar', length: 100 })
  deliveryKey: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date | null;
}
