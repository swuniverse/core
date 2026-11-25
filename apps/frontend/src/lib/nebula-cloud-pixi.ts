import { Texture } from 'pixi.js';
import type { NebulaCloudIndex } from '@swuniverse/shared';
import { getNebulaCloudCanvas } from './nebula-cloud';

export function getNebulaCloudPixiTexture(
  index: NebulaCloudIndex,
  x: number,
  y: number,
): Texture | null {
  const field = getNebulaCloudCanvas(index, x, y);
  if (!field) return null;
  field.texture ??= Texture.from(field.canvas, true);
  return field.texture;
}
