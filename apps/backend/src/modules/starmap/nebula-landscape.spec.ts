import {
  buildNebulaLandscape,
  generateFilmicNebulaTerrain,
  renderNebulaRaster,
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
