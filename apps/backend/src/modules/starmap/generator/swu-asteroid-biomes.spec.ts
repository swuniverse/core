import { SWU_PLANETOID_OVERSIZED_CRATER_CODES, isPlanetoidCraterIntact } from './swu-biome-letters';
import {
  SWU_ASTEROID_BASE_FIELD,
  SWU_ASTEROID_CRATER_FIELDS,
  SWU_ASTEROID_DENSITIES,
  SWU_ASTEROID_EDGE_TILES,
  SWU_ASTEROID_SPACE_FIELDS,
  SWU_ASTEROID_TYPES,
  SWU_ASTEROID_WRECK_FIELD,
  generateAsteroidColonySurface,
  generateAsteroidColonySurfaceForClassId,
  getAsteroidStuClassId,
  getAsteroidTypeAndDensity,
  type SwuAsteroidDensity,
} from './swu-asteroid-biomes';

const edges = (tile: string) =>
  SWU_ASTEROID_EDGE_TILES[tile] ??
  (SWU_ASTEROID_SPACE_FIELDS.includes(tile) ? ['S', 'S', 'S', 'S'] : ['R', 'R', 'R', 'R']);

const count = (grid: string[][], codes: string[]) =>
  grid.flat().filter((cell) => codes.includes(cell)).length;

describe('swu-asteroid-biomes', () => {
  it('covers 4 types x 3 densities with the 12 STU asteroid classIds', () => {
    const ids = SWU_ASTEROID_TYPES.flatMap((type) =>
      SWU_ASTEROID_DENSITIES.map((density) => getAsteroidStuClassId(type, density)),
    );
    expect(ids).toEqual([701, 702, 703, 704, 705, 706, 707, 708, 709, 716, 717, 718]);
    for (const type of SWU_ASTEROID_TYPES) {
      for (const density of SWU_ASTEROID_DENSITIES) {
        expect(getAsteroidTypeAndDensity(getAsteroidStuClassId(type, density))).toEqual({
          type,
          density,
        });
      }
    }
    expect(getAsteroidTypeAndDensity(201)).toBeNull();
  });

  it('is deterministic per seed and 6x6', () => {
    const a = generateAsteroidColonySurface('ice', 'dense', 'seed-1');
    expect(a).toEqual(generateAsteroidColonySurface('ice', 'dense', 'seed-1'));
    expect(a).toHaveLength(6);
    expect(a.every((row) => row.length === 6)).toBe(true);
  });

  it('matches edges of neighbouring tiles and closes the outer border to space', () => {
    for (let i = 0; i < 25; i++) {
      for (const density of SWU_ASTEROID_DENSITIES) {
        const grid = generateAsteroidColonySurface('stone', density, `edges-${i}`);
        grid.forEach((row, y) =>
          row.forEach((tile, x) => {
            if (x < 5) expect(edges(tile)[3]).toBe(edges(row[x + 1])[2]);
            if (y < 5) expect(edges(tile)[1]).toBe(edges(grid[y + 1][x])[0]);
            if (x === 0) expect(edges(tile)[2]).toBe('S');
            if (x === 5) expect(edges(tile)[3]).toBe('S');
            if (y === 0) expect(edges(tile)[0]).toBe('S');
            if (y === 5) expect(edges(tile)[1]).toBe('S');
          }),
        );
      }
    }
  });

  it.each<[SwuAsteroidDensity, number, number]>([
    ['thin', 1, 4],
    ['medium', 3, 4],
    ['dense', 6, 9],
  ])('%s: %i craters and %i base fields inside', (density, craters, base) => {
    for (let i = 0; i < 25; i++) {
      const grid = generateAsteroidColonySurface('green', density, `inner-${i}`);
      const oversized = count(grid, SWU_PLANETOID_OVERSIZED_CRATER_CODES);
      const wreck = count(grid, [SWU_ASTEROID_WRECK_FIELD]);
      expect(count(grid, SWU_ASTEROID_CRATER_FIELDS) + oversized).toBe(craters);
      expect(count(grid, [SWU_ASTEROID_BASE_FIELD]) + wreck).toBe(base);
      expect(wreck).toBeLessThanOrEqual(1);
    }
  });

  it('places an intact oversized crater on dense fields whenever a 2x2 block fits', () => {
    const withCrater = Array.from({ length: 25 }, (_, i) =>
      generateAsteroidColonySurface('red', 'dense', `crater-${i}`),
    ).filter(isPlanetoidCraterIntact);
    expect(withCrater.length).toBeGreaterThan(0);
    for (const grid of withCrater) {
      expect(count(grid, SWU_PLANETOID_OVERSIZED_CRATER_CODES)).toBe(4);
    }
  });

  it('resolves by STU classId', () => {
    expect(generateAsteroidColonySurfaceForClassId(716, 's')).not.toBeNull();
    expect(generateAsteroidColonySurfaceForClassId(201, 's')).toBeNull();
  });
});
