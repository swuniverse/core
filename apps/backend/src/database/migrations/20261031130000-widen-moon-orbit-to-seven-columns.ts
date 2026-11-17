import { MigrationInterface, QueryRunner } from 'typeorm';
import { findArchetypeBySwuClassId } from '../../modules/starmap/generator/swu-archetype-registry';
import { resolveSwuInstance } from '../../modules/starmap/generator/swu-planet-archetypes.generator';
import { buildOrbitRows } from '../../modules/starmap/generator/swu-orbit';

const OLD_WIDTH = 6;
const NEW_WIDTH = 7;
const SHIFT_OFFSET = 1_000_000;

/**
 * Mond-Kolonien hatten nur 6 Orbit-Spalten (Oberflaeche: 7). Hier wird die
 * 7. Spalte ohne Reset nachgezogen: je Orbit-Reihe kommt ein Feld hinzu, die
 * Feldindizes dahinter rutschen entsprechend (untere Orbit-Reihe +1,
 * Oberflaeche/Untergrund +2). Bestehende Felder behalten ihre Zeile (Gebaeude,
 * Fortschritt etc.). Alle Orbit-Kacheln werden dabei deterministisch neu
 * erzeugt (u.a. ohne Polarlichter bei Monden ohne Atmosphaere).
 */
export class WidenMoonOrbitToSevenColumns20261031130000
  implements MigrationInterface
{
  name = 'WidenMoonOrbitToSevenColumns20261031130000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const colonies: Array<{
      id: number;
      name: string | null;
      objectType: number;
      swuRotation: 'rotating' | 'tidal-locked' | null;
      swuRing: boolean | null;
      classId: number | null;
    }> = await queryRunner.query(`
      SELECT c."id", o."name", o."objectType", o."swuRotation", o."swuRing", o."classId"
      FROM "colonies" c
      JOIN "celestial_objects" o ON o."id" = c."celestialObjectId"
      WHERE c."swuZoneSlot" IS NOT NULL AND o."objectType" = 2
        AND o."classId" >= 90000 AND o."classId" < 91000
        AND (SELECT COUNT(*) FROM "colony_fields" f
              WHERE f."colonyId" = c."id" AND f."layer" = 'ORBIT') = ${OLD_WIDTH * 2}`);

    for (const colony of colonies) {
      const archetype =
        colony.classId != null
          ? findArchetypeBySwuClassId(colony.classId)
          : null;
      if (!archetype) continue;
      const instance = resolveSwuInstance(colony);
      const rows = buildOrbitRows(
        archetype.typeId,
        archetype.variant,
        instance.bodyFeature === 'ring',
        NEW_WIDTH,
      );

      // Alles ab der unteren Orbit-Reihe aus dem Weg raeumen (Unique-Index).
      await queryRunner.query(
        `UPDATE "colony_fields" SET "fieldIndex" = "fieldIndex" + ${SHIFT_OFFSET}
         WHERE "colonyId" = $1 AND "fieldIndex" >= ${OLD_WIDTH}`,
        [colony.id],
      );
      await queryRunner.query(
        `UPDATE "colony_fields" SET "fieldIndex" = "fieldIndex" - ${SHIFT_OFFSET} + 1
         WHERE "colonyId" = $1 AND "fieldIndex" >= ${SHIFT_OFFSET} AND "layer" = 'ORBIT'`,
        [colony.id],
      );
      await queryRunner.query(
        `UPDATE "colony_fields" SET "fieldIndex" = "fieldIndex" - ${SHIFT_OFFSET} + 2
         WHERE "colonyId" = $1 AND "fieldIndex" >= ${SHIFT_OFFSET}`,
        [colony.id],
      );

      for (const fieldIndex of [OLD_WIDTH, NEW_WIDTH * 2 - 1]) {
        await queryRunner.query(
          `INSERT INTO "colony_fields"
             ("colonyId", "fieldIndex", "fieldType", "terrainTileId", "layer", "isBuilding")
           VALUES ($1, $2, 0, 'x', 'ORBIT', false)`,
          [colony.id, fieldIndex],
        );
      }

      for (let x = 0; x < NEW_WIDTH; x++) {
        await queryRunner.query(
          `UPDATE "colony_fields" SET "terrainTileId" = $1
           WHERE "colonyId" = $2 AND "fieldIndex" = $3`,
          [rows.upper[x], colony.id, x],
        );
        await queryRunner.query(
          `UPDATE "colony_fields" SET "terrainTileId" = $1
           WHERE "colonyId" = $2 AND "fieldIndex" = $3`,
          [rows.lower[x], colony.id, NEW_WIDTH + x],
        );
      }

      const fields: Array<{
        fieldIndex: number;
        fieldType: number;
        terrainTileId: string | null;
        layer: string | null;
      }> = await queryRunner.query(
        `SELECT "fieldIndex", "fieldType", "terrainTileId", "layer"
         FROM "colony_fields" WHERE "colonyId" = $1 ORDER BY "fieldIndex"`,
        [colony.id],
      );
      await queryRunner.query(
        `UPDATE "colonies" SET "surfaceMask" = $1 WHERE "id" = $2`,
        [Buffer.from(JSON.stringify(fields)).toString('base64'), colony.id],
      );
    }
  }

  async down(): Promise<void> {
    // Datenkorrektur, nicht umkehrbar.
  }
}
