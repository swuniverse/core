import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTradeDomainModel20261023140000 implements MigrationInterface {
  name = 'AddTradeDomainModel20261023140000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "trade_posts" (
        "id" SERIAL NOT NULL,
        "name" varchar(100) NOT NULL,
        "description" text NOT NULL DEFAULT '',
        "networkId" integer NOT NULL,
        "level" integer NOT NULL DEFAULT 1,
        "storageLimit" integer NOT NULL DEFAULT 10000,
        "transferCapacity" integer NOT NULL DEFAULT 200,
        "ownerId" integer NOT NULL,
        "locationId" integer NOT NULL,
        "stationId" integer,
        CONSTRAINT "PK_trade_posts" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_trade_posts_network" CHECK ("networkId" > 0),
        CONSTRAINT "CHK_trade_posts_level" CHECK ("level" > 0),
        CONSTRAINT "CHK_trade_posts_storage_limit" CHECK ("storageLimit" >= 0),
        CONSTRAINT "CHK_trade_posts_transfer_capacity" CHECK ("transferCapacity" >= 0),
        CONSTRAINT "FK_trade_posts_owner" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_trade_posts_location" FOREIGN KEY ("locationId") REFERENCES "space_locations"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_trade_posts_station" FOREIGN KEY ("stationId") REFERENCES "spacecraft"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_trade_posts_network" ON "trade_posts" ("networkId")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_trade_posts_location" ON "trade_posts" ("locationId")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_trade_posts_station" ON "trade_posts" ("stationId") WHERE "stationId" IS NOT NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "trade_account_storage" (
        "id" SERIAL NOT NULL,
        "tradePostId" integer NOT NULL,
        "userId" integer NOT NULL,
        "commodityId" integer NOT NULL,
        "amount" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_trade_account_storage" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_trade_account_storage" UNIQUE ("tradePostId", "userId", "commodityId"),
        CONSTRAINT "CHK_trade_account_storage_amount" CHECK ("amount" >= 0),
        CONSTRAINT "FK_trade_account_storage_post" FOREIGN KEY ("tradePostId") REFERENCES "trade_posts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_trade_account_storage_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_trade_account_storage_user_commodity" ON "trade_account_storage" ("userId", "commodityId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "trade_offers" (
        "id" SERIAL NOT NULL,
        "tradePostId" integer NOT NULL,
        "userId" integer NOT NULL,
        "wantedCommodityId" integer NOT NULL,
        "wantedAmount" integer NOT NULL,
        "offeredCommodityId" integer NOT NULL,
        "offeredAmount" integer NOT NULL,
        "offerCount" integer NOT NULL DEFAULT 1,
        "reservedAmount" integer NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_trade_offers" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_trade_offers_count" CHECK ("offerCount" > 0),
        CONSTRAINT "CHK_trade_offers_wanted_amount" CHECK ("wantedAmount" > 0),
        CONSTRAINT "CHK_trade_offers_offered_amount" CHECK ("offeredAmount" > 0),
        CONSTRAINT "CHK_trade_offers_reserved_amount" CHECK ("reservedAmount" >= 0),
        CONSTRAINT "CHK_trade_offers_distinct_commodities" CHECK ("wantedCommodityId" <> "offeredCommodityId"),
        CONSTRAINT "FK_trade_offers_post" FOREIGN KEY ("tradePostId") REFERENCES "trade_posts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_trade_offers_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_trade_offers_post_user" ON "trade_offers" ("tradePostId", "userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_trade_offers_wanted" ON "trade_offers" ("wantedCommodityId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_trade_offers_offered" ON "trade_offers" ("offeredCommodityId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "trade_transfers" (
        "id" SERIAL NOT NULL,
        "sourceTradePostId" integer NOT NULL,
        "targetTradePostId" integer NOT NULL,
        "userId" integer NOT NULL,
        "commodityId" integer NOT NULL,
        "amount" integer NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_trade_transfers" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_trade_transfers_amount" CHECK ("amount" > 0),
        CONSTRAINT "CHK_trade_transfers_distinct_posts" CHECK ("sourceTradePostId" <> "targetTradePostId"),
        CONSTRAINT "FK_trade_transfers_source" FOREIGN KEY ("sourceTradePostId") REFERENCES "trade_posts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_trade_transfers_target" FOREIGN KEY ("targetTradePostId") REFERENCES "trade_posts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_trade_transfers_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_trade_transfers_source_user_date" ON "trade_transfers" ("sourceTradePostId", "userId", "createdAt")`,
    );

    await queryRunner.query(`
      CREATE TABLE "trade_transactions" (
        "id" SERIAL NOT NULL,
        "tradePostId" integer NOT NULL,
        "buyerId" integer,
        "sellerId" integer,
        "wantedCommodityId" integer NOT NULL,
        "wantedAmount" integer NOT NULL,
        "offeredCommodityId" integer NOT NULL,
        "offeredAmount" integer NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_trade_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_trade_transactions_wanted_amount" CHECK ("wantedAmount" > 0),
        CONSTRAINT "CHK_trade_transactions_offered_amount" CHECK ("offeredAmount" > 0),
        CONSTRAINT "FK_trade_transactions_post" FOREIGN KEY ("tradePostId") REFERENCES "trade_posts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_trade_transactions_buyer" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_trade_transactions_seller" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_trade_transactions_post_date" ON "trade_transactions" ("tradePostId", "createdAt")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "trade_transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trade_transfers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trade_offers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trade_account_storage"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trade_posts"`);
  }
}
