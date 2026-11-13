import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../auth/user.entity';

/** STU `TradeShoutbox`: a short chat line in the shoutbox of one trade network. */
@Entity('trade_shoutbox_entries')
@Index(['networkId', 'id'])
export class TradeShoutboxEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  networkId: number;

  @Column({ type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 200 })
  message: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
