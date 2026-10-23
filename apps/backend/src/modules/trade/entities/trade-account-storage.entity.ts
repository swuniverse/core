import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../auth/user.entity';
import { TradePost } from './trade-post.entity';

@Entity('trade_account_storage')
@Index(['tradePostId', 'userId', 'commodityId'], { unique: true })
@Index(['userId', 'commodityId'])
@Check('CHK_trade_account_storage_amount', '"amount" >= 0')
export class TradeAccountStorage {
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
  commodityId: number;

  @Column({ type: 'int', default: 0 })
  amount: number;
}
