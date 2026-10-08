import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDiplomacyDeliveryLeasesAndRateLimits20261006110000 implements MigrationInterface {
  name = 'AddDiplomacyDeliveryLeasesAndRateLimits20261006110000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "alliance_diplomacy_notifications"
      ADD COLUMN IF NOT EXISTS "leaseToken" varchar(36),
      ADD COLUMN IF NOT EXISTS "leaseExpiresAt" TIMESTAMP
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_alliance_diplomacy_notifications_claimable"
      ON "alliance_diplomacy_notifications" ("leaseExpiresAt", "id")
      WHERE "deliveredAt" IS NULL
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "diplomacy_rate_limits" (
        "actorId" integer NOT NULL,
        "command" varchar(16) NOT NULL,
        "windowStartedAt" TIMESTAMP NOT NULL,
        "windowExpiresAt" TIMESTAMP NOT NULL,
        "attempts" integer NOT NULL,
        CONSTRAINT "PK_diplomacy_rate_limits" PRIMARY KEY ("actorId", "command")
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "diplomacy_rate_limits"');
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_alliance_diplomacy_notifications_claimable"',
    );
    await queryRunner.query(`
      ALTER TABLE "alliance_diplomacy_notifications"
      DROP COLUMN IF EXISTS "leaseExpiresAt",
      DROP COLUMN IF EXISTS "leaseToken"
    `);
  }
}
