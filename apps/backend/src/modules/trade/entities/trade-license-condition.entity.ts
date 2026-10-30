import {
  Check,
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TradePost } from './trade-post.entity';

@Entity('trade_license_conditions')
@Check('CHK_trade_license_conditions_amount', '"amount" >= 1')
@Check(
  'CHK_trade_license_conditions_duration',
  '"durationDays" >= 1 AND "durationDays" <= 365',
)
export class TradeLicenseCondition {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', unique: true })
  tradePostId: number;

  @OneToOne(() => TradePost, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tradePostId' })
  tradePost: TradePost;

  @Column({ type: 'int' })
  commodityId: number;

  @Column({ type: 'int' })
  amount: number;

  @Column({ type: 'int' })
  durationDays: number;
}
