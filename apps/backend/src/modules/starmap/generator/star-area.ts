/**
 * Star area calculation for single and binary star systems.
 * Determines exclusion zones where planets cannot be placed.
 */

export interface StarArea {
  centerX: number;
  centerY: number;
  radius: number;
  gridSize: number;
  bufferZone: number;
}

export interface StarExclusionZone {
  radius: number;
  bufferZone: number;
  totalRadius: number;
}

/**
 * Star asset grid sizes per system type ID.
 * Determines visual star size and exclusion zone calculations.
 */
const STAR_GRID_SIZES: Record<number, number> = {
  // Rare large (1041-1048): gridSize 10
  1041: 10, 1042: 10, 1043: 10, 1044: 10,
  1045: 10, 1046: 10, 1047: 10, 1048: 10,
  // Common giants (1049-1052): gridSize 5
  1049: 5, 1050: 5, 1051: 5, 1052: 5,
  // Supergiants (1053-1056): gridSize 6
  1053: 6, 1054: 6, 1055: 6, 1056: 6,
  // Dwarfs (1057-1060): gridSize 4
  1057: 4, 1058: 4, 1059: 4, 1060: 4,
  // Special small (1061-1063): gridSize 4
  1061: 4, 1062: 4, 1063: 4,
  // Medium (1064-1066): gridSize 6
  1064: 6, 1065: 6, 1066: 6,
  // Very rare small (1067-1068): gridSize 2
  1067: 2, 1068: 2,
  // Very rare medium (1069-1070): gridSize 4
  1069: 4, 1070: 4,
  // Ultra-rare large (1071-1075): gridSize 10
  1071: 10, 1072: 10, 1073: 10, 1074: 10, 1075: 10,
};

export function getStarGridSize(systemTypeId: number): number {
  return STAR_GRID_SIZES[systemTypeId] ?? 4;
}

export function calculateStarAreaSize(systemTypeId: number, systemGridSize: number): number {
  const assetGridSize = getStarGridSize(systemTypeId);
  const scaled = Math.ceil(assetGridSize / 3);
  const maxStarArea = Math.floor(systemGridSize / 6);
  return Math.min(Math.max(scaled, 2), maxStarArea);
}

export function getStarExclusionZone(systemTypeId: number, systemGridSize: number): StarExclusionZone {
  const starAreaSize = calculateStarAreaSize(systemTypeId, systemGridSize);
  const starRadius = Math.floor(starAreaSize / 2);

  let bufferZone: number;
  if (starAreaSize >= 10) bufferZone = 3;
  else if (starAreaSize >= 6) bufferZone = 2;
  else bufferZone = 2;

  return { radius: starRadius, bufferZone, totalRadius: starRadius + bufferZone };
}

export function isPositionInStarExclusionZone(
  x: number, y: number,
  centerX: number, centerY: number,
  exclusionZone: StarExclusionZone,
): boolean {
  const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
  return distance <= exclusionZone.totalRadius;
}

/**
 * Calculate binary star placement (primary top-left, secondary bottom-right).
 */
export function calculateBinaryStarAreas(
  systemGridSize: number,
  primarySystemTypeId: number,
  secondarySystemTypeId: number,
): { primary: StarArea; secondary: StarArea } {
  const gridCenter = Math.floor(systemGridSize / 2);

  const primaryStarSize = calculateStarAreaSize(primarySystemTypeId, systemGridSize);
  const secondaryStarSize = calculateStarAreaSize(secondarySystemTypeId, systemGridSize);

  const primaryRadius = Math.floor(primaryStarSize / 2);
  const secondaryRadius = Math.floor(secondaryStarSize / 2);
  const minSeparation = primaryRadius + secondaryRadius + 2;

  const primaryOffsetDistance = Math.max(3, Math.floor(minSeparation / 2));
  const primaryX = Math.max(primaryRadius + 1, gridCenter - primaryOffsetDistance);
  const primaryY = Math.max(primaryRadius + 1, gridCenter - primaryOffsetDistance);

  const secondaryOffsetDistance = Math.max(3, Math.floor(minSeparation / 2));
  const secondaryX = Math.min(systemGridSize - secondaryRadius, gridCenter + secondaryOffsetDistance);
  const secondaryY = Math.min(systemGridSize - secondaryRadius, gridCenter + secondaryOffsetDistance);

  const primaryExclusion = getStarExclusionZone(primarySystemTypeId, systemGridSize);
  const secondaryExclusion = getStarExclusionZone(secondarySystemTypeId, systemGridSize);

  return {
    primary: {
      centerX: primaryX,
      centerY: primaryY,
      radius: primaryRadius,
      gridSize: primaryStarSize,
      bufferZone: primaryExclusion.bufferZone,
    },
    secondary: {
      centerX: secondaryX,
      centerY: secondaryY,
      radius: secondaryRadius,
      gridSize: secondaryStarSize,
      bufferZone: secondaryExclusion.bufferZone,
    },
  };
}

/**
 * Check if a position is safe for planet placement (outside all star exclusion zones).
 */
export function isPositionSafeForPlanet(
  x: number, y: number,
  systemGridSize: number,
  isBinary: boolean,
  primarySystemTypeId: number,
  secondarySystemTypeId?: number,
): boolean {
  if (isBinary && secondarySystemTypeId) {
    const areas = calculateBinaryStarAreas(systemGridSize, primarySystemTypeId, secondarySystemTypeId);
    const primaryExclusion = getStarExclusionZone(primarySystemTypeId, systemGridSize);
    const secondaryExclusion = getStarExclusionZone(secondarySystemTypeId, systemGridSize);
    const safeFromPrimary = !isPositionInStarExclusionZone(x, y, areas.primary.centerX, areas.primary.centerY, primaryExclusion);
    const safeFromSecondary = !isPositionInStarExclusionZone(x, y, areas.secondary.centerX, areas.secondary.centerY, secondaryExclusion);
    return safeFromPrimary && safeFromSecondary;
  }

  const gridCenter = Math.floor(systemGridSize / 2);
  const exclusionZone = getStarExclusionZone(primarySystemTypeId, systemGridSize);
  return !isPositionInStarExclusionZone(x, y, gridCenter, gridCenter, exclusionZone);
}
