import { createHash } from 'node:crypto';
import {
  buildNebulaLandscape,
  generateFilmicNebulaTerrain,
  renderNebulaRaster,
  renderNebulaContourMask,
  sampleNebulaLandscape,
  type NebulaVisualDto,
} from '@swuniverse/shared';
import { inflateSync } from 'node:zlib';
import { nebulaTextureForField } from './nebula-texture';

const visual: NebulaVisualDto = {
  version: 2,
  seed: 'landscape-test',
  width: 40,
  height: 40,
  density: 'BALANCED',
};
describe('continuous filmic terrain', () => {
  it('uses the same pixels on independently rendered neighboring chunks', () => {
    const scene = buildNebulaLandscape(visual);
    const full = renderNebulaRaster(scene, 7, 0, 60, 30),
      left = renderNebulaRaster(scene, 7, 0, 30, 30),
      right = renderNebulaRaster(scene, 8, 0, 30, 30);
    for (let y = 0; y < 30; y++)
      for (let x = 0; x < 60 * 4; x++) {
        const part = x < 120 ? left[y * 120 + x] : right[y * 120 + x - 120];
        expect(Math.abs(full[y * 240 + x] - part)).toBeLessThanOrEqual(1);
      }
  });
  it('scales region diversity and retains a comparable terrain fraction', () => {
    const small = buildNebulaLandscape(visual),
      largeVisual = { ...visual, width: 120, height: 120 },
      large = buildNebulaLandscape(largeVisual);
    expect(large.regions.length).toBeGreaterThan(small.regions.length);
    const a = generateFilmicNebulaTerrain(visual).size / 1600,
      b = generateFilmicNebulaTerrain(largeVisual).size / 14400;
    expect(Math.abs(a - b)).toBeLessThan(0.12);
    expect(a).toBeGreaterThan(0.1);
    expect(b).toBeGreaterThan(0.1);
  });
  it('produces a cropped valid PNG and omits textures for hidden or unowned terrain', () => {
    const candidate = generateFilmicNebulaTerrain(visual)
      .entries()
      .next().value;
    expect(candidate).toBeDefined();
    const [key, fieldTypeId] = candidate!;
    const [cx, cy] = key.split(',').map(Number);
    const field = {
      fieldTypeId,
      cx,
      cy,
      nebulaGeneration: {
        visual,
        fieldTypeId,
        baseline: {
          fieldTypeId: 1,
          isPassable: true,
          energyCost: 0,
          damage: 6,
          effects: null,
          effectFlags: null,
        },
      },
    };
    const uri = nebulaTextureForField(field)!;
    const bytes = Buffer.from(uri.split(',')[1], 'base64');
    expect([...bytes.subarray(0, 8)]).toEqual([
      137, 80, 78, 71, 13, 10, 26, 10,
    ]);
    expect(bytes.readUInt32BE(16)).toBe(30);
    expect(bytes.readUInt32BE(20)).toBe(30);
    const idat: Buffer[] = [];
    for (let at = 8; at < bytes.length;) {
      const length = bytes.readUInt32BE(at);
      if (bytes.toString('ascii', at + 4, at + 8) === 'IDAT')
        idat.push(bytes.subarray(at + 8, at + 8 + length));
      at += length + 12;
    }
    expect(inflateSync(Buffer.concat(idat)).length).toBe(30 * 121);
    expect(nebulaTextureForField({ ...field, fieldTypeId: 0 })).toBeUndefined();
    expect(nebulaTextureForField({ fieldTypeId, cx, cy })).toBeUndefined();
    expect(nebulaTextureForField(field)).toBe(uri);
  });
});

describe('organic nebula contours', () => {
  it('preserves the exact gameplay terrain selection from the filmic implementation', () => {
    const terrain = generateFilmicNebulaTerrain(visual);
    expect(
      createHash('sha256')
        .update(JSON.stringify([...terrain]))
        .digest('hex'),
    ).toBe('176ce2a522183f979dbd082ce400405edde017a7d61b24b790548296e9a881d8');
  });
  it('adds light filaments and darker dust within the existing cloud palette', () => {
    const scene = buildNebulaLandscape(visual);
    const image = renderNebulaRaster(scene, 7, 7, 180, 180);
    const brightness: number[] = [];
    for (let y = 0; y < 180; y += 3)
      for (let x = 0; x < 180; x += 3) {
        const i = (y * 180 + x) * 4;
        if (image[i + 3] < 50) continue;
        const point = sampleNebulaLandscape(
          scene,
          7 + (x + 0.5) / 30,
          7 + (y + 0.5) / 30,
        );
        brightness.push(image[i] / point.red);
      }
    expect(brightness.length).toBeGreaterThan(20);
    expect(Math.max(...brightness) - Math.min(...brightness)).toBeGreaterThan(
      0.2,
    );
  });
  const alpha = (mask: Uint8ClampedArray, x: number, y: number) =>
    mask[(y * 30 + x) * 4 + 3];
  it('rounds convex edges and diagonal concave corners without dimming connected interiors', () => {
    expect(
      renderNebulaContourMask(0, 30, 30, 0, 0)
        .filter((_, i) => i % 4 === 3)
        .every((v) => v === 255),
    ).toBe(true);
    const top = renderNebulaContourMask(1, 30, 30, 0, 0);
    const convex = renderNebulaContourMask(1 | 8 | 16, 30, 30, 0, 0);
    expect(alpha(convex, 3, 3)).toBeLessThan(alpha(top, 3, 3));
    expect(alpha(convex, 25, 25)).toBe(255);
    const concave = renderNebulaContourMask(1 << 6, 30, 30, 0, 0);
    expect(alpha(concave, 28, 28)).toBeLessThan(10);
    expect(alpha(concave, 15, 15)).toBe(255);
    expect(alpha(concave, 28, 15)).toBe(255);
  });
  it('does not introduce field-boundary dents along a continuous straight edge', () => {
    expect(renderNebulaContourMask(1 | 16 | 32, 30, 30, 8, 12)).toEqual(
      renderNebulaContourMask(1, 30, 30, 8, 12),
    );
    const left = renderNebulaContourMask(1, 30, 30, 8, 12),
      right = renderNebulaContourMask(1, 30, 30, 9, 12);
    for (let y = 0; y < 30; y++)
      expect(
        Math.abs(alpha(left, 29, y) - alpha(right, 0, y)),
      ).toBeLessThanOrEqual(20);
  });
  it('frays exposed edges deterministically in world coordinates', () => {
    const a = renderNebulaContourMask(1, 30, 30, 8, 12);
    expect(a).toEqual(renderNebulaContourMask(1, 30, 30, 8, 12));
    const row = Array.from({ length: 30 }, (_, x) => alpha(a, x, 5));
    expect(Math.max(...row) - Math.min(...row)).toBeGreaterThan(15);
    expect(a).not.toEqual(renderNebulaContourMask(1, 30, 30, 9, 12));
    for (let x = 0; x < 30; x++) expect(alpha(a, x, 0)).toBe(0);
  });
});
