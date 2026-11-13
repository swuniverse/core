import { MigrationInterface, QueryRunner } from 'typeorm';

/** tmw-T8b: auctions of Hutt Cartel deals (STU `stu_auction_bid`, `auction_user`, `auction_amount`, `taken_time`). */
export class AddTradeAuctions20261113150000 implements MigrationInterface {
  name = 'AddTradeAuctions20261113150000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "trade_deals"
        ADD "auctionUserId" integer,
        ADD "auctionAmount" integer,
        ADD "takenAt" TIMESTAMP,
        ADD CONSTRAINT "FK_trade_deals_auction_user" FOREIGN KEY ("auctionUserId") REFERENCES "users"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "CHK_trade_deals_auction_amount" CHECK ("auctionAmount" IS NULL OR "auctionAmount" > 0),
        ADD CONSTRAINT "CHK_trade_deals_auction_fields" CHECK ("auction" OR ("auctionUserId" IS NULL AND "auctionAmount" IS NULL AND "takenAt" IS NULL))
    `);
    await queryRunner.query(`
      CREATE TABLE "trade_auction_bids" (
        "id" SERIAL PRIMARY KEY,
        "dealId" integer NOT NULL,
        "userId" integer NOT NULL,
        "maxAmount" integer NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_trade_auction_bids_deal" FOREIGN KEY ("dealId") REFERENCES "trade_deals"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_trade_auction_bids_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_trade_auction_bids_max_amount" CHECK ("maxAmount" > 0)
      )
    `);
    await queryRunner.query('CREATE INDEX "IDX_trade_auction_bids_deal" ON "trade_auction_bids" ("dealId", "id")');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "trade_auction_bids"');
    await queryRunner.query(`
      ALTER TABLE "trade_deals"
        DROP CONSTRAINT "CHK_trade_deals_auction_fields",
        DROP CONSTRAINT "CHK_trade_deals_auction_amount",
        DROP CONSTRAINT "FK_trade_deals_auction_user",
        DROP COLUMN "takenAt",
        DROP COLUMN "auctionAmount",
        DROP COLUMN "auctionUserId"
    `);
  }
}
