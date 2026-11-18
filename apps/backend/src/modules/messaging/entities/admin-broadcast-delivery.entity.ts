import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { User } from '../../auth/user.entity';

/** Claims each email once even when admin requests overlap or are retried. */
@Entity('admin_broadcast_deliveries')
export class AdminBroadcastDelivery {
  @PrimaryColumn({ type: 'uuid' })
  broadcastId: string;

  @PrimaryColumn({ type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ default: false })
  sent: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
