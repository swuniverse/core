import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  Check,
} from 'typeorm';
import { User } from '../../auth/user.entity';
import { TradePost } from './trade-post.entity';

@Entity('trade_licenses')
@Unique('UQ_trade_licenses_post_user', ['tradePostId', 'userId'])
@Check('CHK_trade_licenses_expiration', '"expiresAt" > "startsAt"')
@Index(['userId', 'expiresAt'])
export class TradeLicense {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  tradePostId: number;

  @ManyToOne(() => TradePost, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tradePostId' })
  tradePost: TradePost;

  @Column({ type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'timestamp' })
  startsAt: Date;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  warningSentAt: Date | null;
}
