import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * STU grants the builder of a player trade post a permanent license
 * (`StationUtility::createTradepostAndLicense`); the list of issued licenses is
 * visible to license holders only (tmw-AUD-10). Backfills owners of existing
 * player posts without a valid license; NPC and abandoned posts stay untouched.
 */
export class OwnerTradeLicenses20261127110000 implements MigrationInterface {
  name = 'OwnerTradeLicenses20261127110000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const now = new Date(); // bound as a parameter so the driver applies the app's timestamp convention
    await queryRunner.query(`
      INSERT INTO "trade_licenses" ("tradePostId", "userId", "startsAt", "expiresAt", "warningSentAt")
      SELECT p."id", p."ownerId", $1::timestamp, $2::timestamp, NULL
      FROM "trade_posts" p
      WHERE p."stationId" IS NOT NULL AND p."ownerId" IS NOT NULL
      ON CONFLICT ("tradePostId", "userId") DO UPDATE
        SET "expiresAt" = EXCLUDED."expiresAt", "warningSentAt" = NULL
        WHERE "trade_licenses"."expiresAt" <= $1::timestamp
    `, [now, new Date('9999-12-31T23:59:59.000Z')]);
  }

  async down(): Promise<void> {
    // The permanent owner licenses are valid data; nothing to undo.
  }
}
