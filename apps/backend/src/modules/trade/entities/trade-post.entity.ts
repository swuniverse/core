import {
  Check,
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export const TRADE_POST_DEFAULT_LEVEL = 1;
export const TRADE_POST_DEFAULT_STORAGE_LIMIT = 10_000;
export const TRADE_POST_DEFAULT_TRANSFER_CAPACITY = 200;

@Entity('trade_posts')
@Index(['networkId'])
@Index(['locationId'], { unique: true })
@Index(['stationId'], { unique: true, where: '"stationId" IS NOT NULL' })
@Check('CHK_trade_posts_network', '"networkId" > 0')
@Check('CHK_trade_posts_level', '"level" > 0')
@Check('CHK_trade_posts_storage_limit', '"storageLimit" >= 0')
@Check('CHK_trade_posts_transfer_capacity', '"transferCapacity" >= 0')
export class TradePost {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ type: 'int' })
  networkId: number;

  @Column({ type: 'int', default: TRADE_POST_DEFAULT_LEVEL })
  level: number;

  @Column({ type: 'int', default: TRADE_POST_DEFAULT_STORAGE_LIMIT })
  storageLimit: number;

  @Column({ type: 'int', default: TRADE_POST_DEFAULT_TRANSFER_CAPACITY })
  transferCapacity: number;

  /** `null` once the owner's account was deleted: the post is abandoned (tmw-T12c). */
  @Column({ type: 'int', nullable: true })
  ownerId: number | null;

  @Column({ type: 'int' })
  locationId: number;

  @Column({ type: 'int', nullable: true })
  stationId: number | null;
}
