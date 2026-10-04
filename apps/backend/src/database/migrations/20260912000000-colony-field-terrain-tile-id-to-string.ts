import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Stellt "colony_fields"."terrainTileId" von integer auf varchar um, damit
 * SWU-Tile-Codes (z.B. "A540", "OU1A") direkt gespeichert werden koennen,
 * statt eine separate Zahlen-Mapping-Tabelle zu brauchen. Bestehende STU-
 * Werte (z.B. 701) werden einfach zu ihrer String-Form ("701") - "fieldType"
 * bleibt unangetastet (weiterhin integer, rein fuer Gameplay-Kategorien).
 *
 * Gleiches Muster wie bereits bei "planet_fields" durchgefuehrt, siehe
 * 20260609110000-replace-planet-field-terrain-type.ts (dort: terrainTileId
 * integer -> terrainType text).
 */
export class ColonyFieldTerrainTileIdToString20260912000000
  implements MigrationInterface
{
  name = 'ColonyFieldTerrainTileIdToString20260912000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "colony_fields"
       ALTER COLUMN "terrainTileId" TYPE varchar(32)
       USING "terrainTileId"::varchar(32)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Nur sicher rueckgaengig zu machen, wenn zwischenzeitlich keine
    // nicht-numerischen (SWU-)Werte eingetragen wurden.
    await queryRunner.query(
      `ALTER TABLE "colony_fields"
       ALTER COLUMN "terrainTileId" TYPE integer
       USING "terrainTileId"::integer`,
    );
  }
}
