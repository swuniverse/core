import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixColonyFieldTypes20260630100000 implements MigrationInterface {
  name = 'FixColonyFieldTypes20260630100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // For fields with terrainTileId < 10000: fieldType should equal terrainTileId
    await queryRunner.query(`
      UPDATE "colony_fields"
      SET "fieldType" = "terrainTileId"
      WHERE "terrainTileId" IS NOT NULL
        AND "terrainTileId" < 10000
        AND "terrainTileId" != "fieldType"
    `);

    // For fields with terrainTileId >= 10000 (5-digit bonus tiles):
    // fieldType should be floor(terrainTileId / 100)
    await queryRunner.query(`
      UPDATE "colony_fields"
      SET "fieldType" = FLOOR("terrainTileId" / 100)
      WHERE "terrainTileId" IS NOT NULL
        AND "terrainTileId" >= 10000
        AND "terrainTileId" < 1000000
        AND "fieldType" != FLOOR("terrainTileId" / 100)
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Not reversible without storing old values
  }
}
