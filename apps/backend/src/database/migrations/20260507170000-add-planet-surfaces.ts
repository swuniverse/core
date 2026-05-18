import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlanetSurfaces20260507170000 implements MigrationInterface {
  name = 'AddPlanetSurfaces20260507170000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "celestial_objects" ADD COLUMN IF NOT EXISTS "planetClass" character varying(32)',
    );
    await queryRunner.query(
      'ALTER TABLE "celestial_objects" ADD COLUMN IF NOT EXISTS "surfaceWidth" integer',
    );
    await queryRunner.query(
      'ALTER TABLE "celestial_objects" ADD COLUMN IF NOT EXISTS "surfaceHeight" integer',
    );
    await queryRunner.query(
      'ALTER TABLE "celestial_objects" ADD COLUMN IF NOT EXISTS "terrainSeed" character varying(64)',
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "planet_fields" (
        "id" SERIAL PRIMARY KEY,
        "celestialObjectId" integer NOT NULL,
        "fieldLayer" character varying(16) NOT NULL,
        "px" integer NOT NULL,
        "py" integer NOT NULL,
        "terrainType" character varying(64) NOT NULL,
        "buildingId" integer,
        "isBuildable" boolean NOT NULL DEFAULT true,
        "resourceModifier" integer NOT NULL DEFAULT 0,
        CONSTRAINT "FK_planet_fields_object" FOREIGN KEY ("celestialObjectId") REFERENCES "celestial_objects"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_planet_fields_object_layer_pos"
        ON "planet_fields" ("celestialObjectId", "fieldLayer", "px", "py")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_planet_fields_object_layer"
        ON "planet_fields" ("celestialObjectId", "fieldLayer")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "planet_fields"');
    await queryRunner.query(
      'ALTER TABLE "celestial_objects" DROP COLUMN IF EXISTS "terrainSeed"',
    );
    await queryRunner.query(
      'ALTER TABLE "celestial_objects" DROP COLUMN IF EXISTS "surfaceHeight"',
    );
    await queryRunner.query(
      'ALTER TABLE "celestial_objects" DROP COLUMN IF EXISTS "surfaceWidth"',
    );
    await queryRunner.query(
      'ALTER TABLE "celestial_objects" DROP COLUMN IF EXISTS "planetClass"',
    );
  }
}
