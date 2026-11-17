import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Planeten/Monde ohne Atmosphaere (Typ E: Mondartig, Lavaplanet) haben keine
 * Polarlichter - ihre unterste Orbit-Reihe darf kein OU9E enthalten, sondern
 * rotiert durchgehend OU1E..OU4E (siehe swu-orbit.ts, buildLowerOrbitRow).
 * Bestehende Kolonien werden hier korrigiert; die Spalte ergibt sich aus der
 * Position in der unteren Orbit-Reihe (die obere Reihe steht davor).
 */
export class FixOrbitPolarLightsWithoutAtmosphere20261031120000
  implements MigrationInterface
{
  name = 'FixOrbitPolarLightsWithoutAtmosphere20261031120000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const colonies: Array<{ colonyId: number; orbitCount: string }> =
      await queryRunner.query(`
      SELECT "colonyId", COUNT(*) AS "orbitCount"
      FROM "colony_fields"
      WHERE "layer" = 'ORBIT'
      GROUP BY "colonyId"
      HAVING BOOL_OR("terrainTileId" = 'OU9E')`);

    for (const { colonyId, orbitCount } of colonies) {
      const width = Number(orbitCount) / 2;
      const fields: Array<{ fieldIndex: number; terrainTileId: string }> =
        await queryRunner.query(
          `SELECT "fieldIndex", "terrainTileId" FROM "colony_fields"
           WHERE "colonyId" = $1 AND "layer" = 'ORBIT' AND "terrainTileId" = 'OU9E'`,
          [colonyId],
        );
      const first: Array<{ min: number }> = await queryRunner.query(
        `SELECT MIN("fieldIndex") AS "min" FROM "colony_fields"
         WHERE "colonyId" = $1 AND "layer" = 'ORBIT'`,
        [colonyId],
      );
      const lowerStart = Number(first[0].min) + width;
      const replacements = new Map<number, string>();
      for (const field of fields) {
        const column = field.fieldIndex - lowerStart;
        if (column < 0) continue;
        const tile = `OU${(column % 4) + 1}E`;
        replacements.set(field.fieldIndex, tile);
        await queryRunner.query(
          `UPDATE "colony_fields" SET "terrainTileId" = $1
           WHERE "colonyId" = $2 AND "fieldIndex" = $3`,
          [tile, colonyId, field.fieldIndex],
        );
      }

      // Das Oberflaechen-Snapshot (base64-JSON) fuehrt die Orbit-Kacheln ebenfalls.
      const rows: Array<{ surfaceMask: string | null }> =
        await queryRunner.query(
          `SELECT "surfaceMask" FROM "colonies" WHERE "id" = $1`,
          [colonyId],
        );
      const mask = rows[0]?.surfaceMask;
      if (!mask) continue;
      try {
        const parsed = JSON.parse(Buffer.from(mask, 'base64').toString());
        if (!Array.isArray(parsed)) continue;
        for (const entry of parsed) {
          const tile = replacements.get(entry?.fieldIndex);
          if (tile && entry.layer === 'ORBIT') entry.terrainTileId = tile;
        }
        await queryRunner.query(
          `UPDATE "colonies" SET "surfaceMask" = $1 WHERE "id" = $2`,
          [Buffer.from(JSON.stringify(parsed)).toString('base64'), colonyId],
        );
      } catch {
        // Snapshot nicht lesbar - die Felder selbst sind korrigiert.
      }
    }
  }

  async down(): Promise<void> {
    // Die urspruenglichen OU9E-Kacheln waren ein Fehler und werden nicht wiederhergestellt.
  }
}
