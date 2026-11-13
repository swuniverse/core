import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBasicTradeRates20261113100000 implements MigrationInterface {
  name = 'AddBasicTradeRates20261113100000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "basic_trade_rates" (
        "id" SERIAL PRIMARY KEY,
        "networkId" integer NOT NULL,
        "commodityId" integer NOT NULL,
        "buySell" smallint NOT NULL,
        "value" integer NOT NULL,
        "rateId" varchar(36) NOT NULL UNIQUE,
        "userId" integer,
        "dateMs" bigint NOT NULL,
        CONSTRAINT "FK_basic_trade_rates_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_basic_trade_rates_latest" ON "basic_trade_rates" ("networkId", "commodityId", "dateMs" DESC, "id" DESC)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "basic_trade_rates"');
  }
}
