import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReplacePlanetFieldTerrainType20260609110000 implements MigrationInterface {
  name = 'ReplacePlanetFieldTerrainType20260609110000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "planet_fields" ADD COLUMN IF NOT EXISTS "fieldType" integer',
    );
    await queryRunner.query(
      'ALTER TABLE "planet_fields" ADD COLUMN IF NOT EXISTS "terrainTileId" integer',
    );
    const hasTerrainType = await queryRunner.hasColumn(
      'planet_fields',
      'terrainType',
    );

    if (hasTerrainType) {
      await queryRunner.query(`
        UPDATE "planet_fields"
        SET
          "terrainTileId" = COALESCE(
            "terrainTileId",
            CASE
              WHEN "terrainType" ~ '^[0-9]+$' THEN "terrainType"::integer
              ELSE 900
            END
          ),
          "fieldType" = COALESCE(
            "fieldType",
            CASE
              WHEN "terrainType" ~ '^[0-9]+$' THEN "terrainType"::integer
              ELSE 900
            END
          )
        WHERE "terrainTileId" IS NULL OR "fieldType" IS NULL
      `);
    } else {
      await queryRunner.query(`
        UPDATE "planet_fields"
        SET
          "terrainTileId" = COALESCE("terrainTileId", "fieldType", 900),
          "fieldType" = COALESCE("fieldType", "terrainTileId", 900)
        WHERE "terrainTileId" IS NULL OR "fieldType" IS NULL
      `);
    }
    await queryRunner.query(
      'ALTER TABLE "planet_fields" ALTER COLUMN "fieldType" SET NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "planet_fields" ALTER COLUMN "terrainTileId" SET NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "planet_fields" DROP COLUMN IF EXISTS "terrainType"',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "planet_fields" ADD COLUMN IF NOT EXISTS "terrainType" character varying(64)',
    );
    await queryRunner.query(
      'UPDATE "planet_fields" SET "terrainType" = "terrainTileId"::text WHERE "terrainType" IS NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "planet_fields" ALTER COLUMN "terrainType" SET NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "planet_fields" DROP COLUMN IF EXISTS "terrainTileId"',
    );
    await queryRunner.query(
      'ALTER TABLE "planet_fields" DROP COLUMN IF EXISTS "fieldType"',
    );
  }
}
