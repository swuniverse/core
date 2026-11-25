import { deflateSync } from 'node:zlib';
import {
  buildNebulaCloudIndex,
  isNebulaCloudSpace,
  nebulaCloudSignature,
  renderNebulaCloudField,
  type NebulaCloudIndex,
} from '@swuniverse/shared';
import {
  nebulaVisualForField,
  type NebulaGeneration,
} from './nebula-generation';

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
export interface NebulaTextureField {
  fieldTypeId: number;
  cx?: number;
  cy?: number;
  fieldType?: { id: number; key: string; category?: string | null };
  nebulaGeneration?: NebulaGeneration | null;
  redacted?: boolean;
}

/** Build only from fields the requesting viewer is allowed to know. */
export function buildNebulaTextureContext(
  knownFields: readonly NebulaTextureField[],
): NebulaCloudIndex {
  return buildNebulaCloudIndex(
    knownFields.flatMap((field) => {
      if (
        field.redacted ||
        field.fieldType?.key === 'UNKNOWN' ||
        typeof field.cx !== 'number' ||
        typeof field.cy !== 'number'
      )
        return [];
      const visual = nebulaVisualForField(field);
      return visual ? [{ x: field.cx, y: field.cy, visual }] : [];
    }),
  );
}

/** Only this known recipient's pixels are returned, including decorative space-field wisps.
 * Seeds and unknown sources never leave the server. Context signatures include visibility.
 */
export function nebulaTextureForField(
  field: NebulaTextureField,
  context?: NebulaCloudIndex,
): string | undefined {
  if (
    field.redacted ||
    field.fieldType?.key === 'UNKNOWN' ||
    typeof field.cx !== 'number' ||
    typeof field.cy !== 'number'
  )
    return undefined;
  if (!nebulaVisualForField(field) && !isNebulaCloudSpace(field.fieldType))
    return undefined;
  const known = context ?? buildNebulaTextureContext([field]);
  const key = nebulaCloudSignature(known, field.cx, field.cy);
  if (!key) return undefined;
  const old = textures.get(key);
  if (old) return old;
  const raster = renderNebulaCloudField(known, field.cx, field.cy);
  if (!raster) return undefined;
  const uri = `data:image/png;base64,${png(Buffer.from(raster)).toString('base64')}`;
  textures.set(key, uri);
  if (textures.size > 4096) textures.delete(textures.keys().next().value!);
  return uri;
}
