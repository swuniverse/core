import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  normalizeStuTerrainType,
  stuColonySurfaceGenerator,
} from '../../modules/colony/stu-colony-surface.generator';

interface ColonyRow {
  id: number;
  colonyClassId: number;
  celestialObjectId: number | null;
  terrainSeed: string | null;
}

interface ColonyFieldRow {
  id: number;
  fieldIndex: number;
  fieldType: number;
  terrainTileId: number | null;
  buildingId: number | null;
  isBuilding: boolean;
}

export class AddColonyFieldTerrainTile20260608000000 implements MigrationInterface {
  name = 'AddColonyFieldTerrainTile20260608000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "colony_fields" ADD COLUMN IF NOT EXISTS "terrainTileId" integer',
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "colony_fields_stu_surface_backup_20260608" (
        "fieldId" integer PRIMARY KEY,
        "fieldType" integer NOT NULL,
        "terrainTileId" integer
      )`,
    );
    await queryRunner.query(
      `INSERT INTO "colony_fields_stu_surface_backup_20260608" ("fieldId", "fieldType", "terrainTileId")
       SELECT "id", "fieldType", "terrainTileId"
       FROM "colony_fields"
       ON CONFLICT ("fieldId") DO NOTHING`,
    );

    const colonies = (await queryRunner.query(`
      SELECT c."id", c."colonyClassId", c."celestialObjectId", co."terrainSeed"
      FROM "colonies" c
      LEFT JOIN "celestial_objects" co ON co."id" = c."celestialObjectId"
      ORDER BY c."id" ASC
    `)) as ColonyRow[];

    for (const colony of colonies) {
      await this.migrateColony(queryRunner, colony);
    }

    await queryRunner.query(
      'UPDATE "colony_fields" SET "terrainTileId" = "fieldType" WHERE "terrainTileId" IS NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "colony_fields" cf
       SET "fieldType" = backup."fieldType",
           "terrainTileId" = backup."terrainTileId"
       FROM "colony_fields_stu_surface_backup_20260608" backup
       WHERE backup."fieldId" = cf."id"`,
    );
    await queryRunner.query(
      'DROP TABLE IF EXISTS "colony_fields_stu_surface_backup_20260608"',
    );
    await queryRunner.query(
      'ALTER TABLE "colony_fields" DROP COLUMN IF EXISTS "terrainTileId"',
    );
  }

  private async migrateColony(
    queryRunner: QueryRunner,
    colony: ColonyRow,
  ): Promise<void> {
    const seed =
      colony.terrainSeed ??
      (colony.celestialObjectId
        ? `celestial-${colony.celestialObjectId}`
        : `colony-${colony.id}`);
    const generated = stuColonySurfaceGenerator.generate(
      colony.colonyClassId,
      seed,
      2,
    );
    const existingFields = (await queryRunner.query(
      `SELECT "id", "fieldIndex", "fieldType", "terrainTileId", "buildingId", "isBuilding"
       FROM "colony_fields"
       WHERE "colonyId" = $1`,
      [colony.id],
    )) as ColonyFieldRow[];
    const existingByIndex = new Map(
      existingFields.map((field) => [field.fieldIndex, field]),
    );

    for (const generatedField of generated.fields) {
      const normalizedFieldType = normalizeStuTerrainType(
        generatedField.fieldType,
      );
      const existing = existingByIndex.get(generatedField.fieldIndex);
      if (!existing) {
        await queryRunner.query(
          `INSERT INTO "colony_fields" (
            "colonyId", "fieldIndex", "fieldType", "terrainTileId",
            "buildingId", "isBuilding", "buildProgress", "buildFinishesAt"
          ) VALUES ($1, $2, $3, $4, NULL, false, 0, NULL)`,
          [
            colony.id,
            generatedField.fieldIndex,
            normalizedFieldType,
            generatedField.fieldType,
          ],
        );
        continue;
      }

      const hasBuilding = existing.buildingId !== null || existing.isBuilding;
      const nextFieldType = hasBuilding
        ? existing.fieldType
        : normalizedFieldType;
      const nextTerrainTileId =
        hasBuilding && existing.fieldType !== normalizedFieldType
          ? (existing.terrainTileId ?? existing.fieldType)
          : generatedField.fieldType;

      await queryRunner.query(
        `UPDATE "colony_fields"
         SET "fieldType" = $1,
             "terrainTileId" = $2
         WHERE "id" = $3`,
        [nextFieldType, nextTerrainTileId, existing.id],
      );
    }
  }
}
