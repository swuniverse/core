import {
  generateNebulaTerrain,
  NEBULA_FIELD_IDS,
  protectRadius,
  protectRoute,
} from './nebula-generator';

describe('nebula terrain generator', () => {
  it('reproduces a seed and selects only the three gentle density levels', () => {
    const first = generateNebulaTerrain(
      120,
      120,
      'swu-nebula-v1',
      'GALAXY',
      'BALANCED',
    );
    expect([...first]).toEqual([
      ...generateNebulaTerrain(120, 120, 'swu-nebula-v1', 'GALAXY', 'BALANCED'),
    ]);
    expect(first.size / (120 * 120)).toBeGreaterThan(0.1);
    expect(first.size / (120 * 120)).toBeLessThan(0.5);
    expect(
      [...first.values()].every((id) => NEBULA_FIELD_IDS.includes(id)),
    ).toBe(true);
    expect([...first]).not.toEqual([
      ...generateNebulaTerrain(120, 120, 'another-seed', 'GALAXY', 'BALANCED'),
    ]);
  });

  it('creates clustered clouds rather than isolated random cells', () => {
    const terrain = generateNebulaTerrain(
      120,
      120,
      'swu-nebula-v1',
      'GALAXY',
      'BALANCED',
    );
    const adjacent = [...terrain.keys()].filter((key) => {
      const [x, y] = key.split(',').map(Number);
      return [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ].some(([a, b]) => terrain.has(`${a},${b}`));
    });
    expect(adjacent.length / terrain.size).toBeGreaterThan(0.95);
  });

  it('supports small rectangular galaxies and nested density profiles without out-of-bounds cells', () => {
    for (const [width, height] of [
      [1, 1],
      [3, 7],
      [22, 22],
    ]) {
      const subtle = generateNebulaTerrain(
        width,
        height,
        'galaxy:9',
        'GALAXY',
        'SUBTLE',
      );
      const rich = generateNebulaTerrain(
        width,
        height,
        'galaxy:9',
        'GALAXY',
        'RICH',
      );
      expect(rich.size).toBeGreaterThanOrEqual(subtle.size);
      for (const key of subtle.keys()) expect(rich.has(key)).toBe(true);
      for (const key of rich.keys()) {
        const [x, y] = key.split(',').map(Number);
        expect(x).toBeGreaterThanOrEqual(1);
        expect(x).toBeLessThanOrEqual(width);
        expect(y).toBeGreaterThanOrEqual(1);
        expect(y).toBeLessThanOrEqual(height);
      }
    }
    expect(() => generateNebulaTerrain(0, 4, 'x', 'GALAXY', 'RICH')).toThrow();
    expect(() => generateNebulaTerrain(22, 22, 'x', 'SYSTEM', 'RICH')).toThrow();
  });

  it('protects full route segments, control points and safety radii', () => {
    const protectedCoordinates = new Set<string>();
    protectRoute(protectedCoordinates, [
      { x: 1, y: 2 },
      { x: 6, y: 2 },
      { x: 6, y: 6 },
    ]);
    for (let x = 1; x <= 6; x++)
      for (let y = 1; y <= 3; y++)
        expect(protectedCoordinates.has(`${x},${y}`)).toBe(true);
    protectRadius(protectedCoordinates, 20, 20, 2);
    expect(protectedCoordinates.has('18,22')).toBe(true);
    expect(protectedCoordinates.has('17,22')).toBe(false);
  });
  it('distributes nebulae across both halves of small and large galaxies', () => {
    for (const size of [40, 120]) {
      const fields = generateNebulaTerrain(size, size, 'swu-nebula-v1:GALAXY:13', 'GALAXY', 'BALANCED');
      const top = [...fields.keys()].filter(key => Number(key.split(',')[1]) <= size / 2).length;
      expect(top / fields.size).toBeGreaterThan(.15);
      expect(top / fields.size).toBeLessThan(.85);
    }
  });

});
