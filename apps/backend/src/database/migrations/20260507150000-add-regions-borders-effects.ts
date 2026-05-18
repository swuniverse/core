import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRegionsBordersEffects20260507150000 implements MigrationInterface {
  name = 'AddRegionsBordersEffects20260507150000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "map_regions" (
        "id" SERIAL PRIMARY KEY,
        "layerId" integer NOT NULL,
        "name" character varying(128) NOT NULL,
        "description" character varying(255),
        "colorKey" character varying(32) NOT NULL DEFAULT 'neutral',
        CONSTRAINT "FK_map_regions_layer" FOREIGN KEY ("layerId") REFERENCES "layers"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_map_regions_layer_name" ON "map_regions" ("layerId", "name")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "border_types" (
        "id" SERIAL PRIMARY KEY,
        "name" character varying(128) NOT NULL,
        "colorKey" character varying(32) NOT NULL DEFAULT 'border-default',
        "style" character varying(16) NOT NULL DEFAULT 'solid'
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_border_types_name" ON "border_types" ("name")
    `);

    await queryRunner.query(
      'ALTER TABLE "galaxy_fields" ADD COLUMN IF NOT EXISTS "regionId" integer',
    );
    await queryRunner.query(
      'ALTER TABLE "galaxy_fields" ADD COLUMN IF NOT EXISTS "borderTypeId" integer',
    );
    await queryRunner.query(
      'ALTER TABLE "galaxy_fields" ADD COLUMN IF NOT EXISTS "effects" text',
    );
    await queryRunner.query(
      'ALTER TABLE "galaxy_fields" ADD COLUMN IF NOT EXISTS "passableOverride" boolean',
    );

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_galaxy_fields_region') THEN
          ALTER TABLE "galaxy_fields"
            ADD CONSTRAINT "FK_galaxy_fields_region" FOREIGN KEY ("regionId") REFERENCES "map_regions"("id") ON DELETE SET NULL;
        END IF;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_galaxy_fields_border_type') THEN
          ALTER TABLE "galaxy_fields"
            ADD CONSTRAINT "FK_galaxy_fields_border_type" FOREIGN KEY ("borderTypeId") REFERENCES "border_types"("id") ON DELETE SET NULL;
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "galaxy_fields" DROP CONSTRAINT IF EXISTS "FK_galaxy_fields_border_type"',
    );
    await queryRunner.query(
      'ALTER TABLE "galaxy_fields" DROP CONSTRAINT IF EXISTS "FK_galaxy_fields_region"',
    );
    await queryRunner.query(
      'ALTER TABLE "galaxy_fields" DROP COLUMN IF EXISTS "passableOverride"',
    );
    await queryRunner.query(
      'ALTER TABLE "galaxy_fields" DROP COLUMN IF EXISTS "effects"',
    );
    await queryRunner.query(
      'ALTER TABLE "galaxy_fields" DROP COLUMN IF EXISTS "borderTypeId"',
    );
    await queryRunner.query(
      'ALTER TABLE "galaxy_fields" DROP COLUMN IF EXISTS "regionId"',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "border_types"');
    await queryRunner.query('DROP TABLE IF EXISTS "map_regions"');
  }
}
