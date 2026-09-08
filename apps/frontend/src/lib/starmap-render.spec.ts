import { describe, expect, it } from 'vitest';
import {
  buildStarTileLayers,
  canLoadInlineSystem,
  getInlineSystemPlacement,
  STARMAP_CELL_SIZE,
} from './starmap-render';

describe('buildStarTileLayers', () => {
  it('uses safe positions when binary star assets overlap', () => {
    const layers = buildStarTileLayers({
      system: { systemTypeId: 1024, maxX: 23, maxY: 23 },
      celestialObjects: [
        { id: 1, classId: 9001, posX: 11, posY: 11 },
        { id: 2, classId: 9002, posX: 12, posY: 12 },
      ],
    } as never);

    expect(layers).toMatchObject([
      { key: 'primary', center: { x: 8, y: 8 } },
      { key: 'secondary', center: { x: 14, y: 14 } },
    ]);
  });
});

describe('getInlineSystemPlacement', () => {
  it('contains a square grid in its anchored galaxy cell', () => {
    const placement = getInlineSystemPlacement(
      { system: { maxX: 22, maxY: 22 } } as never,
      { cx: 3, cy: 4 },
    );

    expect(placement.fieldPixelSize).toBe(STARMAP_CELL_SIZE / 24);
    expect(placement.frame).toEqual({ x: 60, y: 90, width: 30, height: 30 });
    expect(placement.grid).toEqual({
      x: 61.25,
      y: 91.25,
      width: 27.5,
      height: 27.5,
    });
  });

  it('centers a non-square grid without assuming its dimensions', () => {
    const placement = getInlineSystemPlacement(
      { system: { maxX: 20, maxY: 24 } } as never,
      { cx: 1, cy: 1 },
    );

    expect(placement.fieldPixelSize).toBe(STARMAP_CELL_SIZE / 26);
    expect(placement.grid.x).toBeCloseTo(45 / 13);
    expect(placement.grid.y).toBeCloseTo(15 / 13);
    expect(placement.grid.width).toBeCloseTo(300 / 13);
    expect(placement.grid.height).toBeCloseTo(360 / 13);
  });
});

describe('canLoadInlineSystem', () => {
  it('rejects map-only systems', () => {
    expect(canLoadInlineSystem({ isMapOnly: true })).toBe(false);
    expect(canLoadInlineSystem({ isMapOnly: false })).toBe(true);
  });
});
