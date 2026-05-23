export interface SectorFieldRange {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function sectorToFieldRange(
  sectorX: number,
  sectorY: number,
  sectorSize: number,
): SectorFieldRange {
  // Sector coordinates are 0-based in the API; galaxy coordinates are 1-based.
  const minX = sectorX * sectorSize + 1;
  const minY = sectorY * sectorSize + 1;
  return {
    minX,
    maxX: minX + sectorSize - 1,
    minY,
    maxY: minY + sectorSize - 1,
  };
}
