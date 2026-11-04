import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStarmapExportLimits20261104120000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "starmap_export_limits" (
        "userId" integer NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
        "layerId" integer NOT NULL REFERENCES "layers" ("id") ON DELETE CASCADE,
        "expiresAt" TIMESTAMP NOT NULL,
        PRIMARY KEY ("userId", "layerId")
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "starmap_export_limits"');
  }
}
