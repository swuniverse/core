/**
 * Asteroiden - Kolonie-Oberflaechen-Generator
 * ------------------------------------------------------------------
 * 4 Typen (Stein, Gruen, Rot, Eis) x 3 Dichten (duenn, mittel, dicht) = 12
 * Asteroidenfelder, entsprechend den STU-Klassen 701-709 und 716-718.
 *
 * Aufbau: ein 6x6-Feld, in dem eine Planetoid-Flaeche (Innenfelder, siehe
 * Planetoid-Regeln in swu-biome-letters.ts) von 12 Rand-Kacheln (G9A1-G9F2)
 * umschlossen wird, der Rest ist freier Weltraum (OU1E-OU4E, unterer Orbit ohne Atmosphaere). Die Rand-Kacheln
 * sind Wang-Kacheln: jede Kante ist Fels (R), Weltraum (S) oder halb Fels
 * (H1 = obere/linke Haelfte, H2 = untere/rechte Haelfte); Nachbarn muessen an
 * der gemeinsamen Kante dieselbe Art haben. Die Anschlussregeln der Kacheln
 * sind damit die Kantentabelle EDGE_TILES.
 *
 * Innenfelder je Dichte (Basis = geraeumt, G649):
 *   duenn:  1 Krater + 4 Basis        (Wrack 1/1000)
 *   mittel: 3 Krater + 4 Basis        (Wrack 1/300)
 *   dicht:  6 Krater (moeglichst ein uebergrosser 2x2) + 9 Basis (Wrack 1/150)
 * Ein Wrack (G910) ersetzt ein Basisfeld; nach der Bergung wird es zu G614.
 */

import { SeededRNG } from './seeded-rng';
import { SWU_PLANETOID_OVERSIZED_CRATER_CODES } from './swu-biome-letters';

export type SwuAsteroidType = 'stone' | 'green' | 'red' | 'ice';
export type SwuAsteroidDensity = 'thin' | 'medium' | 'dense';

export const SWU_ASTEROID_TYPES: readonly SwuAsteroidType[] = ['stone', 'green', 'red', 'ice'];
export const SWU_ASTEROID_DENSITIES: readonly SwuAsteroidDensity[] = ['thin', 'medium', 'dense'];

export const SWU_ASTEROID_SPACE_FIELDS = ['OU1E', 'OU2E', 'OU3E', 'OU4E'];
export const SWU_ASTEROID_BASE_FIELD = 'G649';
export const SWU_ASTEROID_CRATER_FIELDS = ['G614', 'G642'];
export const SWU_ASTEROID_WRECK_FIELD = 'G910';

const SIZE = 6;
const GENERATION_ATTEMPTS = 40;
const SPACE_WEIGHT_MIN = 2;
const SPACE_WEIGHT_MAX = 14;

type Edge = 'R' | 'S' | 'H1' | 'H2';
/** Kanten in der Reihenfolge [oben, unten, links, rechts]. */
type Edges = readonly [Edge, Edge, Edge, Edge];

/** Rand-Kacheln mit ihren Kanten; Namen laut Kachel-Dateien tG9<Name>.png. */
export const SWU_ASTEROID_EDGE_TILES: Record<string, Edges> = {
  G9A1: ['S', 'R', 'H2', 'H2'], // links-rechts, Fels unten
  G9A2: ['R', 'S', 'H1', 'H1'], // links-rechts, Fels oben
  G9B1: ['H1', 'S', 'H1', 'S'], // links-oben, Fels oben links
  G9B2: ['H2', 'R', 'H2', 'R'], // links-oben, Fels unten rechts
  G9C1: ['S', 'H1', 'H2', 'S'], // links-unten, Fels unten links
  G9C2: ['R', 'H2', 'H1', 'R'], // links-unten, Fels oben rechts
  G9D1: ['H1', 'H1', 'R', 'S'], // oben-unten, Fels links
  G9D2: ['H2', 'H2', 'S', 'R'], // oben-unten, Fels rechts
  G9E1: ['H1', 'R', 'R', 'H2'], // oben-rechts, Fels unten links
  G9E2: ['H2', 'S', 'S', 'H1'], // oben-rechts, Fels oben rechts
  G9F1: ['R', 'H1', 'R', 'H1'], // unten-rechts, Fels oben links
  G9F2: ['S', 'H2', 'S', 'H2'], // unten-rechts, Fels unten rechts
};

const SPACE_EDGES: Edges = ['S', 'S', 'S', 'S'];
const INNER_EDGES: Edges = ['R', 'R', 'R', 'R'];
const INNER = 'inner';
const SPACE = 'space';

