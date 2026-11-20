import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * sc-AUD-13: STU `is_private`/`edited` on logbook entries and
 * `stu_spacecraft_log_scan` for foreign logbooks in scans and profiles.
 */
export class AddShipLogPrivacyAndScans1795183200000 implements MigrationInterface {
  name = 'AddShipLogPrivacyAndScans1795183200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ship_log_entries"
        ADD COLUMN IF NOT EXISTS "isPrivate" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "editedAt" timestamp NULL
    `);
    // Direct messages to another player are logged too; never expose them to third parties.
    await queryRunner.query(`
      UPDATE "ship_log_entries" SET "isPrivate" = true WHERE "body" LIKE '[DIRECT:%'
    `);
    // updatedAt equals createdAt on insert; a later value means the text was edited.
    await queryRunner.query(`
      UPDATE "ship_log_entries" SET "editedAt" = "updatedAt"
       WHERE "updatedAt" > "createdAt" + interval '1 second'
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ship_log_scans" (
        "userId" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "spacecraftId" integer NOT NULL REFERENCES "spacecraft"("id") ON DELETE CASCADE,
        "scannedAt" timestamp NOT NULL,
        PRIMARY KEY ("userId", "spacecraftId")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ship_log_scans_spacecraft" ON "ship_log_scans" ("spacecraftId")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "ship_log_scans"`);
    await queryRunner.query(`
      ALTER TABLE "ship_log_entries" DROP COLUMN IF EXISTS "editedAt", DROP COLUMN IF EXISTS "isPrivate"
    `);
  }
}
