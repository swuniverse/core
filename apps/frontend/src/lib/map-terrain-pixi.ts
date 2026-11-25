import { Container, Sprite, Texture } from 'pixi.js';
import { isNebulaTerrain, type TerrainFieldType } from './map-terrain';

import { getOrganicNebulaMaskCanvas } from './nebula-contour';

const organicTextures = new WeakMap<HTMLCanvasElement, Texture>();
const masks = new Map<number, Texture>();

/** Sixteen tiny cached alpha textures feather only the exposed sides of a nebula tile. */
export function featherNebulaSprite(
  sprite: Sprite,
  container: Container,
  type: TerrainFieldType,
  neighbors: (TerrainFieldType | undefined)[],
) {
  if (!isNebulaTerrain(type)) return;
  const code = neighbors.reduce(
    (bits, neighbor, index) =>
      bits |
      (!neighbor || neighbor.key === 'UNKNOWN' || !isNebulaTerrain(neighbor)
        ? 1 << index
        : 0),
    0,
  );
  if (!code) return;
  let texture = masks.get(code);
  if (!texture) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const context = canvas.getContext('2d');
    if (!context?.createLinearGradient) return;
    context.fillStyle = '#fff';
    context.fillRect(0, 0, 64, 64);
    context.globalCompositeOperation = 'destination-in';
    const axes = [
      [0, 0, 0, 64],
      [64, 0, 0, 0],
      [0, 64, 0, 0],
      [0, 0, 64, 0],
    ];
    axes.forEach(([x0, y0, x1, y1], index) => {
      if (!(code & (1 << index))) return;
      const gradient = context.createLinearGradient(x0, y0, x1, y1);
      gradient.addColorStop(0, 'rgba(255,255,255,0)');
      gradient.addColorStop(0.35, '#fff');
      gradient.addColorStop(1, '#fff');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 64, 64);
    });
    texture = Texture.from(canvas);
    masks.set(code, texture);
  }
  const mask = new Sprite(texture);
  mask.position.copyFrom(sprite.position);
  mask.width = sprite.width;
  mask.height = sprite.height;
  container.addChild(mask);
  sprite.mask = mask;
}

/** Filmic contours share the DOM mask, including diagonal corners and frayed edges. */
export function organicNebulaSprite(
  sprite: Sprite,
  container: Container,
  type: TerrainFieldType,
  x: number,
  y: number,
  neighbors: (TerrainFieldType | undefined)[],
) {
  const value = getOrganicNebulaMaskCanvas(type, x, y, neighbors);
  if (!value) return;
  let texture = organicTextures.get(value.canvas);
  if (!texture) {
    texture = Texture.from(value.canvas, true);
    organicTextures.set(value.canvas, texture);
  }
  const mask = new Sprite(texture);
  mask.position.copyFrom(sprite.position);
  mask.width = sprite.width;
  mask.height = sprite.height;
  container.addChild(mask);
  sprite.mask = mask;
}
