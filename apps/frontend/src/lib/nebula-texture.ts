import type { CSSProperties } from 'react';
import type { Texture } from 'pixi.js';
import {
  buildNebulaLandscape,
  isNebulaVisual,
  renderNebulaRaster,
  type NebulaVisualDto,
  type NebulaLandscape,
} from '@swuniverse/shared';

const CHUNK_FIELDS = 8,
  PIXELS = 30;
const scenes = new Map<string, NebulaLandscape>();
const chunks = new Map<
  string,
  {
    canvas: HTMLCanvasElement;
    url?: string;
    texture?: Texture;
    frames?: Map<number, Texture>;
  }
>();

export function getNebulaChunk(visual: NebulaVisualDto, x: number, y: number) {
  const sceneKey = JSON.stringify([
    visual.seed,
    visual.width,
    visual.height,
    visual.density,
  ]);
  let scene = scenes.get(sceneKey);
  if (!scene) {
    scene = buildNebulaLandscape(visual);
    scenes.set(sceneKey, scene);
    if (scenes.size > 8) scenes.delete(scenes.keys().next().value!);
  }
  const cx = Math.floor((x - 1) / CHUNK_FIELDS),
    cy = Math.floor((y - 1) / CHUNK_FIELDS),
    key = `${sceneKey}:${cx},${cy}`;
  let cached = chunks.get(key);
  if (!cached) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = CHUNK_FIELDS * PIXELS;
    const context = canvas.getContext('2d');
    if (!context) return null;
    const image = context.createImageData(canvas.width, canvas.height);
    image.data.set(
      renderNebulaRaster(
        scene,
        cx * CHUNK_FIELDS,
        cy * CHUNK_FIELDS,
        canvas.width,
        canvas.height,
        PIXELS,
      ),
    );
    context.putImageData(image, 0, 0);
    cached = { canvas };
    chunks.set(key, cached);
    if (chunks.size > 64) chunks.delete(chunks.keys().next().value!);
  } else {
    chunks.delete(key);
    chunks.set(key, cached);
  }
  return { cached, x: (x - 1) % CHUNK_FIELDS, y: (y - 1) % CHUNK_FIELDS };
}

export function getNebulaDomStyle(
  visual: NebulaVisualDto | null | undefined,
  x: number,
  y: number,
): CSSProperties | undefined {
  if (!isNebulaVisual(visual)) return undefined;
  const value = getNebulaChunk(visual, x, y);
  if (!value) return undefined;
  value.cached.url ??= value.cached.canvas.toDataURL('image/png');
  return {
    backgroundImage: `url(${value.cached.url})`,
    backgroundSize: `${CHUNK_FIELDS * 100}% ${CHUNK_FIELDS * 100}%`,
    backgroundPosition: `${(value.x / (CHUNK_FIELDS - 1)) * 100}% ${(value.y / (CHUNK_FIELDS - 1)) * 100}%`,
    backgroundRepeat: 'no-repeat',
  };
}
