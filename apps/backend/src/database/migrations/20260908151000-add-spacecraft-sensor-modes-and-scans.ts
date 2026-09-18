import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSpacecraftSensorModesAndScans20260908151000 implements MigrationInterface {
  name = 'AddSpacecraftSensorModesAndScans20260908151000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "spacecraft"
      ADD COLUMN IF NOT EXISTS "lssMode" varchar NOT NULL DEFAULT 'DISABLED'
    `);
    await queryRunner.query(`
      UPDATE "spacecraft"
      SET "runtimeSystems" =
        (COALESCE("runtimeSystems", '{}'::jsonb) - 'SENSORS') ||
        jsonb_build_object(
          'LONG_RANGE_SENSORS', COALESCE("runtimeSystems"->'LONG_RANGE_SENSORS', "runtimeSystems"->'SENSORS', '{"active":true,"cooldown":0,"integrity":100}'::jsonb),
          'SHORT_RANGE_SENSORS', COALESCE("runtimeSystems"->'SHORT_RANGE_SENSORS', "runtimeSystems"->'SENSORS', '{"active":true,"cooldown":0,"integrity":100}'::jsonb),
          'LIFE_SUPPORT', COALESCE("runtimeSystems"->'LIFE_SUPPORT', '{"active":true,"cooldown":0,"integrity":100}'::jsonb)
        )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "spacecraft_scan_results" (
        "id" SERIAL NOT NULL,
        "userId" integer NOT NULL,
        "spacecraftId" integer NOT NULL,
        "type" varchar(32) NOT NULL,
        "layerId" integer,
        "starSystemId" integer,
        "x" integer NOT NULL,
        "y" integer NOT NULL,
        "energyCost" integer NOT NULL,
        "cooldown" integer NOT NULL,
        "result" jsonb NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_spacecraft_scan_results" PRIMARY KEY ("id"),
        CONSTRAINT "FK_spacecraft_scan_results_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_spacecraft_scan_results_ship" FOREIGN KEY ("spacecraftId") REFERENCES "spacecraft"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_spacecraft_scan_results_user_created" ON "spacecraft_scan_results" ("userId", "createdAt")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "spacecraft_scan_results"`);
    await queryRunner.query(
      `ALTER TABLE "spacecraft" DROP COLUMN IF EXISTS "lssMode"`,
    );
  }
}
