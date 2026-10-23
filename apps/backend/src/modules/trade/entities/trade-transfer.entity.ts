import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../auth/user.entity';
import { TradePost } from './trade-post.entity';

@Entity('trade_transfers')
@Index(['sourceTradePostId', 'userId', 'createdAt'])
@Check('CHK_trade_transfers_amount', '"amount" > 0')
@Check('CHK_trade_transfers_distinct_posts', '"sourceTradePostId" <> "targetTradePostId"')
export class TradeTransfer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  sourceTradePostId: number;

  @ManyToOne(() => TradePost, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sourceTradePostId' })
  sourceTradePost: TradePost;

  @Column({ type: 'int' })
  targetTradePostId: number;

  @ManyToOne(() => TradePost, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'targetTradePostId' })
  targetTradePost: TradePost;

  @Column({ type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'int' })
  commodityId: number;

  @Column({ type: 'int' })
  amount: number;

  @CreateDateColumn()
  createdAt: Date;
}
