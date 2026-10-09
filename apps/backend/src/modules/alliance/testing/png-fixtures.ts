import { deflateSync } from 'node:zlib';

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

export function chunk(type: string, data: Buffer = Buffer.alloc(0)): Buffer {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), 8 + data.length);
  return out;
}

export function ihdr(
  width: number,
  height: number,
  options: { depth?: number; colorType?: number; interlace?: number } = {},
): Buffer {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data[8] = options.depth ?? 8;
  data[9] = options.colorType ?? 2;
  data[12] = options.interlace ?? 0;
  return chunk('IHDR', data);
}

export function idat(raw: Buffer): Buffer {
  return chunk('IDAT', deflateSync(raw));
}

/** A valid non-interlaced 8-bit RGB PNG filled with a flat colour. */
export function makePng(
  width: number,
  height: number,
  extraChunks: Buffer[] = [],
  trailing: Buffer = Buffer.alloc(0),
): Buffer {
  const row = Buffer.alloc(1 + width * 3, 0x7f);
  row[0] = 0;
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([
    PNG_SIGNATURE,
    ihdr(width, height),
    ...extraChunks,
    idat(raw),
    chunk('IEND'),
    trailing,
  ]);
}

/** Pads a PNG with an ancillary text chunk so that it is exactly `bytes` long. */
export function padPngTo(png: Buffer, bytes: number): Buffer {
  const padding = bytes - png.length - 12;
  if (padding < 0) throw new Error('png already larger than target');
  const iend = png.subarray(png.length - 12);
  const head = png.subarray(0, png.length - 12);
  return Buffer.concat([
    head,
    chunk('tEXt', Buffer.alloc(padding, 0x61)),
    iend,
  ]);
}
