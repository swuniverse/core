import type { AdminFlightSignatureFieldDto } from '@swuniverse/shared';
import type { SignatureViewport } from '../../stores/admin-signature.store';

interface SignatureGraphics {
  clear(): unknown;
  moveTo(x: number, y: number): SignatureGraphics;
  lineTo(x: number, y: number): SignatureGraphics;
  stroke(style: { color: number; width: number; alpha: number }): unknown;
}

export function signatureViewport(
  layer: { id: number; width: number; height: number },
  view: { viewX: number; viewY: number; scale: number },
  screen: { width: number; height: number },
  cell: number,
): SignatureViewport | null {
  const xStart = Math.max(1, Math.floor(view.viewX / cell) + 1);
  const yStart = Math.max(1, Math.floor(view.viewY / cell) + 1);
  const xEnd = Math.min(
    layer.width,
    Math.ceil((view.viewX + screen.width / view.scale) / cell),
  );
  const yEnd = Math.min(
    layer.height,
    Math.ceil((view.viewY + screen.height / view.scale) / cell),
  );
  return xStart > xEnd || yStart > yEnd
    ? null
    : { layerId: layer.id, xStart, xEnd, yStart, yEnd };
}

export function drawFlightSignatures(
  graphics: SignatureGraphics,
  fields: AdminFlightSignatureFieldDto[],
  cell: number,
) {
  graphics.clear();
  for (const field of fields) {
    const x = (field.cx - 0.5) * cell;
    const y = (field.cy - 0.5) * cell;
    const offsets = {
      NORTH: [0, -cell / 2],
      EAST: [cell / 2, 0],
      SOUTH: [0, cell / 2],
      WEST: [-cell / 2, 0],
    } as const;
    for (const direction of ['NORTH', 'EAST', 'SOUTH', 'WEST'] as const) {
      const count = field.directions[direction];
      if (count <= 0) continue;
      const width =
        count === 1 ? 1 : count < 6 ? 2 : count < 11 ? 3 : count < 21 ? 4 : 5;
      const [dx, dy] = offsets[direction];
      graphics
        .moveTo(x, y)
        .lineTo(x + dx, y + dy)
        .stroke({ color: 0xc2b942, width, alpha: 0.9 });
    }
  }
}
