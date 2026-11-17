/**
 * Kuppeln: Overlay ueber Basisfeld und Gebaeude. Nur auf geraeumten Kratern
 * (Planeten ohne Atmosphaere) baubar; fertig behandelt das Feld wie ein
 * "standard"-Feld mit Atmosphaere.
 */
export const DOME_TERRAIN_TILES = [
  'G612',
  'G6A2',
  'G6B2',
  'G6C2',
  'G6D2',
] as const;

/** Durastahl-Legierung (21) und Transparistahl (4). */
export const DOME_COSTS: ReadonlyArray<{
  commodityId: number;
  amount: number;
}> = [
  { commodityId: 21, amount: 20 },
  { commodityId: 4, amount: 20 },
];

export const DOME_BUILD_SECONDS = 60 * 60;

export function isDomeTerrainTile(
  terrainTileId: string | null | undefined,
): boolean {
  return (
    terrainTileId != null &&
    (DOME_TERRAIN_TILES as readonly string[]).includes(terrainTileId)
  );
}
