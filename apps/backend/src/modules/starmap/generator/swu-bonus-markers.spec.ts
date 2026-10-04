import { generateSwuBonusMarkers, isSwuBonusMarkerUsable } from './swu-bonus-markers';

const classify = (tile: string): string[] =>
  ({
    S: ['standard'],
    M: ['bergbau'],
    W: ['wasser_alles'],
    G: ['geothermal'],
    H990: [],
  })[tile] ?? [];

const surface = Array.from({ length: 10 }, (_, y) =>
  Array.from({ length: 6 }, (_, x) => ['S', 'M', 'W', 'G'][(x + y) % 4]),
);
const underground = [Array(6).fill('S'), Array(6).fill('S')];

const gasSurface = Array.from({ length: 10 }, () => Array(6).fill('H990'));
const gasUnder = [Array(6).fill('G'), Array(6).fill('G')];

describe('generateSwuBonusMarkers', () => {
  it('caps gas planets at 2 markers in total and ENERGY only on storm/geothermal', () => {
    for (let i = 0; i < 300; i++) {
      const markers = generateSwuBonusMarkers({ surface: gasSurface, untergrund: gasUnder, typeId: 15, seed: `x${i}`, classify });
      expect(markers.length).toBeLessThanOrEqual(2);
      for (const m of markers) {
        if (m.type === 'ENERGY') {
          expect(m.layer === 'SURFACE' ? 'H990' : 'G').toBe(m.layer === 'SURFACE' ? gasSurface[m.y][m.x] : gasUnder[m.y][m.x]);
        }
      }
    }
  });

  it('is deterministic and capped at 2 per layer', () => {
    const run = () =>
      generateSwuBonusMarkers({ surface, untergrund: underground, typeId: 1, seed: 'a', classify });
    expect(run()).toEqual(run());
    expect(run().length).toBeLessThanOrEqual(2);
    expect(run().every((m) => m.layer === 'SURFACE')).toBe(true);
  });

  it('only places markers on eligible tiles', () => {
    for (let i = 0; i < 200; i++) {
      for (const m of generateSwuBonusMarkers({ surface, typeId: 1, seed: `s${i}`, classify })) {
        const tile = surface[m.y][m.x];
        if (m.type === 'KYBER' || m.type === 'PHRIK') expect(tile).toBe('M');
        if (m.type === 'FERTILE') expect(tile).toBe('S');
        if (m.type === 'FERTILE_WATER') expect(tile).toBe('W');
        if (m.type === 'ENERGY') expect(['W', 'G']).toContain(tile);
        if (m.type === 'ATTRACTIVE') expect(tile).toBe('S');
      }
    }
  });

  it('adds underground markers for gas planets only', () => {
    const layers = new Set<string>();
    for (let i = 0; i < 200; i++) {
      for (const m of generateSwuBonusMarkers({ surface: gasSurface, untergrund: gasUnder, typeId: 15, seed: `g${i}`, classify })) layers.add(m.layer);
    }
    expect(layers.has('UNDERGROUND')).toBe(true);
    for (let i = 0; i < 50; i++) {
      expect(generateSwuBonusMarkers({ surface, untergrund: gasUnder, typeId: 1, seed: `n${i}`, classify }).every((m) => m.layer === 'SURFACE')).toBe(true);
    }
  });
});

describe('isSwuBonusMarkerUsable', () => {
  it('greys out a marker whose tile no longer fits (jellyfish on landfill)', () => {
    expect(isSwuBonusMarkerUsable('FERTILE_WATER', 'W', ['wasser_alles'])).toBe(true);
    expect(isSwuBonusMarkerUsable('FERTILE_WATER', 'S', ['standard'])).toBe(false);
    expect(isSwuBonusMarkerUsable('FERTILE', 'S', ['standard'])).toBe(true);
    expect(isSwuBonusMarkerUsable('ENERGY', 'H990', [])).toBe(true);
    expect(isSwuBonusMarkerUsable('ENERGY', 'H910', [])).toBe(false);
  });
});

describe('atmosphere-less archetypes', () => {
  it('Mondartig (Planetoid) only gets Kyber or Phrik markers', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) {
      for (const m of generateSwuBonusMarkers({ surface, typeId: 12, seed: `p${i}`, classify })) seen.add(m.type);
    }
    expect([...seen].every((t) => t === 'KYBER' || t === 'PHRIK')).toBe(true);
    expect(seen.size).toBeGreaterThan(0);
  });

  it('Lava, Giftwelt and Gas never get farm or housing markers', () => {
    for (const typeId of [13, 14, 15]) {
      for (let i = 0; i < 200; i++) {
        for (const m of generateSwuBonusMarkers({ surface, typeId, seed: `l${typeId}-${i}`, classify })) {
          expect(['KYBER', 'PHRIK', 'ENERGY']).toContain(m.type);
        }
      }
    }
  });
});
