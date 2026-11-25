import { Rectangle, Texture } from 'pixi.js';
import { isNebulaVisual, type NebulaVisualDto } from '@swuniverse/shared';
import { getNebulaChunk } from './nebula-texture';

const PIXELS = 30,
  CHUNK_FIELDS = 8;

export function getNebulaPixiTexture(
  visual: NebulaVisualDto | null | undefined,
  x: number,
  y: number,
): Texture | null {
  if (!isNebulaVisual(visual)) return null;
  const value = getNebulaChunk(visual, x, y);
  if (!value) return null;
  // Skip Pixi's global resource cache: evicted chunks remain alive only while displayed.
  value.cached.texture ??= Texture.from(value.cached.canvas, true);
  value.cached.frames ??= new Map();
  const index = value.y * CHUNK_FIELDS + value.x;
  let frame = value.cached.frames.get(index);
  if (!frame) {
    frame = new Texture({
      source: value.cached.texture.source,
      frame: new Rectangle(value.x * PIXELS, value.y * PIXELS, PIXELS, PIXELS),
    });
    value.cached.frames.set(index, frame);
  }
  return frame;
}
