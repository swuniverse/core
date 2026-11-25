import { deflateSync } from 'node:zlib';
import {
  buildNebulaLandscape,
  renderNebulaRaster,
  type NebulaLandscape,
} from '@swuniverse/shared';
import {
  nebulaVisualForField,
  type NebulaGeneration,
} from './nebula-generation';

const landscapes = new Map<string, NebulaLandscape>();
const rasters = new Map<string, Uint8ClampedArray>();
const textures = new Map<string, string>();
const crcTable = Array.from({ length: 256 }, (_, i) => {
  let crc = i;
  for (let j = 0; j < 8; j++)
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});
function pngChunk(name: string, data: Buffer) {
  const bytes = Buffer.concat([Buffer.from(name), data]);
  let crc = 0xffffffff;
  for (const value of bytes) crc = crcTable[(crc ^ value) & 255] ^ (crc >>> 8);
  const length = Buffer.alloc(4),
    checksum = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, bytes, checksum]);
}
function png(data: Buffer) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(30);
  header.writeUInt32BE(30, 4);
  header[8] = 8;
  header[9] = 6;
  const rows = Buffer.alloc(30 * 121);
  for (let y = 0; y < 30; y++)
    data.copy(rows, y * 121 + 1, y * 120, (y + 1) * 120);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(rows)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}
/** Return only this known field's image, never the world seed or hidden neighboring pixels. */
export function nebulaTextureForField(field: {
  fieldTypeId: number;
  cx?: number;
  cy?: number;
  nebulaGeneration?: NebulaGeneration | null;
}): string | undefined {
  if (typeof field.cx !== 'number' || typeof field.cy !== 'number')
    return undefined;
  const visual = nebulaVisualForField(field);
  if (!visual) return undefined;
  const key = JSON.stringify([
      visual.seed,
      visual.width,
      visual.height,
      visual.density,
    ]),
    textureKey = `${key}:${field.cx},${field.cy}`;
  const old = textures.get(textureKey);
  if (old) return old;
  let scene = landscapes.get(key);
  if (!scene) {
    scene = buildNebulaLandscape(visual);
    landscapes.set(key, scene);
    if (landscapes.size > 8) landscapes.delete(landscapes.keys().next().value!);
  }
  const x = Math.floor((field.cx - 1) / 8),
    y = Math.floor((field.cy - 1) / 8),
    chunkKey = `${key}:${x},${y}`;
  let raster = rasters.get(chunkKey);
  if (!raster) {
    raster = renderNebulaRaster(scene, x * 8, y * 8, 240, 240);
    rasters.set(chunkKey, raster);
    if (rasters.size > 64) rasters.delete(rasters.keys().next().value!);
  }
  const left = ((field.cx - 1) % 8) * 30,
    top = ((field.cy - 1) % 8) * 30,
    data = Buffer.alloc(30 * 30 * 4);
  for (let row = 0; row < 30; row++)
    data.set(
      raster.subarray(
        ((top + row) * 240 + left) * 4,
        ((top + row) * 240 + left + 30) * 4,
      ),
      row * 120,
    );
  const uri = `data:image/png;base64,${png(data).toString('base64')}`;
  textures.set(textureKey, uri);
  if (textures.size > 4096) textures.delete(textures.keys().next().value!);
  return uri;
}
