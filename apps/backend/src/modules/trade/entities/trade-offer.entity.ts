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

@Entity('trade_offers')
@Index(['tradePostId', 'userId'])
@Index(['wantedCommodityId'])
@Index(['offeredCommodityId'])
@Check('CHK_trade_offers_count', '"offerCount" > 0')
@Check('CHK_trade_offers_wanted_amount', '"wantedAmount" > 0')
@Check('CHK_trade_offers_offered_amount', '"offeredAmount" > 0')
@Check('CHK_trade_offers_reserved_amount', '"reservedAmount" >= 0')
@Check('CHK_trade_offers_distinct_commodities', '"wantedCommodityId" <> "offeredCommodityId"')
export class TradeOffer {
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

  @Column({ type: 'int' })
  wantedCommodityId: number;

  @Column({ type: 'int' })
  wantedAmount: number;

  @Column({ type: 'int' })
  offeredCommodityId: number;

  @Column({ type: 'int' })
  offeredAmount: number;

  @Column({ type: 'int', default: 1 })
  offerCount: number;

  @Column({ type: 'int' })
  reservedAmount: number;

  @CreateDateColumn()
  createdAt: Date;
}
