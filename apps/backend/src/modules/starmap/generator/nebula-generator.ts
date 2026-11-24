import type { NebulaDensity } from '@swuniverse/shared';

// Visual families only: the last digit still selects the actual gameplay density.
export const NEBULA_FAMILIES = [100, 120, 140, 170] as const;
export const NEBULA_FIELD_IDS = NEBULA_FAMILIES.flatMap((base) => [
  base,
  base + 1,
  base + 2,
]);

function hash(value: string): number {
  let result = 2166136261;
  for (const character of value)
    result = Math.imul(result ^ character.charCodeAt(0), 16777619);
  result ^= result >>> 16;
  result = Math.imul(result, 0x85ebca6b);
  result ^= result >>> 13;
  result = Math.imul(result, 0xc2b2ae35);
  return (result ^ (result >>> 16)) >>> 0;
}

function random(seed: string, key: string): number {
  return hash(`${seed}:${key}`) / 4294967296;
}

function noise(seed: string, x: number, y: number): number {
  const ix = Math.floor(x),
    iy = Math.floor(y);
  const fx = x - ix,
    fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx),
    sy = fy * fy * (3 - 2 * fy);
  const a = random(seed, `${ix},${iy}`),
    b = random(seed, `${ix + 1},${iy}`);
  const c = random(seed, `${ix},${iy + 1}`),
    d = random(seed, `${ix + 1},${iy + 1}`);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/** Coordinates are selected before checking eligibility, so repeat applications cannot expand clouds. */
export function generateNebulaTerrain(
  width: number,
  height: number,
  seed: string,
  scope: 'GALAXY' | 'SYSTEM',
  density: NebulaDensity,
): Map<string, number> {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width < 1 ||
    height < 1 ||
    width * height > 1_000_000
  ) {
    throw new Error('Ungültige Kartengröße für Nebelerzeugung');
  }
  const ratio =
    scope === 'GALAXY'
      ? { SUBTLE: 0.1, BALANCED: 0.2, RICH: 0.3 }[density]
      : { SUBTLE: 0.06, BALANCED: 0.12, RICH: 0.18 }[density];
  const clouds = Array.from(
    {
      length: Math.max(
        2,
        Math.round((width * height) / (scope === 'GALAXY' ? 1200 : 200)),
      ),
    },
    (_, i) => {
      const angle = random(seed, `angle:${i}`) * Math.PI * 2;
      const edge = i % 4;
      return {
        x:
          scope === 'SYSTEM' && edge < 2
            ? (edge === 0 ? 0.12 : 0.88) * width
            : random(seed, `x:${i}`) * width,
        y:
          scope === 'SYSTEM' && edge >= 2
            ? (edge === 2 ? 0.12 : 0.88) * height
            : random(seed, `y:${i}`) * height,
        rx: Math.max(2, width * (0.045 + random(seed, `rx:${i}`) * 0.065)),
        ry: Math.max(2, height * (0.06 + random(seed, `ry:${i}`) * 0.09)),
        cos: Math.cos(angle),
        sin: Math.sin(angle),
        family:
          NEBULA_FAMILIES[hash(`${seed}:family:${i}`) % NEBULA_FAMILIES.length],
      };
    },
  );
  const cells: { x: number; y: number; score: number; family: number }[] = [];
  for (let y = 1; y <= height; y++)
    for (let x = 1; x <= width; x++) {
      let score = -Infinity,
        family: number = NEBULA_FAMILIES[0];
      const warp = (noise(seed, x * 0.19, y * 0.19) - 0.5) * 0.6;
      for (const cloud of clouds) {
        const dx = x - cloud.x,
          dy = y - cloud.y;
        const a = (dx * cloud.cos + dy * cloud.sin) / cloud.rx;
        const b = (-dx * cloud.sin + dy * cloud.cos) / cloud.ry;
        const value = 1 - Math.sqrt(a * a + b * b) + warp;
        if (value > score) {
          score = value;
          family = cloud.family;
        }
      }
      // Prefer peripheral clouds in systems, leaving the central star readable.
      if (scope === 'SYSTEM') {
        const centralDistance = Math.hypot(
          (x - width / 2) / width,
          (y - height / 2) / height,
        );
        score -= Math.max(0, 0.3 - centralDistance) * 6;
      }
      cells.push({ x, y, score, family });
    }
  cells.sort((a, b) => b.score - a.score || a.y - b.y || a.x - b.x);
  const selected = cells.slice(0, Math.ceil(width * height * ratio));
  const result = new Map<string, number>();
  selected.forEach((cell, index) => {
    // Only a small bright core; most of each cloud remains very thin.
    const percentile = index / selected.length;
    const level = percentile < 0.08 ? 2 : percentile < 0.35 ? 1 : 0;
    result.set(`${cell.x},${cell.y}`, cell.family + level);
  });
  return result;
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
