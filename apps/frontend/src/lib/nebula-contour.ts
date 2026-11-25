import type { CSSProperties } from 'react';
import { renderNebulaContourMask } from '@swuniverse/shared';
import { isNebulaTerrain, type TerrainFieldType } from './map-terrain';

const masks = new Map<string, { canvas: HTMLCanvasElement; url?: string }>();

/** Use only the caller's visible neighbors; a hidden field always counts as outside. */
export function getOrganicNebulaMaskCanvas(
  type: TerrainFieldType,
  x: number,
  y: number,
  neighbors: (TerrainFieldType | undefined)[],
) {
  if (type.key === 'UNKNOWN' || !isNebulaTerrain(type)) return undefined;
  let code = 0;
  for (let i = 0; i < 8; i++) {
    const neighbor = neighbors[i];
    if (!neighbor || neighbor.key === 'UNKNOWN' || !isNebulaTerrain(neighbor))
      code |= 1 << i;
  }
  if (!code) return undefined;
  const key = `${code}:${x},${y}`;
  const old = masks.get(key);
  if (old) {
    masks.delete(key);
    masks.set(key, old);
    return old;
  }
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 30;
  const context = canvas.getContext('2d');
  if (!context?.createImageData || !context.putImageData) return undefined;
  const image = context.createImageData(30, 30);
  image.data.set(renderNebulaContourMask(code, 30, 30, x - 1, y - 1));
  context.putImageData(image, 0, 0);
  const value: { canvas: HTMLCanvasElement; url?: string } = { canvas };
  masks.set(key, value);
  if (masks.size > 256) masks.delete(masks.keys().next().value!);
  return value;
}

export function organicNebulaEdgeMask(
  type: TerrainFieldType,
  x: number,
  y: number,
  neighbors: (TerrainFieldType | undefined)[],
): CSSProperties | undefined {
  const mask = getOrganicNebulaMaskCanvas(type, x, y, neighbors);
  if (!mask) return undefined;
  mask.url ??= mask.canvas.toDataURL('image/png');
  return {
    maskImage: `url(${mask.url})`,
    maskSize: '100% 100%',
    maskRepeat: 'no-repeat',
  };
}
