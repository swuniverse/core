import { MigrationInterface, QueryRunner } from 'typeorm';

/** tmw-T8a: Hutt Cartel deals (STU `stu_deals`). */
export class AddTradeDeals20261113120000 implements MigrationInterface {
  name = 'AddTradeDeals20261113120000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "trade_deals" (
        "id" SERIAL PRIMARY KEY,
        "auction" boolean NOT NULL DEFAULT false,
        "amount" integer,
        "giveCommodityId" integer,
        "giveCommodityAmount" integer,
        "buildplanId" integer,
        "ship" boolean NOT NULL DEFAULT false,
        "wantCommodityId" integer,
        "wantCommodityAmount" integer,
        "wantPrestige" integer,
        "factionId" integer,
        "startsAt" TIMESTAMP NOT NULL,
        "endsAt" TIMESTAMP NOT NULL,
        "notifiedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_trade_deals_buildplan" FOREIGN KEY ("buildplanId") REFERENCES "admin_ship_buildplans"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_trade_deals_faction" FOREIGN KEY ("factionId") REFERENCES "factions"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_trade_deals_give" CHECK (("giveCommodityId" IS NULL) <> ("buildplanId" IS NULL)),
        CONSTRAINT "CHK_trade_deals_give_amount" CHECK (("giveCommodityId" IS NULL) = ("giveCommodityAmount" IS NULL) AND COALESCE("giveCommodityAmount", 1) > 0),
        CONSTRAINT "CHK_trade_deals_ship" CHECK ("ship" = false OR "buildplanId" IS NOT NULL),
        CONSTRAINT "CHK_trade_deals_want" CHECK (("wantCommodityId" IS NULL) <> ("wantPrestige" IS NULL)),
        CONSTRAINT "CHK_trade_deals_want_amount" CHECK (("wantCommodityId" IS NULL) = ("wantCommodityAmount" IS NULL) AND COALESCE("wantCommodityAmount", 1) > 0 AND COALESCE("wantPrestige", 1) > 0),
        CONSTRAINT "CHK_trade_deals_amount" CHECK ("amount" IS NULL OR "amount" > 0),
        CONSTRAINT "CHK_trade_deals_window" CHECK ("endsAt" > "startsAt")
      )
    `);
    await queryRunner.query('CREATE INDEX "IDX_trade_deals_window" ON "trade_deals" ("startsAt", "endsAt")');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "trade_deals"');
  }
}