const TILE_EDGES: Record<string, Edges> = {
  [SPACE]: SPACE_EDGES,
  [INNER]: INNER_EDGES,
  ...SWU_ASTEROID_EDGE_TILES,
};
const TILE_KEYS = Object.keys(TILE_EDGES);

interface DensityProfile {
  craters: number;
  base: number;
  /** Wrack-Chance pro Asteroid. */
  wreckChance: number;
}

const DENSITY_PROFILE: Record<SwuAsteroidDensity, DensityProfile> = {
  thin: { craters: 1, base: 4, wreckChance: 1 / 1000 },
  medium: { craters: 3, base: 4, wreckChance: 1 / 300 },
  dense: { craters: 6, base: 9, wreckChance: 1 / 150 },
};

/** STU-classId je Typ, Reihenfolge = [duenn, mittel, dicht]. */
const ASTEROID_STU_CLASS_IDS: Record<SwuAsteroidType, [number, number, number]> = {
  stone: [701, 702, 703],
  green: [704, 705, 706],
  red: [707, 708, 709],
  ice: [716, 717, 718],
};

const DENSITY_INDEX: Record<SwuAsteroidDensity, 0 | 1 | 2> = { thin: 0, medium: 1, dense: 2 };

export function getAsteroidStuClassId(type: SwuAsteroidType, density: SwuAsteroidDensity): number {
  return ASTEROID_STU_CLASS_IDS[type][DENSITY_INDEX[density]];
}

/** Typ + Dichte zu einer STU-Asteroiden-classId, null wenn die classId kein Asteroidenfeld ist. */
export function getAsteroidTypeAndDensity(
  classId: number,
): { type: SwuAsteroidType; density: SwuAsteroidDensity } | null {
  for (const type of SWU_ASTEROID_TYPES) {
    const index = ASTEROID_STU_CLASS_IDS[type].indexOf(classId);
    if (index >= 0) return { type, density: SWU_ASTEROID_DENSITIES[index] };
  }
  return null;
}

export function getAsteroidInnerCellCount(density: SwuAsteroidDensity): number {
  const { craters, base } = DENSITY_PROFILE[density];
  return craters + base;
}

/**
 * Legt zeilenweise ein Kachelmuster mit genau `inner` Innenfeldern. Gewaehlt
 * wird zufaellig unter den Kacheln, mit denen sich das Feld noch vollenden
 * laesst (memoisierte Machbarkeit ueber Kantenzustand der Zeile + Restmenge),
 * ein reines Zufalls-Backtracking findet die exakte Anzahl zu selten.
 */
function tileLayout(inner: number, rng: SeededRNG): string[][] | null {
  const memo = new Map<string, boolean>();

  const candidates = (index: number, bottoms: Edge[], left: Edge, innerLeft: number): string[] => {
    const x = index % SIZE;
    const y = Math.floor(index / SIZE);
    const top = y === 0 ? 'S' : bottoms[x];
    const leftEdge = x === 0 ? 'S' : left;
    return TILE_KEYS.filter((tile) => {
      const edges = TILE_EDGES[tile];
      if (edges[0] !== top || edges[2] !== leftEdge) return false;
      if (y === SIZE - 1 && edges[1] !== 'S') return false;
      if (x === SIZE - 1 && edges[3] !== 'S') return false;
      return tile !== INNER || innerLeft > 0;
    });
  };

  const canFinish = (index: number, bottoms: Edge[], left: Edge, innerLeft: number): boolean => {
    if (index === SIZE * SIZE) return innerLeft === 0;
    if (innerLeft > SIZE * SIZE - index) return false;
    const key = `${index}|${bottoms.join('')}|${left}|${innerLeft}`;
    const known = memo.get(key);
    if (known !== undefined) return known;
    const x = index % SIZE;
    const result = candidates(index, bottoms, left, innerLeft).some((tile) => {
      const edges = TILE_EDGES[tile];
      const nextBottoms = bottoms.slice();
      nextBottoms[x] = edges[1];
      return canFinish(index + 1, nextBottoms, edges[3], innerLeft - (tile === INNER ? 1 : 0));
    });
    memo.set(key, result);
    return result;
  };

  // Pro Seed unterschiedlich stark bevorzugter Weltraum: wenige Felder = dichtes
  // Gebilde, viele = kleine, gestreute Brocken mit viel freiem All dazwischen.
  const spaceWeight = rng.nextInt(SPACE_WEIGHT_MIN, SPACE_WEIGHT_MAX);
  const grid: string[][] = Array.from({ length: SIZE }, () => []);
  let bottoms: Edge[] = Array.from({ length: SIZE }, () => 'S');
  let left: Edge = 'S';
  let innerLeft = inner;
  for (let index = 0; index < SIZE * SIZE; index++) {
    const x = index % SIZE;
    const options: string[] = candidates(index, bottoms, left, innerLeft).filter((tile) => {
      const edges = TILE_EDGES[tile];
      const next = bottoms.slice();
      next[x] = edges[1];
      return canFinish(index + 1, next, edges[3], innerLeft - (tile === INNER ? 1 : 0));
    });
    if (options.length === 0) return null;
    const tile = rng.weightedChoice(
      options.map((item) => ({ item, weight: item === SPACE ? spaceWeight : 1 })),
    );
    grid[Math.floor(index / SIZE)][x] = tile;
    bottoms = bottoms.slice();
    bottoms[x] = TILE_EDGES[tile][1];
    left = TILE_EDGES[tile][3];
    if (tile === INNER) innerLeft--;
  }
  return grid;
}

