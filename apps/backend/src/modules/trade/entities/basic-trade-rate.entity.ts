import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** One basic trade rate of a faction network and commodity (STU `BasicTrade`). */
/** Indexed by network, commodity and recency in the migration. */
@Entity('basic_trade_rates')
export class BasicTradeRate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  networkId: number;

  @Column({ type: 'int' })
  commodityId: number;

  /** Modifier of the trade that produced this rate: buy −10, sell +10, seed 0. */
  @Column({ type: 'smallint' })
  buySell: number;

  /** Goods per 100 Aurodium. */
  @Column({ type: 'int' })
  value: number;

  /** Public id that pins a trade to the rate the player saw. */
  @Column({ type: 'varchar', length: 36, unique: true })
  rateId: string;

  @Column({ type: 'int', nullable: true })
  userId: number | null;

  /** Epoch milliseconds, stored as bigint. */
  @Column({ type: 'bigint', transformer: { to: (value: number) => value, from: (value: string) => Number(value) } })
  dateMs: number;
}
