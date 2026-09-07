import { MigrationInterface, QueryRunner } from 'typeorm';

type SurfaceField = {
  fieldIndex: number;
  fieldType: number;
  terrainTileId: number | null;
  layer: 'ORBIT' | 'SURFACE' | 'UNDERGROUND' | null;
};

export class RestoreMissingColonySurfaceFields20260907180000
  implements MigrationInterface
{
  name = 'RestoreMissingColonySurfaceFields20260907180000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const colonies = (await queryRunner.query(`
      SELECT c.id, c."surfaceMask"
      FROM "colonies" AS c
      WHERE NOT EXISTS (
        SELECT 1 FROM "colony_fields" AS field WHERE field."colonyId" = c.id
      )
        AND c."surfaceMask" IS NOT NULL
    `)) as Array<{ id: number; surfaceMask: string }>;

    for (const colony of colonies) {
      const fields = JSON.parse(
        Buffer.from(colony.surfaceMask, 'base64').toString('utf8'),
      ) as SurfaceField[];
      for (const field of fields) {
        await queryRunner.query(
          `INSERT INTO "colony_fields" (
            "colonyId", "fieldIndex", "fieldType", "terrainTileId", "layer",
            "buildingId", "isBuilding", "buildProgress", "isActive", "integrity",
            "maxIntegrity", "activateAfterBuild"
          ) VALUES ($1, $2, $3, $4, $5, NULL, false, 0, true, 0, 0, true)`,
          [
            colony.id,
            field.fieldIndex,
            field.fieldType,
            field.terrainTileId,
            field.layer,
          ],
        );
      }
    }
  }

  public async down(): Promise<void> {
    // Reconstructed surface fields cannot be distinguished from normal fields.
  }
}
