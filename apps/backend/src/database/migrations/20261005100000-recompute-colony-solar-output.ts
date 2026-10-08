import { MigrationInterface, QueryRunner } from 'typeorm';
import { findArchetypeBySwuClassId } from '../../modules/starmap/generator/swu-archetype-registry';
import { resolveSwuInstance } from '../../modules/starmap/generator/swu-planet-archetypes.generator';
import {
  computeSwuOrbitDistance,
  solarOutputTJ,
} from '../../modules/starmap/generator/swu-solar';

/**
 * Bei der Gruendung wurde das Zielobjekt ohne Sternsystem geladen, dadurch
 * fiel die Orbit-Distanz auf den neutralen Wert 0.5 zurueck und colonies.
 * "solarOutputTJ" wurde falsch gespeichert. Hier mit der echten Distanz neu
 * berechnen (Zone/Rotation/Archetyp stehen fest, siehe swu-solar.ts).
 * Betrifft nur SWU-Planeten und -Monde (objectType 1/2, SWU-classId 90xxx);
 * STU-Kolonien und alles ohne gespeicherten Solarertrag bleiben unberuehrt.
 */
export class RecomputeColonySolarOutput20261005100000
  implements MigrationInterface
{
  name = 'RecomputeColonySolarOutput20261005100000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const rows: Array<{
      id: number;
      swuZoneSlot: number;
      name: string | null;
      objectType: number;
      swuRotation: 'rotating' | 'tidal-locked' | null;
      swuRing: boolean | null;
      classId: number | null;
      posX: number;
      posY: number;
      maxX: number | null;
      maxY: number | null;
      starX: number | null;
      starY: number | null;
    }> = await queryRunner.query(`
      SELECT c."id", c."swuZoneSlot", o."name", o."objectType", o."swuRotation",
             o."swuRing", o."classId", o."posX", o."posY", s."maxX", s."maxY",
             (SELECT st."posX" FROM "celestial_objects" st
               WHERE st."systemId" = o."systemId" AND st."classId" BETWEEN 9001 AND 9005
               ORDER BY st."id" LIMIT 1) AS "starX",
             (SELECT st."posY" FROM "celestial_objects" st
               WHERE st."systemId" = o."systemId" AND st."classId" BETWEEN 9001 AND 9005
               ORDER BY st."id" LIMIT 1) AS "starY"
      FROM "colonies" c
      JOIN "celestial_objects" o ON o."id" = c."celestialObjectId"
      LEFT JOIN "star_systems" s ON s."id" = o."systemId"
      WHERE c."swuZoneSlot" IS NOT NULL AND c."solarOutputTJ" IS NOT NULL
        AND o."objectType" IN (1, 2)
        AND o."classId" >= 90000 AND o."classId" < 91000`);
    for (const row of rows) {
      const archetype =
        row.classId != null ? findArchetypeBySwuClassId(row.classId) : null;
      if (!archetype) continue;
      const instance = resolveSwuInstance({
        name: row.name,
        objectType: row.objectType,
        swuRotation: row.swuRotation,
        swuRing: row.swuRing,
      });
      const star =
        row.starX != null && row.starY != null
          ? { posX: row.starX, posY: row.starY }
          : null;
      const system =
        row.maxX != null && row.maxY != null
          ? { maxX: row.maxX, maxY: row.maxY }
          : null;
      const value = solarOutputTJ(
        computeSwuOrbitDistance(row, star, system),
        row.swuZoneSlot as 1 | 2 | 3,
        instance.rotation,
        archetype.typeId,
        archetype.variant,
      );
      await queryRunner.query(
        'UPDATE "colonies" SET "solarOutputTJ" = $1 WHERE "id" = $2',
        [value, row.id],
      );
    }
  }

  async down(): Promise<void> {
    // Datenkorrektur, nicht umkehrbar.
  }
}
