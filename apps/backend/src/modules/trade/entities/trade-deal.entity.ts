import { Check, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * STU `Deals`: a time-limited Hutt Cartel offer. It gives a commodity, a ship
 * from an admin buildplan or a copy of that buildplan, against a commodity
 * (usually Aurodium) or prestige. Auctions (tmw-T8b) share the table.
 */
@Entity('trade_deals')
@Index(['startsAt', 'endsAt'])
@Check('CHK_trade_deals_give', '("giveCommodityId" IS NULL) <> ("buildplanId" IS NULL)')
@Check('CHK_trade_deals_give_amount', '("giveCommodityId" IS NULL) = ("giveCommodityAmount" IS NULL) AND COALESCE("giveCommodityAmount", 1) > 0')
@Check('CHK_trade_deals_ship', '"ship" = false OR "buildplanId" IS NOT NULL')
@Check('CHK_trade_deals_want', '("wantCommodityId" IS NULL) <> ("wantPrestige" IS NULL)')
@Check('CHK_trade_deals_want_amount', '("wantCommodityId" IS NULL) = ("wantCommodityAmount" IS NULL) AND COALESCE("wantCommodityAmount", 1) > 0 AND COALESCE("wantPrestige", 1) > 0')
@Check('CHK_trade_deals_amount', '"amount" IS NULL OR "amount" > 0')
@Check('CHK_trade_deals_window', '"endsAt" > "startsAt"')
export class TradeDeal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'boolean', default: false })
  auction: boolean;

  /** Remaining takes; `null` is unlimited. A sold-out deal is deleted like in STU. */
  @Column({ type: 'int', nullable: true })
  amount: number | null;

  @Column({ type: 'int', nullable: true })
  giveCommodityId: number | null;

  @Column({ type: 'int', nullable: true })
  giveCommodityAmount: number | null;

  @Column({ type: 'int', nullable: true })
  buildplanId: number | null;

  /** With a buildplan: `true` gives a ship built from it, `false` a copy of the plan. */
  @Column({ type: 'boolean', default: false })
  ship: boolean;

  @Column({ type: 'int', nullable: true })
  wantCommodityId: number | null;

  @Column({ type: 'int', nullable: true })
  wantCommodityAmount: number | null;

  @Column({ type: 'int', nullable: true })
  wantPrestige: number | null;

  @Column({ type: 'int', nullable: true })
  factionId: number | null;

  @Column({ type: 'timestamp' })
  startsAt: Date;

  @Column({ type: 'timestamp' })
  endsAt: Date;

  /** Auctions: the current highest bidder (STU `auction_user`). */
  @Column({ type: 'int', nullable: true })
  auctionUserId: number | null;

  /** Auctions: the current price (STU `auction_amount`). */
  @Column({ type: 'int', nullable: true })
  auctionAmount: number | null;

  /** Auctions: when the winner claimed the prize (STU `taken_time`). */
  @Column({ type: 'timestamp', nullable: true })
  takenAt: Date | null;

  /** Set once licensed players were told about the started deal. */
  @Column({ type: 'timestamp', nullable: true })
  notifiedAt: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
