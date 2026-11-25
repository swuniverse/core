import type { CSSProperties } from 'react';
import type { Texture } from 'pixi.js';
import {
  nebulaCloudSignature,
  renderNebulaCloudField,
  type NebulaCloudIndex,
} from '@swuniverse/shared';

interface CloudCanvas {
  canvas: HTMLCanvasElement;
  url?: string;
  texture?: Texture;
}
const fields = new Map<string, CloudCanvas | null>();

export function getNebulaCloudCanvas(
  index: NebulaCloudIndex,
  x: number,
  y: number,
): CloudCanvas | undefined {
  const key = nebulaCloudSignature(index, x, y);
  if (!key) return undefined;
  if (fields.has(key)) {
    const old = fields.get(key) ?? null;
    fields.delete(key);
    fields.set(key, old);
    return old ?? undefined;
  }
  const raster = renderNebulaCloudField(index, x, y);
  let value: CloudCanvas | null = null;
  if (raster) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 30;
    const context = canvas.getContext('2d');
    if (context?.createImageData && context.putImageData) {
      const image = context.createImageData(30, 30);
      image.data.set(raster);
      context.putImageData(image, 0, 0);
      value = { canvas };
    }
  }
  fields.set(key, value);
  if (fields.size > 256) fields.delete(fields.keys().next().value!);
  return value ?? undefined;
}

export function getNebulaCloudDomStyle(
  index: NebulaCloudIndex,
  x: number,
  y: number,
): CSSProperties | undefined {
  const field = getNebulaCloudCanvas(index, x, y);
  if (!field) return undefined;
  field.url ??= field.canvas.toDataURL('image/png');
  return {
    backgroundImage: `url(${field.url})`,
    backgroundSize: '100% 100%',
    backgroundRepeat: 'no-repeat',
  };
}
