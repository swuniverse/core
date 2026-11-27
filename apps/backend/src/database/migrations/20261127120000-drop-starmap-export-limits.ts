import { MigrationInterface, QueryRunner } from 'typeorm';

// Der Spieler-Kartenexport (und sein Rate-Limit) wurde entfernt (stu-parity tmw-AUD-11).
export class DropStarmapExportLimits20261127120000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "starmap_export_limits"');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "starmap_export_limits" (
        "userId" integer NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
        "layerId" integer NOT NULL REFERENCES "layers" ("id") ON DELETE CASCADE,
        "expiresAt" TIMESTAMP NOT NULL,
        PRIMARY KEY ("userId", "layerId")
      )
    `);
  }
}
