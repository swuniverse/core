import { sectorToFieldRange } from './onboarding-sector.util';

describe('sectorToFieldRange', () => {
  it.each([
    [0, 0, 1, 20, 1, 20],
    [1, 0, 21, 40, 1, 20],
    [5, 5, 101, 120, 101, 120],
  ])(
    'maps 0-based sector (%i,%i) to inclusive field range',
    (sectorX, sectorY, minX, maxX, minY, maxY) => {
      expect(sectorToFieldRange(sectorX, sectorY, 20)).toEqual({
        minX,
        maxX,
        minY,
        maxY,
      });
    },
  );
});
