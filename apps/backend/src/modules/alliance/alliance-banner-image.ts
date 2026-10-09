import { deflateSync, inflateSync } from 'node:zlib';

export const BANNER_MAX_BYTES = 200 * 1024;
export const BANNER_MAX_WIDTH = 600;
export const BANNER_MAX_HEIGHT = 150;

/** A banner upload the server refuses; the message is shown to the user. */
export class BannerImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BannerImageError';
  }
}

export interface NormalizedBanner {
  data: Buffer;
  width: number;
  height: number;
}

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const ERR = {
  notPng: 'Das Banner muss eine PNG-Datei sein',
  tooLarge: 'Das Banner darf höchstens 200 KB groß sein',
  tooBig: 'Das Banner darf höchstens 600 × 150 Pixel groß sein',
  corrupt: 'Die PNG-Datei ist beschädigt',
  trailing: 'Die PNG-Datei enthält zusätzliche Daten hinter dem Bildende',
  animated: 'Animierte PNG-Dateien sind nicht erlaubt',
} as const;

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

function writeChunk(type: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), 8 + data.length);
  return out;
}

const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
const DEPTHS: Record<number, number[]> = {
  0: [1, 2, 4, 8, 16],
  2: [8, 16],
  3: [1, 2, 4, 8],
  4: [8, 16],
  6: [8, 16],
};

const ADAM7 = [
  [0, 0, 8, 8],
  [4, 0, 8, 8],
  [0, 4, 4, 8],
  [2, 0, 4, 4],
  [0, 2, 2, 4],
  [1, 0, 2, 2],
  [0, 1, 1, 2],
];

function rawLength(
  width: number,
  height: number,
  bitsPerPixel: number,
  interlaced: boolean,
): number {
  const pass = (w: number, h: number) =>
    w === 0 || h === 0 ? 0 : h * (1 + Math.ceil((w * bitsPerPixel) / 8));
  if (!interlaced) return pass(width, height);
  return ADAM7.reduce((sum, [x0, y0, dx, dy]) => {
    const w = Math.ceil((width - x0) / dx);
    const h = Math.ceil((height - y0) / dy);
    return sum + pass(Math.max(w, 0), Math.max(h, 0));
  }, 0);
}

/**
 * Validates an uploaded banner by its actual bytes (never by file name or
 * declared content type) and returns a freshly encoded PNG that contains only
 * header, palette, transparency and pixel data. Text, metadata, unknown chunks
 * and anything after the image end are never stored or delivered.
 */
export function normalizeBannerPng(input: Buffer): NormalizedBanner {
  if (input.length < SIGNATURE.length || !input.subarray(0, 8).equals(SIGNATURE)) {
    throw new BannerImageError(ERR.notPng);
  }
  if (input.length > BANNER_MAX_BYTES) throw new BannerImageError(ERR.tooLarge);

  let offset = 8;
  let header: Buffer | null = null;
  let palette: Buffer | null = null;
  let transparency: Buffer | null = null;
  const pixelData: Buffer[] = [];
  let ended = false;
  let first = true;

  while (offset < input.length && !ended) {
    if (offset + 12 > input.length) throw new BannerImageError(ERR.corrupt);
    const length = input.readUInt32BE(offset);
    if (length > input.length || offset + 12 + length > input.length) {
      throw new BannerImageError(ERR.corrupt);
    }
    const type = input.toString('latin1', offset + 4, offset + 8);
    const data = input.subarray(offset + 8, offset + 8 + length);
    const crc = input.readUInt32BE(offset + 8 + length);
    if (crc32(input.subarray(offset + 4, offset + 8 + length)) !== crc) {
      throw new BannerImageError(ERR.corrupt);
    }
    if (first && type !== 'IHDR') throw new BannerImageError(ERR.corrupt);
    first = false;
    switch (type) {
      case 'IHDR':
        if (header || length !== 13) throw new BannerImageError(ERR.corrupt);
        header = data;
        break;
      case 'acTL':
      case 'fcTL':
      case 'fdAT':
        throw new BannerImageError(ERR.animated);
      case 'PLTE':
        palette = data;
        break;
      case 'tRNS':
        transparency = data;
        break;
      case 'IDAT':
        pixelData.push(data);
        break;
      case 'IEND':
        ended = true;
        break;
      default:
        break; // text, metadata and unknown chunks are dropped
    }
    offset += 12 + length;
  }
  if (!header || !ended || pixelData.length === 0) {
    throw new BannerImageError(ERR.corrupt);
  }
  if (offset !== input.length) throw new BannerImageError(ERR.trailing);

  const width = header.readUInt32BE(0);
  const height = header.readUInt32BE(4);
  const depth = header[8];
  const colorType = header[9];
  const interlace = header[12];
  if (
    width === 0 ||
    height === 0 ||
    !DEPTHS[colorType]?.includes(depth) ||
    header[10] !== 0 ||
    header[11] !== 0 ||
    (interlace !== 0 && interlace !== 1)
  ) {
    throw new BannerImageError(ERR.corrupt);
  }
  if (width > BANNER_MAX_WIDTH || height > BANNER_MAX_HEIGHT) {
    throw new BannerImageError(ERR.tooBig);
  }
  if (colorType === 3 && (!palette || palette.length % 3 !== 0)) {
    throw new BannerImageError(ERR.corrupt);
  }

  const expected = rawLength(
    width,
    height,
    CHANNELS[colorType] * depth,
    interlace === 1,
  );
  let raw: Buffer;
  try {
    raw = inflateSync(Buffer.concat(pixelData), { maxOutputLength: expected + 1 });
  } catch {
    throw new BannerImageError(ERR.corrupt);
  }
  if (raw.length !== expected) throw new BannerImageError(ERR.corrupt);

  const chunks = [
    SIGNATURE,
    writeChunk('IHDR', header),
    ...(palette && colorType !== 0 && colorType !== 4
      ? [writeChunk('PLTE', palette)]
      : []),
    ...(transparency ? [writeChunk('tRNS', transparency)] : []),
    writeChunk('IDAT', deflateSync(raw, { level: 9 })),
    writeChunk('IEND', Buffer.alloc(0)),
  ];
  return { data: Buffer.concat(chunks), width, height };
}