/** Findet einen 2x2-Block aus Innenfeldern und markiert ihn mit den Krater-Ecken (Reihenfolge: LO, RO, LU, RU). */
function placeOversizedCrater(grid: string[][], rng: SeededRNG): boolean {
  const spots: Array<[number, number]> = [];
  for (let y = 0; y < SIZE - 1; y++) {
    for (let x = 0; x < SIZE - 1; x++) {
      if (
        grid[y][x] === INNER &&
        grid[y][x + 1] === INNER &&
        grid[y + 1][x] === INNER &&
        grid[y + 1][x + 1] === INNER
      ) {
        spots.push([x, y]);
      }
    }
  }
  if (spots.length === 0) return false;
  const [x, y] = rng.choice(spots);
  const [lo, ro, lu, ru] = SWU_PLANETOID_OVERSIZED_CRATER_CODES;
  grid[y][x] = lo;
  grid[y][x + 1] = ro;
  grid[y + 1][x] = lu;
  grid[y + 1][x + 1] = ru;
  return true;
}

function fillInnerCells(grid: string[][], density: SwuAsteroidDensity, rng: SeededRNG): void {
  const profile = DENSITY_PROFILE[density];
  let craters = profile.craters;
  if (density === 'dense' && placeOversizedCrater(grid, rng)) craters -= 4;

  const cells: Array<[number, number]> = [];
  grid.forEach((row, y) =>
    row.forEach((tile, x) => {
      if (tile === INNER) cells.push([x, y]);
    }),
  );
  rng.shuffle(cells);
  cells.forEach(([x, y], i) => {
    grid[y][x] = i < craters ? rng.choice(SWU_ASTEROID_CRATER_FIELDS) : SWU_ASTEROID_BASE_FIELD;
  });

  if (rng.nextBoolean(profile.wreckChance)) {
    const bases = cells.filter(([x, y]) => grid[y][x] === SWU_ASTEROID_BASE_FIELD);
    if (bases.length > 0) {
      const [x, y] = rng.choice(bases);
      grid[y][x] = SWU_ASTEROID_WRECK_FIELD;
    }
  }
}

/** Deterministisch aus dem Seed; dieselbe Funktion fuer Vorschau und Gruendung. */
export function generateAsteroidColonySurface(
  type: SwuAsteroidType,
  density: SwuAsteroidDensity,
  seed: string,
): string[][] {
  const inner = getAsteroidInnerCellCount(density);
  for (let attempt = 0; attempt < GENERATION_ATTEMPTS; attempt++) {
    const rng = new SeededRNG(`${seed}-${type}-${density}-${attempt}`);
    const layout = tileLayout(inner, rng);
    if (!layout) continue;
    fillInnerCells(layout, density, rng);
    return layout.map((row) =>
      row.map((tile) => (tile === SPACE ? rng.choice(SWU_ASTEROID_SPACE_FIELDS) : tile)),
    );
  }
  throw new Error(`Kein Asteroidenfeld erzeugbar (${type}/${density}, Seed: ${seed}).`);
}

/** Wie generateAsteroidColonySurface, aber ueber die STU-classId (701-709, 716-718); null bei anderen Klassen. */
export function generateAsteroidColonySurfaceForClassId(
  classId: number,
  seed: string,
): string[][] | null {
  const parsed = getAsteroidTypeAndDensity(classId);
  return parsed ? generateAsteroidColonySurface(parsed.type, parsed.density, seed) : null;
}
