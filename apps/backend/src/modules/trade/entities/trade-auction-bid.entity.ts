import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../auth/user.entity';
import { TradeDeal } from './trade-deal.entity';

/** STU `AuctionBid`: a maximum bid on a Hutt Cartel auction. Only the highest one holds a stake. */
@Entity('trade_auction_bids')
@Index(['dealId', 'id'])
@Check('CHK_trade_auction_bids_max_amount', '"maxAmount" > 0')
export class TradeAuctionBid {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  dealId: number;

  @ManyToOne(() => TradeDeal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dealId' })
  deal: TradeDeal;

  @Column({ type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'int' })
  maxAmount: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
