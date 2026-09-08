import { describe, expect, it } from 'vitest';
import { buildStarTileLayers } from './starmap-render';

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
