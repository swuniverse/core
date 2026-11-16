import {
  drawFlightSignatures,
  signatureViewport,
} from './flight-signature-overlay';

describe('admin flight signature overlay', () => {
  it('maps the visible canvas window to clipped, one-based galaxy coordinates', () => {
    const layer = { id: 3, width: 100, height: 100 };
    expect(
      signatureViewport(
        layer,
        { viewX: 60, viewY: 90, scale: 2 },
        { width: 120, height: 120 },
        30,
      ),
    ).toEqual({ layerId: 3, xStart: 3, xEnd: 4, yStart: 4, yEnd: 5 });
    expect(
      signatureViewport(
        layer,
        { viewX: -100, viewY: -100, scale: 0.1 },
        { width: 900, height: 900 },
        30,
      ),
    ).toEqual({ layerId: 3, xStart: 1, xEnd: 100, yStart: 1, yEnd: 100 });
    expect(
      signatureViewport(
        layer,
        { viewX: 4000, viewY: 4000, scale: 1 },
        { width: 100, height: 100 },
        30,
      ),
    ).toBeNull();
  });

  it('draws one segment per populated direction from the cell center with density-based widths', () => {
    const graphics = {
      clear: vi.fn(),
      moveTo: vi.fn().mockReturnThis(),
      lineTo: vi.fn().mockReturnThis(),
      stroke: vi.fn().mockReturnThis(),
    };
    drawFlightSignatures(
      graphics,
      [
        {
          fieldId: 1,
          cx: 2,
          cy: 3,
          directions: { NORTH: 1, EAST: 5, SOUTH: 10, WEST: 21 },
        },
      ],
      30,
    );
    expect(graphics.clear).toHaveBeenCalledOnce();
    expect(graphics.moveTo.mock.calls).toEqual([
      [45, 75],
      [45, 75],
      [45, 75],
      [45, 75],
    ]);
    expect(graphics.lineTo.mock.calls).toEqual([
      [45, 60],
      [60, 75],
      [45, 90],
      [30, 75],
    ]);
    expect(
      graphics.stroke.mock.calls.map(([options]) => options.width),
    ).toEqual([1, 2, 3, 5]);
    graphics.stroke.mockClear();
    drawFlightSignatures(
      graphics,
      [
        {
          fieldId: 1,
          cx: 2,
          cy: 3,
          directions: { NORTH: 0, EAST: 0, SOUTH: 0, WEST: 0 },
        },
      ],
      30,
    );
    expect(graphics.stroke).not.toHaveBeenCalled();
  });
});
