import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../auth/user.entity';
import { MessageFolder } from '../message-folder';

@Entity('messages')
@Index(['recipientId', 'isRead'])
@Index(['senderId'])
@Index('UQ_messages_delivery_key', ['deliveryKey'], {
  unique: true,
  where: '"deliveryKey" IS NOT NULL',
})
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  senderId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @Column()
  recipientId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'recipientId' })
  recipient: User;

  @Column({ length: 255 })
  subject: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ default: false })
  isRead: boolean;

  @Column({ default: false })
  isSystem: boolean;

  /** Durable classification for received messages; sent messages are OUTBOX. */
  @Column({ type: 'varchar', length: 16, default: MessageFolder.PERSONAL })
  folder: MessageFolder;

  /** Optional idempotency token for durable system-message delivery. */
  @Column({ type: 'varchar', length: 100, nullable: true })
  deliveryKey: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  originKind: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  originEventType: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  originSeverity: string | null;

  @Column({ type: 'integer', nullable: true })
  originColonyId: number | null;

  @Column({ type: 'jsonb', nullable: true })
  originPayload: Record<string, unknown> | null;

  @Column({ type: 'bigint', nullable: true })
  originTickId: number | null;

  @Column({ default: false })
  deletedBySender: boolean;

  @Column({ default: false })
  deletedByRecipient: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
