import { generateFilmicNebulaTerrain, FILMIC_NEBULA_FIELD_IDS, type NebulaDensity } from '@swuniverse/shared';
export const NEBULA_FIELD_IDS = FILMIC_NEBULA_FIELD_IDS;
export function generateNebulaTerrain(width: number, height: number, seed: string, scope: 'GALAXY' | 'SYSTEM', density: NebulaDensity): Map<string, number> {
  if (scope !== 'GALAXY') throw new Error('Nebel werden ausschließlich auf der Galaxiekarte erzeugt');
  return generateFilmicNebulaTerrain({version:2,seed,width,height,density});
}

export function protectRadius(
  protectedCoordinates: Set<string>,
  x: number,
  y: number,
  radius: number,
): void {
  for (let dy = -radius; dy <= radius; dy++)
    for (let dx = -radius; dx <= radius; dx++) {
      protectedCoordinates.add(`${x + dx},${y + dy}`);
    }
}

/** Matches the straight/control-point polyline used by the galaxy route overlay. */
export function protectRoute(
  protectedCoordinates: Set<string>,
  points: { x: number; y: number }[],
): void {
  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1],
      to = points[i];
    const steps = Math.ceil(
      Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y)) * 2,
    );
    for (let step = 0; step <= steps; step++) {
      const fraction = steps === 0 ? 0 : step / steps;
      protectRadius(
        protectedCoordinates,
        Math.round(from.x + (to.x - from.x) * fraction),
        Math.round(from.y + (to.y - from.y) * fraction),
        1,
      );
    }
  }
}
