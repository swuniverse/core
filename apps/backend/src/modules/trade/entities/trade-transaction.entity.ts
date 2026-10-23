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

@Entity('trade_transactions')
@Index(['tradePostId', 'createdAt'])
@Check('CHK_trade_transactions_wanted_amount', '"wantedAmount" > 0')
@Check('CHK_trade_transactions_offered_amount', '"offeredAmount" > 0')
export class TradeTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  tradePostId: number;

  @ManyToOne(() => TradePost, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tradePostId' })
  tradePost: TradePost;

  @Column({ type: 'int', nullable: true })
  buyerId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'buyerId' })
  buyer: User | null;

  @Column({ type: 'int', nullable: true })
  sellerId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sellerId' })
  seller: User | null;

  @Column({ type: 'int' })
  wantedCommodityId: number;

  @Column({ type: 'int' })
  wantedAmount: number;

  @Column({ type: 'int' })
  offeredCommodityId: number;

  @Column({ type: 'int' })
  offeredAmount: number;

  @CreateDateColumn()
  createdAt: Date;
}
