import { generateAsteroidColonySurfaceForClassId } from '../starmap/generator/swu-asteroid-biomes';

export interface AsteroidSurfaceField {
  fieldIndex: number;
  /** SWU-Felder haben keinen numerischen Gameplay-Feldtyp, die Bebaubarkeit laeuft ueber terrainTileId + Kategorien. */
  fieldType: number;
  terrainTileId: string;
  layer: 'SURFACE';
  bonusMarker: null;
  /** Startfeld-tauglich (Kategorie "standard"). */
  selectable: boolean;
}

export interface AsteroidSurfaceSnapshot {
  width: number;
  fields: AsteroidSurfaceField[];
}

/**
 * Asteroiden-Oberflaeche (6x6, nur SURFACE) aus dem SWU-Generator fuer die
 * STU-Asteroidenklassen 701-709/716-718, null bei allen anderen Klassen. Die
 * Randkacheln G9xx haben keine Feldkategorie und sind damit unbebaubar.
 */
export function buildAsteroidSurfaceSnapshot(
  classId: number | null | undefined,
  seed: string,
  categoriesForTile: (tile: string) => string[],
): AsteroidSurfaceSnapshot | null {
  if (classId == null) return null;
  const grid = generateAsteroidColonySurfaceForClassId(classId, seed);
  if (!grid) return null;
  const fields = grid.flatMap((row, y) =>
    row.map((code, x) => ({
      fieldIndex: y * row.length + x,
      fieldType: 0,
      terrainTileId: code,
      layer: 'SURFACE' as const,
      bonusMarker: null,
      selectable: categoriesForTile(code).includes('standard'),
    })),
  );
  return { width: grid[0].length, fields };
}
