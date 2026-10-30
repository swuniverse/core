import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTradeLicenses20261030190000 implements MigrationInterface {
  name = 'AddTradeLicenses20261030190000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "trade_license_conditions" (
        "id" SERIAL NOT NULL,
        "tradePostId" integer NOT NULL,
        "commodityId" integer NOT NULL,
        "amount" integer NOT NULL,
        "durationDays" integer NOT NULL,
        CONSTRAINT "UQ_trade_license_conditions_post" UNIQUE ("tradePostId"),
        CONSTRAINT "CHK_trade_license_conditions_amount" CHECK ("amount" >= 1),
        CONSTRAINT "CHK_trade_license_conditions_duration" CHECK ("durationDays" >= 1 AND "durationDays" <= 365),
        CONSTRAINT "PK_trade_license_conditions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_trade_license_conditions_post" FOREIGN KEY ("tradePostId") REFERENCES "trade_posts"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "trade_licenses" (
        "id" SERIAL NOT NULL,
        "tradePostId" integer NOT NULL,
        "userId" integer NOT NULL,
        "startsAt" TIMESTAMP NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "warningSentAt" TIMESTAMP,
        CONSTRAINT "UQ_trade_licenses_post_user" UNIQUE ("tradePostId", "userId"),
        CONSTRAINT "CHK_trade_licenses_expiration" CHECK ("expiresAt" > "startsAt"),
        CONSTRAINT "PK_trade_licenses" PRIMARY KEY ("id"),
        CONSTRAINT "FK_trade_licenses_post" FOREIGN KEY ("tradePostId") REFERENCES "trade_posts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_trade_licenses_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_trade_licenses_user_expiration" ON "trade_licenses" ("userId", "expiresAt")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "trade_licenses"`);
    await queryRunner.query(`DROP TABLE "trade_license_conditions"`);
  }
}
